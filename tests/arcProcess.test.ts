import { test, expect, describe } from "bun:test";
import { parsePsOutput } from "../src/lib/arcProcess.ts";

describe("parsePsOutput", () => {
  test("parses pid and command", () => {
    const out = parsePsOutput("  123 /Applications/Arc.app/Contents/MacOS/Arc\n");
    expect(out).toEqual([
      { pid: 123, dedicated: false, command: "/Applications/Arc.app/Contents/MacOS/Arc" },
    ]);
  });
  test("flags dedicated processes by remote-debugging-port", () => {
    const out = parsePsOutput("456 /path/Arc --remote-debugging-port=9222 --user-data-dir=/x");
    expect(out[0].dedicated).toBe(true);
  });
  test("flags dedicated processes by the arc-mcp profile", () => {
    const out = parsePsOutput("789 /path/Arc --user-data-dir=/Users/x/arc-mcp/profile");
    expect(out[0].dedicated).toBe(true);
  });
  test("skips blank and malformed lines", () => {
    const out = parsePsOutput("\n   \nnotanumber /path/Arc\n42 /path/Arc\n");
    expect(out).toEqual([{ pid: 42, dedicated: false, command: "/path/Arc" }]);
  });
  test("empty input yields an empty array", () => {
    expect(parsePsOutput("")).toEqual([]);
  });
});
