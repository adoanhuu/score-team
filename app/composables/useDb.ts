import Dexie, { type Table } from "dexie";

export interface AuthSessionRecord {
    id: "current";
    token: string;
    userId: number;
    email: string;
    firstName: string;
    lastName: string;
}

// Mirrors the shape of the entries historically stored under the
// `HISTORY_KEY` localStorage key by app.js (see loadHistoryEntries /
// saveHistoryEntries). Kept loosely typed on purpose since the full
// session payload shape belongs to the (not yet migrated) scoring logic.
export interface HistoryEntryRecord {
    localId?: number;
    generatedAt: string;
    updatedAt?: string;
    archivedAt?: string;
    completed?: boolean;
    soloSessionType?: string;
    ruleset?: string;
    // 1 = has local changes not yet confirmed pushed to the server.
    dirty?: 0 | 1;
    [key: string]: unknown;
}

// Mirrors app.js's `appConfig` (CONFIG_KEY localStorage blob). Loosely typed
// on purpose: fields like trainingHold/soloBeeps/trainingVolume belong to
// the not-yet-migrated scoring engine, but must still round-trip through
// IndexedDB and the server (`/api/users/configuration` stores/returns a
// single opaque JSON blob) even before their own UI exists in Nuxt.
export interface ConfigRecord {
    id: "current";
    fullTarget_team: number;
    fullTarget_individual: number;
    missLimit_team: number;
    missLimit_individual: number;
    successZoneByRuleset: Record<string, unknown>;
    enabledRulesets: string[];
    soloBeeps?: {
        preparationSeconds: number;
        tiringSecondsByRuleset: Record<string, number>;
    };
    [key: string]: unknown;
}

class TeamScoreDb extends Dexie {
    authSession!: Table<AuthSessionRecord, string>;
    historyEntries!: Table<HistoryEntryRecord, number>;
    configuration!: Table<ConfigRecord, string>;

    constructor() {
        super("team-score");
        this.version(1).stores({
            authSession: "id",
            historyEntries: "++localId, generatedAt, dirty",
        });
        this.version(2).stores({
            authSession: "id",
            historyEntries: "++localId, generatedAt, archivedAt, dirty",
        });
        this.version(3).stores({
            authSession: "id",
            historyEntries: "++localId, generatedAt, archivedAt, dirty",
            configuration: "id",
        });
    }
}

let instance: TeamScoreDb | null = null;

/** Lazily creates the single Dexie (IndexedDB) database instance. Client-only. */
export function useDb(): TeamScoreDb {
    if (!instance) {
        instance = new TeamScoreDb();
    }
    return instance;
}
