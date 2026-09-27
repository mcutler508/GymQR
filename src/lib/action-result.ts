/**
 * Server actions must not throw for expected failures: in production Next.js
 * replaces any thrown error's message with a generic "An error occurred in the
 * Server Components render…" string, so "wrong passcode" or "name taken" never
 * reaches the member. Actions return an ActionResult instead; the client calls
 * `unwrap` to get the data or a real Error with the real message.
 */
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function toResult<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Something went wrong.' };
  }
}

export function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) throw new Error(result.error);
  return result.data;
}
