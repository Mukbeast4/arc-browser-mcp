import { execFile } from "node:child_process";

export interface OsaResult {
  ok: boolean;
  output: string;
  error?: string;
}

export function runAppleScript(script: string, timeoutMs = 20000): Promise<OsaResult> {
  return new Promise((resolve) => {
    execFile("osascript", ["-e", script], { timeout: timeoutMs }, (err, stdout, stderr) => {
      const output = (stdout ?? "").toString().trim();
      if (err) {
        const error = ((stderr ?? "").toString() || err.message).trim();
        resolve({ ok: false, output, error });
        return;
      }
      resolve({ ok: true, output });
    });
  });
}
