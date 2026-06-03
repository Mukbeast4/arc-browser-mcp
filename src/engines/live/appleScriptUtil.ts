export function escapeForAppleScript(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "").replace(/\n/g, "\\n");
}

export function mapError(err: string | undefined): string {
  const e = err ?? "";
  if (/not allowed|-1743|assistive|not authori/i.test(e)) {
    return `Automation permission denied. Allow control of Arc in System Settings > Privacy & Security > Automation, then retry. (${e})`;
  }
  if (/can.t get|window 1|invalid index|missing value|type specifier|type text/i.test(e)) {
    return `Could not address the Arc window/tab/space. Open an Arc window and retry. (${e})`;
  }
  return e || "AppleScript error";
}
