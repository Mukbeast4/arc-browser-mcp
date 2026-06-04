import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ServerContext } from "../context.js";
import { guard, ok } from "./result.js";
import { enforce } from "./enforce.js";
import type { CdpEngine } from "../engines/cdp/cdpEngine.js";

function requireCdp(ctx: ServerContext): CdpEngine {
  if (ctx.active !== "cdp") throw new Error("This requires the CDP engine. Run arc_cdp_start first.");
  return ctx.cdp as CdpEngine;
}

export function registerInputTools(server: McpServer, ctx: ServerContext): void {
  server.registerTool(
    "arc_hover",
    {
      description: "Hover the pointer over an element by its ref from arc_snapshot (requires arc_cdp_start).",
      inputSchema: { ref: z.string().describe("Element ref from arc_snapshot") },
      annotations: { readOnlyHint: false, openWorldHint: true },
    },
    async ({ ref }) =>
      guard(ctx, async () => {
        await enforce(ctx, { tool: "arc_hover", kind: "write", args: { ref } });
        await requireCdp(ctx).hover(ref);
        return ok(`hovered ${ref}`);
      }),
  );

  server.registerTool(
    "arc_drag",
    {
      description: "Drag one element onto another by their refs from arc_snapshot (requires arc_cdp_start).",
      inputSchema: {
        fromRef: z.string().describe("Source element ref"),
        toRef: z.string().describe("Target element ref"),
      },
      annotations: { readOnlyHint: false, openWorldHint: true },
    },
    async ({ fromRef, toRef }) =>
      guard(ctx, async () => {
        await enforce(ctx, { tool: "arc_drag", kind: "write", args: { fromRef, toRef } });
        await requireCdp(ctx).drag(fromRef, toRef);
        return ok(`dragged ${fromRef} onto ${toRef}`);
      }),
  );

  server.registerTool(
    "arc_press_key",
    {
      description:
        "Press a key or chord (e.g. Enter, Escape, Control+A), optionally focusing an element ref first (requires arc_cdp_start).",
      inputSchema: {
        key: z.string().describe("Key or chord, e.g. Enter, Tab, Control+A"),
        ref: z.string().optional().describe("Optional element ref to focus before pressing"),
      },
      annotations: { readOnlyHint: false, openWorldHint: true },
    },
    async ({ key, ref }) =>
      guard(ctx, async () => {
        await enforce(ctx, { tool: "arc_press_key", kind: "write", args: { key, ref } });
        await requireCdp(ctx).pressKey(key, ref);
        return ok(`pressed ${key}`);
      }),
  );

  server.registerTool(
    "arc_fill_form",
    {
      description: "Fill multiple fields in one call, each by its ref from arc_snapshot (requires arc_cdp_start).",
      inputSchema: {
        fields: z
          .array(z.object({ ref: z.string(), value: z.string() }))
          .describe("Fields to fill, each { ref, value }"),
      },
      annotations: { readOnlyHint: false, openWorldHint: true },
    },
    async ({ fields }) =>
      guard(ctx, async () => {
        await enforce(ctx, { tool: "arc_fill_form", kind: "write", args: { fields } });
        const n = await requireCdp(ctx).fillForm(fields);
        return ok(`filled ${n} field${n === 1 ? "" : "s"}`);
      }),
  );

  server.registerTool(
    "arc_upload_file",
    {
      description: "Set files on a file input by its ref from arc_snapshot, from local paths (requires arc_cdp_start).",
      inputSchema: {
        ref: z.string().describe("File input element ref"),
        paths: z.array(z.string()).describe("Absolute local file paths to upload"),
      },
      annotations: { readOnlyHint: false, openWorldHint: true },
    },
    async ({ ref, paths }) =>
      guard(ctx, async () => {
        await enforce(ctx, { tool: "arc_upload_file", kind: "write", args: { ref, paths } });
        await requireCdp(ctx).uploadFile(ref, paths);
        return ok(`set ${paths.length} file${paths.length === 1 ? "" : "s"} on ${ref}`);
      }),
  );

  server.registerTool(
    "arc_handle_dialog",
    {
      description:
        "Accept or dismiss a pending JavaScript dialog (alert/confirm/prompt) on the active CDP page (requires arc_cdp_start).",
      inputSchema: {
        action: z.enum(["accept", "dismiss"]),
        promptText: z.string().optional().describe("Text to enter for a prompt dialog when accepting"),
        pageId: z.number().int().nonnegative().optional().describe("Target page id from arc_list_tabs; defaults to active"),
      },
      annotations: { readOnlyHint: false, openWorldHint: true },
    },
    async ({ action, promptText, pageId }) =>
      guard(ctx, async () => {
        await enforce(ctx, { tool: "arc_handle_dialog", kind: "write", args: { action, promptText, pageId } });
        const type = await requireCdp(ctx).handleDialog(action, promptText, pageId);
        return ok(`${action}ed ${type} dialog`);
      }),
  );
}
