import { describe, expect, test } from "bun:test";

import { parseArgv } from "./argv.ts";

describe("parseArgv", () => {
  test("empty argv yields empty command", () => {
    expect(parseArgv([])).toEqual({
      command: "",
      positional: [],
      flags: {},
    });
  });

  test("first arg becomes command", () => {
    expect(parseArgv(["status"]).command).toBe("status");
    expect(parseArgv(["add", "58", "food"]).command).toBe("add");
  });

  test("collects positional args after the command", () => {
    expect(parseArgv(["add", "58", "food", "Lunch"]).positional).toEqual([
      "58",
      "food",
      "Lunch",
    ]);
  });

  test("--key=value form", () => {
    const r = parseArgv(["list", "--month=2025-12"]);
    expect(r.flags["month"]).toBe("2025-12");
    expect(r.positional).toEqual([]);
  });

  test("--key value form consumes the next arg", () => {
    const r = parseArgv(["list", "--month", "2025-12"]);
    expect(r.flags["month"]).toBe("2025-12");
    expect(r.positional).toEqual([]);
  });

  test("--key followed by another flag is boolean", () => {
    const r = parseArgv(["list", "--month", "--type", "income"]);
    expect(r.flags["month"]).toBe(true);
    expect(r.flags["type"]).toBe("income");
  });

  test("trailing --key with no following arg is boolean", () => {
    const r = parseArgv(["balance", "--raw"]);
    expect(r.flags["raw"]).toBe(true);
  });

  test("short -n flag with value", () => {
    const r = parseArgv(["list", "-n", "20"]);
    expect(r.flags["n"]).toBe("20");
  });

  test("booleanFlags option forces flag to be boolean", () => {
    const r = parseArgv(["add", "1000", "freelance", "--income", "Project", "A"], {
      booleanFlags: ["income"],
    });
    expect(r.flags["income"]).toBe(true);
    expect(r.positional).toEqual(["1000", "freelance", "Project", "A"]);
  });

  test("booleanFlags option does not affect other flags that take values", () => {
    const r = parseArgv(
      ["add", "58", "food", "--date", "2025-12-07", "--income"],
      { booleanFlags: ["income", "expense"] },
    );
    expect(r.flags["date"]).toBe("2025-12-07");
    expect(r.flags["income"]).toBe(true);
  });

  test("does not treat negative numbers as flags", () => {
    const r = parseArgv(["balance", "--offset", "-5"]);
    expect(r.flags["offset"]).toBe("-5");
  });

  test("mixed positional and flags in any order", () => {
    const r = parseArgv(
      ["add", "58", "--date", "2025-12-07", "food", "Lunch"],
      { booleanFlags: ["income"] },
    );
    expect(r.positional).toEqual(["58", "food", "Lunch"]);
    expect(r.flags["date"]).toBe("2025-12-07");
  });
});
