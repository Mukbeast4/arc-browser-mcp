import { test, expect, describe, afterAll } from "bun:test";
import { readFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { enforce } from "../src/tools/enforce.ts";
import type { PolicyConfig } from "../src/lib/policy.ts";

type Ctx = Parameters<typeof enforce>[0];

function pol(p: Partial<PolicyConfig> = {}): PolicyConfig {
  return { enabled: true, readOnly: false, allowOrigins: [], denyOrigins: [], blockSchemes: [], ...p };
}

function ctxWith(policy: PolicyConfig, currentUrl: string, auditPath = ""): Ctx {
  const engine = { currentUrl: async () => currentUrl };
  return { active: "live", live: engine, cdp: engine, config: { policy, auditPath } } as unknown as Ctx;
}

const auditFile = join(tmpdir(), "arc-mcp-enforce-test.jsonl");
afterAll(() => {
  if (existsSync(auditFile)) rmSync(auditFile);
});

describe("enforce", () => {
  test("is a no-op when policy is off and no audit path is set", async () => {
    const ctx = ctxWith(pol({ enabled: false }), "https://x.com");
    await expect(enforce(ctx, { tool: "arc_click", kind: "write" })).resolves.toBeUndefined();
  });

  test("read-only denies writes but not reads", async () => {
    const ctx = ctxWith(pol({ readOnly: true }), "https://x.com");
    await expect(enforce(ctx, { tool: "arc_navigate", kind: "navigate", url: "https://x.com" })).rejects.toThrow(
      /read-only/,
    );
    await expect(enforce(ctx, { tool: "arc_get_text", kind: "read-page" })).resolves.toBeUndefined();
  });

  test("gates writes on the active engine's current URL", async () => {
    const allow = ctxWith(pol({ allowOrigins: ["https://ok.com"] }), "https://ok.com");
    await expect(enforce(allow, { tool: "arc_click", kind: "write" })).resolves.toBeUndefined();
    const deny = ctxWith(pol({ allowOrigins: ["https://ok.com"] }), "https://bad.com");
    await expect(enforce(deny, { tool: "arc_click", kind: "write" })).rejects.toThrow(/not permitted/);
  });

  test("reads fail open on an unknown current origin, writes fail closed", async () => {
    const ctx = ctxWith(pol({ allowOrigins: ["https://ok.com"] }), "about:blank");
    await expect(enforce(ctx, { tool: "arc_get_text", kind: "read-page" })).resolves.toBeUndefined();
    await expect(enforce(ctx, { tool: "arc_click", kind: "write" })).rejects.toThrow(/unknown or a blocked scheme/);
  });

  test("appends an audit record even when the policy is off", async () => {
    const ctx = ctxWith(pol({ enabled: false }), "https://x.com", auditFile);
    await enforce(ctx, { tool: "arc_navigate", kind: "navigate", url: "https://x.com", args: { url: "https://x.com" } });
    const lines = readFileSync(auditFile, "utf8").trim().split("\n");
    const last = JSON.parse(lines[lines.length - 1]);
    expect(last.tool).toBe("arc_navigate");
    expect(last.decision).toBe("allow");
    expect(last.args.url).toBe("https://x.com");
  });
});
