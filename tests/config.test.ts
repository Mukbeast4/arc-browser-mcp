import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { loadConfig } from "../src/config.ts";

const KEYS = [
  "ARC_MCP_DEFAULT_ENGINE",
  "ARC_MCP_BIN",
  "ARC_MCP_PROFILE_DIR",
  "ARC_MCP_CDP_PORT",
  "ARC_MCP_CDP_MODE",
  "ARC_MCP_CDP_TIMEOUT_MS",
  "ARC_MCP_ALLOW_ATTACH_CAPTURE",
  "ARC_MCP_READ_ONLY",
  "ARC_MCP_ALLOW_ORIGINS",
  "ARC_MCP_DENY_ORIGINS",
  "ARC_MCP_BLOCK_SCHEMES",
  "ARC_MCP_AUDIT_LOG",
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
    expect(c.cdpTimeoutMs).toBe(30000);
    expect(c.allowAttachCapture).toBe(false);
  });
  test("leaves the safety policy inert and auditing off", () => {
    const c = loadConfig();
    expect(c.auditPath).toBe("");
    expect(c.policy.enabled).toBe(false);
    expect(c.policy.readOnly).toBe(false);
    expect(c.policy.allowOrigins).toEqual([]);
    expect(c.policy.denyOrigins).toEqual([]);
    expect(c.policy.blockSchemes).toEqual([]);
  });
});

describe("loadConfig safety policy", () => {
  test("read-only flips the policy on", () => {
    process.env.ARC_MCP_READ_ONLY = "1";
    const c = loadConfig();
    expect(c.policy.readOnly).toBe(true);
    expect(c.policy.enabled).toBe(true);
  });
  test("origins and schemes are trimmed, lowercased, and de-coloned", () => {
    process.env.ARC_MCP_ALLOW_ORIGINS = "https://Example.com, https://news.YC.com ";
    process.env.ARC_MCP_DENY_ORIGINS = "https://evil.com";
    process.env.ARC_MCP_BLOCK_SCHEMES = "JavaScript, FILE:, ,data";
    const c = loadConfig();
    expect(c.policy.allowOrigins).toEqual(["https://example.com", "https://news.yc.com"]);
    expect(c.policy.denyOrigins).toEqual(["https://evil.com"]);
    expect(c.policy.blockSchemes).toEqual(["javascript", "file", "data"]);
    expect(c.policy.enabled).toBe(true);
  });
  test("audit path is independent of the policy", () => {
    process.env.ARC_MCP_AUDIT_LOG = "/tmp/arc-audit.jsonl";
    const c = loadConfig();
    expect(c.auditPath).toBe("/tmp/arc-audit.jsonl");
    expect(c.policy.enabled).toBe(false);
  });
  test("origin entries are normalized to scheme://host[:port]; malformed entries are kept (fail closed)", () => {
    process.env.ARC_MCP_ALLOW_ORIGINS = "https://example.com/some/path, https://shop.com:8443/, example.com";
    const c = loadConfig();
    expect(c.policy.allowOrigins).toEqual(["https://example.com", "https://shop.com:8443", "example.com"]);
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
  test("reads cdp timeout and attach-capture opt-in", () => {
    process.env.ARC_MCP_CDP_TIMEOUT_MS = "5000";
    process.env.ARC_MCP_ALLOW_ATTACH_CAPTURE = "1";
    const c = loadConfig();
    expect(c.cdpTimeoutMs).toBe(5000);
    expect(c.allowAttachCapture).toBe(true);
  });
  test("non-numeric cdp timeout falls back to 30000", () => {
    process.env.ARC_MCP_CDP_TIMEOUT_MS = "nope";
    expect(loadConfig().cdpTimeoutMs).toBe(30000);
  });
  test("unknown engine value falls back to live", () => {
    process.env.ARC_MCP_DEFAULT_ENGINE = "weird";
    expect(loadConfig().defaultEngine).toBe("live");
  });
});
