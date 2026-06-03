#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { SerialQueue } from "./lib/queue.js";
import { log } from "./lib/log.js";
import { LiveEngine } from "./engines/live/liveEngine.js";
import { CdpEngine } from "./engines/cdp/cdpEngine.js";
import { relaunchUserArc } from "./engines/cdp/launcher.js";
import { registerMetaTools } from "./tools/meta.js";
import { registerPageTools } from "./tools/page.js";
import { registerTabTools } from "./tools/tabs.js";
import { registerArcUiTools } from "./tools/arcui.js";
import { registerEngineTools } from "./tools/engine.js";
import type { ServerContext } from "./context.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const ctx: ServerContext = {
    config,
    queue: new SerialQueue(),
    live: new LiveEngine(),
    cdp: new CdpEngine(config),
    active: config.defaultEngine,
  };

  const server = new McpServer({ name: "arc-mcp", version: "0.1.0" });
  registerMetaTools(server, ctx);
  registerPageTools(server, ctx);
  registerTabTools(server, ctx);
  registerArcUiTools(server, ctx);
  registerEngineTools(server, ctx);

  const shutdown = async () => {
    const restore = ctx.active === "cdp" && ctx.config.cdpMode === "dedicated";
    try {
      await ctx.cdp.dispose();
    } catch (e) {
      log.debug("dispose failed", e instanceof Error ? e.message : String(e));
    }
    if (restore) await relaunchUserArc();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  log.info("server started", { activeEngine: ctx.active });
}

main().catch((err) => {
  log.error("fatal", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
