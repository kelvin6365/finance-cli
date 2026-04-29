import { currentMonth, ymOf } from "../core/date.ts";
import { money, padRight, truncate } from "../core/format.ts";
import { warn } from "../core/log.ts";
import { loadDb } from "../core/storage.ts";
import type { Category, Transaction, TransactionType } from "../core/types.ts";
import type { ParsedArgs } from "./argv.ts";
import { resolveCategory } from "./category-resolver.ts";
import { fail, isJson, okJson } from "./output.ts";

const DEFAULT_LIMIT = 10;

const isType = (s: string): s is TransactionType =>
  s === "income" || s === "expense";

const typeLabel = (t: TransactionType): string =>
  t === "income" ? "Income" : "Expense";

const signedAmount = (t: Transaction): string => {
  const n = t.type === "income" ? t.amount : -t.amount;
  return money(n, { signed: true });
};

const renderRow = (t: Transaction, catById: Map<string, Category>): string => {
  const cat = catById.get(t.categoryId);
  const catName = cat ? cat.name : t.categoryId;
  return [
    padRight(t.date, 12),
    padRight(typeLabel(t.type), 8),
    padRight(signedAmount(t), 10),
    padRight(truncate(catName, 10), 12),
    truncate(t.note, 40),
  ].join(" ");
};

export const runList = async (args: ParsedArgs): Promise<number> => {
  const db = await loadDb();
  const catById = new Map(db.categories.map((c) => [c.id, c]));

  let txs = [...db.transactions];

  const monthFlag = args.flags["month"];
  let month: string | null = null;
  if (monthFlag === true) month = currentMonth();
  else if (typeof monthFlag === "string") month = monthFlag;
  if (month) {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return fail(args, `Invalid month (expected YYYY-MM): ${month}`, "EVALIDATION");
    }
    txs = txs.filter((t) => ymOf(t.date) === month);
  }

  const typeFlag = args.flags["type"];
  let typeFilter: TransactionType | null = null;
  if (typeof typeFlag === "string") {
    if (!isType(typeFlag)) {
      return fail(args, `--type accepts only income or expense: ${typeFlag}`, "EVALIDATION");
    }
    typeFilter = typeFlag;
    txs = txs.filter((t) => t.type === typeFilter);
  }

  const catFlag = args.flags["category"];
  let categoryFilter: string | null = null;
  if (typeof catFlag === "string") {
    const r = resolveCategory(db.categories, catFlag);
    if (r.kind === "ambiguous") {
      return fail(args, `Ambiguous category: ${catFlag}`, "EAMBIGUOUS");
    }
    if (r.kind !== "ok") {
      return fail(args, `Unknown category: ${catFlag}`, "EVALIDATION");
    }
    categoryFilter = r.category.id;
    txs = txs.filter((t) => t.categoryId === categoryFilter);
  }

  txs.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.createdAt < b.createdAt ? 1 : -1;
  });

  const nFlag = args.flags["n"];
  const limit = month ? txs.length : Number(nFlag ?? DEFAULT_LIMIT);
  if (!Number.isFinite(limit) || limit < 0) {
    return fail(args, `-n must be a positive integer: ${String(nFlag)}`, "EVALIDATION");
  }
  const visible = txs.slice(0, limit);

  if (isJson(args)) {
    okJson({
      filters: { month, type: typeFilter, category: categoryFilter, limit },
      transactions: visible.map((t) => {
        const cat = catById.get(t.categoryId);
        return {
          id: t.id,
          date: t.date,
          type: t.type,
          amount: t.amount,
          signedAmount: t.type === "income" ? t.amount : -t.amount,
          categoryId: t.categoryId,
          categoryName: cat ? cat.name : t.categoryId,
          note: t.note,
          createdAt: t.createdAt,
        };
      }),
    });
    return 0;
  }

  if (visible.length === 0) {
    warn("No transactions");
    return 0;
  }

  const header = [
    padRight("Date", 12),
    padRight("Type", 8),
    padRight("Amount", 10),
    padRight("Category", 12),
    "Note",
  ].join(" ");
  process.stdout.write(`${header}\n`);
  for (const t of visible) {
    process.stdout.write(`${renderRow(t, catById)}\n`);
  }
  return 0;
};
