import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ServerContext } from "../context.js";
import { guard, ok } from "./result.js";
import type { CdpEngine } from "../engines/cdp/cdpEngine.js";
import type { ConsoleEntry, NetworkEntry, PageBuffers } from "../engines/cdp/recorder.js";

const BODY_CAP = 64 * 1024;
const LIST_TEXT_CAP = 300;

function requireCdp(ctx: ServerContext): CdpEngine {
  if (ctx.active !== "cdp") throw new Error("This requires the CDP engine. Run arc_cdp_start first.");
  return ctx.cdp as CdpEngine;
}

function requireCapture(ctx: ServerContext): CdpEngine {
  const cdp = requireCdp(ctx);
  if (ctx.config.cdpMode === "attach" && !ctx.config.allowAttachCapture) {
    throw new Error(
      "CDP instrumentation of your real Arc session is disabled in attach mode. Set ARC_MCP_ALLOW_ATTACH_CAPTURE=1 to enable it, or use the default dedicated mode.",
    );
  }
  return cdp;
}

async function resolveBuffers(
  ctx: ServerContext,
  pageId?: number,
): Promise<{ buffers: PageBuffers; pageId: number }> {
  const cdp = requireCapture(ctx);
  const page = await cdp.cdpPage(pageId);
  const buffers = cdp.recorder().buffersFor(page);
  if (!buffers) throw new Error("no capture buffers for the target page");
  return { buffers, pageId: buffers.pageId };
}

function footer(offset: number, shown: number, total: number, pageId: number): string {
  const from = shown ? offset + 1 : 0;
  return `showing ${from}-${offset + shown} of ${total} (page ${pageId})`;
}

async function readBody(entry: NetworkEntry): Promise<string> {
  if (!entry.response) return "body: unavailable (no response captured)";
  try {
    const headers = await entry.response.allHeaders().catch(() => ({}) as Record<string, string>);
    const contentType = headers["content-type"] ?? "";
    const buf = await entry.response.body();
    if (contentType && !/^(text\/|application\/(json|javascript|xml|x-www-form-urlencoded))/i.test(contentType)) {
      return `body: <binary, ${buf.length} bytes, ${contentType}>`;
    }
    const text = buf.toString("utf8");
    if (text.length > BODY_CAP) return `body (truncated, ${buf.length} bytes):\n${text.slice(0, BODY_CAP)}`;
    return `body:\n${text}`;
  } catch (e) {
    return `body: unavailable (page navigated or closed) (${e instanceof Error ? e.message : String(e)})`;
  }
}

export function registerDevtoolsTools(server: McpServer, ctx: ServerContext): void {
  server.registerTool(
    "arc_list_console_messages",
    {
      description:
        "List console messages captured from the active CDP page (requires arc_cdp_start). Higher ids are newer.",
      inputSchema: {
        level: z.enum(["log", "info", "warn", "error", "debug"]).optional().describe("Filter by console level"),
        limit: z.number().int().positive().optional(),
        offset: z.number().int().nonnegative().optional(),
        pageId: z.number().int().nonnegative().optional().describe("Target page id from arc_list_tabs; defaults to active"),
      },
    },
    async ({ level, limit, offset, pageId }) =>
      guard(ctx, async () => {
        const { buffers, pageId: pid } = await resolveBuffers(ctx, pageId);
        const off = offset ?? 0;
        const { items, total } = buffers.console.slice(
          off,
          limit ?? 50,
          level ? (e: ConsoleEntry) => e.type === level : undefined,
        );
        const lines = items.map((e) => {
          const text = e.text.length > LIST_TEXT_CAP ? e.text.slice(0, LIST_TEXT_CAP) + "…" : e.text;
          return `#${e.id} [${e.type}] ${text}${e.url ? ` (${e.url}:${e.line})` : ""}`;
        });
        return ok((lines.length ? lines.join("\n") + "\n" : "") + footer(off, items.length, total, pid));
      }),
  );

  server.registerTool(
    "arc_get_console_message",
    {
      description: "Return the full text and source of a captured console message by id (requires arc_cdp_start).",
      inputSchema: {
        id: z.number().int().nonnegative(),
        pageId: z.number().int().nonnegative().optional(),
      },
    },
    async ({ id, pageId }) =>
      guard(ctx, async () => {
        const { buffers } = await resolveBuffers(ctx, pageId);
        const e = buffers.console.getById(id);
        if (!e) return ok(`console message #${id} not found (it may have been evicted from the buffer)`);
        return ok(
          [
            `#${e.id} [${e.type}]`,
            `source: ${e.url || "(unknown)"}:${e.line}`,
            `time: ${new Date(e.timestamp).toISOString()}`,
            "",
            e.text,
          ].join("\n"),
        );
      }),
  );

  server.registerTool(
    "arc_list_network_requests",
    {
      description: "List network requests captured from the active CDP page (requires arc_cdp_start).",
      inputSchema: {
        resourceType: z.string().optional().describe("Filter by type, e.g. document, script, xhr, fetch, image"),
        status: z.number().int().optional().describe("Filter by HTTP status code"),
        limit: z.number().int().positive().optional(),
        offset: z.number().int().nonnegative().optional(),
        pageId: z.number().int().nonnegative().optional(),
      },
    },
    async ({ resourceType, status, limit, offset, pageId }) =>
      guard(ctx, async () => {
        const { buffers, pageId: pid } = await resolveBuffers(ctx, pageId);
        const off = offset ?? 0;
        const { items, total } = buffers.network.slice(
          off,
          limit ?? 50,
          (e: NetworkEntry) =>
            (resourceType ? e.resourceType === resourceType : true) &&
            (status !== undefined ? e.status === status : true),
        );
        const lines = items.map((e) => {
          const st = e.failed ? "FAILED" : e.status === null ? "pending" : String(e.status);
          const dur = e.durationMs === null ? "" : ` (${e.durationMs}ms)`;
          return `#${e.id} ${e.method} ${st} ${e.resourceType} ${e.url}${dur}`;
        });
        return ok((lines.length ? lines.join("\n") + "\n" : "") + footer(off, items.length, total, pid));
      }),
  );

  server.registerTool(
    "arc_get_network_request",
    {
      description:
        "Return details of a captured network request by id, optionally including the response body (requires arc_cdp_start).",
      inputSchema: {
        id: z.number().int().nonnegative(),
        includeBody: z.boolean().optional(),
        pageId: z.number().int().nonnegative().optional(),
      },
    },
    async ({ id, includeBody, pageId }) =>
      guard(ctx, async () => {
        const { buffers } = await resolveBuffers(ctx, pageId);
        const e = buffers.network.getById(id);
        if (!e) return ok(`network request #${id} not found (it may have been evicted from the buffer)`);
        const lines = [
          `#${e.id} ${e.method} ${e.url}`,
          `resourceType: ${e.resourceType}`,
          `status: ${e.failed ? `failed (${e.failureText})` : e.status === null ? "pending" : `${e.status} ${e.statusText}`}`,
          `durationMs: ${e.durationMs ?? "n/a"}`,
        ];
        if (e.response) {
          const headers = await e.response.allHeaders().catch(() => null);
          if (headers) lines.push(`response headers: ${JSON.stringify(headers)}`);
        }
        if (includeBody) lines.push("", await readBody(e));
        return ok(lines.join("\n"));
      }),
  );

  server.registerTool(
    "arc_take_heap_snapshot",
    {
      description:
        "Capture a V8 heap snapshot of the active CDP page, write it to a temp .heapsnapshot file, and return its path and summary (requires arc_cdp_start). Open the file in Chrome DevTools > Memory to analyze retainers.",
    },
    async () =>
      guard(ctx, async () => {
        const cdp = requireCdp(ctx);
        const r = await cdp.takeHeapSnapshot();
        return ok([`path: ${r.path}`, `bytes: ${r.bytes}`, `nodes: ${r.nodeCount ?? "n/a"}`].join("\n"));
      }),
  );

  server.registerTool(
    "arc_performance_start_trace",
    {
      description:
        "Start a Chrome performance trace on the active CDP page (requires arc_cdp_start). Finish with arc_performance_stop_trace.",
      inputSchema: {
        reload: z.boolean().optional().describe("Reload the page after starting, to capture the full load"),
        categories: z.string().optional().describe("Comma-separated trace categories"),
      },
    },
    async ({ reload, categories }) =>
      guard(ctx, async () => {
        const cdp = requireCdp(ctx);
        await cdp.startTrace(categories);
        if (reload) await cdp.reload();
        return ok("performance trace started; run arc_performance_stop_trace to finish");
      }),
  );

  server.registerTool(
    "arc_performance_stop_trace",
    { description: "Stop the running performance trace and return a summary (requires arc_cdp_start)." },
    async () =>
      guard(ctx, async () => {
        const cdp = requireCdp(ctx);
        const summary = await cdp.stopTrace();
        const lines = [`events: ${summary.events}`, `durationMs: ${summary.durationMs}`];
        for (const [k, v] of Object.entries(summary.metrics)) lines.push(`${k}: ${v}`);
        return ok(lines.join("\n"));
      }),
  );

  server.registerTool(
    "arc_emulate",
    {
      description:
        "Apply device/network emulation to the active CDP page: viewport, userAgent, CPU/network throttling, geolocation (requires arc_cdp_start).",
      inputSchema: {
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
        userAgent: z.string().optional(),
        cpuThrottling: z.number().positive().optional().describe("CPU slowdown multiplier, e.g. 4"),
        networkThrottling: z.enum(["offline", "slow-3g", "fast-3g", "none"]).optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
      },
    },
    async ({ width, height, userAgent, cpuThrottling, networkThrottling, latitude, longitude }) =>
      guard(ctx, async () => {
        const cdp = requireCapture(ctx);
        const applied = await cdp.emulate({
          width,
          height,
          userAgent,
          cpuThrottling,
          networkThrottling,
          latitude,
          longitude,
        });
        return ok(applied.length ? `applied: ${applied.join(", ")}` : "no emulation options provided");
      }),
  );

  server.registerTool(
    "arc_resize_page",
    {
      description:
        "Resize the active CDP page viewport, best-effort over connectOverCDP (use arc_emulate for reliable device metrics). Requires arc_cdp_start.",
      inputSchema: {
        width: z.number().int().positive(),
        height: z.number().int().positive(),
      },
    },
    async ({ width, height }) =>
      guard(ctx, async () => {
        const cdp = requireCdp(ctx);
        const okFlag = await cdp.resizePage(width, height);
        return ok(
          `resized (best-effort) to ${width}x${height}${okFlag ? "" : " (viewport override may not have applied)"}; use arc_emulate for reliable device metrics`,
        );
      }),
  );
}
