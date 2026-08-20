import type { HistoryEntryRecord } from "./useDb";

interface SessionsGetResponse {
    entries?: HistoryEntryRecord[];
}

function entryKey(entry: HistoryEntryRecord): string {
    return entry.archivedAt || entry.generatedAt || "";
}

function entryTimestamp(entry: HistoryEntryRecord): number {
    return new Date((entry.updatedAt as string) || entry.archivedAt || entry.generatedAt || 0).getTime();
}

/**
 * Unions local and server entries, keyed by archivedAt (falling back to
 * generatedAt), keeping whichever side was updated most recently. This is
 * always a superset of both inputs, which is what makes it safe to push
 * back to the server afterwards (see mergeAndSync below) — a plain
 * "push local as-is" would silently wipe server data if local IndexedDB is
 * empty (e.g. first login on a new device).
 */
export function mergeHistoryEntries(
    local: HistoryEntryRecord[],
    server: HistoryEntryRecord[],
): HistoryEntryRecord[] {
    const byKey = new Map<string, HistoryEntryRecord>();
    for (const entry of server) {
        const key = entryKey(entry);
        if (key) byKey.set(key, entry);
    }
    for (const entry of local) {
        const key = entryKey(entry);
        if (!key) continue;
        const existing = byKey.get(key);
        if (!existing || entryTimestamp(entry) >= entryTimestamp(existing)) {
            byKey.set(key, entry);
        }
    }
    return [...byKey.values()];
}

/**
 * Offline-first sync of the local IndexedDB history entries against
 * functions/api/users/sessions.js. That endpoint always replaces the full
 * set server-side (DELETE + re-INSERT), so a raw push sends the whole local
 * table and a raw pull returns the whole server table — callers must be
 * careful never to push a table that hasn't first been merged with the
 * server's copy (see mergeAndSync).
 */
export function useSync() {
    const { isOnline } = useOnline();
    const { token, isAuthenticated, handleAuthFailure } = useAuth();
    const syncing = useState<boolean>("sync-in-progress", () => false);
    const lastSyncedAt = useState<string>("sync-last-at", () => "");

    async function pushHistoryToServer(): Promise<boolean> {
        if (!import.meta.client || !isOnline.value || !isAuthenticated.value) return false;
        if (syncing.value) return false;

        syncing.value = true;
        try {
            const entries = await useDb().historyEntries.toArray();
            const payload = entries.map(({ localId, dirty, ...rest }) => rest);

            const res = await $fetch.raw("/api/users/sessions", {
                method: "PUT",
                headers: { authorization: `Bearer ${token.value}` },
                body: { entries: payload },
                ignoreResponseError: true,
            });

            if (res.status === 401) {
                await handleAuthFailure((res._data as { error?: string } | undefined)?.error);
                return false;
            }
            if (res.status < 200 || res.status >= 300) return false;

            await useDb().historyEntries.toCollection().modify({ dirty: 0 });
            lastSyncedAt.value = new Date().toISOString();
            return true;
        } catch {
            // Network failure: entries stay marked dirty locally and will be
            // retried on the next reconnect/login (see app/plugins/auto-sync.client.ts).
            return false;
        } finally {
            syncing.value = false;
        }
    }

    async function pullHistoryFromServer(): Promise<HistoryEntryRecord[] | null> {
        if (!import.meta.client || !isOnline.value || !isAuthenticated.value) return null;

        try {
            const res = await $fetch.raw<SessionsGetResponse>("/api/users/sessions", {
                headers: { authorization: `Bearer ${token.value}` },
                ignoreResponseError: true,
            });

            if (res.status === 401) {
                await handleAuthFailure((res._data as { error?: string } | undefined)?.error);
                return null;
            }
            if (res.status < 200 || res.status >= 300) return null;

            return res._data?.entries ?? [];
        } catch {
            return null;
        }
    }

    /**
     * Safe to call automatically (e.g. on login / reconnect): pulls the
     * server's entries, unions them with whatever is stored locally, writes
     * the merged (superset) result back to IndexedDB, then pushes that same
     * superset to the server. Unlike a raw push, this can never cause data
     * loss on either side.
     */
    async function mergeAndSync(): Promise<boolean> {
        if (!import.meta.client || !isOnline.value || !isAuthenticated.value) return false;
        if (syncing.value) return false;

        const serverEntries = await pullHistoryFromServer();
        if (serverEntries === null) return false;

        syncing.value = true;
        try {
            const localEntries = await useDb().historyEntries.toArray();
            const merged = mergeHistoryEntries(localEntries, serverEntries);

            await useDb().transaction("rw", useDb().historyEntries, async () => {
                await useDb().historyEntries.clear();
                await useDb().historyEntries.bulkAdd(merged.map((entry) => ({ ...entry, dirty: 0 as const })));
            });
        } finally {
            syncing.value = false;
        }

        return pushHistoryToServer();
    }

    return { syncing, lastSyncedAt, pushHistoryToServer, pullHistoryFromServer, mergeAndSync };
}

