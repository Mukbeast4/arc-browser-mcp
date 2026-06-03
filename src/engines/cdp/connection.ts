import { chromium, type Browser, type Page } from "playwright-core";
import { log } from "../../lib/log.js";

export class CdpConnection {
  private browser: Browser | null = null;
  private active: Page | null = null;

  async connect(port: number, timeoutMs = 20000): Promise<void> {
    this.browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, { timeout: timeoutMs });
    this.browser.on("disconnected", () => {
      log.debug("cdp disconnected");
      this.browser = null;
      this.active = null;
    });
  }

  get connected(): boolean {
    return this.browser !== null;
  }

  pages(): Page[] {
    if (!this.browser) return [];
    const out: Page[] = [];
    for (const ctx of this.browser.contexts()) {
      for (const p of ctx.pages()) {
        if (!p.isClosed()) out.push(p);
      }
    }
    return out;
  }

  async activePage(): Promise<Page> {
    if (!this.browser) throw new Error("CDP not connected");
    const pages = this.pages();
    if (this.active && !this.active.isClosed() && pages.indexOf(this.active) >= 0) {
      return this.active;
    }
    if (pages.length === 0) {
      const ctx = this.browser.contexts()[0] ?? (await this.browser.newContext());
      this.active = await ctx.newPage();
      await this.active.setViewportSize({ width: 1280, height: 800 }).catch(() => {});
      return this.active;
    }
    this.active = pages[0] as Page;
    return this.active;
  }

  setActive(index: number): void {
    const p = this.pages()[index];
    if (p) this.active = p;
  }

  async newPage(url?: string): Promise<Page> {
    if (!this.browser) throw new Error("CDP not connected");
    const ctx = this.browser.contexts()[0] ?? (await this.browser.newContext());
    const page = await ctx.newPage();
    await page.setViewportSize({ width: 1280, height: 800 }).catch(() => {});
    if (url) await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    this.active = page;
    return page;
  }

  async disconnect(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (e) {
        log.debug("browser close failed", String(e));
      }
      this.browser = null;
      this.active = null;
    }
  }
}
