/**
 * Client-side offline queue for set-log writes (lane L5b).
 *
 * When the trainer taps Done/Skip on the live train screen while the device is
 * offline, the write is parked here in IndexedDB instead of being lost. When
 * connectivity returns (the `online` event, or a fresh mount after a reload)
 * the queue is drained sequentially and each entry is replayed against
 * `/api/sessions/[id]/set-logs` with its idempotency key (`client_op_id`) and
 * its original `capturedAt` timestamp sent as `logged_at`.
 *
 * Deliberately framework-free and dependency-free — a thin wrapper over the
 * native `indexedDB` API. This is foreground code (no Service Worker), so it
 * only ever runs in a browser context where `indexedDB` exists.
 */

export interface PendingSetLogEntry {
  /** Client-generated idempotency key. Stable across replays of one write, so a
   *  replayed POST cannot produce a duplicate set_logs row. */
  client_op_id: string;
  sessionId: string;
  /** `${version}:${section}:${index}:${exercise_name}` — used to re-locate the
   *  in-memory set on the screen after a successful replay. */
  exerciseRef: string;
  /** 1-based set number, matching the `set_number` column. */
  setNumber: number;
  /** "POST" for a new set, "PATCH" for an already-saved set. */
  method: "POST" | "PATCH";
  /** The request body exactly as it would have been sent live (no idempotency
   *  key, no timestamp — those are added at replay time). */
  body: Record<string, unknown>;
  /** The instant the trainer tapped Done/Skip — becomes `logged_at` on replay,
   *  NOT the time it eventually syncs. */
  capturedAt: string;
  /** The instant the entry was written to the queue (ordering tie-breaker). */
  queuedAt: string;
}

const DB_NAME = "ef-hub-offline-queue";
const STORE_NAME = "pending-set-logs";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

/** Opens (creating if necessary) the queue database and its object store. */
export function openQueueDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this environment"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "client_op_id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open offline queue database"));
    request.onblocked = () => reject(new Error("Offline queue database open blocked"));
  });

  return dbPromise;
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openQueueDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const request = run(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}

/**
 * Add (or, if a write already exists for the same idempotency key, replace) one
 * pending write. `put` semantics are deliberate: re-tapping a queued set while
 * still offline overwrites the earlier queued write rather than stacking a
 * second, conflicting entry under a different key.
 */
export async function enqueue(entry: PendingSetLogEntry): Promise<void> {
  await withStore("readwrite", (store) => store.put(entry));
}

/** Returns every queued entry, oldest first (by `queuedAt`). */
export async function getAllPending(): Promise<PendingSetLogEntry[]> {
  const all = await withStore<PendingSetLogEntry[]>(
    "readonly",
    (store) => store.getAll() as IDBRequest<PendingSetLogEntry[]>,
  );
  return [...all].sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
}

/** Deletes one entry after it has been successfully replayed. */
export async function remove(client_op_id: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(client_op_id));
}
