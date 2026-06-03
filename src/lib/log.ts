type Level = "debug" | "info" | "warn" | "error";

function serialize(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function emit(level: Level, message: string, meta?: unknown): void {
  const suffix = meta === undefined ? "" : " " + serialize(meta);
  process.stderr.write(`[arc-mcp] ${level} ${message}${suffix}\n`);
}

export const log = {
  debug: (message: string, meta?: unknown) => emit("debug", message, meta),
  info: (message: string, meta?: unknown) => emit("info", message, meta),
  warn: (message: string, meta?: unknown) => emit("warn", message, meta),
  error: (message: string, meta?: unknown) => emit("error", message, meta),
};
