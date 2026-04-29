import { describe, expect, test } from "bun:test";

import { afford, projectCashflow } from "./projection.ts";
import type { Database } from "./types.ts";

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

describe("projectCashflow", () => {
  test("emits recurring income on dayOfMonth within window", () => {
    const db = baseDb();
    db.recurringIncome.push({
      id: "ri-salary",
      name: "Salary",
      amount: 50000,
      categoryId: "cat-salary",
      dayOfMonth: 25,
      active: true,
      note: "",
    });
    const events = projectCashflow(db, "2026-04-01", "2026-06-30");
    expect(events.map((e) => e.date)).toEqual([
      "2026-04-25",
      "2026-05-25",
      "2026-06-25",
    ]);
    expect(events[0]?.amount).toBe(50000);
  });

  test("skips recurring income with null dayOfMonth", () => {
    const db = baseDb();
    db.recurringIncome.push({
      id: "ri-freelance",
      name: "Freelance",
      amount: 10000,
      categoryId: "cat-freelance",
      dayOfMonth: null,
      active: true,
      note: "",
    });
    expect(projectCashflow(db, "2026-04-01", "2026-06-30")).toEqual([]);
  });

  test("emits debt payments on day 28 each month", () => {
    const db = baseDb();
    db.debts.push({
      id: "debt-x",
      name: "Loan",
      principalRemaining: 10000,
      annualRate: 0,
      monthlyPayment: 500,
      startDate: null,
      endDate: null,
      categoryId: "cat-debt",
      active: true,
      note: "",
    });
    const events = projectCashflow(db, "2026-04-01", "2026-05-31");
    expect(events.map((e) => e.date)).toEqual(["2026-04-28", "2026-05-28"]);
    expect(events[0]?.amount).toBe(-500);
  });

  test("returns empty when window inverted", () => {
    expect(projectCashflow(baseDb(), "2026-05-01", "2026-04-01")).toEqual([]);
  });
});

describe("afford", () => {
  const db = baseDb();
  db.recurringIncome.push({
    id: "ri", name: "Salary", amount: 50000, categoryId: "c", dayOfMonth: 25,
    active: true, note: "",
  });
  db.recurringExpense.push({
    id: "re", name: "Rent", amount: 10000, categoryId: "c", dayOfMonth: 1,
    active: true, note: "",
  });

  test("yes when net cashflow comfortably covers the amount and never dips", () => {
    // Window 4-2 to 4-30: skip Rent 4-1, just Salary 4-25 = +50000. Min stays at 0.
    const r = afford(db, 5000, "2026-04-02", "2026-04-30");
    expect(r.net_cashflow).toBe(50000);
    expect(r.min_running_balance).toBe(0);
    expect(r.verdict).toBe("yes");
    expect(r.shortfall).toBe(0);
  });

  test("tight when final positive but running balance dips below zero", () => {
    // Window 4-1 to 4-30: Rent 4-1 (-10000), Salary 4-25 (+50000). Net 40000, min -10000.
    const r = afford(db, 5000, "2026-04-01", "2026-04-30");
    expect(r.net_cashflow).toBe(40000);
    expect(r.min_running_balance).toBe(-10000);
    expect(r.min_running_date).toBe("2026-04-01");
    expect(r.verdict).toBe("tight");
  });

  test("no when net cashflow falls short of the amount", () => {
    const r = afford(db, 100000, "2026-04-02", "2026-04-30");
    expect(r.verdict).toBe("no");
    expect(r.shortfall).toBe(50000);
  });
});
