import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ServerContext } from "../context.js";
import { currentEngine } from "../context.js";
import { guard, ok } from "./result.js";

export function registerTabTools(server: McpServer, ctx: ServerContext): void {
  const engine = () => currentEngine(ctx);

  server.registerTool(
    "arc_list_tabs",
    { description: "List tabs in the front Arc window with index, title, URL, and which is active (marked with *)." },
    async () =>
      guard(ctx, async () => {
        const tabs = await engine().listTabs();
        const lines = tabs.map((t) => `${t.index}${t.active ? "*" : " "} ${t.title} - ${t.url}`);
        return ok(lines.length ? lines.join("\n") : "(no tabs)");
      }),
  );

  server.registerTool(
    "arc_select_tab",
    {
      description: "Select (focus) a tab by its index from arc_list_tabs.",
      inputSchema: { index: z.number().int().nonnegative() },
    },
    async ({ index }) =>
      guard(ctx, async () => {
        await engine().selectTab(index);
        return ok(`selected tab ${index}`);
      }),
  );

  server.registerTool(
    "arc_open_tab",
    {
      description: "Open a new tab in the front Arc window, optionally at a URL.",
      inputSchema: { url: z.string().optional() },
    },
    async ({ url }) =>
      guard(ctx, async () => {
        await engine().openTab(url);
        return ok(`opened tab${url ? ` at ${url}` : ""}`);
      }),
  );

  server.registerTool(
    "arc_close_tab",
    {
      description: "Close a tab by its index from arc_list_tabs.",
      inputSchema: { index: z.number().int().nonnegative() },
    },
    async ({ index }) =>
      guard(ctx, async () => {
        await engine().closeTab(index);
        return ok(`closed tab ${index}`);
      }),
  );
}
