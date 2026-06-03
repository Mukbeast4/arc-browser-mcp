import { test, expect, describe } from "bun:test";
import { assertRef, isValidRef } from "../src/engines/ref.ts";

describe("isValidRef", () => {
  test("accepts non-negative integer strings", () => {
    expect(isValidRef("0")).toBe(true);
    expect(isValidRef("42")).toBe(true);
  });
  test("rejects non-numeric or signed values", () => {
    for (const bad of ["", "1a", "-1", "1.0", " 1", "a"]) {
      expect(isValidRef(bad)).toBe(false);
    }
  });
});

describe("assertRef", () => {
  test("passes for a valid ref", () => {
    expect(() => assertRef("7")).not.toThrow();
  });
  test("throws for an invalid ref", () => {
    expect(() => assertRef("x")).toThrow("invalid ref");
  });
});
