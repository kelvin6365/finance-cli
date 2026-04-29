import { money } from "../core/format.ts";
import { error } from "../core/log.ts";
import { loadDb, saveDb } from "../core/storage.ts";
import type { Debt } from "../core/types.ts";
import type { FlagValue, ParsedArgs } from "./argv.ts";
import { fail, isJson, okJson } from "./output.ts";

// --- shared helpers (also used by loan-edit, loan-pay) ----------------------

export const isYm = (s: string): boolean => /^\d{4}-\d{2}$/.test(s);

export const newDebtId = (): string =>
  `debt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

export const asPositiveInt = (v: FlagValue | undefined): number | null => {
  if (typeof v !== "string") return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

export const asNonNegInt = (v: FlagValue | undefined): number | null => {
  if (typeof v !== "string") return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : null;
};

export const asNonNegFloat = (v: FlagValue | undefined): number | null => {
  if (typeof v !== "string") return null;
  const n = parseFloat(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

const ADD_FLAG_NAMES = [
  "name",
  "amount",
  "instalments",
  "paid",
  "payment",
  "rate",
  "start",
  "end",
  "note",
];

const hasAddFlags = (args: ParsedArgs): boolean =>
  ADD_FLAG_NAMES.some((k) => args.flags[k] !== undefined) || isJson(args);

// --- interactive add (existing flow) ----------------------------------------

const ask = (msg: string): string => {
  const answer = prompt(msg);
  return answer === null ? "" : answer.trim();
};

const askInt = (msg: string): number | null => {
  const s = ask(msg);
  if (s === "") return null;
  const n = Number(s);
  return Number.isInteger(n) && n >= 0 ? n : null;
};

const runLoanAddInteractive = async (): Promise<number> => {
  if (!process.stdin.isTTY) {
    error("Interactive mode requires a TTY. Use flags: --name --amount --instalments --paid --payment");
    return 1;
  }

  process.stdout.write("── Add Loan ──────────────────────────\n");

  const name = ask("Name (e.g. HSBC Loan): ");
  if (!name) {
    error("Name is required.");
    return 1;
  }

  const originalAmount = askInt("Original amount (HKD, integer): ");
  if (originalAmount === null || originalAmount <= 0) {
    error("Original amount must be a positive integer.");
    return 1;
  }

  const totalInstalments = askInt("Total instalments (months): ");
  if (totalInstalments === null || totalInstalments <= 0) {
    error("Total instalments must be a positive integer.");
    return 1;
  }

  const paidInstalments = askInt("Instalments paid so far: ");
  if (paidInstalments === null || paidInstalments > totalInstalments) {
    error("Paid instalments cannot exceed total instalments.");
    return 1;
  }

  const remaining = totalInstalments - paidInstalments;
  const principalRemaining = Math.round(
    (originalAmount / totalInstalments) * remaining,
  );

  const monthlyPayment = askInt("Monthly payment (HKD, integer): ");
  if (monthlyPayment === null || monthlyPayment <= 0) {
    error("Monthly payment must be a positive integer.");
    return 1;
  }

  const rateInput = ask("Annual rate % (0 for interest-free, Enter to skip): ");
  const annualRate = rateInput === "" ? 0 : parseFloat(rateInput);
  if (!Number.isFinite(annualRate) || annualRate < 0) {
    error("Annual rate must be a non-negative number.");
    return 1;
  }

  const startInput = ask("Start date YYYY-MM (Enter to skip): ");
  const startDate = startInput === "" ? null : startInput;
  if (startDate !== null && !isYm(startDate)) {
    error("Start date must be YYYY-MM format.");
    return 1;
  }

  const endInput = ask("End date YYYY-MM (Enter to skip): ");
  const endDate = endInput === "" ? null : endInput;
  if (endDate !== null && !isYm(endDate)) {
    error("End date must be YYYY-MM format.");
    return 1;
  }

  const note = ask("Note (optional): ");

  const debt: Debt = {
    id: newDebtId(),
    name,
    principalRemaining,
    annualRate,
    monthlyPayment,
    startDate,
    endDate,
    categoryId: "cat-debt",
    active: true,
    note: note || `${paidInstalments}/${totalInstalments} instalments`,
  };

  process.stdout.write("\n── Preview ───────────────────────────\n");
  process.stdout.write(`  Name:       ${debt.name}\n`);
  process.stdout.write(`  Principal:  ${money(debt.principalRemaining)} (${remaining} of ${totalInstalments} remaining)\n`);
  process.stdout.write(`  Payment:    ${money(debt.monthlyPayment)}/mo\n`);
  process.stdout.write(`  Rate:       ${debt.annualRate}% p.a.\n`);
  if (debt.startDate) process.stdout.write(`  Start:      ${debt.startDate}\n`);
  if (debt.endDate) process.stdout.write(`  End:        ${debt.endDate}\n`);
  if (debt.note) process.stdout.write(`  Note:       ${debt.note}\n`);
  process.stdout.write("──────────────────────────────────────\n");

  const confirm = ask("Save? (y/n): ");
  if (confirm.toLowerCase() !== "y") {
    process.stdout.write("Cancelled.\n");
    return 0;
  }

  const db = await loadDb();
  db.debts.push(debt);
  await saveDb(db);
  process.stdout.write(`✓ Loan added: ${debt.name} · ${money(debt.principalRemaining)} remaining\n`);
  return 0;
};

// --- non-interactive add ----------------------------------------------------

const runLoanAddFlags = async (args: ParsedArgs): Promise<number> => {
  const name = typeof args.flags["name"] === "string" ? args.flags["name"] : "";
  if (!name) return fail(args, "--name is required", "EVALIDATION");

  const originalAmount = asPositiveInt(args.flags["amount"]);
  if (originalAmount === null)
    return fail(args, "--amount must be a positive integer", "EVALIDATION");

  const totalInstalments = asPositiveInt(args.flags["instalments"]);
  if (totalInstalments === null)
    return fail(args, "--instalments must be a positive integer", "EVALIDATION");

  const paidInstalments = asNonNegInt(args.flags["paid"]);
  if (paidInstalments === null)
    return fail(args, "--paid must be a non-negative integer", "EVALIDATION");
  if (paidInstalments > totalInstalments)
    return fail(args, "--paid cannot exceed --instalments", "EVALIDATION");

  const monthlyPayment = asPositiveInt(args.flags["payment"]);
  if (monthlyPayment === null)
    return fail(args, "--payment must be a positive integer", "EVALIDATION");

  let annualRate = 0;
  if (args.flags["rate"] !== undefined) {
    const r = asNonNegFloat(args.flags["rate"]);
    if (r === null) return fail(args, "--rate must be a non-negative number", "EVALIDATION");
    annualRate = r;
  }

  const startInput =
    typeof args.flags["start"] === "string" ? args.flags["start"] : null;
  if (startInput !== null && !isYm(startInput))
    return fail(args, "--start must be YYYY-MM format", "EVALIDATION");

  const endInput =
    typeof args.flags["end"] === "string" ? args.flags["end"] : null;
  if (endInput !== null && !isYm(endInput))
    return fail(args, "--end must be YYYY-MM format", "EVALIDATION");

  const noteInput =
    typeof args.flags["note"] === "string" ? args.flags["note"] : null;

  const remaining = totalInstalments - paidInstalments;
  const principalRemaining = Math.round(
    (originalAmount / totalInstalments) * remaining,
  );

  const debt: Debt = {
    id: newDebtId(),
    name,
    principalRemaining,
    annualRate,
    monthlyPayment,
    startDate: startInput,
    endDate: endInput,
    categoryId: "cat-debt",
    active: true,
    note: noteInput ?? `${paidInstalments}/${totalInstalments} instalments`,
  };

  const db = await loadDb();
  db.debts.push(debt);
  await saveDb(db);

  if (isJson(args)) {
    okJson({ debt });
    return 0;
  }
  process.stdout.write(
    `✓ Loan added: ${debt.name} · ${money(debt.principalRemaining)} remaining\n`,
  );
  return 0;
};

export const runLoanAdd = async (args: ParsedArgs): Promise<number> => {
  if (hasAddFlags(args)) return runLoanAddFlags(args);
  return runLoanAddInteractive();
};
