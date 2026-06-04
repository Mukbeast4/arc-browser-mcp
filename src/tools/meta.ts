import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { ServerContext } from "../context.js";
import { enforce } from "./enforce.js";
import { runAppleScript } from "../engines/live/osascript.js";
import { listArcProcesses } from "../lib/arcProcess.js";

function textResult(text: string, isError = false) {
  return { content: [{ type: "text" as const, text }], isError };
}

export function registerMetaTools(server: McpServer, ctx: ServerContext): void {
  server.registerTool(
    "arc_status",
    {
      description:
        "Report Arc MCP status: default engine, running Arc instances, live-engine reachability, and CDP profile state.",
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () =>
      ctx.queue.run(async () => {
        await enforce(ctx, { tool: "arc_status", kind: "read-meta" });
        const procs = await listArcProcesses();
        const dedicated = procs.filter((p) => p.dedicated);
        const daily = procs.filter((p) => !p.dedicated);
        const live = await runAppleScript('tell application "Arc" to return name');
        const onboarded = existsSync(join(ctx.config.cdpProfileDir, "Local State"));
        return textResult(
          [
            `active engine: ${ctx.active}`,
            `default engine: ${ctx.config.defaultEngine}`,
            `arc binary: ${ctx.config.arcBin}`,
            `running Arc instances: ${procs.length} (daily: ${daily.length}, dedicated/debug: ${dedicated.length})`,
            `live engine (AppleScript) reachable: ${live.ok ? "yes" : `no${live.error ? ` (${live.error})` : ""}`}`,
            `cdp mode: ${ctx.config.cdpMode}`,
            `cdp profile dir: ${ctx.config.cdpProfileDir}`,
            `cdp profile onboarded: ${onboarded ? "yes" : "no (run one-time setup before using cdp)"}`,
            `safety policy: ${ctx.config.policy.enabled ? "active" : "off"}${ctx.config.policy.readOnly ? " (read-only)" : ""}`,
            `audit log: ${ctx.config.auditPath || "off"}`,
          ].join("\n"),
        );
      }),
  );

  server.registerTool(
    "arc_check_capabilities",
    {
      description:
        "Probe what the live (AppleScript) engine can do on the running Arc: basic control and in-page JavaScript execution.",
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () =>
      ctx.queue.run(async () => {
        await enforce(ctx, { tool: "arc_check_capabilities", kind: "read-meta" });
        const control = await runAppleScript('tell application "Arc" to return name');
        const probeSkipped = control.ok && ctx.config.policy.enabled;
        let jsOk = false;
        let jsDetail = "";
        if (control.ok && !ctx.config.policy.enabled) {
          const js = await runAppleScript(
            'tell application "Arc"\ntell front window\'s active tab\nset r to execute javascript "1+1"\nend tell\nreturn r\nend tell',
          );
          jsOk = js.ok;
          jsDetail = js.ok ? js.output : (js.error ?? "");
        }
        const capability = !control.ok
          ? "live engine: unavailable (grant Automation permission for Arc in System Settings > Privacy & Security > Automation)"
          : probeSkipped
            ? "live engine: in-page JavaScript probe skipped while a safety policy is active"
            : jsOk
              ? "live engine: full (navigate, snapshot, click, fill, extract, Spaces/tabs/windows)"
              : "live engine: limited (navigate + tab/Space/window management only; in-page DOM interaction unavailable)";
        return textResult(
          [
            `applescript control: ${control.ok ? "ok" : `FAILED ${control.error ?? ""}`}`,
            `execute javascript: ${
              probeSkipped
                ? "skipped (safety policy active)"
                : jsOk
                  ? `ok (returned ${jsDetail})`
                  : `unavailable${jsDetail ? ` - ${jsDetail}` : ""}`
            }`,
            capability,
          ].join("\n"),
        );
      }),
  );
}
