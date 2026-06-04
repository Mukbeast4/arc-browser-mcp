import { homedir } from "node:os";
import { join } from "node:path";
import { originOf, type PolicyConfig } from "./lib/policy.js";
import { log } from "./lib/log.js";

export type EngineName = "live" | "cdp";
export type CdpMode = "dedicated" | "attach";

export interface Config {
  defaultEngine: EngineName;
  arcBin: string;
  cdpProfileDir: string;
  cdpPort: number;
  cdpMode: CdpMode;
  cdpTimeoutMs: number;
  allowAttachCapture: boolean;
  auditPath: string;
  policy: PolicyConfig;
}

function env(key: string, fallback: string): string {
  const value = process.env[key];
  return value && value.length > 0 ? value : fallback;
}

function list(key: string): string[] {
  const raw = env(key, "");
  return raw
    ? raw
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.length > 0)
    : [];
}

function origins(key: string): string[] {
  return list(key).map((entry) => {
    const o = originOf(entry);
    if (o === null) {
      log.warn("ignoring malformed origin; use scheme://host[:port]", { key, entry });
      return entry;
    }
    return o;
  });
}

export function loadConfig(): Config {
  const readOnly = env("ARC_MCP_READ_ONLY", "") === "1";
  const allowOrigins = origins("ARC_MCP_ALLOW_ORIGINS");
  const denyOrigins = origins("ARC_MCP_DENY_ORIGINS");
  const blockSchemes = list("ARC_MCP_BLOCK_SCHEMES").map((s) => s.replace(/:$/, ""));
  return {
    defaultEngine: env("ARC_MCP_DEFAULT_ENGINE", "live") === "cdp" ? "cdp" : "live",
    arcBin: env("ARC_MCP_BIN", "/Applications/Arc.app/Contents/MacOS/Arc"),
    cdpProfileDir: env(
      "ARC_MCP_PROFILE_DIR",
      join(homedir(), "Library", "Application Support", "arc-mcp", "profile"),
    ),
    cdpPort: parseInt(env("ARC_MCP_CDP_PORT", "0"), 10) || 0,
    cdpMode: env("ARC_MCP_CDP_MODE", "dedicated") === "attach" ? "attach" : "dedicated",
    cdpTimeoutMs: parseInt(env("ARC_MCP_CDP_TIMEOUT_MS", "30000"), 10) || 30000,
    allowAttachCapture: env("ARC_MCP_ALLOW_ATTACH_CAPTURE", "") === "1",
    auditPath: env("ARC_MCP_AUDIT_LOG", ""),
    policy: {
      enabled: readOnly || allowOrigins.length > 0 || denyOrigins.length > 0 || blockSchemes.length > 0,
      readOnly,
      allowOrigins,
      denyOrigins,
      blockSchemes,
    },
  };
}
