import { spawn, execSync, type ChildProcess } from "node:child_process";
import { mkdirSync } from "node:fs";

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export interface DedicatedArc {
  proc: ChildProcess;
  port: number;
}

export function spawnDedicatedArc(bin: string, profileDir: string, port: number): ChildProcess {
  mkdirSync(profileDir, { recursive: true });
  return spawn(
    bin,
    [
      `--user-data-dir=${profileDir}`,
      `--remote-debugging-port=${port}`,
      "--remote-allow-origins=*",
      "--no-first-run",
      "--no-default-browser-check",
    ],
    { stdio: ["ignore", "ignore", "ignore"] },
  );
}

export async function waitForCdp(port: number, timeoutMs = 30000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await delay(500);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return;
    } catch {}
  }
  throw new Error(
    `dedicated Arc did not expose CDP on port ${port} within ${Math.round(timeoutMs / 1000)}s. Another Arc instance must be closed first (Arc is single-instance).`,
  );
}

export function isArcRunning(): boolean {
  try {
    return execSync(`pgrep -f "Arc.app/Contents/MacOS/Arc" || true`).toString().trim().length > 0;
  } catch {
    return false;
  }
}

export async function quitArcGracefully(timeoutMs = 15000): Promise<boolean> {
  try {
    execSync(`osascript -e 'tell application "Arc" to quit'`);
  } catch {}
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (!isArcRunning()) return true;
    await delay(400);
  }
  return !isArcRunning();
}

export async function relaunchUserArc(): Promise<boolean> {
  await delay(1500);
  for (let i = 0; i < 5; i++) {
    try {
      execSync(`open -a "Arc"`, { stdio: "ignore" });
    } catch {}
    await delay(1200);
    if (isArcRunning()) return true;
  }
  return isArcRunning();
}
