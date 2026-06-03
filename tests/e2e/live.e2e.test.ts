import { test, expect, describe } from "bun:test";
import { LiveEngine } from "../../src/engines/live/liveEngine.ts";

const enabled = process.env.ARC_MCP_E2E === "1";
const itLive = enabled ? test : test.skip;

describe("live engine e2e (needs a running Arc with Automation + JavaScript from Apple Events)", () => {
  itLive(
    "navigates, snapshots, and reads text from example.com",
    async () => {
      const engine = new LiveEngine();
      await engine.ensureReady();
      const snap = await engine.navigate("https://example.com");
      expect(snap.title.toLowerCase()).toContain("example");
      expect(snap.refCount).toBeGreaterThan(0);
      const text = await engine.getText();
      expect(text.length).toBeGreaterThan(0);
    },
    30000,
  );
});
