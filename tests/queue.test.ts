import { test, expect, describe } from "bun:test";
import { SerialQueue } from "../src/lib/queue.ts";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("SerialQueue", () => {
  test("runs tasks serially regardless of their duration", async () => {
    const q = new SerialQueue();
    const events: string[] = [];
    const mk = (name: string, ms: number) => async () => {
      events.push(`start:${name}`);
      await delay(ms);
      events.push(`end:${name}`);
    };
    const p1 = q.run(mk("a", 30));
    const p2 = q.run(mk("b", 5));
    const p3 = q.run(mk("c", 1));
    await Promise.all([p1, p2, p3]);
    expect(events).toEqual([
      "start:a",
      "end:a",
      "start:b",
      "end:b",
      "start:c",
      "end:c",
    ]);
  });

  test("a rejected task does not break the chain", async () => {
    const q = new SerialQueue();
    const bad = q.run(async () => {
      throw new Error("boom");
    });
    await expect(bad).rejects.toThrow("boom");
    const good = await q.run(async () => 42);
    expect(good).toBe(42);
  });
});
