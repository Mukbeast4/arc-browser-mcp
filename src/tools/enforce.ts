import type { ServerContext } from "../context.js";
import { currentEngine } from "../context.js";
import { evaluatePolicy, needsCurrentUrl, type ToolKind } from "../lib/policy.js";
import { appendAudit } from "../lib/audit.js";

export interface EnforceRequest {
  tool: string;
  kind: ToolKind;
  url?: string;
  args?: Record<string, unknown>;
}

export async function enforce(ctx: ServerContext, req: EnforceRequest): Promise<void> {
  const { policy, auditPath } = ctx.config;
  if (!policy.enabled && !auditPath) return;

  let currentUrl: string | undefined;
  if (policy.enabled && needsCurrentUrl(req.kind)) {
    currentUrl = await currentEngine(ctx)
      .currentUrl()
      .catch(() => "");
  }

  const decision = policy.enabled
    ? evaluatePolicy(policy, { tool: req.tool, kind: req.kind, url: req.url, currentUrl })
    : ({ allowed: true } as const);

  if (auditPath) {
    appendAudit(auditPath, {
      timestamp: new Date().toISOString(),
      tool: req.tool,
      kind: req.kind,
      decision: decision.allowed ? "allow" : "deny",
      reason: decision.allowed ? undefined : decision.reason,
      args: req.args,
    });
  }

  if (!decision.allowed) throw new Error(decision.reason);
}
