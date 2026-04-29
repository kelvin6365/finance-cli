import type { ParsedArgs } from "./argv.ts";
import { SCHEMA_VERSION, okJson } from "./output.ts";

type FlagSpec = {
  name: string;
  type: "string" | "number" | "boolean";
  description: string;
};

type CommandSpec = {
  name: string;
  description: string;
  positional: { name: string; type: "string" | "number"; required: boolean }[];
  flags: FlagSpec[];
  mutates: boolean;
};

const COMMON_FLAGS: FlagSpec[] = [
  { name: "json", type: "boolean", description: "Emit a JSON envelope on stdout" },
  { name: "help", type: "boolean", description: "Print help and exit" },
];

const DRY_RUN: FlagSpec = {
  name: "dry-run",
  type: "boolean",
  description: "Compute and return the would-be result without writing",
};

const IDEMPOTENCY_KEY: FlagSpec = {
  name: "idempotency-key",
  type: "string",
  description:
    "Caller-supplied key; if seen within 24h, the original result is replayed instead of re-executing",
};

const MUTATION_FLAGS: FlagSpec[] = [...COMMON_FLAGS, DRY_RUN, IDEMPOTENCY_KEY];

const COMMANDS: CommandSpec[] = [
  {
    name: "status",
    description: "Monthly snapshot: income, expense, balance, debt total, May reserve",
    positional: [],
    flags: [...COMMON_FLAGS],
    mutates: false,
  },
  {
    name: "init",
    description: "Create ~/.finance/data.json from the bundled seed",
    positional: [],
    flags: [
      ...MUTATION_FLAGS,
      { name: "currency", type: "string", description: "ISO currency code (e.g. USD, HKD)" },
      { name: "symbol", type: "string", description: "Display symbol (e.g. $, HK$, ¥)" },
    ],
    mutates: true,
  },
  {
    name: "add",
    description: "Log a transaction",
    positional: [
      { name: "amount", type: "number", required: false },
      { name: "category", type: "string", required: false },
      { name: "note", type: "string", required: false },
    ],
    flags: [
      ...MUTATION_FLAGS,
      { name: "income", type: "boolean", description: "Mark as income (default expense)" },
      { name: "expense", type: "boolean", description: "Mark as expense" },
      { name: "date", type: "string", description: "ISO YYYY-MM-DD; defaults to today" },
    ],
    mutates: true,
  },
  {
    name: "edit",
    description: "Modify an existing transaction by id",
    positional: [{ name: "id", type: "string", required: true }],
    flags: [
      ...MUTATION_FLAGS,
      { name: "amount", type: "number", description: "New amount" },
      { name: "category", type: "string", description: "New category id or name" },
      { name: "note", type: "string", description: "New note" },
      { name: "date", type: "string", description: "New ISO date" },
    ],
    mutates: true,
  },
  {
    name: "delete",
    description: "Remove a transaction by id; returns prior state",
    positional: [{ name: "id", type: "string", required: true }],
    flags: [
      ...MUTATION_FLAGS,
      { name: "yes", type: "boolean", description: "Skip confirmation prompt" },
    ],
    mutates: true,
  },
  {
    name: "show",
    description: "Fetch a single record by id (transaction, debt, recurring, …)",
    positional: [{ name: "id", type: "string", required: true }],
    flags: [...COMMON_FLAGS],
    mutates: false,
  },
  {
    name: "list",
    description: "List transactions with filters",
    positional: [],
    flags: [
      ...COMMON_FLAGS,
      { name: "month", type: "string", description: "YYYY-MM filter" },
      { name: "type", type: "string", description: "income | expense" },
      { name: "category", type: "string", description: "Category id or name" },
      { name: "n", type: "number", description: "Page size" },
    ],
    mutates: false,
  },
  {
    name: "afford",
    description:
      "Can I cover <amount> by --by date? Returns yes/tight/no with cashflow projection",
    positional: [{ name: "amount", type: "number", required: true }],
    flags: [
      ...COMMON_FLAGS,
      { name: "by", type: "string", description: "ISO YYYY-MM-DD; defaults to end of current month" },
    ],
    mutates: false,
  },
  {
    name: "runway",
    description:
      "Freelance vs target + cashflow projection. Tells you whether to push, coast, or catch up",
    positional: [],
    flags: [
      ...COMMON_FLAGS,
      { name: "through", type: "string", description: "ISO YYYY-MM-DD; defaults to end of current month" },
    ],
    mutates: false,
  },
  {
    name: "balance",
    description: "Current month balance, one line",
    positional: [],
    flags: [
      ...COMMON_FLAGS,
      { name: "raw", type: "boolean", description: "Plain integer (no symbol/comma)" },
    ],
    mutates: false,
  },
  {
    name: "income",
    description: "Current month income vs target",
    positional: [],
    flags: [...COMMON_FLAGS],
    mutates: false,
  },
  {
    name: "next-month",
    description: "Next month income vs payments preview",
    positional: [],
    flags: [...COMMON_FLAGS],
    mutates: false,
  },
  {
    name: "loans",
    description: "Active debts sorted by principal desc",
    positional: [],
    flags: [...COMMON_FLAGS],
    mutates: false,
  },
  {
    name: "loan add",
    description: "Add a new loan (interactive without flags)",
    positional: [],
    flags: [
      ...MUTATION_FLAGS,
      { name: "name", type: "string", description: "Loan label" },
      { name: "amount", type: "number", description: "Original principal" },
      { name: "instalments", type: "number", description: "Total instalment count" },
      { name: "paid", type: "number", description: "Instalments already paid" },
      { name: "payment", type: "number", description: "Monthly payment amount" },
      { name: "rate", type: "number", description: "APR % (e.g. 12.68)" },
      { name: "start", type: "string", description: "YYYY-MM start month" },
      { name: "end", type: "string", description: "YYYY-MM end month" },
      { name: "note", type: "string", description: "Free-form note" },
    ],
    mutates: true,
  },
  {
    name: "loan edit",
    description: "Modify an existing loan by id",
    positional: [{ name: "id", type: "string", required: true }],
    flags: [
      ...MUTATION_FLAGS,
      { name: "name", type: "string", description: "New label" },
      { name: "payment", type: "number", description: "New monthly payment" },
      { name: "principal", type: "number", description: "New remaining principal" },
      { name: "rate", type: "number", description: "New APR %" },
      { name: "end", type: "string", description: "New end month" },
      { name: "note", type: "string", description: "New note" },
    ],
    mutates: true,
  },
  {
    name: "loan pay",
    description: "Record an instalment: decrement principal + log expense transaction",
    positional: [{ name: "id", type: "string", required: true }],
    flags: [...MUTATION_FLAGS],
    mutates: true,
  },
  {
    name: "recurring",
    description: "List recurring income, expense, and periodic items",
    positional: [],
    flags: [...COMMON_FLAGS],
    mutates: false,
  },
  {
    name: "recurring sync",
    description:
      "Auto-create transactions for recurring income/expense whose dayOfMonth has already passed in the target month, skipping any already synced (idempotent)",
    positional: [],
    flags: [
      ...MUTATION_FLAGS,
      { name: "month", type: "string", description: "Target YYYY-MM (defaults to current month)" },
    ],
    mutates: true,
  },
  {
    name: "categories",
    description: "List all categories",
    positional: [],
    flags: [...COMMON_FLAGS],
    mutates: false,
  },
  {
    name: "schema",
    description: "Self-describe the command surface (this command)",
    positional: [],
    flags: [...COMMON_FLAGS],
    mutates: false,
  },
];

export const runSchema = async (args: ParsedArgs): Promise<number> => {
  const payload = {
    schema_version: SCHEMA_VERSION,
    envelope: {
      ok: { ok: true, schema_version: SCHEMA_VERSION, data: "<command-specific>" },
      err: {
        ok: false,
        schema_version: SCHEMA_VERSION,
        error: "<message>",
        code: "ENOENT | ENOTFOUND | EVALIDATION | EAMBIGUOUS | EUNKNOWN",
      },
    },
    commands: COMMANDS,
  };
  okJson(payload);
  // noop for human mode — schema is meant for machines, but keep a friendly hint
  if (args.flags["json"] !== true) {
    process.stderr.write(
      "Tip: pipe through `jq` for readability — `finance schema --json | jq '.data.commands[].name'`\n",
    );
  }
  return 0;
};
