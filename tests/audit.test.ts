import { test, expect, describe } from "bun:test";
import { auditLine, type AuditRecord } from "../src/lib/audit.ts";

function rec(p: Partial<AuditRecord> = {}): AuditRecord {
  return { timestamp: "2026-06-04T00:00:00.000Z", tool: "arc_navigate", kind: "navigate", decision: "allow", ...p };
}

describe("auditLine", () => {
  test("emits a single-line JSON record with the core fields", () => {
    const parsed = JSON.parse(auditLine(rec({ args: { url: "https://example.com" } })));
    expect(parsed.timestamp).toBe("2026-06-04T00:00:00.000Z");
    expect(parsed.tool).toBe("arc_navigate");
    expect(parsed.kind).toBe("navigate");
    expect(parsed.decision).toBe("allow");
    expect(parsed.args.url).toBe("https://example.com");
    expect(auditLine(rec())).not.toContain("\n");
  });

  test("includes the reason only on denial", () => {
    expect(JSON.parse(auditLine(rec())).reason).toBeUndefined();
    expect(JSON.parse(auditLine(rec({ decision: "deny", reason: "blocked URL scheme: javascript" }))).reason).toBe(
      "blocked URL scheme: javascript",
    );
  });

  test("caps long string arg values to avoid multi-MB lines", () => {
    const big = "a".repeat(20000);
    const parsed = JSON.parse(auditLine(rec({ kind: "write", args: { value: big } })));
    expect(parsed.args.value.length).toBeLessThan(big.length);
    expect(parsed.args.value.endsWith("…")).toBe(true);
  });

  test("preserves non-string arg values", () => {
    const parsed = JSON.parse(auditLine(rec({ kind: "write", args: { index: 3, submit: true } })));
    expect(parsed.args.index).toBe(3);
    expect(parsed.args.submit).toBe(true);
  });
});
