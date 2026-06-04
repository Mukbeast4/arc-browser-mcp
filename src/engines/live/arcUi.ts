import { runAppleScript } from "./osascript.js";
import { escapeForAppleScript, mapError } from "./appleScriptUtil.js";

const RS = "\x1e";
const US = "\x1f";
const GS = "\x1d";

export interface SpaceInfo {
  index: number;
  id: string;
  title: string;
  active: boolean;
}

export interface WindowInfo {
  index: number;
  id: string;
  name: string;
}

export interface ActiveState {
  window: string;
  space: string;
  tabTitle: string;
  tabUrl: string;
}

export async function listSpaces(): Promise<SpaceInfo[]> {
  const script = `tell application "Arc"
set us to (ASCII character 31)
set rs to (ASCII character 30)
set gs to (ASCII character 29)
set activeId to id of active space of front window
set n to count of spaces of front window
set out to ""
repeat with i from 1 to n
set out to out & (id of space i of front window) & us & (title of space i of front window) & rs
end repeat
return activeId & gs & out
end tell`;
  const res = await runAppleScript(script);
  if (!res.ok) throw new Error(mapError(res.error));
  const out = res.output.trim();
  const gsIndex = out.indexOf(GS);
  const activeId = gsIndex >= 0 ? out.slice(0, gsIndex) : "";
  const blob = gsIndex >= 0 ? out.slice(gsIndex + 1) : out;
  const spaces: SpaceInfo[] = [];
  blob
    .split(RS)
    .filter((r) => r.length > 0)
    .forEach((rec, index) => {
      const f = rec.split(US);
      spaces.push({ index, id: f[0] ?? "", title: f[1] ?? "", active: (f[0] ?? "") === activeId });
    });
  return spaces;
}

export async function focusSpace(target: string): Promise<SpaceInfo> {
  const spaces = await listSpaces();
  const match = spaces.find((s) => s.id === target || s.title === target);
  if (!match) {
    throw new Error(`space not found: ${target} (available: ${spaces.map((s) => s.title).join(", ")})`);
  }
  const r = await runAppleScript(`tell application "Arc" to tell space ${match.index + 1} of front window to focus`);
  if (!r.ok) throw new Error(mapError(r.error));
  return match;
}

export async function listWindows(): Promise<WindowInfo[]> {
  const script = `tell application "Arc"
set us to (ASCII character 31)
set rs to (ASCII character 30)
set n to count of windows
set out to ""
repeat with i from 1 to n
set out to out & (id of window i) & us & (name of window i) & rs
end repeat
return out
end tell`;
  const res = await runAppleScript(script);
  if (!res.ok) throw new Error(mapError(res.error));
  const windows: WindowInfo[] = [];
  res.output
    .trim()
    .split(RS)
    .filter((r) => r.length > 0)
    .forEach((rec, index) => {
      const f = rec.split(US);
      windows.push({ index, id: f[0] ?? "", name: f[1] ?? "" });
    });
  return windows;
}

export async function activeState(): Promise<ActiveState> {
  const script = `tell application "Arc"
set us to (ASCII character 31)
set wn to name of front window
set sp to title of active space of front window
set tt to title of active tab of front window
set tu to URL of active tab of front window
return wn & us & sp & us & tt & us & tu
end tell`;
  const res = await runAppleScript(script);
  if (!res.ok) throw new Error(mapError(res.error));
  const f = res.output.trim().split(US);
  return { window: f[0] ?? "", space: f[1] ?? "", tabTitle: f[2] ?? "", tabUrl: f[3] ?? "" };
}

export async function activeTabUrl(): Promise<string> {
  const r = await runAppleScript('tell application "Arc" to return URL of active tab of front window');
  if (!r.ok) return "";
  return r.output.trim().replace(/^"|"$/g, "");
}

export async function littleArc(url: string): Promise<void> {
  const safe = escapeForAppleScript(url);
  const r = await runAppleScript(`tell application "Arc" to make new tab with properties {URL:"${safe}"}`);
  if (!r.ok) throw new Error(mapError(r.error));
}
