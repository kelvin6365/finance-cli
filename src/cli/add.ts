import { today } from "../core/date.ts";
import { money } from "../core/format.ts";
import { error } from "../core/log.ts";
import { loadDb, saveDb } from "../core/storage.ts";
import type { Category, Transaction, TransactionType } from "../core/types.ts";
import type { ParsedArgs } from "./argv.ts";
import { formatCategoryList, resolveCategory } from "./category-resolver.ts";
import { fail, isJson, okJson } from "./output.ts";

const isYmd = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s);

const newTxId = (): string => `tx-${crypto.randomUUID()}`;

const printConfirmation = (
  tx: Transaction,
  category: Category,
): void => {
  const signed = tx.type === "income" ? tx.amount : -tx.amount;
  const note = tx.note ? ` · ${tx.note}` : "";
  process.stdout.write(
    `✓ Added: ${money(signed, { signed: true })} · ${category.name}${note} · ${tx.date}\n`,
  );
};

const oneShot = async (args: ParsedArgs): Promise<number> => {
  const [amountStr, catInput, ...rest] = args.positional;
  if (!amountStr || !catInput) {
    return fail(
      args,
      "Usage: finance add <amount> <category> [note] [--income] [--date YYYY-MM-DD]",
      "EVALIDATION",
    );
  }

  const amount = Number(amountStr);
  if (!Number.isInteger(amount) || amount <= 0) {
    return fail(args, `Amount must be a positive integer: ${amountStr}`, "EVALIDATION");
  }

  const explicitIncome = args.flags["income"] === true;
  const explicitExpense = args.flags["expense"] === true;
  if (explicitIncome && explicitExpense) {
    return fail(args, "Cannot use both --income and --expense", "EVALIDATION");
  }
  const type: TransactionType = explicitIncome ? "income" : "expense";

  const dateFlag = args.flags["date"];
  const date = typeof dateFlag === "string" ? dateFlag : today();
  if (!isYmd(date)) {
    return fail(args, `Invalid date (expected YYYY-MM-DD): ${date}`, "EVALIDATION");
  }

  const note = rest.join(" ");

  const db = await loadDb();
  const resolved = resolveCategory(db.categories, catInput);
  if (resolved.kind === "unknown") {
    if (isJson(args)) {
      return fail(args, `Unknown category: ${catInput}`, "EVALIDATION");
    }
    error(`Unknown category: ${catInput}`);
    process.stderr.write(`${formatCategoryList(db.categories)}\n`);
    return 1;
  }
  if (resolved.kind === "ambiguous") {
    if (isJson(args)) {
      return fail(args, `Ambiguous category: ${catInput}`, "EAMBIGUOUS");
    }
    error(`Ambiguous category: ${catInput}`);
    process.stderr.write(`${formatCategoryList(resolved.matches)}\n`);
    return 1;
  }

  const tx: Transaction = {
    id: newTxId(),
    date,
    amount,
    type,
    categoryId: resolved.category.id,
    note,
    createdAt: new Date().toISOString(),
  };

  db.transactions.push(tx);
  await saveDb(db);

  if (isJson(args)) {
    okJson({ transaction: tx, category: resolved.category });
  } else {
    printConfirmation(tx, resolved.category);
  }
  return 0;
};

const ask = (msg: string): string => {
  const answer = prompt(msg);
  return answer === null ? "" : answer.trim();
};

const interactive = async (args: ParsedArgs): Promise<number> => {
  if (isJson(args)) {
    return fail(
      args,
      "Interactive add not supported with --json. Pass amount and category as positional args.",
      "EVALIDATION",
    );
  }
  if (!process.stdin.isTTY) {
    error("Interactive mode requires a TTY. One-shot: finance add <amount> <category> [note]");
    return 1;
  }
  const db = await loadDb();

  const typeAns = ask("Type? (i)ncome / (e)xpense: ");
  const t = typeAns.toLowerCase();
  const type: TransactionType =
    t === "i" || t === "income" ? "income" : "expense";

  const amountAns = ask("Amount: ");
  const amount = Number(amountAns);
  if (!Number.isInteger(amount) || amount <= 0) {
    error(`Amount must be a positive integer: ${amountAns}`);
    return 1;
  }

  const pool = db.categories.filter((c) => c.type === type);
  const menu = pool
    .map((c, i) => `[${i + 1}] ${c.name}`)
    .join(" ");
  const catAns = ask(`Category: ${menu}: `);
  const idx = Number(catAns) - 1;
  let category: Category | undefined;
  if (Number.isInteger(idx) && idx >= 0 && idx < pool.length) {
    category = pool[idx];
  } else {
    const r = resolveCategory(pool, catAns, type);
    if (r.kind === "ok") category = r.category;
  }
  if (!category) {
    error(`Unknown category: ${catAns}`);
    return 1;
  }

  const note = ask("Note (optional): ");

  const tx: Transaction = {
    id: newTxId(),
    date: today(),
    amount,
    type,
    categoryId: category.id,
    note,
    createdAt: new Date().toISOString(),
  };

  db.transactions.push(tx);
  await saveDb(db);
  printConfirmation(tx, category);
  return 0;
};

export const runAdd = async (args: ParsedArgs): Promise<number> => {
  if (args.positional.length === 0) {
    return interactive(args);
  }
  return oneShot(args);
};
