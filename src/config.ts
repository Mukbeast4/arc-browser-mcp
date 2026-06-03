import { homedir } from "node:os";
import { join } from "node:path";

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
}

function env(key: string, fallback: string): string {
  const value = process.env[key];
  return value && value.length > 0 ? value : fallback;
}

export function loadConfig(): Config {
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
  };
}
