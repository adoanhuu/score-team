import type { HistoryEntryRecord } from "./useDb";
import { getHistorySortDate, normalizeSoloSessionType } from "~/utils/scoring-format";
import { presets } from "~/utils/scoring-engine";

// Vue's `ref`/`useState` deep-wraps object values (and nested arrays/objects)
// in reactive Proxies, which Dexie/IndexedDB's structured clone cannot
// serialize (throws DataCloneError). A JSON round-trip guarantees a fully
// plain, cloneable copy — safe here since HistoryEntryRecord only ever holds
// JSON-serializable data. See useConfig.ts's toPlain() for the same fix.
function toPlain<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
}

/**
 * Read/write access to the local IndexedDB history entries (mirrors
 * app.js's loadHistoryEntries/saveHistoryEntries, backed by Dexie instead of
 * localStorage). Any mutation triggers a push to the server (best effort,
 * no-op offline/logged-out — see useSync).
 */
export function useHistory() {
    const { pushHistoryToServer, mergeAndSync } = useSync();

    async function list(): Promise<HistoryEntryRecord[]> {
        const entries = await useDb().historyEntries.toArray();
        return entries
            .map((entry) => ({ ...entry, soloSessionType: normalizeSoloSessionType(entry.soloSessionType) }))
            .sort((a, b) => getHistorySortDate(b) - getHistorySortDate(a));
    }

    async function remove(archivedAt: string) {
        if (!archivedAt) return;
        await useDb().historyEntries.where("archivedAt").equals(archivedAt).delete();
        void pushHistoryToServer();
    }

    /**
     * Reconciles local history with the server's copy (see
     * useSync.mergeAndSync — a safe union, never a destructive overwrite in
     * either direction) and returns the resulting local entry count.
     */
    async function restoreFromServer(): Promise<number | null> {
        const ok = await mergeAndSync();
        if (!ok) return null;
        return useDb().historyEntries.count();
    }

    /**
     * Find-by-archivedAt-(or-generatedAt-if-new)-then-merge-then-put, mirroring
     * app.js's updateSoloHistoryEntryFromCurrentSession(). If `entry.volleys`
     * is empty the previously-saved entry (if any) is deleted instead — a
     * session with zero shots has nothing worth keeping in the history.
     */
    async function upsert(entry: HistoryEntryRecord): Promise<HistoryEntryRecord | null> {
        const db = useDb();
        const table = db.historyEntries;
        const identifier = entry.archivedAt || entry.generatedAt;
        const existing = identifier
            ? await table.where("archivedAt").equals(identifier).first()
            ?? (entry.archivedAt ? undefined : await table.where("generatedAt").equals(identifier).first())
            : undefined;

        const volleys = Array.isArray(entry.volleys) ? entry.volleys : [];
        if (volleys.length === 0) {
            if (existing?.localId !== undefined) await table.delete(existing.localId);
            void pushHistoryToServer();
            return null;
        }

        const now = new Date().toISOString();
        const archivedAt = entry.archivedAt || existing?.archivedAt || entry.generatedAt;
        const merged: HistoryEntryRecord = toPlain({
            ...existing,
            ...entry,
            archivedAt,
            updatedAt: now,
            dirty: 1,
        });
        if (existing?.localId !== undefined) merged.localId = existing.localId;
        else delete merged.localId;

        const localId = await table.put(merged);
        void pushHistoryToServer();
        return { ...merged, localId };
    }

    /**
     * Most-recently-updated entry with `completed === false` and at least
     * one recorded volley, mirroring getLatestIncompleteSoloHistoryEntry().
     */
    async function getLatestIncomplete(): Promise<HistoryEntryRecord | null> {
        const entries = await useDb().historyEntries.toArray();
        const candidates = entries.filter((entry) => {
            if (entry.completed) return false;
            const volleys = Array.isArray(entry.volleys) ? entry.volleys : [];
            if (volleys.length === 0) return false;
            return Boolean(entry.ruleset && entry.ruleset in presets);
        });
        if (candidates.length === 0) return null;
        candidates.sort((a, b) => getHistorySortDate(b) - getHistorySortDate(a));
        return candidates[0] ?? null;
    }

    return { list, remove, restoreFromServer, upsert, getLatestIncomplete };
}

