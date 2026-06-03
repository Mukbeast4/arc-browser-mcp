import { test, expect, describe } from "bun:test";
import { retry } from "../src/lib/retry.ts";

const noSleep = async () => {};

describe("retry", () => {
  test("returns on the first success", async () => {
    let calls = 0;
    const r = await retry(
      async () => {
        calls++;
        return "ok";
      },
      { sleep: noSleep },
    );
    expect(r).toBe("ok");
    expect(calls).toBe(1);
  });

  test("retries until success", async () => {
    let calls = 0;
    const r = await retry(
      async () => {
        calls++;
        if (calls < 3) throw new Error("fail");
        return calls;
      },
      { sleep: noSleep, rng: () => 0 },
    );
    expect(r).toBe(3);
    expect(calls).toBe(3);
  });

  test("throws the last error after exhausting attempts", async () => {
    let calls = 0;
    await expect(
      retry(
        async () => {
          calls++;
          throw new Error(`fail-${calls}`);
        },
        { attempts: 2, sleep: noSleep, rng: () => 0 },
      ),
    ).rejects.toThrow("fail-2");
    expect(calls).toBe(2);
  });

  test("stops early when shouldRetry returns false", async () => {
    let calls = 0;
    await expect(
      retry(
        async () => {
          calls++;
          throw new Error("nope");
        },
        { sleep: noSleep, shouldRetry: () => false },
      ),
    ).rejects.toThrow("nope");
    expect(calls).toBe(1);
  });
});
