#!/usr/bin/env bun
import { error } from "../core/log.ts";
import { loadDb } from "../core/storage.ts";
import { runAdd } from "./add.ts";
import { runAfford } from "./afford.ts";
import { parseArgv } from "./argv.ts";
import { runBalance } from "./balance.ts";
import { runCategories } from "./categories.ts";
import { runDelete } from "./delete.ts";
import { runEdit } from "./edit.ts";
import { runIncomeEdit } from "./income-edit.ts";
import { runIncome } from "./income.ts";
import { runInit } from "./init.ts";
import { runList } from "./list.ts";
import { runLoanEdit } from "./loan-edit.ts";
import { runLoanPay } from "./loan-pay.ts";
import { runLoanAdd } from "./loan.ts";
import { runLoans } from "./loans.ts";
import { runNextMonth } from "./next-month.ts";
import { errJson, isJson } from "./output.ts";
import { runRecurring } from "./recurring.ts";
import { runRunway } from "./runway.ts";
import { runSchema } from "./schema.ts";
import { runShow } from "./show.ts";
import { runStatus } from "./status.ts";

const HELP = `finance — personal finance tracker
Usage:
  finance                          # status (default)
  finance status
  finance init [--currency USD --symbol $]   # create ~/.finance/data.json from seed
  finance add <amount> <category> [note] [--income] [--date YYYY-MM-DD]
  finance add                      # interactive mode
  finance edit <id> [--amount N] [--category <name>] [--note <text>] [--date YYYY-MM-DD]
  finance delete <id> [--yes]      # remove a transaction (returns prior state in --json)
  finance balance [--raw]
  finance afford <amount> [--by YYYY-MM-DD]   # can I cover X by date Y? yes/tight/no
  finance runway [--through YYYY-MM-DD]       # freelance vs target + cashflow projection
  finance income                   # current month income vs target
  finance income edit <id> [--name] [--amount N] [--note]
  finance list [--month [YYYY-MM]] [-n N] [--type income|expense] [--category <name>]
  finance next-month               # next month income vs payments preview
  finance loans                    # active debts, sorted by principal desc
  finance recurring                # recurring income, expense, and periodic items
  finance categories               # category list
  finance show <id>                # fetch a single record by id
  finance loan add                 # interactive prompt flow
  finance loan add --name <s> --amount N --instalments N --paid N --payment N
                                   # non-interactive form
                                   # optional: --rate %, --start YYYY-MM, --end YYYY-MM, --note
  finance loan edit <id> [--name] [--payment N] [--principal N] [--rate %] [--end YYYY-MM] [--note]
  finance loan pay <id>            # decrement principal by monthlyPayment + log transaction
  finance schema                   # self-describe command surface (for LLMs / scripts)
  finance --help

Add --json to any command for machine-readable output:
  {"ok":true,"schema_version":"1.0","data":...}        on success
  {"ok":false,"schema_version":"1.0","error":...,"code":...}  on stderr (non-zero exit)

Add --dry-run to any mutation (init, add, edit, delete, loan add|edit|pay,
income edit) to preview the result without writing.

Add --idempotency-key <KEY> to add/edit/delete/loan add|pay so retries
within 24h replay the original result instead of double-applying.
`;

const STORAGE_HINT = "Hint: run `finance init` first";

const COMMON_BOOLEANS = ["help", "json"];
const MUTATION_BOOLEANS = ["dry-run", ...COMMON_BOOLEANS];

const BOOLEAN_FLAGS: Record<string, string[]> = {
  add: ["income", "expense", ...MUTATION_BOOLEANS],
  balance: ["raw", ...COMMON_BOOLEANS],
  list: COMMON_BOOLEANS,
  status: COMMON_BOOLEANS,
  income: MUTATION_BOOLEANS,
  init: MUTATION_BOOLEANS,
  "next-month": COMMON_BOOLEANS,
  loan: MUTATION_BOOLEANS,
  loans: COMMON_BOOLEANS,
  recurring: COMMON_BOOLEANS,
  categories: COMMON_BOOLEANS,
  show: COMMON_BOOLEANS,
  edit: MUTATION_BOOLEANS,
  delete: ["yes", ...MUTATION_BOOLEANS],
  schema: COMMON_BOOLEANS,
  afford: COMMON_BOOLEANS,
  runway: COMMON_BOOLEANS,
};

const dispatch = async (): Promise<number> => {
  const argv = process.argv.slice(2);
  const firstParse = parseArgv(argv);
  const cmd = firstParse.command;

  if (firstParse.flags["help"] === true || cmd === "help" || cmd === "--help") {
    process.stdout.write(HELP);
    return 0;
  }

  const parsed = parseArgv(argv, {
    booleanFlags: BOOLEAN_FLAGS[cmd] ?? ["help"],
  });

  switch (cmd) {
    case "":
      // Bare `finance` opens the TUI on a TTY; pipes/scripts and --json get
      // the text/JSON snapshot so existing tooling and agents keep working.
      if (process.stdout.isTTY && process.stdin.isTTY && !isJson(parsed)) {
        const db = await loadDb();
        const { renderApp } = await import("../tui/index.ts");
        await renderApp(db);
        return 0;
      }
      return runStatus(parsed);
    case "status":
      return runStatus(parsed);
    case "init":
      return runInit(parsed);
    case "add":
      return runAdd(parsed);
    case "edit":
      return runEdit(parsed);
    case "delete":
      return runDelete(parsed);
    case "balance":
      return runBalance(parsed);
    case "afford":
      return runAfford(parsed);
    case "runway":
      return runRunway(parsed);
    case "income": {
      const sub = parsed.positional[0];
      if (sub === "edit") return runIncomeEdit(parsed);
      return runIncome(parsed);
    }
    case "list":
      return runList(parsed);
    case "next-month":
      return runNextMonth(parsed);
    case "loans":
      return runLoans(parsed);
    case "recurring":
      return runRecurring(parsed);
    case "categories":
      return runCategories(parsed);
    case "show":
      return runShow(parsed);
    case "schema":
      return runSchema(parsed);
    case "loan": {
      const sub = parsed.positional[0];
      if (sub === "add") return runLoanAdd(parsed);
      if (sub === "edit") return runLoanEdit(parsed);
      if (sub === "pay") return runLoanPay(parsed);
      if (isJson(parsed)) {
        errJson(`Unknown loan subcommand: ${sub ?? "(none)"}`, "EVALIDATION");
      } else {
        error(`Unknown loan subcommand: ${sub ?? "(none)"}. Try: finance loan add|edit|pay`);
      }
      return 1;
    }
    default:
      if (isJson(parsed)) {
        errJson(`Unknown command: ${cmd}`, "EVALIDATION");
      } else {
        error(`Unknown command: ${cmd}`);
        process.stderr.write(HELP);
      }
      return 1;
  }
};

const main = async (): Promise<void> => {
  try {
    const code = await dispatch();
    process.exit(code);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const jsonMode = process.argv.includes("--json");
    const missingFile = msg.includes("ENOENT") || msg.includes("No such file");
    if (jsonMode) {
      errJson(
        missingFile ? `Cannot read data: ${msg}. ${STORAGE_HINT}` : msg,
        missingFile ? "ENOENT" : "EUNKNOWN",
      );
      process.exit(2);
    }
    if (missingFile) {
      error(`Cannot read data: ${msg}`);
      process.stderr.write(`${STORAGE_HINT}\n`);
      process.exit(2);
    }
    error(msg);
    process.exit(2);
  }
};

await main();
