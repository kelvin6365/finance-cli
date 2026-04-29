import { currentMonth, monthName } from "../core/date.ts";
import { money } from "../core/format.ts";
import { loadDb } from "../core/storage.ts";
import type { ParsedArgs } from "./argv.ts";
import { isJson, okJson } from "./output.ts";

const RULE = "─".repeat(48);

const col = (label: string, amount: number, signed = false): string => {
  const fmt = money(amount, { signed });
  return `  ${label.padEnd(30)}${fmt.padStart(10)}`;
};

const nextYm = (): { ym: string; year: number; month: number } => {
  const [y, m] = currentMonth().split("-").map(Number) as [number, number];
  const month = m === 12 ? 1 : m + 1;
  const year = m === 12 ? y + 1 : y;
  return { ym: `${year}-${String(month).padStart(2, "0")}`, year, month };
};

export const runNextMonth = async (args: ParsedArgs): Promise<number> => {
  const db = await loadDb();
  const { ym, year, month } = nextYm();

  const incomeItems = db.recurringIncome
    .filter((r) => r.active)
    .sort((a, b) => b.amount - a.amount)
    .map((r) => ({ name: r.name, amount: r.amount }));
  const totalIncome = incomeItems.reduce((s, r) => s + r.amount, 0);

  const recurringItems = db.recurringExpense
    .filter((r) => r.active)
    .map((r) => ({ name: r.name, amount: r.amount, kind: "recurring" as const }));
  const debtItems = db.debts
    .filter((d) => d.active)
    .map((d) => ({ name: d.name, amount: d.monthlyPayment, kind: "debt" as const }));
  const paymentItems = [...recurringItems, ...debtItems].sort(
    (a, b) => b.amount - a.amount,
  );
  const totalPayments = paymentItems.reduce((s, p) => s + p.amount, 0);

  const periodicDue = db.periodicItems
    .filter((p) => p.active && p.month === month)
    .sort((a, b) => b.amount - a.amount)
    .map((p) => ({ name: p.name, amount: p.amount }));
  const totalPeriodic = periodicDue.reduce((s, p) => s + p.amount, 0);

  const net = totalIncome - totalPayments - totalPeriodic;

  if (isJson(args)) {
    okJson({
      month: ym,
      year,
      monthNum: month,
      income: { items: incomeItems, total: totalIncome },
      payments: { items: paymentItems, total: totalPayments },
      oneOff: { items: periodicDue, total: totalPeriodic },
      net,
    });
    return 0;
  }

  const out: string[] = [];
  out.push(RULE);
  out.push(`  ${monthName(month).toUpperCase()} ${year} · Next Month Preview`);
  out.push(RULE);

  out.push("  Income");
  for (const r of incomeItems) {
    out.push(col(`    ${r.name}`, r.amount, true));
  }
  out.push(col("  Total income", totalIncome, true));
  out.push(RULE);

  out.push("  Regular Payments");
  for (const p of paymentItems) {
    out.push(col(`    ${p.name}`, p.amount));
  }
  out.push(col("  Total payments", totalPayments));
  out.push(RULE);

  if (periodicDue.length > 0) {
    out.push("  One-off Due");
    for (const p of periodicDue) {
      out.push(col(`    ${p.name}`, p.amount));
    }
    out.push(col("  Total one-off", totalPeriodic));
    out.push(RULE);
  }

  out.push(col("  Net balance", net, true));
  out.push(RULE);

  process.stdout.write(`${out.join("\n")}\n`);
  return 0;
};
