import type {
  Browser,
  BrowserContext,
  Page,
  Request,
  Response,
  ConsoleMessage,
  Dialog,
} from "playwright-core";
import { RingBuffer } from "./ringBuffer.js";
import { log } from "../../lib/log.js";

const CONSOLE_CAP = 500;
const NETWORK_CAP = 500;
const CONSOLE_TEXT_CAP = 2000;
const DIALOG_AUTO_DISMISS_MS = 30000;

export interface ConsoleEntry {
  id: number;
  type: string;
  text: string;
  url: string;
  line: number;
  timestamp: number;
}

export interface NetworkEntry {
  id: number;
  method: string;
  url: string;
  resourceType: string;
  status: number | null;
  statusText: string;
  ok: boolean;
  failed: boolean;
  failureText: string;
  startedAt: number;
  durationMs: number | null;
  response: Response | null;
}

export interface PageBuffers {
  pageId: number;
  console: RingBuffer<ConsoleEntry>;
  network: RingBuffer<NetworkEntry>;
  byRequest: WeakMap<Request, NetworkEntry>;
  pendingDialog: Dialog | null;
  dialogTimer: ReturnType<typeof setTimeout> | null;
}

export class CdpRecorder {
  private buffers = new Map<Page, PageBuffers>();
  private attached = new WeakSet<Page>();
  private nextPageId = 1;

  attachAll(browser: Browser): void {
    for (const ctx of browser.contexts()) {
      this.watch(ctx);
      for (const page of ctx.pages()) this.attach(page);
    }
  }

  watch(ctx: BrowserContext): void {
    ctx.on("page", (page) => this.attach(page));
  }

  attach(page: Page): void {
    if (this.attached.has(page)) return;
    this.attached.add(page);
    const buf: PageBuffers = {
      pageId: this.nextPageId++,
      console: new RingBuffer<ConsoleEntry>(CONSOLE_CAP),
      network: new RingBuffer<NetworkEntry>(NETWORK_CAP),
      byRequest: new WeakMap(),
      pendingDialog: null,
      dialogTimer: null,
    };
    this.buffers.set(page, buf);

    page.on("console", (msg: ConsoleMessage) => {
      const loc = msg.location();
      buf.console.push({
        id: 0,
        type: msg.type(),
        text: msg.text().slice(0, CONSOLE_TEXT_CAP),
        url: loc.url,
        line: loc.lineNumber,
        timestamp: Date.now(),
      });
    });
    page.on("pageerror", (err: Error) => {
      buf.console.push({
        id: 0,
        type: "error",
        text: (err.stack || err.message || String(err)).slice(0, CONSOLE_TEXT_CAP),
        url: "",
        line: 0,
        timestamp: Date.now(),
      });
    });
    page.on("request", (req: Request) => {
      const entry: NetworkEntry = {
        id: 0,
        method: req.method(),
        url: req.url(),
        resourceType: req.resourceType(),
        status: null,
        statusText: "",
        ok: false,
        failed: false,
        failureText: "",
        startedAt: Date.now(),
        durationMs: null,
        response: null,
      };
      buf.network.push(entry);
      buf.byRequest.set(req, entry);
    });
    page.on("response", (res: Response) => {
      const entry = buf.byRequest.get(res.request());
      if (!entry) return;
      entry.status = res.status();
      entry.statusText = res.statusText();
      entry.ok = res.ok();
      entry.response = res;
    });
    page.on("requestfinished", (req: Request) => {
      const entry = buf.byRequest.get(req);
      if (!entry) return;
      const timing = req.timing();
      if (timing && timing.responseEnd >= 0) entry.durationMs = Math.round(timing.responseEnd);
    });
    page.on("requestfailed", (req: Request) => {
      const entry = buf.byRequest.get(req);
      if (!entry) return;
      entry.failed = true;
      entry.failureText = req.failure()?.errorText ?? "failed";
    });
    page.on("dialog", (dialog: Dialog) => {
      if (buf.dialogTimer) clearTimeout(buf.dialogTimer);
      buf.pendingDialog = dialog;
      buf.dialogTimer = setTimeout(() => {
        if (buf.pendingDialog === dialog) {
          buf.pendingDialog = null;
          buf.dialogTimer = null;
          dialog.dismiss().catch(() => {});
        }
      }, DIALOG_AUTO_DISMISS_MS);
      buf.dialogTimer.unref();
    });
    page.on("close", () => {
      if (buf.dialogTimer) clearTimeout(buf.dialogTimer);
      this.buffers.delete(page);
      this.attached.delete(page);
    });
    log.debug("recorder attached", { pageId: buf.pageId });
  }

  buffersFor(page: Page): PageBuffers | undefined {
    return this.buffers.get(page);
  }

  pageIdOf(page: Page): number | undefined {
    return this.buffers.get(page)?.pageId;
  }

  pageById(pageId: number): Page | undefined {
    for (const [page, buf] of this.buffers) {
      if (buf.pageId === pageId) return page;
    }
    return undefined;
  }

  takeDialog(page: Page): Dialog | null {
    const buf = this.buffers.get(page);
    if (!buf) return null;
    const dialog = buf.pendingDialog;
    buf.pendingDialog = null;
    if (buf.dialogTimer) {
      clearTimeout(buf.dialogTimer);
      buf.dialogTimer = null;
    }
    return dialog;
  }

  clear(): void {
    this.buffers.clear();
  }
}
