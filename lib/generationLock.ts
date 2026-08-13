/**
 * In-process lock preventing duplicate concurrent AI block-generation requests
 * for the same client — e.g. a page refresh mid-generation followed by
 * clicking "Generate" again, or two tabs open on the same client. The
 * client-side "disabled while generating" button state doesn't survive a
 * page refresh, so nothing previously stopped a second full (up to 18-call)
 * generation from starting for the same client while one was still running.
 *
 * This app runs as a single standalone Next.js container (output: standalone
 * on Coolify — not serverless-per-request, not horizontally scaled), so
 * in-memory state persists for the container's lifetime and is a valid guard
 * here. It would NOT be sufficient if this app were ever deployed across
 * multiple replicas — that would need a DB-backed lock instead.
 *
 * 2026-08-13: added after a burst of block-generation activity burned ~£30 of
 * OpenRouter credit in 5 minutes.
 */

const MAX_LOCK_AGE_MS = 5 * 60 * 1000; // safety valve: a crashed request can never wedge this lock for more than 5 minutes
const inFlight = new Map<string, number>(); // client id -> acquired-at timestamp

export function tryAcquireGenerationLock(key: string): boolean {
  const acquiredAt = inFlight.get(key);
  if (acquiredAt !== undefined && Date.now() - acquiredAt < MAX_LOCK_AGE_MS) {
    return false;
  }
  inFlight.set(key, Date.now());
  return true;
}

export function releaseGenerationLock(key: string): void {
  inFlight.delete(key);
}
