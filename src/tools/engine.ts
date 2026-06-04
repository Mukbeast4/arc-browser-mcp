import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ServerContext } from "../context.js";
import { guard, ok, fail } from "./result.js";
import { enforce } from "./enforce.js";
import { isArcRunning, quitArcGracefully, relaunchUserArc } from "../engines/cdp/launcher.js";

export function registerEngineTools(server: McpServer, ctx: ServerContext): void {
  server.registerTool(
    "arc_cdp_start",
    {
      description:
        "Switch to the CDP engine: high-fidelity automation on a dedicated Arc profile (native screenshots, network, console, auto-wait). Arc is single-instance, so your normal Arc must be closed. Pass confirmQuitDaily=true to let arc-mcp gracefully quit it (it is relaunched on arc_cdp_stop).",
      inputSchema: {
        confirmQuitDaily: z
          .boolean()
          .optional()
          .describe("Allow quitting your running Arc so the dedicated instance can take over"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async ({ confirmQuitDaily }) =>
      guard(ctx, async () => {
        await enforce(ctx, { tool: "arc_cdp_start", kind: "engine", args: { confirmQuitDaily } });
        if (ctx.active === "cdp") return ok("already in CDP mode");
        let quitDaily = false;
        if (ctx.config.cdpMode === "dedicated" && isArcRunning()) {
          if (!confirmQuitDaily) {
            return fail(
              "Your Arc is running and CDP needs Arc to be the only instance. Re-run arc_cdp_start with confirmQuitDaily=true to gracefully quit it (it will be relaunched on arc_cdp_stop), or quit Arc yourself first.",
            );
          }
          const quit = await quitArcGracefully(20000);
          if (!quit) return fail("could not quit Arc; quit it manually and retry");
          quitDaily = true;
        }
        try {
          await ctx.cdp.ensureReady();
        } catch (err) {
          if (quitDaily) await relaunchUserArc();
          return fail(
            `failed to start CDP engine: ${err instanceof Error ? err.message : String(err)}${quitDaily ? " — your Arc has been relaunched" : ""}`,
          );
        }
        ctx.active = "cdp";
        return ok(
          "CDP mode active on a dedicated Arc instance. Page and tab tools now use CDP. Call arc_cdp_stop to return to your live Arc.",
        );
      }),
  );

  server.registerTool(
    "arc_cdp_stop",
    {
      description: "Leave CDP mode: shut down the dedicated Arc instance and relaunch your normal Arc. Page/tab tools return to the live engine.",
      annotations: { readOnlyHint: false },
    },
    async () =>
      guard(ctx, async () => {
        await enforce(ctx, { tool: "arc_cdp_stop", kind: "engine" });
        if (ctx.active !== "cdp") return ok("not in CDP mode");
        await ctx.cdp.dispose();
        ctx.active = "live";
        if (ctx.config.cdpMode === "dedicated") await relaunchUserArc();
        return ok(
          ctx.config.cdpMode === "dedicated"
            ? "Returned to live mode; your Arc is relaunching."
            : "Returned to live mode.",
        );
      }),
  );
}
