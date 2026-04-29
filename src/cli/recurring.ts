import { currentMonth, daysInMonth, today } from "../core/date.ts";
import { money } from "../core/format.ts";
import { loadDb, saveDb } from "../core/storage.ts";
import type { Database, Transaction } from "../core/types.ts";
import type { ParsedArgs } from "./argv.ts";
import { fail, isDryRun, isJson, okJson } from "./output.ts";

const RULE = "─".repeat(48);

const isYm = (s: string): boolean => /^\d{4}-\d{2}$/.test(s);

const pad2 = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

const newTxId = (): string => `tx-${crypto.randomUUID()}`;

type Pending = {
  recurringId: string;
  type: "income" | "expense";
  date: string;
  amount: number;
  categoryId: string;
  name: string;
  note: string;
};

const collectPending = (db: Database, ym: string, throughDate: string): Pending[] => {
  const dim = daysInMonth(ym);
  const out: Pending[] = [];
  const seen = new Set(
    db.transactions
      .filter((t) => t.recurringId && t.date.startsWith(ym))
      .map((t) => `${t.recurringId}:${ym}`),
  );

  for (const r of db.recurringIncome) {
    if (!r.active) continue;
    if (r.dayOfMonth === null) continue;
    const day = Math.min(r.dayOfMonth, dim);
    const date = `${ym}-${pad2(day)}`;
    if (date > throughDate) continue;
    if (seen.has(`${r.id}:${ym}`)) continue;
    out.push({
      recurringId: r.id,
      type: "income",
      date,
      amount: r.amount,
      categoryId: r.categoryId,
      name: r.name,
      note: r.note,
    });
  }
  for (const r of db.recurringExpense) {
    if (!r.active) continue;
    const day = Math.min(r.dayOfMonth, dim);
    const date = `${ym}-${pad2(day)}`;
    if (date > throughDate) continue;
    if (seen.has(`${r.id}:${ym}`)) continue;
    out.push({
      recurringId: r.id,
      type: "expense",
      date,
      amount: r.amount,
      categoryId: r.categoryId,
      name: r.name,
      note: r.note,
    });
  }
  out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return out;
};

const toTransaction = (p: Pending): Transaction => ({
  id: newTxId(),
  date: p.date,
  amount: p.amount,
  type: p.type,
  categoryId: p.categoryId,
  note: p.note ? `${p.name} · ${p.note}` : p.name,
  recurringId: p.recurringId,
  createdAt: new Date().toISOString(),
});

export const runRecurringSync = async (args: ParsedArgs): Promise<number> => {
  const monthFlag = args.flags["month"];
  const ym = typeof monthFlag === "string" ? monthFlag : currentMonth();
  if (!isYm(ym)) {
    return fail(args, `Invalid --month (expected YYYY-MM): ${ym}`, "EVALIDATION");
  }
  const ymd = today();
  const through = ym === currentMonth() ? ymd : `${ym}-${pad2(daysInMonth(ym))}`;

  const db = await loadDb();
  const pending = collectPending(db, ym, through);

  if (isDryRun(args)) {
    if (isJson(args)) okJson({ dry_run: true, would: { month: ym, pending } });
    else {
      process.stdout.write(`[dry-run] ${pending.length} pending for ${ym}\n`);
      for (const p of pending) {
        const sign = p.type === "income" ? "+" : "-";
        process.stdout.write(`  ${p.date}  ${sign}${money(p.amount)}  ${p.name}\n`);
      }
    }
    return 0;
  }

  if (pending.length === 0) {
    if (isJson(args)) okJson({ month: ym, created: [] });
    else process.stdout.write(`Nothing to sync for ${ym}.\n`);
    return 0;
  }

  const created = pending.map(toTransaction);
  db.transactions.push(...created);
  await saveDb(db);

  if (isJson(args)) {
    okJson({ month: ym, created });
    return 0;
  }
  process.stdout.write(`✓ Synced ${created.length} recurring entries for ${ym}\n`);
  for (const t of created) {
    const sign = t.type === "income" ? "+" : "-";
    process.stdout.write(`  ${t.date}  ${sign}${money(t.amount)}  ${t.note}\n`);
  }
  return 0;
};

export const runRecurring = async (args: ParsedArgs): Promise<number> => {
  if (args.positional[0] === "sync") {
    return runRecurringSync(args);
  }
  const db = await loadDb();
  const income = db.recurringIncome.filter((r) => r.active);
  const expense = db.recurringExpense.filter((r) => r.active);
  const periodic = db.periodicItems.filter((p) => p.active);

  const totalIncome = income.reduce((s, r) => s + r.amount, 0);
  const totalExpense = expense.reduce((s, r) => s + r.amount, 0);

  if (isJson(args)) {
    okJson({
      income: { items: income, total: totalIncome },
      expense: { items: expense, total: totalExpense },
      periodic,
    });
    return 0;
  }

  const out: string[] = [];
  out.push(RULE);
  out.push(`  Recurring income (${income.length})`);
  out.push(RULE);
  for (const r of income) {
    out.push(`  ${r.name.padEnd(30)}${money(r.amount).padStart(12)}/mo`);
  }
  out.push(`  ${"Total".padEnd(30)}${money(totalIncome).padStart(12)}/mo`);
  out.push(RULE);
  out.push(`  Recurring expense (${expense.length})`);
  out.push(RULE);
  for (const r of expense) {
    out.push(`  ${r.name.padEnd(30)}${money(r.amount).padStart(12)}/mo`);
  }
  out.push(`  ${"Total".padEnd(30)}${money(totalExpense).padStart(12)}/mo`);
  out.push(RULE);
  if (periodic.length > 0) {
    out.push(`  Periodic items (${periodic.length})`);
    out.push(RULE);
    for (const p of periodic) {
      out.push(
        `  ${p.name.padEnd(30)}${money(p.amount).padStart(12)}  m=${String(p.month).padStart(2)} ${p.recurring}`,
      );
    }
    out.push(RULE);
  }
  process.stdout.write(`${out.join("\n")}\n`);
  return 0;
};
