import { appendFileSync, chmodSync } from "node:fs";
import { log } from "./log.js";

export interface AuditRecord {
  timestamp: string;
  tool: string;
  kind: string;
  decision: "allow" | "deny";
  reason?: string;
  args?: Record<string, unknown>;
}

const VALUE_CAP = 8192;

function capValues(args: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args)) {
    out[k] = typeof v === "string" && v.length > VALUE_CAP ? v.slice(0, VALUE_CAP) + "…" : v;
  }
  return out;
}

export function auditLine(record: AuditRecord): string {
  const shaped = record.args ? { ...record, args: capValues(record.args) } : record;
  return JSON.stringify(shaped);
}

export function appendAudit(path: string, record: AuditRecord): void {
  try {
    appendFileSync(path, auditLine(record) + "\n", { mode: 0o600 });
    chmodSync(path, 0o600);
  } catch (e) {
    log.warn("audit write failed", e instanceof Error ? e.message : String(e));
  }
}
