import { money } from "../core/format.ts";
import { loadDb } from "../core/storage.ts";
import type { ParsedArgs } from "./argv.ts";
import { isJson, okJson } from "./output.ts";

const RULE = "─".repeat(48);

export const runRecurring = async (args: ParsedArgs): Promise<number> => {
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
