import { test, expect, describe } from "bun:test";
import {
  schemeOf,
  originOf,
  originAllowed,
  landingAllowed,
  bufferEntryAllowed,
  evaluatePolicy,
  needsCurrentUrl,
  type PolicyConfig,
} from "../src/lib/policy.ts";

function pol(p: Partial<PolicyConfig> = {}): PolicyConfig {
  return { enabled: true, readOnly: false, allowOrigins: [], denyOrigins: [], blockSchemes: [], ...p };
}

describe("schemeOf", () => {
  test("parses and lowercases the scheme", () => {
    expect(schemeOf("https://github.com/x")).toBe("https");
    expect(schemeOf("JavaScript:alert(1)")).toBe("javascript");
    expect(schemeOf("file:///etc/passwd")).toBe("file");
    expect(schemeOf("data:text/html,x")).toBe("data");
  });
  test("returns null for non-URLs", () => {
    expect(schemeOf("not a url")).toBeNull();
    expect(schemeOf("")).toBeNull();
  });
});

describe("originOf", () => {
  test("returns the lowercased origin for http(s)", () => {
    expect(originOf("https://github.com/a/b")).toBe("https://github.com");
    expect(originOf("https://GitHub.com")).toBe("https://github.com");
    expect(originOf("https://example.com:8443/x")).toBe("https://example.com:8443");
  });
  test("returns null for opaque/unparseable URLs", () => {
    expect(originOf("javascript:alert(1)")).toBeNull();
    expect(originOf("file:///x")).toBeNull();
    expect(originOf("about:blank")).toBeNull();
    expect(originOf("garbage")).toBeNull();
  });
});

describe("originAllowed", () => {
  test("empty allow + empty deny permits any real origin, never null", () => {
    expect(originAllowed(pol(), "https://anything.com")).toBe(true);
    expect(originAllowed(pol(), null)).toBe(false);
  });
  test("deny takes precedence over allow", () => {
    const cfg = pol({ allowOrigins: ["https://x.com"], denyOrigins: ["https://x.com"] });
    expect(originAllowed(cfg, "https://x.com")).toBe(false);
  });
  test("allow-list is exact match only (no subdomain bypass)", () => {
    const cfg = pol({ allowOrigins: ["https://example.com"] });
    expect(originAllowed(cfg, "https://example.com")).toBe(true);
    expect(originAllowed(cfg, "https://evil.example.com")).toBe(false);
    expect(originAllowed(cfg, "https://example.com.evil.com")).toBe(false);
  });
});

describe("evaluatePolicy read-only", () => {
  test("denies mutating kinds and names the tool", () => {
    const cfg = pol({ readOnly: true });
    for (const kind of ["navigate", "write", "evaluate", "destructive"] as const) {
      const d = evaluatePolicy(cfg, { tool: `arc_${kind}`, kind });
      expect(d.allowed).toBe(false);
      if (!d.allowed) expect(d.reason).toContain(`arc_${kind}`);
    }
  });
  test("allows reads, meta, and engine control", () => {
    const cfg = pol({ readOnly: true });
    for (const kind of ["read-page", "read-buffer", "read-meta", "engine"] as const) {
      expect(evaluatePolicy(cfg, { tool: "t", kind, currentUrl: "https://ok.com" }).allowed).toBe(true);
    }
  });
});

describe("evaluatePolicy evaluate gating", () => {
  test("evaluate is disabled when an origin allow/deny policy is active", () => {
    expect(evaluatePolicy(pol({ allowOrigins: ["https://x.com"] }), { tool: "arc_evaluate", kind: "evaluate", currentUrl: "https://x.com" }).allowed).toBe(false);
    expect(evaluatePolicy(pol({ denyOrigins: ["https://y.com"] }), { tool: "arc_evaluate", kind: "evaluate", currentUrl: "https://x.com" }).allowed).toBe(false);
  });
  test("evaluate runs when only a scheme block is set and current scheme is fine", () => {
    expect(evaluatePolicy(pol({ blockSchemes: ["data"] }), { tool: "arc_evaluate", kind: "evaluate", currentUrl: "https://x.com" }).allowed).toBe(true);
  });
});

describe("evaluatePolicy navigate", () => {
  test("blocks listed schemes case-insensitively", () => {
    const cfg = pol({ blockSchemes: ["javascript", "file"] });
    expect(evaluatePolicy(cfg, { tool: "arc_navigate", kind: "navigate", url: "javascript:alert(1)" }).allowed).toBe(false);
    expect(evaluatePolicy(cfg, { tool: "arc_navigate", kind: "navigate", url: "JAVAScript:alert(1)" }).allowed).toBe(false);
  });
  test("enforces the allow-list on the argument origin (exact)", () => {
    const cfg = pol({ allowOrigins: ["https://example.com"] });
    expect(evaluatePolicy(cfg, { tool: "arc_navigate", kind: "navigate", url: "https://example.com/x" }).allowed).toBe(true);
    expect(evaluatePolicy(cfg, { tool: "arc_navigate", kind: "navigate", url: "https://evil.com" }).allowed).toBe(false);
    expect(evaluatePolicy(cfg, { tool: "arc_navigate", kind: "navigate", url: "https://sub.example.com" }).allowed).toBe(false);
  });
  test("empty url and no-policy navigation are allowed", () => {
    expect(evaluatePolicy(pol({ allowOrigins: ["https://example.com"] }), { tool: "arc_open_tab", kind: "navigate", url: "" }).allowed).toBe(true);
    expect(evaluatePolicy(pol(), { tool: "arc_navigate", kind: "navigate", url: "https://anything.com" }).allowed).toBe(true);
  });
});

describe("evaluatePolicy current-origin gating", () => {
  const cfg = pol({ allowOrigins: ["https://ok.com"] });
  test("read-page: allowed on allow-listed, denied on known other, fail-OPEN on unknown", () => {
    expect(evaluatePolicy(cfg, { tool: "arc_get_text", kind: "read-page", currentUrl: "https://ok.com/p" }).allowed).toBe(true);
    expect(evaluatePolicy(cfg, { tool: "arc_get_text", kind: "read-page", currentUrl: "https://bad.com" }).allowed).toBe(false);
    expect(evaluatePolicy(cfg, { tool: "arc_get_text", kind: "read-page", currentUrl: "about:blank" }).allowed).toBe(true);
    expect(evaluatePolicy(cfg, { tool: "arc_get_text", kind: "read-page", currentUrl: "" }).allowed).toBe(true);
  });
  test("write: allowed on allow-listed, denied on other, fail-CLOSED on unknown", () => {
    expect(evaluatePolicy(cfg, { tool: "arc_click", kind: "write", currentUrl: "https://ok.com" }).allowed).toBe(true);
    expect(evaluatePolicy(cfg, { tool: "arc_click", kind: "write", currentUrl: "https://bad.com" }).allowed).toBe(false);
    expect(evaluatePolicy(cfg, { tool: "arc_click", kind: "write", currentUrl: "about:blank" }).allowed).toBe(false);
    expect(evaluatePolicy(cfg, { tool: "arc_click", kind: "write", currentUrl: "" }).allowed).toBe(false);
  });
  test("a current tab on a blocked scheme blocks writes but not reads", () => {
    const sc = pol({ blockSchemes: ["data"] });
    expect(evaluatePolicy(sc, { tool: "arc_click", kind: "write", currentUrl: "data:text/html,x" }).allowed).toBe(false);
    expect(evaluatePolicy(sc, { tool: "arc_get_text", kind: "read-page", currentUrl: "data:text/html,x" }).allowed).toBe(true);
  });
});

describe("evaluatePolicy inert config", () => {
  test("permits every kind when nothing is configured", () => {
    const cfg = pol();
    for (const kind of ["navigate", "read-page", "write", "evaluate", "destructive"] as const) {
      expect(evaluatePolicy(cfg, { tool: "t", kind, url: "https://x.com", currentUrl: "https://x.com" }).allowed).toBe(true);
    }
  });
});

describe("landingAllowed", () => {
  test("no origin policy permits any landing, including opaque", () => {
    expect(landingAllowed(pol(), "https://anywhere.com")).toBe(true);
    expect(landingAllowed(pol(), "about:blank")).toBe(true);
  });
  test("allow-list permits listed landings, denies others, fails open on opaque", () => {
    const cfg = pol({ allowOrigins: ["https://ok.com"] });
    expect(landingAllowed(cfg, "https://ok.com/after-redirect")).toBe(true);
    expect(landingAllowed(cfg, "https://tracker.com")).toBe(false);
    expect(landingAllowed(cfg, "about:blank")).toBe(true);
  });
  test("deny-list blocks a denied landing", () => {
    expect(landingAllowed(pol({ denyOrigins: ["https://bad.com"] }), "https://bad.com/x")).toBe(false);
  });
});

describe("bufferEntryAllowed", () => {
  test("no origin policy keeps everything", () => {
    expect(bufferEntryAllowed(pol(), "https://cdn.com/a.js")).toBe(true);
    expect(bufferEntryAllowed(pol(), "data:application/json,{}")).toBe(true);
  });
  test("allow-list keeps allowed entries and drops others, including opaque", () => {
    const cfg = pol({ allowOrigins: ["https://ok.com"] });
    expect(bufferEntryAllowed(cfg, "https://ok.com/api")).toBe(true);
    expect(bufferEntryAllowed(cfg, "https://cdn.other.com/a.js")).toBe(false);
    expect(bufferEntryAllowed(cfg, "data:image/png;base64,xxxx")).toBe(false);
  });
  test("deny-only keeps opaque and non-denied entries, drops denied", () => {
    const cfg = pol({ denyOrigins: ["https://bad.com"] });
    expect(bufferEntryAllowed(cfg, "https://bad.com/track")).toBe(false);
    expect(bufferEntryAllowed(cfg, "https://fine.com/a")).toBe(true);
    expect(bufferEntryAllowed(cfg, "data:image/png;base64,xxxx")).toBe(true);
  });
});

describe("needsCurrentUrl", () => {
  test("is true only for page-content kinds", () => {
    expect(needsCurrentUrl("read-page")).toBe(true);
    expect(needsCurrentUrl("write")).toBe(true);
    expect(needsCurrentUrl("evaluate")).toBe(true);
    expect(needsCurrentUrl("navigate")).toBe(false);
    expect(needsCurrentUrl("read-buffer")).toBe(false);
    expect(needsCurrentUrl("read-meta")).toBe(false);
    expect(needsCurrentUrl("destructive")).toBe(false);
    expect(needsCurrentUrl("engine")).toBe(false);
  });
});
