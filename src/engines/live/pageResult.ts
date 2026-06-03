export interface PageResult<T> {
  ok: boolean;
  value?: T;
  error?: string;
}

export function parsePageResult<T>(output: string): T {
  const trimmed = output.trim();
  if (!trimmed) {
    throw new Error("empty result from page (is JavaScript from Apple Events enabled in Arc?)");
  }
  let parsed: PageResult<T>;
  try {
    let raw: unknown = JSON.parse(trimmed);
    if (typeof raw === "string") raw = JSON.parse(raw);
    if (typeof raw !== "object" || raw === null) throw new Error("not an object");
    parsed = raw as PageResult<T>;
  } catch {
    throw new Error(`could not parse page result: ${output.slice(0, 200)}`);
  }
  if (parsed.ok !== true) throw new Error(parsed.error ?? "page evaluation failed");
  return parsed.value as T;
}
