import { describe, expect, test } from "bun:test";

import type { FlagValue, ParsedArgs } from "./argv.ts";
import { errJson, fail, isJson, okJson } from "./output.ts";

const args = (flags: Record<string, FlagValue> = {}): ParsedArgs => ({
  command: "test",
  positional: [],
  flags,
});

describe("okJson", () => {
  test("writes a single-line ok envelope", () => {
    let captured = "";
    okJson({ a: 1, b: "two" }, (s) => { captured = s; });
    expect(captured).toBe('{"ok":true,"data":{"a":1,"b":"two"}}\n');
  });

  test("preserves array payloads", () => {
    let captured = "";
    okJson([1, 2, 3], (s) => { captured = s; });
    expect(captured).toBe('{"ok":true,"data":[1,2,3]}\n');
  });
});

describe("errJson", () => {
  test("writes a single-line err envelope with code", () => {
    let captured = "";
    errJson("nope", "ENOENT", (s) => { captured = s; });
    expect(captured).toBe('{"ok":false,"error":"nope","code":"ENOENT"}\n');
  });
});

describe("isJson", () => {
  test("true only for boolean true on the json flag", () => {
    expect(isJson(args({ json: true }))).toBe(true);
    expect(isJson(args())).toBe(false);
    expect(isJson(args({ json: "true" }))).toBe(false);
  });
});

describe("fail", () => {
  test("returns exit code 1 in json mode", () => {
    let captured = "";
    // Inline: we know fail uses stderr writer; capture by overriding errJson path
    // is awkward, so just assert the contract: fail returns 1 and emits valid JSON
    // when args has --json. Here we route through errJson directly with a writer
    // to verify the JSON shape, and assert fail's return code separately.
    errJson("x", "EVALIDATION", (s) => { captured = s; });
    expect(captured).toBe('{"ok":false,"error":"x","code":"EVALIDATION"}\n');
    expect(fail(args({ json: true }), "x", "EVALIDATION")).toBe(1);
  });

  test("returns exit code 1 in human mode", () => {
    expect(fail(args(), "human-mode-error", "EUNKNOWN")).toBe(1);
  });
});
