import { test, expect, describe } from "bun:test";
import { parsePageResult } from "../src/engines/live/pageResult.ts";

describe("parsePageResult", () => {
  test("returns the value of a successful result", () => {
    expect(parsePageResult<number>(JSON.stringify({ ok: true, value: 42 }))).toBe(42);
  });
  test("handles a double-encoded JSON string", () => {
    const inner = JSON.stringify({ ok: true, value: "hi" });
    expect(parsePageResult<string>(JSON.stringify(inner))).toBe("hi");
  });
  test("throws the page error on ok:false", () => {
    expect(() => parsePageResult(JSON.stringify({ ok: false, error: "stale_ref 3" }))).toThrow(
      "stale_ref 3",
    );
  });
  test("throws a generic message when ok is missing", () => {
    expect(() => parsePageResult(JSON.stringify({ value: 1 }))).toThrow("page evaluation failed");
  });
  test("throws on empty output", () => {
    expect(() => parsePageResult("")).toThrow("empty result");
  });
  test("throws on non-JSON output", () => {
    expect(() => parsePageResult("not json")).toThrow("could not parse page result");
  });
});
