import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ServerContext } from "../context.js";
import { guard, ok } from "./result.js";
import { enforce } from "./enforce.js";
import { listSpaces, focusSpace, listWindows, activeState, littleArc } from "../engines/live/arcUi.js";

export function registerArcUiTools(server: McpServer, ctx: ServerContext): void {
  server.registerTool(
    "arc_list_spaces",
    {
      description: "List Arc Spaces in the front window with index, title, id, and which is active (marked *).",
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () =>
      guard(ctx, async () => {
        await enforce(ctx, { tool: "arc_list_spaces", kind: "read-meta" });
        const spaces = await listSpaces();
        const lines = spaces.map((s) => `${s.index}${s.active ? "*" : " "} ${s.title} [${s.id}]`);
        return ok(lines.length ? lines.join("\n") : "(no spaces)");
      }),
  );

  server.registerTool(
    "arc_focus_space",
    {
      description: "Focus (switch to) an Arc Space by its title or id from arc_list_spaces.",
      inputSchema: { space: z.string().describe("Space title or id") },
      annotations: { readOnlyHint: false },
    },
    async ({ space }) =>
      guard(ctx, async () => {
        await enforce(ctx, { tool: "arc_focus_space", kind: "write", args: { space } });
        const m = await focusSpace(space);
        return ok(`focused space ${m.title}`);
      }),
  );

  server.registerTool(
    "arc_list_windows",
    {
      description: "List Arc windows with index, name, and id.",
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () =>
      guard(ctx, async () => {
        await enforce(ctx, { tool: "arc_list_windows", kind: "read-meta" });
        const ws = await listWindows();
        const lines = ws.map((w) => `${w.index} ${w.name} [${w.id}]`);
        return ok(lines.length ? lines.join("\n") : "(no windows)");
      }),
  );

  server.registerTool(
    "arc_active_state",
    {
      description: "Report the active Arc window name, active Space, and active tab title and URL.",
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () =>
      guard(ctx, async () => {
        await enforce(ctx, { tool: "arc_active_state", kind: "read-meta" });
        const s = await activeState();
        return ok(`window: ${s.window}\nspace: ${s.space}\ntab: ${s.tabTitle}\nurl: ${s.tabUrl}`);
      }),
  );

  server.registerTool(
    "arc_little_arc",
    {
      description: "Open a URL in a Little Arc window (write-only: creates it, cannot read it back).",
      inputSchema: { url: z.string().describe("URL to open in Little Arc") },
      annotations: { readOnlyHint: false, openWorldHint: true },
    },
    async ({ url }) =>
      guard(ctx, async () => {
        await enforce(ctx, { tool: "arc_little_arc", kind: "navigate", url, args: { url } });
        await littleArc(url);
        return ok(`opened Little Arc at ${url}`);
      }),
  );
}
