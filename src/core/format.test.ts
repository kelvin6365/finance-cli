import { describe, expect, test } from "bun:test";

import { bar, money, padRight, percent, truncate } from "./format.ts";

describe("money", () => {
  test("groups thousands with comma", () => {
    expect(money(1234)).toBe("$1,234");
    expect(money(1234567)).toBe("$1,234,567");
  });

  test("zero", () => {
    expect(money(0)).toBe("$0");
  });

  test("under thousand has no comma", () => {
    expect(money(58)).toBe("$58");
    expect(money(999)).toBe("$999");
  });

  test("negative gets minus sign", () => {
    expect(money(-58)).toBe("-$58");
    expect(money(-1234)).toBe("-$1,234");
  });

  test("signed: true prefixes positives with +", () => {
    expect(money(1234, { signed: true })).toBe("+$1,234");
    expect(money(0, { signed: true })).toBe("$0");
  });

  test("signed: true keeps negatives with - (no double sign)", () => {
    expect(money(-58, { signed: true })).toBe("-$58");
  });
});

describe("percent", () => {
  test("rounds to whole percent", () => {
    expect(percent(0.234)).toBe("23%");
    expect(percent(0.5)).toBe("50%");
    expect(percent(0)).toBe("0%");
    expect(percent(1)).toBe("100%");
  });

  test("rounds half up", () => {
    expect(percent(0.235)).toBe("24%");
  });
});

describe("bar", () => {
  test("returns string of exactly width chars", () => {
    expect(bar(2, 10, 10).length).toBe(10);
    expect(bar(0, 10, 10).length).toBe(10);
    expect(bar(10, 10, 10).length).toBe(10);
  });

  test("empty when width is 0 or negative", () => {
    expect(bar(5, 10, 0)).toBe("");
    expect(bar(5, 10, -3)).toBe("");
  });

  test("all empty cells when value is 0", () => {
    expect(bar(0, 10, 5)).toBe("░░░░░");
  });

  test("all filled cells when value >= max", () => {
    expect(bar(10, 10, 5)).toBe("▓▓▓▓▓");
    expect(bar(20, 10, 5)).toBe("▓▓▓▓▓");
  });

  test("clamps negative ratio to zero", () => {
    expect(bar(-5, 10, 5)).toBe("░░░░░");
  });

  test("zero max gives empty bar (no division by zero)", () => {
    expect(bar(5, 0, 5)).toBe("░░░░░");
  });
});

describe("padRight", () => {
  test("pads short strings with spaces", () => {
    expect(padRight("ab", 5)).toBe("ab   ");
  });

  test("returns original when already long enough", () => {
    expect(padRight("abcde", 5)).toBe("abcde");
    expect(padRight("abcdef", 5)).toBe("abcdef");
  });
});

describe("truncate", () => {
  test("returns original when fits", () => {
    expect(truncate("abc", 5)).toBe("abc");
    expect(truncate("abcde", 5)).toBe("abcde");
  });

  test("truncates with ellipsis when too long", () => {
    expect(truncate("abcdef", 5)).toBe("abcd…");
  });

  test("zero or negative width returns empty", () => {
    expect(truncate("abc", 0)).toBe("");
    expect(truncate("abc", -1)).toBe("");
  });
});
