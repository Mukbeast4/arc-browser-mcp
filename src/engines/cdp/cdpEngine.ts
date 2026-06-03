import type { Page } from "playwright-core";
import type { Engine, PageSnapshot, ScreenshotResult, TabInfo } from "../engine.js";
import type { Config } from "../../config.js";
import { spawnDedicatedArc, waitForCdp, type DedicatedArc } from "./launcher.js";
import { CdpConnection } from "./connection.js";
import { SNAPSHOT_JS, GET_TEXT_JS, evalExprJs, waitTextJs } from "../live/liveJs.js";
import { assertRef } from "../ref.js";
import { log } from "../../lib/log.js";
import type { CdpRecorder } from "./recorder.js";
import {
  startTrace as beginTrace,
  stopTrace as endTrace,
  emulate as applyEmulation,
  type TraceSession,
  type TraceSummary,
  type EmulateOptions,
} from "./cdpSession.js";

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
  private trace: TraceSession | null = null;

  constructor(private config: Config) {}

  async ensureReady(): Promise<void> {
    if (this.conn.connected) return;
    const port = this.config.cdpPort || 9222;
    const timeout = this.config.cdpTimeoutMs;
    const capture = this.config.cdpMode !== "attach" || this.config.allowAttachCapture;
    if (this.config.cdpMode === "attach") {
      await this.conn.connect(port, timeout, capture);
      return;
    }
    this.dedicated = spawnDedicatedArc(this.config.arcBin, this.config.cdpProfileDir, port);
    try {
      await waitForCdp(port, timeout);
      await this.conn.connect(port, timeout, capture);
    } catch (err) {
      const logs = this.dedicated?.recentLogs() ?? [];
      await this.dispose();
      const base = err instanceof Error ? err.message : String(err);
      const detail = logs.length > 0 ? `\nlast dedicated Arc output:\n${logs.join("\n")}` : "";
      throw new Error(base + detail);
    }
  }

  async dispose(): Promise<void> {
    this.trace = null;
    await this.conn.disconnect();
    if (this.dedicated) {
      const { proc } = this.dedicated;
      this.dedicated = null;
      try {
        proc.kill("SIGTERM");
      } catch (e) {
        log.debug("SIGTERM failed", String(e));
      }
      await delay(1500);
      try {
        proc.kill("SIGKILL");
      } catch (e) {
        log.debug("SIGKILL failed", String(e));
      }
    }
  }

  private async page(): Promise<Page> {
    return this.cdpPage();
  }

  async cdpPage(pageId?: number): Promise<Page> {
    await this.ensureReady();
    if (pageId !== undefined) {
      const page = this.conn.recorder.pageById(pageId);
      if (!page) throw new Error(`no page with pageId ${pageId}; run arc_list_tabs to see page ids`);
      return page;
    }
    return this.conn.activePage();
  }

  recorder(): CdpRecorder {
    return this.conn.recorder;
  }

  captureEnabled(): boolean {
    return this.conn.captureEnabled;
  }

  async startTrace(categories?: string): Promise<void> {
    if (this.trace) throw new Error("a performance trace is already running; stop it first");
    this.trace = await beginTrace(await this.cdpPage(), categories);
  }

  async stopTrace(): Promise<TraceSummary> {
    if (!this.trace) throw new Error("no performance trace is running; start one first");
    const summary = await endTrace(this.trace);
    this.trace = null;
    return summary;
  }

  async emulate(opts: EmulateOptions): Promise<string[]> {
    return applyEmulation(await this.cdpPage(), opts);
  }

  async resizePage(width: number, height: number): Promise<boolean> {
    const page = await this.cdpPage();
    let okFlag = true;
    await page.setViewportSize({ width, height }).catch((e) => {
      log.debug("resize failed", String(e));
      okFlag = false;
    });
    return okFlag;
  }

  async hover(ref: string): Promise<void> {
    const page = await this.cdpPage();
    await this.locator(page, ref).hover({ timeout: 10000 });
  }

  async drag(fromRef: string, toRef: string): Promise<void> {
    const page = await this.cdpPage();
    await this.locator(page, fromRef).dragTo(this.locator(page, toRef), { timeout: 10000 });
  }

  async pressKey(key: string, ref?: string): Promise<void> {
    const page = await this.cdpPage();
    if (ref !== undefined) await this.locator(page, ref).press(key, { timeout: 10000 });
    else await page.keyboard.press(key);
  }

  async fillForm(fields: Array<{ ref: string; value: string }>): Promise<number> {
    const page = await this.cdpPage();
    for (const f of fields) await this.locator(page, f.ref).fill(f.value, { timeout: 10000 });
    return fields.length;
  }

  async uploadFile(ref: string, paths: string[]): Promise<void> {
    const page = await this.cdpPage();
    await this.locator(page, ref).setInputFiles(paths, { timeout: 10000 });
  }

  async handleDialog(action: "accept" | "dismiss", promptText?: string): Promise<string> {
    const page = await this.cdpPage();
    const dialog = this.conn.recorder.takeDialog(page);
    if (!dialog) throw new Error("no pending dialog on the active page");
    const type = dialog.type();
    if (action === "accept") await dialog.accept(promptText);
    else await dialog.dismiss();
    return type;
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
      tabs.push({ index: i, title, url: p.url(), active: p === active, pageId: this.conn.recorder.pageIdOf(p) });
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
