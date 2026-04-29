import { today } from "../core/date.ts";
import { money } from "../core/format.ts";
import { loadDb, saveDb } from "../core/storage.ts";
import type { Debt, Transaction } from "../core/types.ts";
import type { ParsedArgs } from "./argv.ts";
import { fail, isJson, okJson } from "./output.ts";

const newTxId = (): string => `tx-${crypto.randomUUID()}`;

export const runLoanPay = async (args: ParsedArgs): Promise<number> => {
  const id = args.positional[1];
  if (!id) {
    return fail(args, "Usage: finance loan pay <id>", "EVALIDATION");
  }
  if (!id.startsWith("debt-")) {
    return fail(
      args,
      `loan pay requires a debt id (starts with 'debt-'): ${id}`,
      "EVALIDATION",
    );
  }

  const db = await loadDb();
  const idx = db.debts.findIndex((d) => d.id === id);
  if (idx < 0) return fail(args, `Not found: ${id}`, "ENOTFOUND");

  const before = db.debts[idx]!;
  if (!before.active) return fail(args, `Loan is inactive: ${id}`, "EVALIDATION");
  if (before.principalRemaining <= 0)
    return fail(args, `Loan already paid off: ${id}`, "EVALIDATION");

  const payAmount = before.monthlyPayment;
  const newPrincipal = Math.max(0, before.principalRemaining - payAmount);
  const becameInactive = newPrincipal === 0;

  const after: Debt = {
    ...before,
    principalRemaining: newPrincipal,
    active: !becameInactive,
  };

  const tx: Transaction = {
    id: newTxId(),
    date: today(),
    amount: payAmount,
    type: "expense",
    categoryId: "cat-debt",
    note: `Payment: ${before.name}`,
    createdAt: new Date().toISOString(),
  };

  db.debts[idx] = after;
  db.transactions.push(tx);
  await saveDb(db);

  if (isJson(args)) {
    okJson({ debt: after, transaction: tx, becameInactive });
    return 0;
  }
  const tail = becameInactive ? " (paid off!)" : "";
  process.stdout.write(
    `✓ Paid ${money(payAmount)} on ${before.name} · ${money(after.principalRemaining)} remaining${tail}\n`,
  );
  return 0;
};
