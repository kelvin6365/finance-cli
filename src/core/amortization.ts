import type { Database, Debt } from "./types.ts";

export type PaymentSplit = {
  interest: number;
  principal: number;
};

export type LoanAmortization = {
  debtId: string;
  monthsRemaining: number | null;
  totalInterestRemaining: number;
  nextPayment: PaymentSplit;
};

const monthlyRate = (debt: Debt): number => debt.annualRate / 100 / 12;

const monthsToPayoff = (debt: Debt): number | null => {
  const P = debt.principalRemaining;
  const M = debt.monthlyPayment;
  if (P <= 0 || M <= 0) return null;
  const r = monthlyRate(debt);
  if (r === 0) return Math.ceil(P / M);
  if (M <= P * r) return null;
  return Math.ceil(-Math.log(1 - (P * r) / M) / Math.log(1 + r));
};

export const nextPaymentSplit = (debt: Debt): PaymentSplit => {
  const P = debt.principalRemaining;
  if (P <= 0) return { interest: 0, principal: 0 };
  const r = monthlyRate(debt);
  const interest = Math.round(P * r);
  const principal = Math.max(0, debt.monthlyPayment - interest);
  return { interest, principal };
};

export const loanAmortization = (debt: Debt): LoanAmortization => {
  const months = monthsToPayoff(debt);
  if (months === null) {
    return {
      debtId: debt.id,
      monthsRemaining: null,
      totalInterestRemaining: 0,
      nextPayment: nextPaymentSplit(debt),
    };
  }
  // Simulate month-by-month to total interest precisely (handles rounding effects).
  let balance = debt.principalRemaining;
  const r = monthlyRate(debt);
  let totalInterest = 0;
  for (let i = 0; i < months; i += 1) {
    const interest = balance * r;
    const principal = Math.min(balance, Math.max(0, debt.monthlyPayment - interest));
    totalInterest += interest;
    balance = Math.max(0, balance - principal);
    if (balance <= 0) break;
  }
  return {
    debtId: debt.id,
    monthsRemaining: months,
    totalInterestRemaining: Math.round(totalInterest),
    nextPayment: nextPaymentSplit(debt),
  };
};

export type Strategy = "avalanche" | "snowball";

export type SimulationResult = {
  strategy: Strategy | "baseline";
  extra_per_month: number;
  months_to_clear_all: number;
  total_interest: number;
  per_loan: {
    debtId: string;
    name: string;
    months: number;
    interest_paid: number;
  }[];
};

const cloneDebts = (debts: Debt[]): Debt[] => debts.map((d) => ({ ...d }));

const sortBy = (debts: Debt[], strategy: Strategy): Debt[] => {
  const copy = cloneDebts(debts);
  if (strategy === "avalanche") {
    copy.sort((a, b) => b.annualRate - a.annualRate);
  } else {
    copy.sort((a, b) => a.principalRemaining - b.principalRemaining);
  }
  return copy;
};

const HARD_CAP_MONTHS = 600; // 50 years; protects against pathological inputs.

const runSimulation = (
  initial: Debt[],
  extraPerMonth: number,
  strategy: Strategy | "baseline",
): SimulationResult => {
  const debts = cloneDebts(initial.filter((d) => d.active && d.principalRemaining > 0));
  const totals = new Map<string, { interest: number; months: number; cleared: boolean }>(
    debts.map((d) => [d.id, { interest: 0, months: 0, cleared: false }]),
  );
  let month = 0;
  while (debts.some((d) => d.principalRemaining > 0)) {
    if (month >= HARD_CAP_MONTHS) break;
    month += 1;
    let extraPool = extraPerMonth;
    const ordered =
      strategy === "baseline" ? debts : sortBy(debts, strategy);
    const targetId = ordered.find((d) => d.principalRemaining > 0)?.id;

    for (const d of debts) {
      if (d.principalRemaining <= 0) continue;
      const r = monthlyRate(d);
      const interest = d.principalRemaining * r;
      const baseAvailable = Math.max(0, d.monthlyPayment - interest);
      let principalPay = Math.min(d.principalRemaining, baseAvailable);
      let interestPaid = Math.min(interest, d.monthlyPayment);
      if (strategy !== "baseline" && d.id === targetId && extraPool > 0) {
        const extraTowardPrincipal = Math.min(extraPool, d.principalRemaining - principalPay);
        principalPay += extraTowardPrincipal;
        extraPool -= extraTowardPrincipal;
      }
      d.principalRemaining = Math.max(0, d.principalRemaining - principalPay);
      const t = totals.get(d.id);
      if (t) {
        t.interest += interestPaid;
        t.months = month;
        if (d.principalRemaining <= 0) t.cleared = true;
      }
    }
  }

  const perLoan = debts.map((d) => {
    const t = totals.get(d.id) ?? { interest: 0, months: 0, cleared: false };
    const original = initial.find((x) => x.id === d.id)!;
    return {
      debtId: d.id,
      name: original.name,
      months: t.months,
      interest_paid: Math.round(t.interest),
    };
  });
  const total_interest = perLoan.reduce((s, x) => s + x.interest_paid, 0);
  return {
    strategy,
    extra_per_month: extraPerMonth,
    months_to_clear_all: month,
    total_interest,
    per_loan: perLoan,
  };
};

export const simulatePayoff = (
  db: Database,
  strategy: Strategy,
  extraPerMonth: number,
): { baseline: SimulationResult; strategy_run: SimulationResult } => {
  const baseline = runSimulation(db.debts, 0, "baseline");
  const strategy_run = runSimulation(db.debts, extraPerMonth, strategy);
  return { baseline, strategy_run };
};
