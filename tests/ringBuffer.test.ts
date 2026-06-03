import { test, expect, describe } from "bun:test";
import { RingBuffer } from "../src/engines/cdp/ringBuffer.ts";

interface Item {
  id: number;
  v: string;
}

describe("RingBuffer", () => {
  test("assigns monotonic ids", () => {
    const b = new RingBuffer<Item>(10);
    expect(b.push({ id: -1, v: "a" })).toBe(0);
    expect(b.push({ id: -1, v: "b" })).toBe(1);
  });

  test("evicts the oldest entry at capacity", () => {
    const b = new RingBuffer<Item>(2);
    b.push({ id: -1, v: "a" });
    b.push({ id: -1, v: "b" });
    b.push({ id: -1, v: "c" });
    expect(b.size).toBe(2);
    expect(b.getById(0)).toBeUndefined();
    expect(b.getById(1)?.v).toBe("b");
    expect(b.getById(2)?.v).toBe("c");
  });

  test("slice paginates and reports the total", () => {
    const b = new RingBuffer<Item>(10);
    for (const v of ["a", "b", "c", "d"]) b.push({ id: -1, v });
    const page = b.slice(1, 2);
    expect(page.total).toBe(4);
    expect(page.items.map((i) => i.v)).toEqual(["b", "c"]);
  });

  test("slice applies a filter to both items and total", () => {
    const b = new RingBuffer<Item>(10);
    for (const v of ["a", "b", "a", "c"]) b.push({ id: -1, v });
    const page = b.slice(0, 10, (i) => i.v === "a");
    expect(page.total).toBe(2);
    expect(page.items.length).toBe(2);
  });

  test("clear resets contents and the id counter", () => {
    const b = new RingBuffer<Item>(10);
    b.push({ id: -1, v: "a" });
    b.clear();
    expect(b.size).toBe(0);
    expect(b.push({ id: -1, v: "b" })).toBe(0);
  });
});
