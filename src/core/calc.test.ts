import { describe, expect, test } from "bun:test";
import seedJson from "../../data/seed.json" with { type: "json" };
import type { Database, Transaction } from "./types.ts";
import {
  activeDebtCount,
  daysUntilMay2026,
  freelanceMonthActual,
  may2026Readiness,
  mayPrepHaveToday,
  mayPrepRequiredMonthlySave,
  monthBalanceActual,
  monthExpenseActual,
  monthIncomeActual,
  monthlyExpenseTotal,
  monthlyIncomeTotal,
  monthlyNetCashflow,
  monthsUntilMayPrep,
  totalDebtRemaining,
} from "./calc.ts";

const seed = seedJson as Database;

const tx = (over: Partial<Transaction>): Transaction => ({
  id: over.id ?? "tx-test",
  date: over.date ?? "2025-12-08",
  amount: over.amount ?? 0,
  type: over.type ?? "expense",
  categoryId: over.categoryId ?? "cat-other-out",
  note: over.note ?? "",
  createdAt: over.createdAt ?? "2025-12-08T00:00:00.000Z",
  ...(over.recurringId !== undefined ? { recurringId: over.recurringId } : {}),
});

const withTransactions = (txs: Transaction[]): Database => ({
  ...seed,
  transactions: txs,
});

describe("monthlyIncomeTotal", () => {
  test("matches the seed's salary entry", () => {
    expect(monthlyIncomeTotal(seed)).toBe(38000);
  });

  test("ignores inactive recurring income", () => {
    const db: Database = {
      ...seed,
      recurringIncome: seed.recurringIncome.map((r) => ({ ...r, active: false })),
    };
    expect(monthlyIncomeTotal(db)).toBe(0);
  });
});

describe("monthlyExpenseTotal", () => {
  test("matches the seed (recurring + debts)", () => {
    // rent 13000 + utilities 1200 + 3 loans (4200 + 1400 + 1200) = 21000
    expect(monthlyExpenseTotal(seed)).toBe(21000);
  });

  test("ignores inactive recurring expenses and inactive debts", () => {
    const db: Database = {
      ...seed,
      recurringExpense: seed.recurringExpense.map((r) => ({ ...r, active: false })),
      debts: seed.debts.map((d) => ({ ...d, active: false })),
    };
    expect(monthlyExpenseTotal(db)).toBe(0);
  });
});

describe("monthlyNetCashflow", () => {
  test("matches the seed", () => {
    expect(monthlyNetCashflow(seed)).toBe(17000);
  });

  test("equals income minus expense", () => {
    expect(monthlyNetCashflow(seed)).toBe(
      monthlyIncomeTotal(seed) - monthlyExpenseTotal(seed),
    );
  });
});

describe("totalDebtRemaining", () => {
  test("matches the seed (sum of active debt principals)", () => {
    // 150000 + 32000 + 50000
    expect(totalDebtRemaining(seed)).toBe(232000);
  });

  test("ignores inactive debts", () => {
    const db: Database = {
      ...seed,
      debts: seed.debts.map((d, i) => (i === 0 ? { ...d, active: false } : d)),
    };
    // first debt is the consolidation loan (150000)
    expect(totalDebtRemaining(db)).toBe(232000 - 150000);
  });
});

describe("daysUntilMay2026", () => {
  test("zero on the deadline date", () => {
    expect(daysUntilMay2026(seed, "2027-05-15")).toBe(0);
  });

  test("positive before the deadline", () => {
    expect(daysUntilMay2026(seed, "2027-04-15")).toBe(30);
  });

  test("negative after the deadline", () => {
    expect(daysUntilMay2026(seed, "2027-05-22")).toBe(-7);
  });

  test("crosses year boundaries correctly", () => {
    expect(daysUntilMay2026(seed, "2025-12-08")).toBe(523);
  });
});

describe("may2026Readiness", () => {
  test("returns currentReserve / target when no insurance transactions logged", () => {
    const r = may2026Readiness(seed, "2025-12-08");
    expect(r).toBeCloseTo(
      seed.settings.currentReserve / seed.settings.may2026InsuranceTarget,
      5,
    );
  });

  test("counts cat-insurance expenses on or before today as accumulated savings", () => {
    const db = withTransactions([
      tx({
        id: "tx-1",
        date: "2025-11-01",
        amount: 2000,
        type: "expense",
        categoryId: "cat-insurance",
      }),
    ]);
    const r = may2026Readiness(db, "2025-12-08");
    expect(r).toBeCloseTo(
      (seed.settings.currentReserve + 2000) / seed.settings.may2026InsuranceTarget,
      5,
    );
  });

  test("ignores cat-insurance expenses dated after today", () => {
    const db = withTransactions([
      tx({
        id: "tx-future",
        date: "2026-01-15",
        amount: 50000,
        type: "expense",
        categoryId: "cat-insurance",
      }),
    ]);
    expect(may2026Readiness(db, "2025-12-08")).toBeCloseTo(
      seed.settings.currentReserve / seed.settings.may2026InsuranceTarget,
      5,
    );
  });

  test("caps at 1 when reserve exceeds target", () => {
    const db: Database = {
      ...seed,
      settings: { ...seed.settings, currentReserve: 200000 },
    };
    expect(may2026Readiness(db, "2025-12-08")).toBe(1);
  });

  test("never returns negative", () => {
    const db: Database = {
      ...seed,
      settings: { ...seed.settings, currentReserve: 0 },
    };
    expect(may2026Readiness(db, "2025-12-08")).toBeGreaterThanOrEqual(0);
  });
});

describe("monthIncomeActual", () => {
  test("returns 0 when no transactions in month", () => {
    expect(monthIncomeActual(seed, "2025-12")).toBe(0);
  });

  test("sums income transactions in the target month", () => {
    const db = withTransactions([
      tx({ id: "a", date: "2025-12-05", amount: 5000, type: "income", categoryId: "cat-freelance" }),
      tx({ id: "b", date: "2025-12-20", amount: 47500, type: "income", categoryId: "cat-salary" }),
      tx({ id: "c", date: "2025-12-15", amount: 100, type: "expense", categoryId: "cat-food" }),
      tx({ id: "d", date: "2025-11-30", amount: 9999, type: "income", categoryId: "cat-salary" }),
    ]);
    expect(monthIncomeActual(db, "2025-12")).toBe(52500);
  });
});

describe("monthExpenseActual", () => {
  test("returns 0 when no transactions in month", () => {
    expect(monthExpenseActual(seed, "2025-12")).toBe(0);
  });

  test("sums expense transactions in the target month only", () => {
    const db = withTransactions([
      tx({ id: "a", date: "2025-12-05", amount: 58, type: "expense", categoryId: "cat-food" }),
      tx({ id: "b", date: "2025-12-20", amount: 200, type: "expense", categoryId: "cat-transport" }),
      tx({ id: "c", date: "2025-12-15", amount: 1000, type: "income", categoryId: "cat-freelance" }),
      tx({ id: "d", date: "2026-01-01", amount: 8000, type: "expense", categoryId: "cat-living" }),
    ]);
    expect(monthExpenseActual(db, "2025-12")).toBe(258);
  });
});

describe("monthBalanceActual", () => {
  test("equals monthIncomeActual minus monthExpenseActual", () => {
    const db = withTransactions([
      tx({ id: "a", date: "2025-12-05", amount: 5000, type: "income", categoryId: "cat-freelance" }),
      tx({ id: "b", date: "2025-12-20", amount: 1234, type: "expense", categoryId: "cat-food" }),
    ]);
    expect(monthBalanceActual(db, "2025-12")).toBe(5000 - 1234);
    expect(monthBalanceActual(db, "2025-12")).toBe(
      monthIncomeActual(db, "2025-12") - monthExpenseActual(db, "2025-12"),
    );
  });

  test("returns 0 when month has no activity", () => {
    expect(monthBalanceActual(seed, "2025-12")).toBe(0);
  });
});

describe("activeDebtCount", () => {
  test("counts active debts on seed", () => {
    expect(activeDebtCount(seed)).toBe(3);
  });

  test("ignores inactive debts", () => {
    const db: Database = {
      ...seed,
      debts: seed.debts.map((d, i) => (i < 2 ? { ...d, active: false } : d)),
    };
    expect(activeDebtCount(db)).toBe(1);
  });
});

describe("monthsUntilMayPrep", () => {
  test("calendar months between today's YYYY-MM and deadline's YYYY-MM", () => {
    expect(monthsUntilMayPrep(seed, "2025-12-08")).toBe(17);
  });

  test("zero in the deadline month", () => {
    expect(monthsUntilMayPrep(seed, "2027-05-01")).toBe(0);
    expect(monthsUntilMayPrep(seed, "2027-05-15")).toBe(0);
  });

  test("negative after the deadline month", () => {
    expect(monthsUntilMayPrep(seed, "2027-06-15")).toBe(-1);
  });

  test("ignores day-of-month for the boundary", () => {
    expect(monthsUntilMayPrep(seed, "2025-12-31")).toBe(17);
    expect(monthsUntilMayPrep(seed, "2026-01-01")).toBe(16);
  });
});

describe("mayPrepHaveToday", () => {
  test("equals currentReserve when no transactions logged", () => {
    expect(mayPrepHaveToday(seed, "2025-12-08")).toBe(seed.settings.currentReserve);
  });

  test("adds net cashflow since the savings start window", () => {
    const db = withTransactions([
      tx({ id: "a", date: "2025-12-05", amount: 5000, type: "income", categoryId: "cat-salary" }),
      tx({ id: "b", date: "2025-12-20", amount: 1000, type: "expense", categoryId: "cat-food" }),
    ]);
    expect(mayPrepHaveToday(db, "2025-12-31")).toBe(
      seed.settings.currentReserve + 5000 - 1000,
    );
  });

  test("ignores transactions before 2025-12-01", () => {
    const db = withTransactions([
      tx({ id: "old", date: "2025-11-15", amount: 50000, type: "income", categoryId: "cat-salary" }),
    ]);
    expect(mayPrepHaveToday(db, "2025-12-08")).toBe(seed.settings.currentReserve);
  });

  test("ignores transactions dated after today", () => {
    const db = withTransactions([
      tx({ id: "future", date: "2026-04-01", amount: 9999, type: "income", categoryId: "cat-salary" }),
    ]);
    expect(mayPrepHaveToday(db, "2025-12-31")).toBe(seed.settings.currentReserve);
  });
});

describe("mayPrepRequiredMonthlySave", () => {
  test("returns 0 once haveToday meets target", () => {
    const db: Database = {
      ...seed,
      settings: { ...seed.settings, currentReserve: 100000 },
    };
    expect(mayPrepRequiredMonthlySave(db, "2025-12-08")).toBe(0);
  });

  test("rounds up to cover any leftover", () => {
    // gap = 8400 - 5000 = 3400; months = 17; ceil(3400/17) = 200
    expect(mayPrepRequiredMonthlySave(seed, "2025-12-08")).toBe(200);
  });

  test("returns the full gap when zero or negative months remain", () => {
    const gap =
      seed.settings.may2026InsuranceTarget - seed.settings.currentReserve;
    expect(mayPrepRequiredMonthlySave(seed, "2027-05-15")).toBe(gap);
    expect(mayPrepRequiredMonthlySave(seed, "2027-06-15")).toBe(gap);
  });
});

describe("freelanceMonthActual", () => {
  test("sums signed amounts of cat-freelance transactions in month", () => {
    const db = withTransactions([
      tx({ id: "a", date: "2025-12-05", amount: 10000, type: "income", categoryId: "cat-freelance" }),
      tx({ id: "b", date: "2025-12-20", amount: 500, type: "expense", categoryId: "cat-freelance", note: "refund" }),
      tx({ id: "c", date: "2025-12-15", amount: 9999, type: "income", categoryId: "cat-salary" }),
      tx({ id: "d", date: "2025-11-15", amount: 8000, type: "income", categoryId: "cat-freelance" }),
    ]);
    expect(freelanceMonthActual(db, "2025-12")).toBe(10000 - 500);
  });

  test("returns 0 when no freelance activity in month", () => {
    expect(freelanceMonthActual(seed, "2025-12")).toBe(0);
  });
});

import { loanPayoff } from "./calc.ts";
import type { Debt } from "./types.ts";

const debt = (over: Partial<Debt>): Debt => ({
  id: over.id ?? "debt-test",
  name: over.name ?? "Test loan",
  principalRemaining: over.principalRemaining ?? 100000,
  annualRate: over.annualRate ?? 12,
  monthlyPayment: over.monthlyPayment ?? 5000,
  startDate: over.startDate ?? null,
  endDate: over.endDate ?? null,
  categoryId: over.categoryId ?? "cat-debt",
  active: over.active ?? true,
  note: over.note ?? "",
});

describe("loanPayoff", () => {
  test("uses stored endDate when present", () => {
    const d = debt({ endDate: "2028-08-31" });
    const result = loanPayoff(d, "2026-04-29");
    expect(result?.source).toBe("stored");
    expect(result?.endDate).toBe("2028-08-31");
    expect(result?.daysRemaining).toBeGreaterThan(0);
  });

  test("returns 0 days when stored endDate is in the past", () => {
    const d = debt({ endDate: "2025-01-01" });
    const result = loanPayoff(d, "2026-04-29");
    expect(result?.daysRemaining).toBe(0);
  });

  test("computes payoff via amortisation when no endDate", () => {
    const d = debt({ principalRemaining: 100000, annualRate: 12, monthlyPayment: 5000 });
    const result = loanPayoff(d, "2026-04-29");
    expect(result?.source).toBe("computed");
    // 23 months out: 2026-04 + 23 = 2028-03, last day 2028-03-31
    expect(result?.endDate).toBe("2028-03-31");
  });

  test("zero-rate loan uses simple division", () => {
    const d = debt({ principalRemaining: 100000, annualRate: 0, monthlyPayment: 5000 });
    const result = loanPayoff(d, "2026-04-29");
    // 20 months: 2026-04 + 20 = 2027-12, last day 2027-12-31
    expect(result?.endDate).toBe("2027-12-31");
  });

  test("returns null when payment cannot cover interest", () => {
    const d = debt({ principalRemaining: 100000, annualRate: 12, monthlyPayment: 1000 });
    expect(loanPayoff(d, "2026-04-29")).toBeNull();
  });
});
