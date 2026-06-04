export interface PageSnapshot {
  url: string;
  title: string;
  tree: string;
  refCount: number;
}

export interface TabInfo {
  index: number;
  title: string;
  url: string;
  active: boolean;
  pageId?: number;
}

export interface ScreenshotResult {
  base64: string;
  mimeType: string;
}

export interface Engine {
  readonly name: EngineName;
  ensureReady(): Promise<void>;
  dispose(): Promise<void>;
  navigate(url: string): Promise<PageSnapshot>;
  reload(): Promise<PageSnapshot>;
  goBack(): Promise<PageSnapshot>;
  goForward(): Promise<PageSnapshot>;
  snapshot(): Promise<PageSnapshot>;
  currentUrl(): Promise<string>;
  click(ref: string): Promise<void>;
  type(ref: string, text: string, submit: boolean): Promise<void>;
  fill(ref: string, value: string): Promise<void>;
  getText(): Promise<string>;
  evaluate(expression: string): Promise<unknown>;
  screenshot(fullPage: boolean): Promise<ScreenshotResult>;
  waitForText(text: string, timeoutMs: number): Promise<void>;
  listTabs(): Promise<TabInfo[]>;
  selectTab(index: number): Promise<void>;
  openTab(url?: string): Promise<void>;
  closeTab(index: number): Promise<void>;
}

import type { EngineName } from "../config.js";
