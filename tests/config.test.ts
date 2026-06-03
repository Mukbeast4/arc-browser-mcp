import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { loadConfig } from "../src/config.ts";

const KEYS = [
  "ARC_MCP_DEFAULT_ENGINE",
  "ARC_MCP_BIN",
  "ARC_MCP_PROFILE_DIR",
  "ARC_MCP_CDP_PORT",
  "ARC_MCP_CDP_MODE",
];

let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = {};
  for (const k of KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("loadConfig defaults", () => {
  test("uses the live engine and dedicated mode", () => {
    const c = loadConfig();
    expect(c.defaultEngine).toBe("live");
    expect(c.cdpMode).toBe("dedicated");
    expect(c.cdpPort).toBe(0);
    expect(c.arcBin).toContain("Arc.app");
  });
});

describe("loadConfig overrides", () => {
  test("honors env overrides", () => {
    process.env.ARC_MCP_DEFAULT_ENGINE = "cdp";
    process.env.ARC_MCP_CDP_MODE = "attach";
    process.env.ARC_MCP_CDP_PORT = "9222";
    process.env.ARC_MCP_BIN = "/custom/Arc";
    const c = loadConfig();
    expect(c.defaultEngine).toBe("cdp");
    expect(c.cdpMode).toBe("attach");
    expect(c.cdpPort).toBe(9222);
    expect(c.arcBin).toBe("/custom/Arc");
  });
  test("non-numeric port falls back to 0", () => {
    process.env.ARC_MCP_CDP_PORT = "abc";
    expect(loadConfig().cdpPort).toBe(0);
  });
  test("unknown engine value falls back to live", () => {
    process.env.ARC_MCP_DEFAULT_ENGINE = "weird";
    expect(loadConfig().defaultEngine).toBe("live");
  });
});
