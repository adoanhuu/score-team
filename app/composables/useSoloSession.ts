// Stateful composable for Mode Solo: reactive port of app.js's scoring
// `state` object + actions (registerScore/undo/edit/delete), backed by the
// pure helpers in scoring-engine.ts and persisted incrementally to Dexie via
// useHistory().upsert() (mirrors updateSoloHistoryEntryFromCurrentSession()).
// The in-progress session is also auto-saved to localStorage under app.js's
// AUTO_SAVE_KEY (persistAppState()/restorePersistedState()), together with the
// last setup form values, so a reload goes straight back into scoring.
// Two contest flavours coexist, as in app.js:
//  - `contestMode`/`contestInfo`: Concours joined from Mode Multi (driven by
//    useContest.ts), never written to the local history;
//  - `soloContestInfo`/`soloContestParticipant`: a Mode Solo "Concours"
//    session linked by identifier, kept in the history and pushed to
//    /api/contest/users after every change (syncSoloContestUserProgress()).
import { FIELD_X, normalizeSoloSessionType, type Ruleset } from "~/utils/scoring-format";
import {
    presets,
    getArrowsPerVolley,
    getTargetCountForRuleset,
    getSelectablePointsForArrow,
    getMaxVolleyForConfig,
    getMaxShootTotalForConfig,
    clampSuccessZoneForConfig,
    getGroupsForRuleset,
    getWeaponsForRuleset,
    isWeaponAllowedForRuleset,
    roundTotal,
    scoreToValue,
    normalizeScoringMode,
    normalizeSoloTimerMode,
    isSoloTimerEnabled,
    canUseTimerForSetup,
    type ScoringMode,
    type SoloTimerMode,
} from "~/utils/scoring-engine";
import type { HistoryEntryRecord } from "./useDb";

/** Mirrors app.js's LAST_SCORE_PREVIEW_MS: brief pause showing the full volley before it's committed to history. */
const LAST_SCORE_PREVIEW_MS = 300;
/** Mirrors app.js's AUTO_SAVE_KEY (persistAppState()/restorePersistedState()). */
export const SOLO_AUTO_SAVE_KEY = "score-team-autosave-v1";
/** Mirrors app.js's CONTEST_PROGRESS_KEY (persistContestProgressState()). */
const CONTEST_PROGRESS_KEY = "score-team-contest-progress-v1";
/** Mirrors app.js's SOLO_CONTEST_DEVICE_ID_KEY / SOLO_CONTEST_PROFILE_KEY. */
const SOLO_CONTEST_DEVICE_ID_KEY = "score-team-solo-contest-device-id-v1";
const SOLO_CONTEST_PROFILE_KEY = "score-team-solo-contest-profile-v1";

export interface SoloVolley {
    arrows: (number | null)[];
    group: string | null;
    total: number;
    success: boolean;
}

/** Minimal contest identity attached to a Concours-linked Mode Solo session (mirrors app.js's state.contestInfo / state.soloContestInfo). */
export interface ContestInfo {
    id?: unknown;
    uuid: string;
    name: string;
    ruleset: string;
    startDate: string;
    endDate: string;
}

/** Mirrors app.js's state.soloContestParticipant (normalizeSoloContestParticipantProfile()). */
export interface SoloContestParticipant {
    contestUuid: string;
    firstName: string;
    lastName: string;
    weapon: string;
    userId: string;
}

export interface SoloSetupValues {
    ruleset: Ruleset;
    scoringMode: ScoringMode;
    weapon: string;
    lieu: string;
    sessionDate: string;
    sessionTime: string;
    contestIdentifier: string;
    useTargetGroups: boolean;
    soloSessionType: "training" | "contest";
    timerMode: SoloTimerMode;
    showScores: boolean;
    successZone: number;
    targetCount: number;
}

/** Mirrors app.js's getSetupSnapshot() (the `setup` part of the auto-save payload). */
export interface SoloSetupSnapshot {
    ruleset: string;
    scoringMode: string;
    weapon: string;
    contestIdentifier: string;
    successZone: number;
    sessionDate: string;
    sessionTime: string;
    useTargetGroups: boolean;
    soloSessionType: string;
    timerMode: SoloTimerMode;
    useTimer: boolean;
    showScores: boolean;
}

interface SoloState extends SoloSetupValues {
    phase: "setup" | "scoring";
    arrowsPerVolley: number;
    allowedPoints: number[];
    /** Fixed-length (arrowsPerVolley) buffer of the volley in progress, as app.js's state.currentshoot. */
    currentShoot: (number | null)[];
    currentArrowIndex: number;
    volleys: SoloVolley[];
    selectedGroup: string | null;
    inputLocked: boolean;
    archivedAt: string | null;
    generatedAt: string | null;
    editingVolleyIndex: number | null;
    lastEditedVolleyIndex: number | null;
    progressionAxis: string;
    contestMode: boolean;
    contestInfo: ContestInfo | null;
    soloContestInfo: ContestInfo | null;
    soloContestParticipant: SoloContestParticipant | null;
    /** Volley count at which the per-volley timer was last completed/closed (app.js's state.soloTimerVolleyIndex). */
    soloTimerVolleyIndex: number | null;
    completionArchived: boolean;
}

/** Local YYYY-MM-DD / HH:MM, mirrors app.js's getCurrentSessionDateTime(). */
export function getCurrentSessionDateTime(): { date: string; time: string } {
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    return { date, time };
}

function createDefaultSetup(ruleset: Ruleset = "nature"): SoloSetupValues {
    const { date, time } = getCurrentSessionDateTime();
    return {
        ruleset,
        scoringMode: normalizeScoringMode("individual", ruleset),
        weapon: getWeaponsForRuleset(ruleset)[0] ?? "",
        lieu: "",
        sessionDate: date,
        sessionTime: time,
        contestIdentifier: "",
        useTargetGroups: true,
        soloSessionType: "training",
        timerMode: "hold",
        showScores: true,
        successZone: 1,
        targetCount: getTargetCountForRuleset(ruleset),
    };
}

function freshScoringDefaults(): Omit<SoloState, keyof SoloSetupValues> {
    return {
        phase: "setup",
        arrowsPerVolley: getArrowsPerVolley("nature", "individual"),
        allowedPoints: presets.nature,
        currentShoot: Array(getArrowsPerVolley("nature", "individual")).fill(null),
        currentArrowIndex: 0,
        volleys: [],
        selectedGroup: null,
        inputLocked: false,
        archivedAt: null,
        generatedAt: null,
        editingVolleyIndex: null,
        lastEditedVolleyIndex: null,
        progressionAxis: "",
        contestMode: false,
        contestInfo: null,
        soloContestInfo: null,
        soloContestParticipant: null,
        soloTimerVolleyIndex: null,
        completionArchived: false,
    };
}

function readStorageJson(key: string): any {
    try {
        const raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function writeStorageJson(key: string, value: unknown) {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Ignore storage failures (private mode / quota).
    }
}

function normalizeContestInfo(raw: any, fallbackRuleset: string): ContestInfo | null {
    if (!raw || typeof raw !== "object") return null;
    return {
        id: raw.id,
        uuid: raw.uuid || "",
        name: raw.name || "",
        ruleset: raw.ruleset || fallbackRuleset,
        startDate: raw.startDate || "",
        endDate: raw.endDate || "",
    };
}

/** Volley entries of a history/contest payload (`{arrows, group}` objects or bare arrays, as restoreSoloContestUserProgress()). */
function normalizeSourceVolleys(sourceVolleys: unknown[]): { arrows: (number | null)[]; group: string }[] {
    return sourceVolleys.map((volley: any) => {
        const arrows = Array.isArray(volley?.arrows) ? volley.arrows : Array.isArray(volley) ? volley : [];
        return {
            arrows: [...arrows],
            group: typeof volley?.group === "string" ? volley.group : "",
        };
    });
}

// --- Solo contest participant helpers (app.js's SOLO_CONTEST_* family) ---

function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function generateDeviceId(): string {
    return typeof crypto?.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Mirrors getOrCreateSoloContestDeviceId(). */
function getOrCreateSoloContestDeviceId(): string {
    try {
        const existingId = (window.localStorage.getItem(SOLO_CONTEST_DEVICE_ID_KEY) || "").trim();
        if (existingId) return existingId;
        const generatedId = generateDeviceId();
        window.localStorage.setItem(SOLO_CONTEST_DEVICE_ID_KEY, generatedId);
        return generatedId;
    } catch {
        return generateDeviceId();
    }
}

/** Mirrors computeSoloContestDeviceUserId(): SHA-256 hex of the device UUID. */
export async function computeSoloContestDeviceUserId(): Promise<string> {
    const deviceId = getOrCreateSoloContestDeviceId();
    if (!crypto?.subtle) {
        return deviceId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 64);
    }
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(deviceId));
    return bytesToHex(new Uint8Array(digest));
}

/** Mirrors normalizeSoloContestParticipantProfile(). */
function normalizeSoloContestParticipantProfile(profile: any, contestUuid = ""): SoloContestParticipant | null {
    if (!profile || typeof profile !== "object" || Array.isArray(profile)) return null;
    const firstName = typeof profile.firstName === "string" ? profile.firstName.trim() : "";
    const lastName = typeof profile.lastName === "string" ? profile.lastName.trim() : "";
    const weapon = typeof profile.weapon === "string" ? profile.weapon.trim() : "";
    const userId = typeof profile.userId === "string" ? profile.userId.trim() : "";
    const normalizedContestUuid = typeof contestUuid === "string" && contestUuid.trim()
        ? contestUuid.trim()
        : (typeof profile.contestUuid === "string" ? profile.contestUuid.trim() : "");
    if (!firstName || !lastName || !weapon || !userId) return null;
    return { contestUuid: normalizedContestUuid, firstName, lastName, weapon, userId };
}

function loadSoloContestProfileStore(): Record<string, any> {
    const parsed = readStorageJson(SOLO_CONTEST_PROFILE_KEY);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
}

/** Mirrors getStoredSoloContestParticipant(): per-contest profile (lowercased uuid), else `lastProfile`. */
export function getStoredSoloContestParticipant(contestUuid: string): SoloContestParticipant | null {
    const normalizedContestUuid = typeof contestUuid === "string" ? contestUuid.trim() : "";
    if (!normalizedContestUuid) return null;
    const store = loadSoloContestProfileStore();
    const specificProfile = normalizeSoloContestParticipantProfile(store[normalizedContestUuid.toLowerCase()], normalizedContestUuid);
    if (specificProfile) return specificProfile;
    const lastProfile = normalizeSoloContestParticipantProfile(store.lastProfile, normalizedContestUuid);
    return lastProfile ? { ...lastProfile, contestUuid: normalizedContestUuid } : null;
}

/** Mirrors storeSoloContestParticipant(). */
export function storeSoloContestParticipant(contestUuid: string, participant: SoloContestParticipant) {
    const normalizedContestUuid = typeof contestUuid === "string" ? contestUuid.trim() : "";
    const normalizedProfile = normalizeSoloContestParticipantProfile(participant, normalizedContestUuid);
    if (!normalizedContestUuid || !normalizedProfile) return;
    const store = loadSoloContestProfileStore();
    store[normalizedContestUuid.toLowerCase()] = normalizedProfile;
    store.lastProfile = {
        firstName: normalizedProfile.firstName,
        lastName: normalizedProfile.lastName,
        weapon: normalizedProfile.weapon,
        userId: normalizedProfile.userId,
    };
    writeStorageJson(SOLO_CONTEST_PROFILE_KEY, store);
}

/** Mirrors getHistoryEntryUpdateDate(). */
function getHistoryEntryUpdateDate(entry: HistoryEntryRecord): number {
    return new Date((entry?.updatedAt || entry?.archivedAt || entry?.generatedAt || 0) as string | number).getTime();
}

export function useSoloSession() {
    const state = useState<SoloState>("solo-session-state", () => ({
        ...createDefaultSetup(),
        ...freshScoringDefaults(),
    }));
    // Last setup form values (app.js's getSetupSnapshot()), written with every auto-save.
    const setupSnapshot = useState<SoloSetupSnapshot | null>("solo-setup-snapshot", () => null);

    const { upsert, list } = useHistory();
    const { showFlash } = useFlash();

    const completedVolleys = computed(() => state.value.volleys.length);
    const totalScore = computed(() => state.value.volleys.reduce((sum, v) => sum + v.total, 0));
    const isComplete = computed(() => completedVolleys.value >= state.value.targetCount && state.value.targetCount > 0);
    /** Mirrors shouldUseTargetGroupsForScoring(). */
    const useTargetGroupsForScoring = computed(() => state.value.useTargetGroups && !state.value.contestMode);
    const groupOptions = computed(() => getGroupsForRuleset(state.value.ruleset));
    const maxVolley = computed(() =>
        getMaxVolleyForConfig(state.value.ruleset, state.value.scoringMode, state.value.arrowsPerVolley, state.value.allowedPoints),
    );
    const maxShootTotal = computed(() =>
        getMaxShootTotalForConfig(state.value.ruleset, state.value.scoringMode, state.value.arrowsPerVolley, state.value.allowedPoints),
    );
    const selectablePoints = computed(() =>
        getSelectablePointsForArrow(state.value.ruleset, state.value.scoringMode, state.value.currentArrowIndex, state.value.allowedPoints),
    );
    const currentShootPartialTotal = computed(() =>
        state.value.currentShoot.reduce((sum: number, value) => sum + scoreToValue(value), 0),
    );
    const hasPartialVolley = computed(() => state.value.currentShoot.some((value) => value !== null));

    /** Mirrors getSelectedTargetGroup(): no group recorded when groups are off or in contest mode. */
    function getSelectedTargetGroup(): string | null {
        if (!useTargetGroupsForScoring.value) return null;
        return state.value.selectedGroup || null;
    }

    /** Mirrors syncTargetGroupSelect(): selects the given group, else the ruleset's first one. */
    function syncTargetGroupSelect(selectedValue: string | null = null) {
        const groups = groupOptions.value;
        state.value.selectedGroup = selectedValue && groups.includes(selectedValue) ? selectedValue : (groups[0] ?? null);
    }

    function resetRoundBuffer() {
        state.value.currentShoot = Array(state.value.arrowsPerVolley).fill(null);
        state.value.currentArrowIndex = 0;
    }

    /** Nature team mode volley quota: max 3x20, 6x15, 3x10 (mirrors isNatureTeamQuotaAllowed). */
    function isNatureTeamQuotaAllowed(score: number): boolean {
        const nextShoot = [...state.value.currentShoot];
        nextShoot[state.value.currentArrowIndex] = score;
        const counts = nextShoot.reduce(
            (result, value) => {
                if (value === 20) result.twenty += 1;
                if (value === 15) result.fifteen += 1;
                if (value === 10) result.ten += 1;
                return result;
            },
            { twenty: 0, fifteen: 0, ten: 0 },
        );
        return counts.twenty <= 3 && counts.fifteen <= 6 && counts.ten <= 3;
    }

    /** Mirrors isScoreAllowedForCurrentArrow(). */
    function isScoreAllowedForCurrentArrow(score: number): boolean {
        const isNatureTeam = state.value.ruleset === "nature" && state.value.scoringMode === "team";
        if (state.value.currentArrowIndex === 0) {
            if (isNatureTeam) return isNatureTeamQuotaAllowed(score);
            return score <= maxShootTotal.value;
        }
        if (isNatureTeam && !isNatureTeamQuotaAllowed(score)) return false;
        return currentShootPartialTotal.value + score <= maxShootTotal.value;
    }

    function configureForSetup(setup: SoloSetupValues) {
        const scoringMode = normalizeScoringMode(setup.scoringMode, setup.ruleset);
        const arrowsPerVolley = getArrowsPerVolley(setup.ruleset, scoringMode);
        const allowedPoints = [...new Set(presets[setup.ruleset] ?? presets.nature)].sort((a, b) => b - a);
        state.value = {
            ...state.value,
            ...setup,
            targetCount: getTargetCountForRuleset(setup.ruleset),
            scoringMode,
            // Mirrors getSelectedSoloTimerMode(): no timer outside individual Nature/Campagne/3D.
            timerMode: canUseTimerForSetup(scoringMode, setup.ruleset) ? normalizeSoloTimerMode(setup.timerMode) : "none",
            arrowsPerVolley,
            allowedPoints,
            successZone: clampSuccessZoneForConfig(setup.successZone, setup.ruleset, scoringMode, arrowsPerVolley, allowedPoints),
        };
    }

    function selectGroup(group: string | null) {
        state.value.selectedGroup = group;
    }

    /** Links (or unlinks, when passed null) this Mode Solo session to a Concours contest (mirrors app.js's state.contestMode/state.contestInfo). */
    function configureContest(info: ContestInfo | null) {
        state.value.contestMode = Boolean(info);
        state.value.contestInfo = info;
        if (info) {
            state.value.soloContestInfo = null;
            state.value.soloContestParticipant = null;
            state.value.timerMode = "none";
        }
    }

    /** Mirrors startScoring(); `soloContest` carries the identifier-linked contest validated beforehand (validateSoloContestIdentifierBeforeStart()). */
    function startScoring(
        setup: SoloSetupValues,
        soloContest: { info: ContestInfo; participant: SoloContestParticipant } | null = null,
    ) {
        configureForSetup(setup);
        state.value.phase = "scoring";
        state.value.volleys = [];
        state.value.inputLocked = false;
        state.value.archivedAt = null;
        state.value.generatedAt = new Date().toISOString();
        state.value.editingVolleyIndex = null;
        state.value.lastEditedVolleyIndex = null;
        state.value.progressionAxis = "";
        state.value.contestMode = false;
        state.value.contestInfo = null;
        state.value.soloContestInfo = soloContest?.info ?? null;
        state.value.soloContestParticipant = soloContest?.participant ?? null;
        state.value.soloTimerVolleyIndex = null;
        state.value.completionArchived = false;
        resetRoundBuffer();
        syncTargetGroupSelect();
    }

    /** Registers one arrow's score; commits the volley (after a brief preview) once arrowsPerVolley arrows are entered. */
    async function registerScore(score: number) {
        if (state.value.inputLocked) return;
        const isEditing = Number.isInteger(state.value.editingVolleyIndex) && (state.value.editingVolleyIndex as number) >= 0;
        if (state.value.volleys.length >= state.value.targetCount && !isEditing) return;
        if (state.value.currentArrowIndex >= state.value.arrowsPerVolley) return;
        if (!selectablePoints.value.includes(score)) return;
        if (!isScoreAllowedForCurrentArrow(score)) return;

        const shoot = [...state.value.currentShoot];
        shoot[state.value.currentArrowIndex] = score;
        state.value.currentShoot = shoot;
        state.value.currentArrowIndex += 1;
        state.value.completionArchived = false;

        if (state.value.currentArrowIndex < state.value.arrowsPerVolley) return;

        state.value.inputLocked = true;
        const editingIndexSnapshot = isEditing ? state.value.editingVolleyIndex : null;
        const delay = isEditing ? 0 : LAST_SCORE_PREVIEW_MS;

        await new Promise<void>((resolve) => window.setTimeout(resolve, delay));
        // The session may have been closed/reset during the preview delay.
        if (state.value.phase !== "scoring") return;

        const newArrows = [...state.value.currentShoot];
        const total = roundTotal(newArrows);
        const volley: SoloVolley = {
            arrows: newArrows,
            group: getSelectedTargetGroup(),
            total,
            success: total >= state.value.successZone,
        };

        if (Number.isInteger(editingIndexSnapshot)) {
            const replaceIndex = Math.max(0, Math.min(editingIndexSnapshot as number, state.value.volleys.length - 1));
            state.value.volleys = state.value.volleys.map((v, i) => (i === replaceIndex ? volley : v));
            state.value.lastEditedVolleyIndex = replaceIndex;
            state.value.editingVolleyIndex = null;
        } else {
            state.value.volleys = [...state.value.volleys, volley];
        }

        // Save immediately when a full volley is validated.
        void persist();
        if (state.value.soloContestInfo?.uuid) {
            void syncSoloContestUserProgress();
        }

        state.value.inputLocked = false;
        if (state.value.volleys.length === state.value.targetCount) {
            if (!state.value.completionArchived) {
                showFlash(state.value.contestMode ? "Concours terminé." : "Parcours enregistré dans l'historique.");
                state.value.completionArchived = true;
            }
            return;
        }
        resetRoundBuffer();
    }

    /** Mirrors stepBackOneArrow(): removes the last arrow; crossing a volley boundary restores that volley minus its last arrow. */
    function stepBackOneArrow() {
        if (state.value.inputLocked) return;

        if (state.value.editingVolleyIndex !== null && state.value.currentArrowIndex === 0) {
            showFlash("Volée en modification : saisissez les flèches ou validez la nouvelle volée.");
            return;
        }

        if (state.value.currentArrowIndex > 0) {
            const shoot = [...state.value.currentShoot];
            state.value.currentArrowIndex -= 1;
            shoot[state.value.currentArrowIndex] = null;
            state.value.currentShoot = shoot;
            state.value.completionArchived = false;
            void persist();
            return;
        }

        if (state.value.volleys.length === 0) return;
        const previous = state.value.volleys[state.value.volleys.length - 1] as SoloVolley;
        state.value.volleys = state.value.volleys.slice(0, -1);
        const shoot = [...previous.arrows];
        state.value.currentArrowIndex = state.value.arrowsPerVolley - 1;
        shoot[state.value.currentArrowIndex] = null;
        state.value.currentShoot = shoot;
        syncTargetGroupSelect(previous.group);
        state.value.completionArchived = false;
        void persist();
        if (state.value.soloContestInfo?.uuid) {
            void syncSoloContestUserProgress();
        }
    }

    /** Mirrors editVolleyAt(). Returns true when the row was put in edit mode. */
    function editVolleyAt(index: number): boolean {
        if (state.value.inputLocked) return false;
        if (state.value.volleys.length === state.value.targetCount) {
            showFlash("Session terminée : modification désactivée.");
            return false;
        }
        if (!Number.isInteger(index) || index < 0 || index >= state.value.volleys.length) return false;
        const originalGroup = state.value.volleys[index]?.group ?? null;
        state.value.editingVolleyIndex = index;
        resetRoundBuffer();
        if (state.value.useTargetGroups) syncTargetGroupSelect(originalGroup);
        state.value.completionArchived = false;
        showFlash(`Modification volée ${index + 1} : la ligne sera remplacée.`);
        return true;
    }

    /** Mirrors deleteVolleyAt() (the confirmation dialog is shown by the page). */
    async function deleteVolleyAt(index: number) {
        if (state.value.inputLocked) return;
        if (!Number.isInteger(index) || index < 0 || index >= state.value.volleys.length) return;
        state.value.volleys = state.value.volleys.filter((_, i) => i !== index);
        if (state.value.lastEditedVolleyIndex === index) state.value.lastEditedVolleyIndex = null;
        else if (state.value.lastEditedVolleyIndex !== null && index < state.value.lastEditedVolleyIndex) {
            state.value.lastEditedVolleyIndex -= 1;
        }
        state.value.completionArchived = false;
        await persist();
        if (state.value.soloContestInfo?.uuid) {
            void syncSoloContestUserProgress();
        }
    }

    async function setProgressionAxis(text: string) {
        state.value.progressionAxis = text;
        await persist();
    }

    /** Mirrors app.js's buildResultsPayload() (1-based volley indexes, fixed-2 averages, {point: count} distribution). */
    function buildResultsPayload(): HistoryEntryRecord {
        const volleys = state.value.volleys;
        const totals = volleys.map((v) => roundTotal(v.arrows));
        const total = totals.reduce((sum, value) => sum + value, 0);
        const avgVolley = volleys.length ? total / volleys.length : 0;
        const avgArrow = volleys.length && state.value.arrowsPerVolley ? total / (volleys.length * state.value.arrowsPerVolley) : 0;

        let best = 0;
        let worst = 0;
        totals.forEach((value, index) => {
            if (value > (totals[best] as number)) best = index;
            if (value < (totals[worst] as number)) worst = index;
        });

        const distribution = new Map<number | null, number>();
        state.value.allowedPoints.forEach((point) => distribution.set(point, 0));
        volleys.flatMap((v) => v.arrows).forEach((point) => {
            distribution.set(point, (distribution.get(point) || 0) + 1);
        });

        return {
            generatedAt: state.value.generatedAt ?? new Date().toISOString(),
            archivedAt: state.value.archivedAt ?? undefined,
            ruleset: state.value.ruleset,
            scoringMode: state.value.scoringMode,
            weapon: state.value.weapon || "",
            lieu: state.value.lieu || "",
            sessionDate: state.value.sessionDate || "",
            sessionTime: state.value.sessionTime || "",
            contestIdentifier: state.value.contestIdentifier || "",
            useTargetGroups: state.value.useTargetGroups,
            soloSessionType: state.value.soloSessionType,
            timerMode: state.value.timerMode,
            useTimer: isSoloTimerEnabled(state.value.timerMode),
            showScores: state.value.showScores,
            targetCount: state.value.targetCount,
            arrowsPerVolley: state.value.arrowsPerVolley,
            successZone: state.value.successZone,
            completed: state.value.targetCount > 0 && volleys.length === state.value.targetCount,
            total,
            avgVolley: Number(avgVolley.toFixed(2)),
            avgArrow: Number(avgArrow.toFixed(2)),
            bestVolley: volleys.length ? { index: best + 1, total: totals[best] } : null,
            worstVolley: volleys.length ? { index: worst + 1, total: totals[worst] } : null,
            allowedPoints: state.value.allowedPoints,
            distribution: Object.fromEntries(distribution.entries()),
            volleys: volleys.map((volley, idx) => ({
                index: idx + 1,
                arrows: volley.arrows,
                group: volley.group || null,
                total: roundTotal(volley.arrows),
                success: roundTotal(volley.arrows) >= state.value.successZone,
            })),
            progressionAxis: state.value.progressionAxis,
        };
    }

    /**
     * Incremental save after every completed volley / edit / delete, mirroring
     * updateSoloHistoryEntryFromCurrentSession(): contest sessions joined from
     * Mode Multi (contestMode) are never written to the local history.
     */
    async function persist() {
        if (state.value.contestMode) return;
        const payload = buildResultsPayload();
        const saved = await upsert(payload);
        state.value.archivedAt = saved?.archivedAt ?? (state.value.volleys.length ? state.value.archivedAt : null);
    }

    // --- Incomplete-session resume (getLatestIncompleteSoloHistoryEntry / restoreIncompleteSoloSession) ---

    /** Latest `completed === false` entry with a known ruleset and ≥1 volley, by updatedAt||archivedAt||generatedAt. */
    async function resumeIfIncomplete(): Promise<HistoryEntryRecord | null> {
        const entries = await list();
        return entries
            .filter((entry) => (
                entry
                && entry.completed === false
                && Boolean(entry.ruleset && entry.ruleset in presets)
                && Array.isArray(entry.volleys)
                && (entry.volleys as unknown[]).length > 0
            ))
            .sort((a, b) => getHistoryEntryUpdateDate(b) - getHistoryEntryUpdateDate(a))[0] ?? null;
    }

    /** Mirrors restoreIncompleteSoloSession(). Returns false when the entry holds no complete volley. */
    function restoreIncompleteSession(entry: HistoryEntryRecord): boolean {
        const ruleset = entry?.ruleset as Ruleset;
        if (!entry || !presets[ruleset]) return false;

        const scoringMode = normalizeScoringMode(entry.scoringMode, ruleset);
        const arrowsPerVolley = Number.isInteger(entry.arrowsPerVolley)
            ? (entry.arrowsPerVolley as number)
            : getArrowsPerVolley(ruleset, scoringMode);
        const restoredVolleys = normalizeSourceVolleys(Array.isArray(entry.volleys) ? entry.volleys : [])
            .filter((volley) => volley.arrows.length === arrowsPerVolley);
        if (restoredVolleys.length === 0) return false;

        const allowedPoints = Array.isArray(entry.allowedPoints) && entry.allowedPoints.length
            ? [...(entry.allowedPoints as number[])]
            : [...presets[ruleset]];
        const successZone = Number.isInteger(entry.successZone) ? (entry.successZone as number) : 1;

        state.value = {
            ...state.value,
            ruleset,
            scoringMode,
            weapon: isWeaponAllowedForRuleset(String(entry.weapon || ""), ruleset)
                ? String(entry.weapon)
                : (getWeaponsForRuleset(ruleset)[0] ?? ""),
            lieu: String(entry.lieu || ""),
            sessionDate: String(entry.sessionDate || ""),
            sessionTime: String(entry.sessionTime || ""),
            contestIdentifier: String(entry.contestIdentifier || ""),
            useTargetGroups: typeof entry.useTargetGroups === "boolean" ? entry.useTargetGroups : true,
            soloSessionType: normalizeSoloSessionType(entry.soloSessionType) as "training" | "contest",
            timerMode: normalizeSoloTimerMode(entry.timerMode, normalizeSoloTimerMode(entry.useTimer)),
            showScores: typeof entry.showScores === "boolean" ? entry.showScores : true,
            successZone,
            targetCount: Number.isInteger(entry.targetCount) ? (entry.targetCount as number) : getTargetCountForRuleset(ruleset),
            arrowsPerVolley,
            allowedPoints,
            phase: "scoring",
            volleys: restoredVolleys.map((volley) => {
                const total = roundTotal(volley.arrows);
                return { arrows: volley.arrows, group: volley.group || null, total, success: total >= successZone };
            }),
            inputLocked: false,
            archivedAt: entry.archivedAt ?? null,
            generatedAt: entry.generatedAt || new Date().toISOString(),
            editingVolleyIndex: null,
            lastEditedVolleyIndex: null,
            progressionAxis: String(entry.progressionAxis || ""),
            contestMode: false,
            contestInfo: null,
            soloContestInfo: null,
            soloContestParticipant: null,
            soloTimerVolleyIndex: null,
            completionArchived: false,
        };
        resetRoundBuffer();
        syncTargetGroupSelect();
        void persist();
        showFlash("Session reprise.");
        return true;
    }

    // --- Solo contest sync (syncSoloContestUserProgress / restoreSoloContestUserProgress) ---

    /** Mirrors getActiveSoloContestParticipant(). */
    function getActiveSoloContestParticipant(contestUuid = state.value.soloContestInfo?.uuid || ""): SoloContestParticipant | null {
        const normalizedContestUuid = typeof contestUuid === "string" ? contestUuid.trim() : "";
        if (!normalizedContestUuid) return null;
        const activeProfile = normalizeSoloContestParticipantProfile(state.value.soloContestParticipant, normalizedContestUuid);
        if (activeProfile && activeProfile.contestUuid.toLowerCase() === normalizedContestUuid.toLowerCase()) {
            return activeProfile;
        }
        return getStoredSoloContestParticipant(normalizedContestUuid);
    }

    /** Mirrors syncSoloContestUserProgress() → upsertContestUserFromLocalProfile() with a solo participant (no auth header, errors ignored). */
    async function syncSoloContestUserProgress() {
        const uuid = state.value.soloContestInfo?.uuid?.trim() || "";
        if (!uuid) return;
        const participant = getActiveSoloContestParticipant(uuid);
        if (!participant) return;
        const safeWeapon = state.value.weapon?.trim() || "-";
        try {
            await $fetch("/api/contest/users", {
                method: "POST",
                body: {
                    contest_uuid: uuid,
                    user_id: participant.userId || undefined,
                    first_name: participant.firstName || "Archer",
                    last_name: participant.lastName || "Inconnu",
                    weapon: participant.weapon || safeWeapon,
                    data: {
                        updatedAt: new Date().toISOString(),
                        volleys: buildResultsPayload().volleys,
                    },
                },
            });
        } catch {
            // Keep contest flow resilient if contest-user sync fails.
        }
    }

    /** Mirrors restoreSoloContestUserProgress(): reloads the volleys saved server-side for this participant. */
    function restoreSoloContestUserProgress(entry: any): boolean {
        const payloadData = entry?.data && typeof entry.data === "object" && !Array.isArray(entry.data) ? entry.data : null;
        if (!payloadData) return false;

        const sourceVolleys = Array.isArray(payloadData.volleys)
            ? payloadData.volleys
            : Array.isArray(payloadData.shoots)
                ? payloadData.shoots.map((shoot: unknown, index: number) => ({
                    arrows: shoot,
                    group: Array.isArray(payloadData.shootGroups) ? payloadData.shootGroups[index] || null : null,
                }))
                : [];
        const restoredVolleys = normalizeSourceVolleys(sourceVolleys)
            .filter((volley) => volley.arrows.length === state.value.arrowsPerVolley)
            .slice(0, state.value.targetCount);
        if (!restoredVolleys.length) return false;

        if (isWeaponAllowedForRuleset(entry?.weapon || "", state.value.ruleset)) {
            state.value.weapon = entry.weapon;
        }
        state.value.volleys = restoredVolleys.map((volley) => {
            const total = roundTotal(volley.arrows);
            return { arrows: volley.arrows, group: volley.group || null, total, success: total >= state.value.successZone };
        });
        state.value.completionArchived = state.value.volleys.length === state.value.targetCount;
        state.value.editingVolleyIndex = null;
        state.value.lastEditedVolleyIndex = null;
        state.value.progressionAxis = payloadData.progressionAxis || state.value.progressionAxis || "";
        state.value.soloTimerVolleyIndex = null;
        resetRoundBuffer();
        syncTargetGroupSelect();
        return true;
    }

    // --- Auto-save (persistAppState / restorePersistedState / clearPersistedState) ---

    function buildScoringSnapshot() {
        const s = state.value;
        return {
            targetCount: s.targetCount,
            successZone: s.successZone,
            lieu: s.lieu || "",
            sessionDate: s.sessionDate || "",
            sessionTime: s.sessionTime || "",
            sessionStartedAt: s.generatedAt || "",
            historyEntryArchivedAt: s.archivedAt || "",
            contestIdentifier: s.contestIdentifier || "",
            soloContestInfo: s.soloContestInfo ? { ...s.soloContestInfo } : null,
            // Not in app.js's snapshot: keeps a Multi-joined contest session in contest mode across a reload.
            contestMode: s.contestMode,
            contestInfo: s.contestInfo ? { ...s.contestInfo } : null,
            scoringMode: s.scoringMode,
            weapon: s.weapon || "",
            useTargetGroups: s.useTargetGroups,
            soloSessionType: s.soloSessionType,
            timerMode: s.timerMode,
            useTimer: isSoloTimerEnabled(s.timerMode),
            showScores: s.showScores,
            arrowsPerVolley: s.arrowsPerVolley,
            currentArrowIndex: s.currentArrowIndex,
            shoots: s.volleys.map((volley) => [...volley.arrows]),
            currentshoot: [...s.currentShoot],
            activeRuleset: s.ruleset,
            allowedPoints: [...s.allowedPoints],
            shootGroups: s.volleys.map((volley) => volley.group || ""),
            currentGroup: getSelectedTargetGroup() || "",
            editingVolleyIndex: s.editingVolleyIndex,
            progressionAxis: s.progressionAxis || "",
            completionArchived: s.completionArchived,
        };
    }

    function getSetupSnapshot(): SoloSetupSnapshot | null {
        if (setupSnapshot.value) return setupSnapshot.value;
        const payload = import.meta.client ? readStorageJson(SOLO_AUTO_SAVE_KEY) : null;
        return payload?.setup && typeof payload.setup === "object" ? payload.setup : null;
    }

    /** Mirrors persistAppState(): setup snapshot + (while scoring) the whole in-progress session. */
    function persistAppState() {
        if (!import.meta.client) return;
        const isScoring = state.value.phase === "scoring";
        writeStorageJson(SOLO_AUTO_SAVE_KEY, {
            version: 1,
            setup: getSetupSnapshot() ?? {},
            screen: isScoring ? "scoring" : "setup",
            scoring: isScoring ? buildScoringSnapshot() : null,
        });
        persistContestProgressState();
    }

    /** Records the setup form values (getSetupSnapshot()) and auto-saves them. */
    function saveSetupSnapshot(setup: SoloSetupValues, timerModeForSetup: SoloTimerMode) {
        setupSnapshot.value = {
            ruleset: setup.ruleset,
            scoringMode: setup.scoringMode,
            weapon: setup.weapon,
            contestIdentifier: (setup.contestIdentifier || "").trim(),
            successZone: Number.isInteger(setup.successZone) ? setup.successZone : 1,
            sessionDate: setup.sessionDate || "",
            sessionTime: setup.sessionTime || "",
            useTargetGroups: setup.useTargetGroups,
            soloSessionType: setup.soloSessionType,
            timerMode: timerModeForSetup,
            useTimer: isSoloTimerEnabled(timerModeForSetup),
            showScores: setup.showScores,
        };
        persistAppState();
    }

    function clearPersistedState() {
        try {
            window.localStorage.removeItem(SOLO_AUTO_SAVE_KEY);
        } catch {
            // Ignore storage failures.
        }
    }

    /** Mirrors restorePersistedState()'s scoring branch. Returns true when a session in progress was restored. */
    function restorePersistedScoring(): boolean {
        if (!import.meta.client) return false;
        const payload = readStorageJson(SOLO_AUTO_SAVE_KEY);
        if (payload?.screen !== "scoring" || !payload.scoring) return false;
        const saved = payload.scoring;
        const setup = payload.setup || {};
        const ruleset = saved.activeRuleset as Ruleset;
        if (!presets[ruleset]) return false;

        const scoringMode = normalizeScoringMode(saved.scoringMode, ruleset);
        const arrowsPerVolley = getArrowsPerVolley(ruleset, scoringMode);
        let allowedPoints: number[] = Array.isArray(saved.allowedPoints) && saved.allowedPoints.length
            ? [...saved.allowedPoints]
            : [...presets[ruleset]];
        // Ensure FIELD_X is present for field sessions (handles stale saved data from before X was added)
        if (ruleset === "field" && !allowedPoints.includes(FIELD_X)) allowedPoints = [...presets.field];
        const successZone = clampSuccessZoneForConfig(
            Number.isInteger(saved.successZone) ? saved.successZone : 1,
            ruleset,
            scoringMode,
            arrowsPerVolley,
            allowedPoints,
        );
        const shootGroups: unknown[] = Array.isArray(saved.shootGroups) ? saved.shootGroups : [];
        const volleys: SoloVolley[] = (Array.isArray(saved.shoots) ? saved.shoots : [])
            .map((shoot: unknown, index: number) => ({
                arrows: Array.isArray(shoot) ? [...shoot] : [],
                group: typeof shootGroups[index] === "string" && shootGroups[index] ? (shootGroups[index] as string) : null,
            }))
            .filter((volley: { arrows: unknown[] }) => volley.arrows.length === arrowsPerVolley)
            .map((volley: { arrows: (number | null)[]; group: string | null }) => {
                const total = roundTotal(volley.arrows);
                return { ...volley, total, success: total >= successZone };
            });
        const currentShoot: (number | null)[] = Array.isArray(saved.currentshoot)
            ? [...saved.currentshoot].slice(0, arrowsPerVolley)
            : Array(arrowsPerVolley).fill(null);
        while (currentShoot.length < arrowsPerVolley) currentShoot.push(null);
        let currentArrowIndex = Number.isInteger(saved.currentArrowIndex)
            ? Math.max(0, Math.min(saved.currentArrowIndex, arrowsPerVolley))
            : currentShoot.findIndex((value) => value === null);
        if (currentArrowIndex < 0) currentArrowIndex = arrowsPerVolley;
        const targetCount = Number.isInteger(saved.targetCount) ? saved.targetCount : getTargetCountForRuleset(ruleset);
        const contestMode = Boolean(saved.contestMode && saved.contestInfo);

        state.value = {
            ...state.value,
            ruleset,
            scoringMode,
            weapon: isWeaponAllowedForRuleset(saved.weapon || "", ruleset) ? saved.weapon : (getWeaponsForRuleset(ruleset)[0] ?? ""),
            lieu: saved.lieu || "",
            sessionDate: saved.sessionDate || "",
            sessionTime: saved.sessionTime || "",
            contestIdentifier: saved.contestIdentifier || "",
            useTargetGroups: typeof saved.useTargetGroups === "boolean" ? saved.useTargetGroups : true,
            soloSessionType: normalizeSoloSessionType(
                saved.soloSessionType,
                normalizeSoloSessionType(setup.soloSessionType),
            ) as "training" | "contest",
            timerMode: normalizeSoloTimerMode(
                saved.timerMode,
                normalizeSoloTimerMode(setup.timerMode, normalizeSoloTimerMode(saved.useTimer, normalizeSoloTimerMode(setup.useTimer))),
            ),
            showScores: typeof saved.showScores === "boolean"
                ? saved.showScores
                : (typeof setup.showScores === "boolean" ? setup.showScores : true),
            successZone,
            targetCount,
            arrowsPerVolley,
            allowedPoints,
            phase: "scoring",
            currentShoot,
            currentArrowIndex,
            volleys,
            inputLocked: false,
            archivedAt: saved.historyEntryArchivedAt || null,
            generatedAt: saved.sessionStartedAt || new Date().toISOString(),
            editingVolleyIndex: Number.isInteger(saved.editingVolleyIndex) ? saved.editingVolleyIndex : null,
            lastEditedVolleyIndex: null,
            progressionAxis: saved.progressionAxis || "",
            contestMode,
            contestInfo: contestMode ? normalizeContestInfo(saved.contestInfo, ruleset) : null,
            soloContestInfo: normalizeContestInfo(saved.soloContestInfo, ruleset),
            soloContestParticipant: null,
            soloTimerVolleyIndex: null,
            completionArchived: volleys.length === targetCount,
        };
        syncTargetGroupSelect(saved.currentGroup || null);
        return true;
    }

    // --- Contest (Mode Multi) local progress (persistContestProgressState / restoreContestProgressState) ---

    function getContestProgressStorageKey(contestInfo: ContestInfo | null): string {
        if (!contestInfo) return "";
        const uuid = typeof contestInfo.uuid === "string" ? contestInfo.uuid.trim() : "";
        const ruleset = typeof contestInfo.ruleset === "string" ? contestInfo.ruleset.trim() : "";
        return uuid && ruleset ? `${uuid}:${ruleset}` : "";
    }

    function persistContestProgressState() {
        if (!state.value.contestMode || !state.value.contestInfo || state.value.phase !== "scoring") return;
        const contestKey = getContestProgressStorageKey(state.value.contestInfo);
        if (!contestKey) return;
        const parsed = readStorageJson(CONTEST_PROGRESS_KEY);
        const entries = parsed && typeof parsed === "object" ? parsed : {};
        entries[contestKey] = { updatedAt: new Date().toISOString(), scoring: buildScoringSnapshot() };
        writeStorageJson(CONTEST_PROGRESS_KEY, entries);
    }

    /**
     * Hook for useContest (mirrors restoreContestProgressState() called by
     * startContestScoring()): reloads this device's locally saved progress for
     * the contest linked via configureContest(). Returns true when restored.
     */
    function restoreContestProgress(contestInfo: ContestInfo | null = state.value.contestInfo): boolean {
        const contestKey = getContestProgressStorageKey(contestInfo);
        if (!contestKey) return false;
        const scoring = readStorageJson(CONTEST_PROGRESS_KEY)?.[contestKey]?.scoring;
        if (!scoring || scoring.activeRuleset !== state.value.ruleset) return false;

        const shootGroups: unknown[] = Array.isArray(scoring.shootGroups) ? scoring.shootGroups : [];
        const successZone = state.value.successZone;
        state.value.volleys = (Array.isArray(scoring.shoots) ? scoring.shoots : [])
            .map((shoot: unknown, index: number) => ({
                arrows: Array.isArray(shoot) ? [...shoot] : [],
                group: typeof shootGroups[index] === "string" && shootGroups[index] ? (shootGroups[index] as string) : null,
            }))
            .filter((volley: { arrows: unknown[] }) => volley.arrows.length === state.value.arrowsPerVolley)
            .map((volley: { arrows: (number | null)[]; group: string | null }) => {
                const total = roundTotal(volley.arrows);
                return { ...volley, total, success: total >= successZone };
            });
        if (isWeaponAllowedForRuleset(scoring.weapon || "", state.value.ruleset)) state.value.weapon = scoring.weapon;
        const currentShoot: (number | null)[] = Array.isArray(scoring.currentshoot)
            ? [...scoring.currentshoot].slice(0, state.value.arrowsPerVolley)
            : [];
        while (currentShoot.length < state.value.arrowsPerVolley) currentShoot.push(null);
        state.value.currentShoot = currentShoot;
        let currentArrowIndex = Number.isInteger(scoring.currentArrowIndex)
            ? Math.max(0, Math.min(scoring.currentArrowIndex, state.value.arrowsPerVolley))
            : currentShoot.findIndex((value) => value === null);
        if (currentArrowIndex < 0) currentArrowIndex = state.value.arrowsPerVolley;
        state.value.currentArrowIndex = currentArrowIndex;
        state.value.editingVolleyIndex = Number.isInteger(scoring.editingVolleyIndex) ? scoring.editingVolleyIndex : null;
        state.value.progressionAxis = scoring.progressionAxis || "";
        state.value.soloTimerVolleyIndex = null;
        state.value.completionArchived = typeof scoring.completionArchived === "boolean"
            ? scoring.completionArchived
            : state.value.volleys.length === state.value.targetCount;
        syncTargetGroupSelect(scoring.currentGroup || null);
        return true;
    }

    /** Mirrors restart(): drops the session in progress (and its auto-save) but keeps the setup snapshot. */
    function reset() {
        const keepSetup = getSetupSnapshot();
        state.value = {
            ...createDefaultSetup(),
            ...freshScoringDefaults(),
        };
        setupSnapshot.value = keepSetup;
        if (import.meta.client) {
            clearPersistedState();
            persistAppState();
        }
    }

    return {
        state,
        completedVolleys,
        totalScore,
        isComplete,
        maxVolley,
        maxShootTotal,
        selectablePoints,
        groupOptions,
        useTargetGroupsForScoring,
        hasPartialVolley,
        isScoreAllowedForCurrentArrow,
        getSelectedTargetGroup,
        configureForSetup,
        selectGroup,
        configureContest,
        startScoring,
        registerScore,
        stepBackOneArrow,
        editVolleyAt,
        deleteVolleyAt,
        setProgressionAxis,
        buildResultsPayload,
        persist,
        resumeIfIncomplete,
        restoreIncompleteSession,
        syncSoloContestUserProgress,
        restoreSoloContestUserProgress,
        restoreContestProgress,
        getSetupSnapshot,
        saveSetupSnapshot,
        persistAppState,
        clearPersistedState,
        restorePersistedScoring,
        reset,
    };
}
