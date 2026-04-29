import { describe, expect, test } from "bun:test";

import {
  currentMonth,
  daysBetween,
  daysInMonth,
  today,
  ymOf,
} from "./date.ts";

describe("today", () => {
  test("formats as YYYY-MM-DD with zero-padded month and day", () => {
    expect(today(new Date(2025, 0, 5))).toBe("2025-01-05");
    expect(today(new Date(2025, 11, 31))).toBe("2025-12-31");
  });

  test("uses local-time fields, not UTC", () => {
    const d = new Date(2025, 5, 15, 23, 59, 59);
    expect(today(d)).toBe("2025-06-15");
  });
});

describe("currentMonth", () => {
  test("returns YYYY-MM", () => {
    expect(currentMonth(new Date(2025, 0, 5))).toBe("2025-01");
    expect(currentMonth(new Date(2026, 4, 1))).toBe("2026-05");
  });
});

describe("daysBetween", () => {
  test("zero for same date", () => {
    expect(daysBetween("2025-12-08", "2025-12-08")).toBe(0);
  });

  test("positive when b is later", () => {
    expect(daysBetween("2025-12-08", "2025-12-15")).toBe(7);
  });

  test("negative when b is earlier", () => {
    expect(daysBetween("2025-12-15", "2025-12-08")).toBe(-7);
  });

  test("crosses month boundary", () => {
    expect(daysBetween("2025-11-30", "2025-12-01")).toBe(1);
  });

  test("crosses year boundary", () => {
    expect(daysBetween("2025-12-31", "2026-01-01")).toBe(1);
  });

  test("crosses leap-day correctly", () => {
    expect(daysBetween("2024-02-28", "2024-03-01")).toBe(2);
    expect(daysBetween("2025-02-28", "2025-03-01")).toBe(1);
  });

  test("not affected by DST (UTC math)", () => {
    expect(daysBetween("2025-03-08", "2025-03-10")).toBe(2);
    expect(daysBetween("2025-11-01", "2025-11-03")).toBe(2);
  });
});

describe("daysInMonth", () => {
  test("31-day months", () => {
    expect(daysInMonth("2025-01")).toBe(31);
    expect(daysInMonth("2025-12")).toBe(31);
  });

  test("30-day months", () => {
    expect(daysInMonth("2025-04")).toBe(30);
    expect(daysInMonth("2025-11")).toBe(30);
  });

  test("February in non-leap year", () => {
    expect(daysInMonth("2025-02")).toBe(28);
    expect(daysInMonth("2026-02")).toBe(28);
  });

  test("February in leap year", () => {
    expect(daysInMonth("2024-02")).toBe(29);
    expect(daysInMonth("2000-02")).toBe(29);
  });

  test("February in century non-leap year", () => {
    expect(daysInMonth("1900-02")).toBe(28);
  });
});

describe("ymOf", () => {
  test("strips day from YYYY-MM-DD", () => {
    expect(ymOf("2025-12-08")).toBe("2025-12");
    expect(ymOf("2026-05-01")).toBe("2026-05");
  });
});
