import { today } from "../core/date.ts";
import { money } from "../core/format.ts";
import { loadDb, saveDb } from "../core/storage.ts";
import type { Debt, Transaction } from "../core/types.ts";
import type { ParsedArgs } from "./argv.ts";
import { idemKey, idemLookup, idemSave } from "./idempotency.ts";
import { fail, isDryRun, isJson, okJson } from "./output.ts";

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

  if (isDryRun(args)) {
    if (isJson(args)) okJson({ dry_run: true, would: { debt: after, transaction: tx, becameInactive } });
    else process.stdout.write(`[dry-run] would pay ${money(payAmount)} on ${before.name}\n`);
    return 0;
  }

  const key = idemKey(args);
  if (key) {
    const cached = await idemLookup(key);
    if (cached !== null) {
      if (isJson(args)) okJson({ idempotent_replay: true, ...(cached as object) });
      else process.stdout.write(`[idempotent] already applied for key '${key}'\n`);
      return 0;
    }
  }

  db.debts[idx] = after;
  db.transactions.push(tx);
  await saveDb(db);

  const payload = { debt: after, transaction: tx, becameInactive };
  if (key) await idemSave(key, payload);

  if (isJson(args)) {
    okJson(payload);
    return 0;
  }
  const tail = becameInactive ? " (paid off!)" : "";
  process.stdout.write(
    `✓ Paid ${money(payAmount)} on ${before.name} · ${money(after.principalRemaining)} remaining${tail}\n`,
  );
  return 0;
};
