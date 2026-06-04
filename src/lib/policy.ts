export type ToolKind =
  | "navigate"
  | "read-page"
  | "read-buffer"
  | "read-meta"
  | "write"
  | "evaluate"
  | "destructive"
  | "engine";

export interface PolicyConfig {
  enabled: boolean;
  readOnly: boolean;
  allowOrigins: string[];
  denyOrigins: string[];
  blockSchemes: string[];
}

export interface PolicyRequest {
  tool: string;
  kind: ToolKind;
  url?: string;
  currentUrl?: string;
}

export type Decision = { allowed: true } | { allowed: false; reason: string };

const READONLY_DENIED = new Set<ToolKind>(["navigate", "write", "evaluate", "destructive"]);
const ORIGIN_GATED = new Set<ToolKind>(["read-page", "write", "evaluate"]);

export function needsCurrentUrl(kind: ToolKind): boolean {
  return ORIGIN_GATED.has(kind);
}

export function schemeOf(url: string): string | null {
  try {
    return new URL(url).protocol.replace(/:$/, "").toLowerCase();
  } catch {
    return null;
  }
}

export function originOf(url: string): string | null {
  try {
    const origin = new URL(url).origin;
    return origin && origin !== "null" ? origin.toLowerCase() : null;
  } catch {
    return null;
  }
}

export function originAllowed(cfg: PolicyConfig, origin: string | null): boolean {
  if (origin === null) return false;
  const o = origin.toLowerCase();
  if (cfg.denyOrigins.includes(o)) return false;
  if (cfg.allowOrigins.length > 0) return cfg.allowOrigins.includes(o);
  return true;
}

export function landingAllowed(cfg: PolicyConfig, url: string): boolean {
  if (cfg.allowOrigins.length === 0 && cfg.denyOrigins.length === 0) return true;
  const origin = originOf(url);
  if (origin === null) return true;
  return originAllowed(cfg, origin);
}

export function bufferEntryAllowed(cfg: PolicyConfig, url: string): boolean {
  if (cfg.allowOrigins.length === 0 && cfg.denyOrigins.length === 0) return true;
  const origin = originOf(url);
  if (origin === null) return cfg.allowOrigins.length === 0;
  return originAllowed(cfg, origin);
}

export function evaluatePolicy(cfg: PolicyConfig, req: PolicyRequest): Decision {
  if (cfg.readOnly && READONLY_DENIED.has(req.kind)) {
    return { allowed: false, reason: `read-only mode: ${req.tool} is disabled (ARC_MCP_READ_ONLY)` };
  }

  const originPolicy = cfg.allowOrigins.length > 0 || cfg.denyOrigins.length > 0;

  if (req.kind === "evaluate" && originPolicy) {
    return { allowed: false, reason: `${req.tool} is disabled while an origin policy is active` };
  }

  if (req.kind === "navigate") {
    const url = req.url ?? "";
    if (url.length === 0) return { allowed: true };
    const scheme = schemeOf(url);
    if (scheme !== null && cfg.blockSchemes.includes(scheme)) {
      return { allowed: false, reason: `blocked URL scheme: ${scheme}` };
    }
    if (originPolicy && !originAllowed(cfg, originOf(url))) {
      return { allowed: false, reason: `origin not permitted by policy: ${originOf(url) ?? url}` };
    }
    return { allowed: true };
  }

  if (ORIGIN_GATED.has(req.kind) && (originPolicy || cfg.blockSchemes.length > 0)) {
    const current = req.currentUrl ?? "";
    const origin = originOf(current);
    const scheme = schemeOf(current);
    const schemeBlocked = scheme !== null && cfg.blockSchemes.includes(scheme);
    if (origin === null || schemeBlocked) {
      if (req.kind === "read-page") return { allowed: true };
      return {
        allowed: false,
        reason: "current tab origin is unknown or a blocked scheme; navigate to an allowed origin first or use the CDP engine",
      };
    }
    if (originPolicy && !originAllowed(cfg, origin)) {
      const verb = req.kind === "read-page" ? "reading" : "acting on";
      return { allowed: false, reason: `${verb} ${origin} is not permitted by the origin policy` };
    }
    return { allowed: true };
  }

  return { allowed: true };
}
