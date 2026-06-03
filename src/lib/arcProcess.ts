import { execFile } from "node:child_process";

export interface ArcProcess {
  pid: number;
  dedicated: boolean;
  command: string;
}

export function parsePsOutput(stdout: string): ArcProcess[] {
  const procs: ArcProcess[] = [];
  for (const raw of stdout.trim().split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const gap = line.indexOf(" ");
    if (gap < 0) continue;
    const pid = parseInt(line.slice(0, gap), 10);
    if (Number.isNaN(pid)) continue;
    const command = line.slice(gap + 1);
    const dedicated = command.includes("--remote-debugging-port") || command.includes("arc-mcp");
    procs.push({ pid, dedicated, command });
  }
  return procs;
}

export function listArcProcesses(): Promise<ArcProcess[]> {
  return new Promise((resolve) => {
    execFile(
      "/bin/sh",
      ["-c", 'ps -Ao pid=,command= | grep "Arc.app/Contents/MacOS/Arc" | grep -v grep'],
      (_err, stdout) => {
        resolve(stdout ? parsePsOutput(stdout.toString()) : []);
      },
    );
  });
}
