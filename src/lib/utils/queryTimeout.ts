/**
 * Wraps a promise with a timeout. If the promise doesn't resolve within
 * the given duration, resolves with the fallback value instead of hanging.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
  ]);
}
