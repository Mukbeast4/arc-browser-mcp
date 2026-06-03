import type { Config, EngineName } from "./config.js";
import type { SerialQueue } from "./lib/queue.js";
import type { Engine } from "./engines/engine.js";

export interface ServerContext {
  config: Config;
  queue: SerialQueue;
  live: Engine;
  cdp: Engine;
  active: EngineName;
}

export function currentEngine(ctx: ServerContext): Engine {
  return ctx.active === "cdp" ? ctx.cdp : ctx.live;
}
