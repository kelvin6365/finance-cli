import { daysBetween, lastDayOfMonthAfter, ymOf } from "./date.ts";
import type { Database, Debt, Transaction } from "./types.ts";

export type LoanPayoff = {
  debtId: string;
  endDate: string;
  daysRemaining: number;
  source: "stored" | "computed";
};

const normalizeEndDate = (raw: string): string => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}$/.test(raw)) return lastDayOfMonthAfter(`${raw}-01`, 0);
  return raw;
};

export const loanPayoff = (debt: Debt, today: string): LoanPayoff | null => {
  if (debt.endDate) {
    const endDate = normalizeEndDate(debt.endDate);
    return {
      debtId: debt.id,
      endDate,
      daysRemaining: Math.max(0, daysBetween(today, endDate)),
      source: "stored",
    };
  }
  const P = debt.principalRemaining;
  const M = debt.monthlyPayment;
  if (P <= 0 || M <= 0) return null;
  const r = debt.annualRate / 100 / 12;
  let n: number;
  if (r === 0) {
    n = Math.ceil(P / M);
  } else {
    if (M <= P * r) return null;
    n = Math.ceil(-Math.log(1 - (P * r) / M) / Math.log(1 + r));
  }
  const endDate = lastDayOfMonthAfter(today, n);
  return {
    debtId: debt.id,
    endDate,
    daysRemaining: Math.max(0, daysBetween(today, endDate)),
    source: "computed",
  };
};

const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

export const monthlyIncomeTotal = (db: Database): number =>
  sum(db.recurringIncome.filter((r) => r.active).map((r) => r.amount));

export const monthlyExpenseTotal = (db: Database): number => {
  const recurring = sum(
    db.recurringExpense.filter((r) => r.active).map((r) => r.amount),
  );
  const debts = sum(db.debts.filter((d) => d.active).map((d) => d.monthlyPayment));
  return recurring + debts;
};

export const monthlyNetCashflow = (db: Database): number =>
  monthlyIncomeTotal(db) - monthlyExpenseTotal(db);

export const totalDebtRemaining = (db: Database): number =>
  sum(db.debts.filter((d) => d.active).map((d) => d.principalRemaining));

export const daysUntilMay2026 = (db: Database, today: string): number =>
  daysBetween(today, db.settings.may2026Deadline);

// "accumulated savings" in SPEC §5 is interpreted as transactions logged
// against cat-insurance up to and including `today` — money the user has
// actively set aside for the May 2026 fund. currentReserve is the baseline.
export const may2026Readiness = (db: Database, today: string): number => {
  const accumulated = sum(
    db.transactions
      .filter(
        (t) =>
          t.categoryId === "cat-insurance" &&
          t.type === "expense" &&
          t.date <= today,
      )
      .map((t) => t.amount),
  );
  const target = db.settings.may2026InsuranceTarget;
  if (target <= 0) return 0;
  const ratio = (db.settings.currentReserve + accumulated) / target;
  return Math.max(0, Math.min(1, ratio));
};

const inMonth = (t: Transaction, ym: string): boolean => ymOf(t.date) === ym;

export const monthIncomeActual = (db: Database, ym: string): number =>
  sum(
    db.transactions
      .filter((t) => inMonth(t, ym) && t.type === "income")
      .map((t) => t.amount),
  );

export const monthExpenseActual = (db: Database, ym: string): number =>
  sum(
    db.transactions
      .filter((t) => inMonth(t, ym) && t.type === "expense")
      .map((t) => t.amount),
  );

export const monthBalanceActual = (db: Database, ym: string): number =>
  monthIncomeActual(db, ym) - monthExpenseActual(db, ym);

export const freelanceMonthActual = (db: Database, ym: string): number =>
  sum(
    db.transactions
      .filter((t) => inMonth(t, ym) && t.categoryId === "cat-freelance")
      .map((t) => (t.type === "income" ? t.amount : -t.amount)),
  );

export const activeDebtCount = (db: Database): number =>
  db.debts.filter((d) => d.active).length;

const ymToOrdinal = (ym: string): number => {
  const [y, m] = ym.split("-").map(Number) as [number, number];
  return y * 12 + m;
};

export const monthsUntilMayPrep = (db: Database, today: string): number =>
  ymToOrdinal(db.settings.may2026Deadline) - ymToOrdinal(today);

// "Money toward the May target" — the user's reserve plus every dollar of
// net cashflow they've logged since the savings window opened (Dec 1, 2025).
// Anything dated outside [SAVINGS_START, today] is excluded.
const SAVINGS_START = "2025-12-01";

export const mayPrepHaveToday = (db: Database, today: string): number => {
  const net = sum(
    db.transactions
      .filter((t) => t.date >= SAVINGS_START && t.date <= today)
      .map((t) => (t.type === "income" ? t.amount : -t.amount)),
  );
  return db.settings.currentReserve + net;
};

export const mayPrepRequiredMonthlySave = (
  db: Database,
  today: string,
): number => {
  const gap = db.settings.may2026InsuranceTarget - mayPrepHaveToday(db, today);
  if (gap <= 0) return 0;
  const months = monthsUntilMayPrep(db, today);
  if (months <= 0) return gap;
  return Math.ceil(gap / months);
};
