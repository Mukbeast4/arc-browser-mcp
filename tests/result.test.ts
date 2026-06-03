import { test, expect, describe } from "bun:test";
import { ok, fail, imageResult, formatSnapshot } from "../src/tools/result.ts";

describe("ok and fail", () => {
  test("ok is not an error", () => {
    const r = ok("hello");
    expect(r.isError).toBe(false);
    expect(r.content).toEqual([{ type: "text", text: "hello" }]);
  });
  test("fail is an error", () => {
    expect(fail("bad").isError).toBe(true);
  });
});

describe("imageResult", () => {
  test("includes a caption then the image", () => {
    const r = imageResult("BASE64", "image/png", "cap");
    expect(r.isError).toBe(false);
    expect(r.content[0]).toEqual({ type: "text", text: "cap" });
    expect(r.content[1]).toEqual({ type: "image", data: "BASE64", mimeType: "image/png" });
  });
});

describe("formatSnapshot", () => {
  test("renders the header and the tree", () => {
    const s = formatSnapshot({ url: "https://x.test", title: "X", tree: "[0] button", refCount: 1 });
    expect(s).toContain("url: https://x.test");
    expect(s).toContain("title: X");
    expect(s).toContain("refs: 1");
    expect(s).toContain("[0] button");
  });
  test("an empty tree shows the placeholder", () => {
    const s = formatSnapshot({ url: "u", title: "t", tree: "", refCount: 0 });
    expect(s).toContain("(no interactive elements found)");
  });
});
