import type { Page, CDPSession } from "playwright-core";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

interface LooseSession {
  send(method: string, params?: unknown): Promise<unknown>;
  on(event: string, listener: (params: unknown) => void): void;
  detach(): Promise<void>;
}

function loose(s: CDPSession): LooseSession {
  return s as unknown as LooseSession;
}

export interface TraceSession {
  raw: CDPSession;
  events: unknown[];
  startedAt: number;
}

export interface TraceSummary {
  events: number;
  durationMs: number;
  metrics: Record<string, number>;
}

export interface EmulateOptions {
  width?: number;
  height?: number;
  userAgent?: string;
  cpuThrottling?: number;
  networkThrottling?: "offline" | "slow-3g" | "fast-3g" | "none";
  latitude?: number;
  longitude?: number;
}

const NETWORK_PROFILES: Record<string, Record<string, number | boolean>> = {
  offline: { offline: true, downloadThroughput: 0, uploadThroughput: 0, latency: 0 },
  "slow-3g": { offline: false, downloadThroughput: 65536, uploadThroughput: 32768, latency: 400 },
  "fast-3g": { offline: false, downloadThroughput: 196608, uploadThroughput: 98304, latency: 150 },
  none: { offline: false, downloadThroughput: -1, uploadThroughput: -1, latency: 0 },
};

export async function startTrace(page: Page, categories?: string): Promise<TraceSession> {
  const raw = await page.context().newCDPSession(page);
  const s = loose(raw);
  const events: unknown[] = [];
  s.on("Tracing.dataCollected", (p) => {
    const value = (p as { value?: unknown[] }).value;
    if (Array.isArray(value)) events.push(...value);
  });
  const params: Record<string, unknown> = { transferMode: "ReportEvents" };
  if (categories) params.categories = categories;
  await s.send("Tracing.start", params);
  return { raw, events, startedAt: Date.now() };
}

export async function stopTrace(trace: TraceSession): Promise<TraceSummary> {
  const s = loose(trace.raw);
  const complete = new Promise<void>((resolve) => s.on("Tracing.tracingComplete", () => resolve()));
  await s.send("Tracing.end");
  await Promise.race([complete, new Promise<void>((r) => setTimeout(r, 5000))]);
  await s.detach().catch(() => {});
  return {
    events: trace.events.length,
    durationMs: Date.now() - trace.startedAt,
    metrics: traceMetrics(trace.events),
  };
}

function traceMetrics(events: unknown[]): Record<string, number> {
  const metrics: Record<string, number> = {};
  let minTs = Infinity;
  let maxTs = -Infinity;
  for (const e of events) {
    const ts = (e as { ts?: number }).ts;
    if (typeof ts === "number") {
      if (ts < minTs) minTs = ts;
      if (ts > maxTs) maxTs = ts;
    }
  }
  if (maxTs > minTs) metrics.traceSpanMs = Math.round((maxTs - minTs) / 1000);
  return metrics;
}

export async function emulate(page: Page, opts: EmulateOptions): Promise<string[]> {
  const s = loose(await page.context().newCDPSession(page));
  const applied: string[] = [];
  if (opts.width !== undefined && opts.height !== undefined) {
    await s.send("Emulation.setDeviceMetricsOverride", {
      width: opts.width,
      height: opts.height,
      deviceScaleFactor: 0,
      mobile: false,
    });
    applied.push(`viewport ${opts.width}x${opts.height}`);
  }
  if (opts.userAgent !== undefined) {
    await s.send("Emulation.setUserAgentOverride", { userAgent: opts.userAgent });
    applied.push("userAgent overridden");
  }
  if (opts.cpuThrottling !== undefined) {
    await s.send("Emulation.setCPUThrottlingRate", { rate: opts.cpuThrottling });
    applied.push(`cpuThrottling ${opts.cpuThrottling}x`);
  }
  if (opts.networkThrottling !== undefined) {
    await s.send("Network.enable");
    await s.send("Network.emulateNetworkConditions", NETWORK_PROFILES[opts.networkThrottling]);
    applied.push(`network ${opts.networkThrottling}`);
  }
  if (opts.latitude !== undefined && opts.longitude !== undefined) {
    await s.send("Emulation.setGeolocationOverride", {
      latitude: opts.latitude,
      longitude: opts.longitude,
      accuracy: 1,
    });
    applied.push(`geolocation ${opts.latitude},${opts.longitude}`);
  }
  return applied;
}

export interface HeapSnapshotResult {
  path: string;
  bytes: number;
  nodeCount: number | null;
}

export async function takeHeapSnapshot(page: Page): Promise<HeapSnapshotResult> {
  const s = loose(await page.context().newCDPSession(page));
  const chunks: string[] = [];
  s.on("HeapProfiler.addHeapSnapshotChunk", (p) => {
    const chunk = (p as { chunk?: string }).chunk;
    if (typeof chunk === "string") chunks.push(chunk);
  });
  await s.send("HeapProfiler.enable");
  await s.send("HeapProfiler.takeHeapSnapshot", { reportProgress: false, captureNumericValue: false });
  await s.detach().catch(() => {});
  const data = chunks.join("");
  const path = join(tmpdir(), `arc-mcp-heap-${process.pid}-${Date.now()}.heapsnapshot`);
  await writeFile(path, data, "utf8");
  const match = data.slice(0, 4096).match(/"node_count":(\d+)/);
  return { path, bytes: Buffer.byteLength(data), nodeCount: match ? parseInt(match[1], 10) : null };
}
