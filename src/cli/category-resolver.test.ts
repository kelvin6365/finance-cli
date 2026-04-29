import { describe, expect, test } from "bun:test";

import seedJson from "../../data/seed.json" with { type: "json" };
import type { Database } from "../core/types.ts";
import { resolveCategory } from "./category-resolver.ts";

const cats = (seedJson as Database).categories;

const okId = (input: string, expected: string): void => {
  const r = resolveCategory(cats, input);
  expect(r.kind).toBe("ok");
  if (r.kind === "ok") expect(r.category.id).toBe(expected);
};

describe("resolveCategory", () => {
  test("matches by full id", () => {
    okId("cat-food", "cat-food");
    okId("cat-freelance", "cat-freelance");
  });

  test("matches by id case-insensitively", () => {
    okId("CAT-FOOD", "cat-food");
  });

  test("matches by shorthand (id without cat- prefix)", () => {
    okId("food", "cat-food");
    okId("freelance", "cat-freelance");
    okId("transport", "cat-transport");
  });

  test("matches by exact name", () => {
    okId("Food", "cat-food");
    okId("Transport", "cat-transport");
    okId("Freelance", "cat-freelance");
  });

  test("fuzzy substring match when unique", () => {
    okId("free", "cat-freelance");
    okId("util", "cat-utility");
  });

  test("returns ambiguous when multiple categories match", () => {
    const r = resolveCategory(cats, "ing");
    expect(r.kind).toBe("ambiguous");
    if (r.kind === "ambiguous") {
      expect(r.matches.map((c) => c.id).sort()).toEqual([
        "cat-living",
        "cat-shopping",
      ]);
    }
  });

  test("returns unknown for empty input", () => {
    expect(resolveCategory(cats, "").kind).toBe("unknown");
    expect(resolveCategory(cats, "   ").kind).toBe("unknown");
  });

  test("returns unknown for non-matching input", () => {
    expect(resolveCategory(cats, "xyz-nope").kind).toBe("unknown");
  });

  test("type filter restricts the search pool", () => {
    const r = resolveCategory(cats, "other", "income");
    expect(r.kind).toBe("ok");
    if (r.kind === "ok") expect(r.category.id).toBe("cat-other-in");

    const r2 = resolveCategory(cats, "other", "expense");
    expect(r2.kind).toBe("ok");
    if (r2.kind === "ok") expect(r2.category.id).toBe("cat-other-out");
  });

  test("type filter excludes mismatched categories from id match", () => {
    const r = resolveCategory(cats, "cat-food", "income");
    expect(r.kind).toBe("unknown");
  });
});
