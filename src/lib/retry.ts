const sleepDefault = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export interface RetryOptions {
  attempts?: number;
  baseMs?: number;
  maxMs?: number;
  rng?: () => number;
  sleep?: (ms: number) => Promise<void>;
  shouldRetry?: (error: unknown) => boolean;
}

export async function retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const attempts = options.attempts ?? 3;
  const baseMs = options.baseMs ?? 300;
  const maxMs = options.maxMs ?? 3000;
  const rng = options.rng ?? Math.random;
  const sleep = options.sleep ?? sleepDefault;
  const shouldRetry = options.shouldRetry ?? (() => true);
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === attempts - 1 || !shouldRetry(error)) break;
      const backoff = Math.min(maxMs, baseMs * 2 ** attempt);
      await sleep(Math.round(backoff + rng() * baseMs));
    }
  }
  throw lastError;
}
