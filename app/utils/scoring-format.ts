// Ported from app.js: shared constants/helpers for formatting scoring data.
// Kept intentionally minimal — only what the migrated read-only pages
// (historique, stats, ...) need. The full scoring engine (input rules,
// presets per ruleset, target counts, etc.) is migrated separately with the
// solo/multi scoring pages.

export const SOLO_SESSION_TYPE_TRAINING = "training" as const;
export const SOLO_SESSION_TYPE_CONTEST = "contest" as const;

// Sentinel for "X" score (Field/Hunter: inner-bull, counted as 5 pts).
export const FIELD_X = 5.5;

export const RULESETS = ["nature", "campagne", "3d", "field", "3d2", "3dh", "ar"] as const;
export type Ruleset = (typeof RULESETS)[number];

export function normalizeSoloSessionType(
    value: unknown,
    fallback: string = SOLO_SESSION_TYPE_TRAINING,
): string {
    if (value === SOLO_SESSION_TYPE_TRAINING || value === SOLO_SESSION_TYPE_CONTEST) {
        return value;
    }
    return fallback;
}

export function formatRulesetLabel(value: unknown): string {
    if (value === "nature") return "Nature";
    if (value === "campagne") return "Campagne";
    if (value === "3d") return "3D";
    if (value === "field") return "Field / Hunter";
    if (value === "3d2") return "3D Two Shoots";
    if (value === "3dh") return "3D Hunting";
    if (value === "ar") return "Animal round";
    return (value as string) || "-";
}

export function scoreLabel(value: unknown): string {
    if (value === null || value === undefined) return "-";
    if (value === 0) return "M";
    if (value === FIELD_X) return "X";
    return String(value);
}

export function formatScore(value: unknown): string {
    return scoreLabel(value);
}

/** Sort key used across the app: prefers sessionDate/sessionTime over generatedAt/archivedAt. */
export function getHistorySortDate(entry: any): number {
    if (entry?.sessionDate) {
        const rawTime = typeof entry.sessionTime === "string" ? entry.sessionTime : "";
        const safeTime = /^\d{2}:\d{2}$/.test(rawTime) ? rawTime : "23:59";
        const sessionTs = new Date(`${entry.sessionDate}T${safeTime}:59`).getTime();
        if (!Number.isNaN(sessionTs)) return sessionTs;
    }
    return new Date(entry?.archivedAt || entry?.generatedAt || 0).getTime();
}

export function formatHistoryEntryDate(entry: any): string {
    if (entry?.sessionDate) {
        const [yyyy, mm, dd] = String(entry.sessionDate).split("-");
        if (yyyy && mm && dd) return `${dd}/${mm}/${yyyy}`;
    }
    const date = new Date(entry?.generatedAt || entry?.archivedAt);
    if (Number.isNaN(date.getTime())) return "Date inconnue";
    return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatHistoryEntryTime(entry: any): string {
    const rawTime = typeof entry?.sessionTime === "string" ? entry.sessionTime : "";
    if (/^\d{2}:\d{2}$/.test(rawTime)) {
        return rawTime.replace(":", "h");
    }
    const date = new Date(entry?.generatedAt || entry?.archivedAt);
    if (Number.isNaN(date.getTime())) return "--h--";
    return date
        .toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", hour12: false })
        .replace(":", "h");
}
