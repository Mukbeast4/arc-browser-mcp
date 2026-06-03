import { execFile } from "node:child_process";
import { readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runAppleScript } from "./osascript.js";
import { log } from "../../lib/log.js";

const GEOMETRY_SCRIPT =
  'tell application "System Events" to tell process "Arc"\nset p to position of front window\nset s to size of front window\nreturn ((item 1 of p) as integer as string) & "," & ((item 2 of p) as integer as string) & "," & ((item 1 of s) as integer as string) & "," & ((item 2 of s) as integer as string)\nend tell';

export async function captureArcWindow(): Promise<{ base64: string; mimeType: string }> {
  const geo = await runAppleScript(GEOMETRY_SCRIPT);
  if (!geo.ok) {
    throw new Error(
      `could not read Arc window geometry; grant Accessibility permission to the host app in System Settings > Privacy & Security > Accessibility (${geo.error ?? ""})`,
    );
  }
  const parts = geo.output.split(",").map((n) => parseInt(n.trim(), 10));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) {
    throw new Error(`unexpected window geometry: ${geo.output}`);
  }
  const [x, y, w, h] = parts as [number, number, number, number];
  const file = join(tmpdir(), `arc-mcp-shot-${process.pid}-${Date.now()}.jpg`);
  await new Promise<void>((resolve, reject) => {
    execFile("screencapture", ["-x", "-o", "-t", "jpg", `-R${x},${y},${w},${h}`, file], (err) => {
      if (err) {
        reject(
          new Error(
            `screencapture failed; grant Screen Recording permission in System Settings > Privacy & Security > Screen Recording (${err.message})`,
          ),
        );
        return;
      }
      resolve();
    });
  });
  await new Promise<void>((resolve) => {
    execFile("sips", ["-Z", "1280", "-s", "formatOptions", "70", file], () => resolve());
  });
  const buf = await readFile(file);
  await unlink(file).catch((e) => log.debug("temp cleanup failed", String(e)));
  return { base64: buf.toString("base64"), mimeType: "image/jpeg" };
}
