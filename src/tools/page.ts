import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ServerContext } from "../context.js";
import { currentEngine } from "../context.js";
import type { PageSnapshot } from "../engines/engine.js";
import { guard, ok, fail, imageResult, formatSnapshot } from "./result.js";
import { enforce } from "./enforce.js";
import { landingAllowed } from "../lib/policy.js";

export function registerPageTools(server: McpServer, ctx: ServerContext): void {
  const engine = () => currentEngine(ctx);
  const landed = (s: PageSnapshot) =>
    landingAllowed(ctx.config.policy, s.url)
      ? ok(formatSnapshot(s))
      : fail(`navigation landed on ${s.url}, which is not permitted by the origin policy`);

  server.registerTool(
    "arc_navigate",
    {
      description: "Navigate the active Arc tab to a URL and return an accessibility snapshot with element refs.",
      inputSchema: { url: z.string().describe("The URL to open") },
      annotations: { readOnlyHint: false, openWorldHint: true },
    },
    async ({ url }) =>
      guard(ctx, async () => {
        await enforce(ctx, { tool: "arc_navigate", kind: "navigate", url, args: { url } });
        return landed(await engine().navigate(url));
      }),
  );

  server.registerTool(
    "arc_reload",
    {
      description: "Reload the active Arc tab and return a fresh snapshot.",
      annotations: { readOnlyHint: false, openWorldHint: true },
    },
    async () =>
      guard(ctx, async () => {
        await enforce(ctx, { tool: "arc_reload", kind: "write" });
        return landed(await engine().reload());
      }),
  );

  server.registerTool(
    "arc_go_back",
    {
      description: "Navigate back in the active Arc tab history and return a snapshot.",
      annotations: { readOnlyHint: false, openWorldHint: true },
    },
    async () =>
      guard(ctx, async () => {
        await enforce(ctx, { tool: "arc_go_back", kind: "write" });
        return landed(await engine().goBack());
      }),
  );

  server.registerTool(
    "arc_go_forward",
    {
      description: "Navigate forward in the active Arc tab history and return a snapshot.",
      annotations: { readOnlyHint: false, openWorldHint: true },
    },
    async () =>
      guard(ctx, async () => {
        await enforce(ctx, { tool: "arc_go_forward", kind: "write" });
        return landed(await engine().goForward());
      }),
  );

  server.registerTool(
    "arc_snapshot",
    {
      description:
        "Capture an accessibility snapshot of the active Arc tab: interactive elements with stable refs for click/type/fill. Refs are valid only until the next snapshot or navigation.",
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async () =>
      guard(ctx, async () => {
        await enforce(ctx, { tool: "arc_snapshot", kind: "read-page" });
        return ok(formatSnapshot(await engine().snapshot()));
      }),
  );

  server.registerTool(
    "arc_get_text",
    {
      description: "Return the visible text of the active Arc tab (truncated to 20000 chars).",
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async () =>
      guard(ctx, async () => {
        await enforce(ctx, { tool: "arc_get_text", kind: "read-page" });
        return ok(await engine().getText());
      }),
  );

  server.registerTool(
    "arc_evaluate",
    {
      description: "Evaluate a JavaScript expression in the active Arc tab and return the JSON-serialized result.",
      inputSchema: { js: z.string().describe("A JavaScript expression to evaluate in the page") },
      annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
    },
    async ({ js }) =>
      guard(ctx, async () => {
        await enforce(ctx, { tool: "arc_evaluate", kind: "evaluate", args: { js } });
        const value = await engine().evaluate(js);
        return ok(typeof value === "string" ? value : JSON.stringify(value));
      }),
  );

  server.registerTool(
    "arc_click",
    {
      description: "Click an element by its ref from the latest arc_snapshot.",
      inputSchema: { ref: z.string().describe("Element ref from arc_snapshot, e.g. 3") },
      annotations: { readOnlyHint: false, openWorldHint: true },
    },
    async ({ ref }) =>
      guard(ctx, async () => {
        await enforce(ctx, { tool: "arc_click", kind: "write", args: { ref } });
        await engine().click(ref);
        return ok(`clicked ${ref}`);
      }),
  );

  server.registerTool(
    "arc_fill",
    {
      description: "Set the value of an input or textarea by its ref (replaces existing value).",
      inputSchema: {
        ref: z.string().describe("Element ref from arc_snapshot"),
        value: z.string().describe("The value to set"),
      },
      annotations: { readOnlyHint: false, openWorldHint: true },
    },
    async ({ ref, value }) =>
      guard(ctx, async () => {
        await enforce(ctx, { tool: "arc_fill", kind: "write", args: { ref, value } });
        await engine().fill(ref, value);
        return ok(`filled ${ref}`);
      }),
  );

  server.registerTool(
    "arc_type",
    {
      description: "Type text into an element by its ref, optionally submitting (pressing Enter) afterward.",
      inputSchema: {
        ref: z.string().describe("Element ref from arc_snapshot"),
        text: z.string(),
        submit: z.boolean().optional().describe("Submit the form / press Enter after typing"),
      },
      annotations: { readOnlyHint: false, openWorldHint: true },
    },
    async ({ ref, text, submit }) =>
      guard(ctx, async () => {
        await enforce(ctx, { tool: "arc_type", kind: "write", args: { ref, text, submit } });
        await engine().type(ref, text, submit ?? false);
        return ok(`typed into ${ref}${submit ? " and submitted" : ""}`);
      }),
  );

  server.registerTool(
    "arc_wait_for",
    {
      description: "Wait until the given text appears in the active Arc tab, or time out.",
      inputSchema: {
        text: z.string().describe("Text to wait for"),
        timeoutMs: z.number().int().positive().optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ text, timeoutMs }) =>
      guard(ctx, async () => {
        await enforce(ctx, { tool: "arc_wait_for", kind: "read-page", args: { text, timeoutMs } });
        await engine().waitForText(text, timeoutMs ?? 10000);
        return ok(`found: ${text}`);
      }),
  );

  server.registerTool(
    "arc_screenshot",
    {
      description:
        "Capture a screenshot of the Arc window (requires Screen Recording and Accessibility permissions for the live engine).",
      inputSchema: { fullPage: z.boolean().optional() },
      annotations: { readOnlyHint: false, openWorldHint: true },
    },
    async ({ fullPage }) =>
      guard(ctx, async () => {
        await enforce(ctx, { tool: "arc_screenshot", kind: "read-page", args: { fullPage } });
        const shot = await engine().screenshot(fullPage ?? false);
        return imageResult(shot.base64, shot.mimeType, "Arc window screenshot");
      }),
  );
}
