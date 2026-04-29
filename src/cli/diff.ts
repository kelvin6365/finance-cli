import { today } from "../core/date.ts";
import { money } from "../core/format.ts";
import { loadDb } from "../core/storage.ts";
import type { Database, Transaction } from "../core/types.ts";
import type { ParsedArgs } from "./argv.ts";
import { fail, isJson, okJson } from "./output.ts";

const isYmd = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s);

const sumByCategory = (
  db: Database,
  txs: Transaction[],
): { categoryId: string; name: string; net: number }[] => {
  const cats = new Map(db.categories.map((c) => [c.id, c]));
  const map = new Map<string, number>();
  for (const t of txs) {
    const v = t.type === "income" ? t.amount : -t.amount;
    map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + v);
  }
  return [...map.entries()]
    .map(([categoryId, net]) => ({
      categoryId,
      name: cats.get(categoryId)?.name ?? categoryId,
      net,
    }))
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
};

export const runDiff = async (args: ParsedArgs): Promise<number> => {
  const since = args.positional[0];
  if (!since) {
    return fail(args, "Usage: finance diff <YYYY-MM-DD>", "EVALIDATION");
  }
  if (!isYmd(since)) {
    return fail(args, `Invalid date (expected YYYY-MM-DD): ${since}`, "EVALIDATION");
  }
  const ymd = today();
  if (since > ymd) {
    return fail(args, `Date is in the future: ${since}`, "EVALIDATION");
  }

  const db = await loadDb();
  const window = db.transactions.filter((t) => t.date > since && t.date <= ymd);
  const income = window.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = window.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const net = income - expense;
  const byCategory = sumByCategory(db, window);

  const report = {
    since,
    today: ymd,
    transaction_count: window.length,
    income,
    expense,
    net,
    by_category: byCategory,
  };

  if (isJson(args)) {
    okJson(report);
    return 0;
  }

  process.stdout.write(`Diff · ${since} → ${ymd}  (${window.length} transactions)\n\n`);
  process.stdout.write(`  Income     ${money(income).padStart(14)}\n`);
  process.stdout.write(`  Expense    ${money(expense).padStart(14)}\n`);
  process.stdout.write(`  Net        ${money(net, { signed: true }).padStart(14)}\n`);
  if (byCategory.length > 0) {
    process.stdout.write(`\n  By category\n`);
    for (const c of byCategory.slice(0, 10)) {
      process.stdout.write(
        `    ${c.name.padEnd(28)}${money(c.net, { signed: true }).padStart(12)}\n`,
      );
    }
  }
  return 0;
};
