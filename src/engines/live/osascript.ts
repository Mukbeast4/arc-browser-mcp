import { execFile } from "node:child_process";
import { log } from "../../lib/log.js";

export interface OsaResult {
  ok: boolean;
  output: string;
  error?: string;
}

export function runAppleScript(script: string, timeoutMs = 20000): Promise<OsaResult> {
  return new Promise((resolve) => {
    log.debug("osascript", { script: script.slice(0, 200) });
    execFile("osascript", ["-e", script], { timeout: timeoutMs }, (err, stdout, stderr) => {
      const output = (stdout ?? "").toString().trim();
      if (err) {
        const error = ((stderr ?? "").toString() || err.message).trim();
        log.warn("osascript failed", { error, output: output.slice(0, 200) });
        resolve({ ok: false, output, error });
        return;
      }
      resolve({ ok: true, output });
    });
  });
}
