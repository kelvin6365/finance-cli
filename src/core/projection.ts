import { daysBetween } from "./date.ts";
import type { Database } from "./types.ts";

export type CashflowEvent = {
  date: string;
  amount: number;
  source:
    | "recurring-income"
    | "recurring-expense"
    | "debt-payment"
    | "periodic-income"
    | "periodic-expense";
  label: string;
  refId: string;
};

const pad2 = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

const ymdAt = (year: number, month: number, day: number): string => {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const safeDay = Math.min(day, lastDay);
  return `${year}-${pad2(month)}-${pad2(safeDay)}`;
};

const monthsBetween = (
  from: string,
  to: string,
): { year: number; month: number }[] => {
  const [fy, fm] = from.split("-").map(Number) as [number, number];
  const [ty, tm] = to.split("-").map(Number) as [number, number];
  const out: { year: number; month: number }[] = [];
  let y = fy;
  let m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    out.push({ year: y, month: m });
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
};

const DEBT_DUE_DAY = 28;

export const projectCashflow = (
  db: Database,
  from: string,
  to: string,
): CashflowEvent[] => {
  if (daysBetween(from, to) < 0) return [];

  const events: CashflowEvent[] = [];
  const months = monthsBetween(from, to);

  for (const { year, month } of months) {
    for (const r of db.recurringIncome) {
      if (!r.active) continue;
      if (r.dayOfMonth === null) continue;
      const date = ymdAt(year, month, r.dayOfMonth);
      if (date < from || date > to) continue;
      events.push({
        date,
        amount: r.amount,
        source: "recurring-income",
        label: r.name,
        refId: r.id,
      });
    }
    for (const r of db.recurringExpense) {
      if (!r.active) continue;
      const date = ymdAt(year, month, r.dayOfMonth);
      if (date < from || date > to) continue;
      events.push({
        date,
        amount: -r.amount,
        source: "recurring-expense",
        label: r.name,
        refId: r.id,
      });
    }
    for (const d of db.debts) {
      if (!d.active) continue;
      if (d.principalRemaining <= 0) continue;
      const date = ymdAt(year, month, DEBT_DUE_DAY);
      if (date < from || date > to) continue;
      events.push({
        date,
        amount: -d.monthlyPayment,
        source: "debt-payment",
        label: d.name,
        refId: d.id,
      });
    }
    for (const p of db.periodicItems) {
      if (!p.active) continue;
      if (p.month !== month) continue;
      const date = ymdAt(year, p.month, 1);
      if (date < from || date > to) continue;
      events.push({
        date,
        amount: p.type === "income" ? p.amount : -p.amount,
        source: p.type === "income" ? "periodic-income" : "periodic-expense",
        label: p.name,
        refId: p.id,
      });
    }
  }

  events.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return events;
};

export type AffordVerdict = "yes" | "tight" | "no";

export type AffordReport = {
  amount_needed: number;
  by_date: string;
  net_cashflow: number;
  min_running_balance: number;
  min_running_date: string | null;
  verdict: AffordVerdict;
  shortfall: number;
  events: CashflowEvent[];
};

export const afford = (
  db: Database,
  amount: number,
  from: string,
  to: string,
): AffordReport => {
  const events = projectCashflow(db, from, to);
  let running = 0;
  let min = 0;
  let minDate: string | null = null;
  for (const e of events) {
    running += e.amount;
    if (running < min) {
      min = running;
      minDate = e.date;
    }
  }
  const verdict: AffordVerdict =
    running < amount ? "no" : min < 0 ? "tight" : "yes";
  const shortfall = Math.max(0, amount - running);
  return {
    amount_needed: amount,
    by_date: to,
    net_cashflow: running,
    min_running_balance: min,
    min_running_date: minDate,
    verdict,
    shortfall,
    events,
  };
};
