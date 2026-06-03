import type { ServerContext } from "../context.js";
import type { PageSnapshot } from "../engines/engine.js";

type Content =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mimeType: string };

export interface ToolResult {
  content: Content[];
  isError: boolean;
  [key: string]: unknown;
}

export function ok(text: string): ToolResult {
  return { content: [{ type: "text", text }], isError: false };
}

export function fail(text: string): ToolResult {
  return { content: [{ type: "text", text }], isError: true };
}

export function imageResult(base64: string, mimeType: string, caption: string): ToolResult {
  return {
    content: [
      { type: "text", text: caption },
      { type: "image", data: base64, mimeType },
    ],
    isError: false,
  };
}

export async function guard(ctx: ServerContext, fn: () => Promise<ToolResult>): Promise<ToolResult> {
  return ctx.queue.run(async () => {
    try {
      return await fn();
    } catch (e) {
      return fail(e instanceof Error ? e.message : String(e));
    }
  });
}

export function formatSnapshot(s: PageSnapshot): string {
  const body = s.tree && s.tree.length > 0 ? s.tree : "(no interactive elements found)";
  return `url: ${s.url}\ntitle: ${s.title}\nrefs: ${s.refCount}\n\n${body}`;
}
