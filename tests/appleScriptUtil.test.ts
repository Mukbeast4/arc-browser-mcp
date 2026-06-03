import { test, expect, describe } from "bun:test";
import { escapeForAppleScript, mapError } from "../src/engines/live/appleScriptUtil.ts";

describe("escapeForAppleScript", () => {
  test("escapes backslashes", () => {
    expect(escapeForAppleScript("a\\b")).toBe("a\\\\b");
  });
  test("escapes double quotes", () => {
    expect(escapeForAppleScript('say "hi"')).toBe('say \\"hi\\"');
  });
  test("strips carriage returns", () => {
    expect(escapeForAppleScript("a\rb")).toBe("ab");
  });
  test("converts newlines to literal backslash-n", () => {
    expect(escapeForAppleScript("a\nb")).toBe("a\\nb");
  });
  test("escapes a backslash before converting an adjacent newline", () => {
    expect(escapeForAppleScript("a\\\nb")).toBe("a\\\\\\nb");
  });
  test("empty string stays empty", () => {
    expect(escapeForAppleScript("")).toBe("");
  });
});

describe("mapError", () => {
  test("maps permission errors", () => {
    expect(mapError("error -1743: not allowed")).toContain("Automation permission denied");
  });
  test("maps addressing errors", () => {
    expect(mapError("can't get window 1")).toContain("Could not address");
  });
  test("maps missing value to an addressing error", () => {
    expect(mapError("missing value")).toContain("Could not address");
  });
  test("passes through unknown errors", () => {
    expect(mapError("boom")).toBe("boom");
  });
  test("undefined yields a generic message", () => {
    expect(mapError(undefined)).toBe("AppleScript error");
  });
});
