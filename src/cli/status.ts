import {
  daysUntilMay2026,
  may2026Readiness,
  monthBalanceActual,
  monthExpenseActual,
  monthIncomeActual,
  monthlyExpenseTotal,
  monthlyIncomeTotal,
  totalDebtRemaining,
} from "../core/calc.ts";
import { currentMonth, daysInMonth, monthName, today } from "../core/date.ts";
import { bar, money, percent } from "../core/format.ts";
import { loadDb } from "../core/storage.ts";
import type { ParsedArgs } from "./argv.ts";
import { isJson, okJson } from "./output.ts";

const RULE = "─".repeat(48);

const ratio = (n: number, d: number): number => (d > 0 ? n / d : 0);

export const runStatus = async (args: ParsedArgs): Promise<number> => {
  const db = await loadDb();
  const ymd = today();
  const ym = currentMonth();
  const [y, m] = ym.split("-") as [string, string];
  const monthNum = Number(m);
  const day = Number(ymd.slice(8, 10));
  const dim = daysInMonth(ym);

  const incomeAct = monthIncomeActual(db, ym);
  const incomeTgt = monthlyIncomeTotal(db);
  const expenseAct = monthExpenseActual(db, ym);
  const expenseTgt = monthlyExpenseTotal(db);
  const balance = monthBalanceActual(db, ym);
  const debt = totalDebtRemaining(db);
  const daysLeft = daysUntilMay2026(db, ymd);
  const readiness = may2026Readiness(db, ymd);

  if (isJson(args)) {
    okJson({
      month: ym,
      day,
      daysInMonth: dim,
      income: { actual: incomeAct, target: incomeTgt },
      expense: { actual: expenseAct, target: expenseTgt },
      balance,
      totalDebt: debt,
      may2026: { daysLeft, readiness },
    });
    return 0;
  }

  const out: string[] = [];
  out.push(RULE);
  out.push(`  ${monthName(monthNum)} ${y} · Day ${day} / ${dim}`);
  out.push(RULE);
  out.push(
    `  Income     ${money(incomeAct).padStart(10)}   (target ${money(incomeTgt)})  ${bar(incomeAct, incomeTgt, 10)}  ${percent(ratio(incomeAct, incomeTgt))}`,
  );
  out.push(
    `  Expense    ${money(expenseAct).padStart(10)}   (budget ${money(expenseTgt)})  ${bar(expenseAct, expenseTgt, 10)}  ${percent(ratio(expenseAct, expenseTgt))}`,
  );
  out.push(`  Balance    ${money(balance, { signed: true }).padStart(11)}`);
  out.push(RULE);
  out.push(`  Total debt ${money(debt).padStart(11)}`);
  out.push(
    `  May insurance ${String(daysLeft).padStart(4)} days   (ready ${percent(readiness)})`,
  );
  out.push(RULE);

  process.stdout.write(`${out.join("\n")}\n`);
  return 0;
};
