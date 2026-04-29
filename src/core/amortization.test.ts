import { describe, expect, test } from "bun:test";

import {
  loanAmortization,
  nextPaymentSplit,
  simulatePayoff,
} from "./amortization.ts";
import type { Database, Debt } from "./types.ts";

const debt = (over: Partial<Debt>): Debt => ({
  id: over.id ?? "debt-x",
  name: over.name ?? "Test",
  principalRemaining: over.principalRemaining ?? 100000,
  annualRate: over.annualRate ?? 12,
  monthlyPayment: over.monthlyPayment ?? 5000,
  startDate: over.startDate ?? null,
  endDate: over.endDate ?? null,
  categoryId: over.categoryId ?? "cat-debt",
  active: over.active ?? true,
  note: over.note ?? "",
});

describe("nextPaymentSplit", () => {
  test("12% APR on 100k → 1000 interest / 4000 principal of 5000 payment", () => {
    const d = debt({});
    const split = nextPaymentSplit(d);
    expect(split.interest).toBe(1000);
    expect(split.principal).toBe(4000);
  });

  test("0% loan → all principal", () => {
    const d = debt({ annualRate: 0 });
    const split = nextPaymentSplit(d);
    expect(split.interest).toBe(0);
    expect(split.principal).toBe(5000);
  });

  test("paid-off loan → zeros", () => {
    const split = nextPaymentSplit(debt({ principalRemaining: 0 }));
    expect(split).toEqual({ interest: 0, principal: 0 });
  });
});

describe("loanAmortization", () => {
  test("12% APR on 100k @ 5000/mo finishes in 23 months", () => {
    const a = loanAmortization(debt({}));
    expect(a.monthsRemaining).toBe(23);
    expect(a.totalInterestRemaining).toBeGreaterThan(0);
    expect(a.totalInterestRemaining).toBeLessThan(20000);
  });

  test("payment ≤ interest → null months and zero remaining interest", () => {
    const a = loanAmortization(debt({ monthlyPayment: 1000 }));
    expect(a.monthsRemaining).toBeNull();
    expect(a.totalInterestRemaining).toBe(0);
  });
});

const baseDb = (): Database => ({
  _meta: { version: "1", currency: "USD", description: "" },
  settings: {
    currency: "USD",
    currencySymbol: "$",
    monthlySavingsTarget: 0,
    freelanceMonthlyTarget: 0,
    livingExpenseTarget: 0,
    currentReserve: 0,
    may2026InsuranceTarget: 0,
    may2026Deadline: "2026-05-11",
    weekStartsOn: 1,
  },
  categories: [],
  recurringIncome: [],
  recurringExpense: [],
  debts: [],
  periodicItems: [],
  transactions: [],
});

describe("simulatePayoff", () => {
  test("avalanche prioritises highest-rate loan", () => {
    const db = baseDb();
    db.debts.push(
      debt({ id: "d1", name: "high", principalRemaining: 50000, annualRate: 24, monthlyPayment: 2000 }),
      debt({ id: "d2", name: "low", principalRemaining: 50000, annualRate: 6, monthlyPayment: 2000 }),
    );
    const { baseline, strategy_run } = simulatePayoff(db, "avalanche", 1000);
    expect(strategy_run.months_to_clear_all).toBeLessThan(baseline.months_to_clear_all);
    expect(strategy_run.total_interest).toBeLessThan(baseline.total_interest);
  });

  test("snowball clears smallest balance first", () => {
    const db = baseDb();
    db.debts.push(
      debt({ id: "small", name: "small", principalRemaining: 5000, annualRate: 10, monthlyPayment: 500 }),
      debt({ id: "big", name: "big", principalRemaining: 50000, annualRate: 10, monthlyPayment: 1000 }),
    );
    const { strategy_run } = simulatePayoff(db, "snowball", 500);
    const small = strategy_run.per_loan.find((x) => x.debtId === "small");
    const big = strategy_run.per_loan.find((x) => x.debtId === "big");
    expect(small).toBeDefined();
    expect(big).toBeDefined();
    expect(small!.months).toBeLessThan(big!.months);
  });
});
