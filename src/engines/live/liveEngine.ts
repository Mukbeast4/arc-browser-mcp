import type { Engine, PageSnapshot, ScreenshotResult, TabInfo } from "../engine.js";
import { runAppleScript } from "./osascript.js";
import { captureArcWindow } from "./screenshot.js";
import { escapeForAppleScript, mapError } from "./appleScriptUtil.js";
import {
  SNAPSHOT_JS,
  GET_TEXT_JS,
  clickJs,
  fillJs,
  typeJs,
  evalExprJs,
  waitTextJs,
} from "./liveJs.js";
import { parsePageResult } from "./pageResult.js";
import { assertRef } from "../ref.js";
import { retry } from "../../lib/retry.js";
import { log } from "../../lib/log.js";

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const RS = "\x1e";
const US = "\x1f";

export class LiveEngine implements Engine {
  readonly name = "live" as const;

  async ensureReady(): Promise<void> {
    const r = await runAppleScript('tell application "Arc" to return name');
    if (!r.ok) throw new Error(mapError(r.error));
  }

  async dispose(): Promise<void> {}

  private async runPage<T = unknown>(inner: string): Promise<T> {
    const program = `(function(){try{return JSON.stringify({ok:true,value:(${inner})})}catch(e){return JSON.stringify({ok:false,error:String((e&&e.message)||e)})}})()`;
    const escaped = escapeForAppleScript(program);
    const script = `tell application "Arc"\ntell front window's active tab\nexecute javascript "${escaped}"\nend tell\nend tell`;
    const res = await retry(
      async () => {
        const r = await runAppleScript(script, 30000);
        if (!r.ok) throw new Error(mapError(r.error));
        return r;
      },
      { attempts: 3, baseMs: 400 },
    );
    return parsePageResult<T>(res.output);
  }

  private async waitLoaded(timeoutMs: number): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const r = await runAppleScript('tell application "Arc" to return loading of front window\'s active tab');
      if (r.ok && r.output.trim() === "false") return;
      await delay(300);
    }
  }

  async navigate(url: string): Promise<PageSnapshot> {
    const safe = escapeForAppleScript(url);
    const r = await runAppleScript(`tell application "Arc" to set URL of front window's active tab to "${safe}"`);
    if (!r.ok) throw new Error(mapError(r.error));
    await this.waitLoaded(20000);
    return this.snapshot();
  }

  async reload(): Promise<PageSnapshot> {
    const r = await runAppleScript("tell application \"Arc\" to tell front window's active tab to reload");
    if (!r.ok) throw new Error(mapError(r.error));
    await this.waitLoaded(20000);
    return this.snapshot();
  }

  async goBack(): Promise<PageSnapshot> {
    const r = await runAppleScript("tell application \"Arc\" to tell front window's active tab to go back");
    if (!r.ok) throw new Error(mapError(r.error));
    await this.waitLoaded(20000);
    return this.snapshot();
  }

  async goForward(): Promise<PageSnapshot> {
    const r = await runAppleScript("tell application \"Arc\" to tell front window's active tab to go forward");
    if (!r.ok) throw new Error(mapError(r.error));
    await this.waitLoaded(20000);
    return this.snapshot();
  }

  async snapshot(): Promise<PageSnapshot> {
    const v = await this.runPage<{ url: string; title: string; count: number; tree: string }>(SNAPSHOT_JS);
    return { url: v.url, title: v.title, tree: v.tree, refCount: v.count };
  }

  async click(ref: string): Promise<void> {
    assertRef(ref);
    await this.runPage(clickJs(ref));
  }

  async type(ref: string, text: string, submit: boolean): Promise<void> {
    assertRef(ref);
    await this.runPage(typeJs(ref, text, submit));
  }

  async fill(ref: string, value: string): Promise<void> {
    assertRef(ref);
    await this.runPage(fillJs(ref, value));
  }

  async getText(): Promise<string> {
    return this.runPage<string>(GET_TEXT_JS);
  }

  async evaluate(expression: string): Promise<unknown> {
    return this.runPage<unknown>(evalExprJs(expression));
  }

  async screenshot(_fullPage: boolean): Promise<ScreenshotResult> {
    return captureArcWindow();
  }

  async waitForText(text: string, timeoutMs: number): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const found = await this.runPage<boolean>(waitTextJs(text));
      if (found) return;
      await delay(400);
    }
    throw new Error(`timed out after ${timeoutMs}ms waiting for text: ${text}`);
  }

  async listTabs(): Promise<TabInfo[]> {
    const script = `tell application "Arc"
set rs to (ASCII character 30)
set us to (ASCII character 31)
set gs to (ASCII character 29)
set activeId to id of active tab of front window
set n to count of tabs of front window
set out to ""
repeat with i from 1 to n
set out to out & (id of tab i of front window) & us & (title of tab i of front window) & us & (URL of tab i of front window) & rs
end repeat
return activeId & gs & out
end tell`;
    const res = await runAppleScript(script);
    if (!res.ok) throw new Error(mapError(res.error));
    let out = res.output.trim();
    if (out.startsWith('"') && out.endsWith('"')) {
      try {
        out = JSON.parse(out) as string;
      } catch (e) {
        log.debug("listTabs unwrap failed", String(e));
      }
    }
    const gsIndex = out.indexOf("\x1d");
    const activeId = gsIndex >= 0 ? out.slice(0, gsIndex) : "";
    const blob = gsIndex >= 0 ? out.slice(gsIndex + 1) : out;
    const tabs: TabInfo[] = [];
    blob
      .split(RS)
      .filter((r) => r.length > 0)
      .forEach((rec, index) => {
        const fields = rec.split(US);
        tabs.push({
          index,
          title: fields[1] ?? "",
          url: fields[2] ?? "",
          active: (fields[0] ?? "") === activeId,
        });
      });
    return tabs;
  }

  async selectTab(index: number): Promise<void> {
    const r = await runAppleScript(`tell application "Arc" to tell tab ${index + 1} of front window to select`);
    if (!r.ok) throw new Error(mapError(r.error));
  }

  async openTab(url?: string): Promise<void> {
    const target = url && url.length > 0 ? url : "about:blank";
    const safe = escapeForAppleScript(target);
    const r = await runAppleScript(
      `tell application "Arc" to tell front window to make new tab with properties {URL:"${safe}"}`,
    );
    if (!r.ok) throw new Error(mapError(r.error));
  }

  async closeTab(index: number): Promise<void> {
    const r = await runAppleScript(`tell application "Arc" to tell tab ${index + 1} of front window to close`);
    if (!r.ok) throw new Error(mapError(r.error));
  }
}
