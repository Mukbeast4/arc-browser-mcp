import { execFile } from "node:child_process";

export interface ArcProcess {
  pid: number;
  dedicated: boolean;
  command: string;
}

export function listArcProcesses(): Promise<ArcProcess[]> {
  return new Promise((resolve) => {
    execFile(
      "/bin/sh",
      ["-c", 'ps -Ao pid=,command= | grep "Arc.app/Contents/MacOS/Arc" | grep -v grep'],
      (_err, stdout) => {
        if (!stdout) {
          resolve([]);
          return;
        }
        const procs: ArcProcess[] = [];
        for (const raw of stdout.toString().trim().split("\n")) {
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
        resolve(procs);
      },
    );
  });
}
