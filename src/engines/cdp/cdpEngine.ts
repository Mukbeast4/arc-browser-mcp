import type { Page } from "playwright-core";
import type { Engine, PageSnapshot, ScreenshotResult, TabInfo } from "../engine.js";
import type { Config } from "../../config.js";
import { spawnDedicatedArc, waitForCdp, type DedicatedArc } from "./launcher.js";
import { CdpConnection } from "./connection.js";
import { SNAPSHOT_JS, GET_TEXT_JS, evalExprJs, waitTextJs } from "../live/liveJs.js";
import { assertRef } from "../ref.js";

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

interface SnapshotValue {
  url: string;
  title: string;
  count: number;
  tree: string;
}

export class CdpEngine implements Engine {
  readonly name = "cdp" as const;
  private dedicated: DedicatedArc | null = null;
  private conn = new CdpConnection();

  constructor(private config: Config) {}

  async ensureReady(): Promise<void> {
    if (this.conn.connected) return;
    const port = this.config.cdpPort || 9222;
    if (this.config.cdpMode === "attach") {
      await this.conn.connect(port);
      return;
    }
    const proc = spawnDedicatedArc(this.config.arcBin, this.config.cdpProfileDir, port);
    this.dedicated = { proc, port };
    try {
      await waitForCdp(port);
      await this.conn.connect(port);
    } catch (err) {
      await this.dispose();
      throw err;
    }
  }

  async dispose(): Promise<void> {
    await this.conn.disconnect();
    if (this.dedicated) {
      const { proc } = this.dedicated;
      this.dedicated = null;
      try {
        proc.kill("SIGTERM");
      } catch {}
      await delay(1500);
      try {
        proc.kill("SIGKILL");
      } catch {}
    }
  }

  private async page(): Promise<Page> {
    await this.ensureReady();
    return this.conn.activePage();
  }

  private locator(page: Page, ref: string) {
    assertRef(ref);
    return page.locator(`[data-arcmcp-ref="${ref}"]`);
  }

  async navigate(url: string): Promise<PageSnapshot> {
    const page = await this.page();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    return this.snapshot();
  }

  async reload(): Promise<PageSnapshot> {
    const page = await this.page();
    await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
    return this.snapshot();
  }

  async goBack(): Promise<PageSnapshot> {
    const page = await this.page();
    await page.goBack({ waitUntil: "domcontentloaded", timeout: 30000 });
    return this.snapshot();
  }

  async goForward(): Promise<PageSnapshot> {
    const page = await this.page();
    await page.goForward({ waitUntil: "domcontentloaded", timeout: 30000 });
    return this.snapshot();
  }

  async snapshot(): Promise<PageSnapshot> {
    const page = await this.page();
    const v = (await page.evaluate(SNAPSHOT_JS)) as SnapshotValue;
    return { url: v.url, title: v.title, tree: v.tree, refCount: v.count };
  }

  async click(ref: string): Promise<void> {
    const page = await this.page();
    await this.locator(page, ref).click({ timeout: 10000 });
  }

  async type(ref: string, text: string, submit: boolean): Promise<void> {
    const page = await this.page();
    const loc = this.locator(page, ref);
    await loc.fill(text, { timeout: 10000 });
    if (submit) await loc.press("Enter");
  }

  async fill(ref: string, value: string): Promise<void> {
    const page = await this.page();
    await this.locator(page, ref).fill(value, { timeout: 10000 });
  }

  async getText(): Promise<string> {
    const page = await this.page();
    return (await page.evaluate(GET_TEXT_JS)) as string;
  }

  async evaluate(expression: string): Promise<unknown> {
    const page = await this.page();
    return page.evaluate(evalExprJs(expression));
  }

  async screenshot(fullPage: boolean): Promise<ScreenshotResult> {
    const page = await this.page();
    await page.setViewportSize({ width: 1280, height: 800 }).catch(() => {});
    await page.bringToFront().catch(() => {});
    const buf = await page.screenshot({ type: "jpeg", quality: 70, fullPage });
    return { base64: buf.toString("base64"), mimeType: "image/jpeg" };
  }

  async waitForText(text: string, timeoutMs: number): Promise<void> {
    const page = await this.page();
    await page.waitForFunction(waitTextJs(text), undefined, { timeout: timeoutMs });
  }

  async listTabs(): Promise<TabInfo[]> {
    await this.ensureReady();
    const pages = this.conn.pages();
    const active = await this.conn.activePage();
    const tabs: TabInfo[] = [];
    for (let i = 0; i < pages.length; i++) {
      const p = pages[i] as Page;
      let title = "";
      try {
        title = await p.title();
      } catch {}
      tabs.push({ index: i, title, url: p.url(), active: p === active });
    }
    return tabs;
  }

  async selectTab(index: number): Promise<void> {
    await this.ensureReady();
    this.conn.setActive(index);
    const pages = this.conn.pages();
    const p = pages[index];
    if (p) await p.bringToFront();
  }

  async openTab(url?: string): Promise<void> {
    await this.ensureReady();
    await this.conn.newPage(url);
  }

  async closeTab(index: number): Promise<void> {
    await this.ensureReady();
    const pages = this.conn.pages();
    const p = pages[index];
    if (p) await p.close();
  }
}
