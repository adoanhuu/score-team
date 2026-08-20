// Stateful composable for Mode Solo: reactive port of app.js's scoring
// `state` object + actions (registerScore/undo/edit/delete), backed by the
// pure helpers in scoring-engine.ts and persisted incrementally to Dexie via
// useHistory().upsert() (mirrors updateSoloHistoryEntryFromCurrentSession()).
// Contest-mode (Concours) linking and the Peloton/Duel/Multi engines are
// intentionally NOT ported here - out of scope for this pass.
import type { Ruleset } from "~/utils/scoring-format";
import {
    presets,
    getArrowsPerVolley,
    getTargetCountForRuleset,
    getSelectablePointsForArrow,
    getMaxVolleyForConfig,
    getMaxShootTotalForConfig,
    clampSuccessZoneForConfig,
    getGroupsForRuleset,
    roundTotal,
    scoreToValue,
    normalizeScoringMode,
    normalizeSoloTimerMode,
    type ScoringMode,
    type SoloTimerMode,
} from "~/utils/scoring-engine";
import type { HistoryEntryRecord } from "./useDb";

/** Mirrors app.js's LAST_SCORE_PREVIEW_MS: brief pause showing the full volley before it's committed to history. */
const LAST_SCORE_PREVIEW_MS = 300;

export interface SoloVolley {
    index: number;
    arrows: (number | null)[];
    group: string | null;
    total: number;
    success: boolean;
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

interface SoloState extends SoloSetupValues {
    phase: "setup" | "scoring";
    arrowsPerVolley: number;
    allowedPoints: number[];
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
}

function createDefaultSetup(ruleset: Ruleset = "nature"): SoloSetupValues {
    const scoringMode = normalizeScoringMode("team", ruleset);
    return {
        ruleset,
        scoringMode,
        weapon: "",
        lieu: "",
        sessionDate: new Date().toISOString().slice(0, 10),
        sessionTime: new Date().toISOString().slice(11, 16),
        contestIdentifier: "",
        useTargetGroups: true,
        soloSessionType: "training",
        timerMode: normalizeSoloTimerMode(undefined, "none"),
        showScores: true,
        successZone: 1,
        targetCount: getTargetCountForRuleset(ruleset),
    };
}

function freshScoringDefaults(): Pick<
    SoloState,
    | "phase"
    | "arrowsPerVolley"
    | "allowedPoints"
    | "currentShoot"
    | "currentArrowIndex"
    | "volleys"
    | "selectedGroup"
    | "inputLocked"
    | "archivedAt"
    | "generatedAt"
    | "editingVolleyIndex"
    | "lastEditedVolleyIndex"
    | "progressionAxis"
> {
    return {
        phase: "setup",
        arrowsPerVolley: getArrowsPerVolley("nature", "team"),
        allowedPoints: presets.nature,
        currentShoot: [],
        currentArrowIndex: 0,
        volleys: [],
        selectedGroup: null,
        inputLocked: false,
        archivedAt: null,
        generatedAt: null,
        editingVolleyIndex: null,
        lastEditedVolleyIndex: null,
        progressionAxis: "",
    };
}

export function useSoloSession() {
    const state = useState<SoloState>("solo-session-state", () => ({
        ...createDefaultSetup(),
        ...freshScoringDefaults(),
    }));

    const { upsert, getLatestIncomplete } = useHistory();

    const completedVolleys = computed(() => state.value.volleys.length);
    const totalScore = computed(() => state.value.volleys.reduce((sum, v) => sum + v.total, 0));
    const isComplete = computed(() => completedVolleys.value >= state.value.targetCount && state.value.targetCount > 0);
    const useTargetGroupsForScoring = computed(() => state.value.useTargetGroups);
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

    function isScoreAllowedForCurrentArrow(score: number): boolean {
        if (state.value.ruleset === "nature" && state.value.scoringMode === "team" && !isNatureTeamQuotaAllowed(score)) {
            return false;
        }
        if (state.value.currentArrowIndex === 0) {
            return score <= maxShootTotal.value;
        }
        return currentShootPartialTotal.value + score <= maxShootTotal.value;
    }

    function configureForSetup(setup: SoloSetupValues) {
        const scoringMode = normalizeScoringMode(setup.scoringMode, setup.ruleset);
        const arrowsPerVolley = getArrowsPerVolley(setup.ruleset, scoringMode);
        const allowedPoints = [...new Set(presets[setup.ruleset] ?? presets.nature)].sort((a, b) => b - a);
        state.value = {
            ...state.value,
            ...setup,
            scoringMode,
            arrowsPerVolley,
            allowedPoints,
            successZone: clampSuccessZoneForConfig(setup.successZone, setup.ruleset, scoringMode, arrowsPerVolley, allowedPoints),
        };
    }

    function selectGroup(group: string | null) {
        state.value.selectedGroup = group;
    }

    function startScoring(setup: SoloSetupValues) {
        configureForSetup(setup);
        state.value.phase = "scoring";
        state.value.currentShoot = [];
        state.value.currentArrowIndex = 0;
        state.value.volleys = [];
        state.value.selectedGroup = groupOptions.value[0] ?? null;
        state.value.inputLocked = false;
        state.value.archivedAt = null;
        state.value.generatedAt = new Date().toISOString();
        state.value.editingVolleyIndex = null;
        state.value.lastEditedVolleyIndex = null;
        state.value.progressionAxis = "";
    }

    /** Registers one arrow's score; commits the volley (after a brief preview) once arrowsPerVolley arrows are entered. */
    async function registerScore(score: number) {
        if (state.value.inputLocked) return;
        const isEditing = Number.isInteger(state.value.editingVolleyIndex);
        if (isComplete.value && !isEditing) return;
        if (state.value.currentArrowIndex >= state.value.arrowsPerVolley) return;
        if (!selectablePoints.value.includes(score)) return;
        if (!isScoreAllowedForCurrentArrow(score)) return;

        const shoot = [...state.value.currentShoot];
        shoot[state.value.currentArrowIndex] = score;
        state.value.currentShoot = shoot;
        state.value.currentArrowIndex += 1;

        if (state.value.currentArrowIndex < state.value.arrowsPerVolley) return;

        state.value.inputLocked = true;
        const editingIndexSnapshot = isEditing ? state.value.editingVolleyIndex : null;
        const delay = isEditing ? 0 : LAST_SCORE_PREVIEW_MS;
        const selectedGroup = state.value.selectedGroup;

        await new Promise<void>((resolve) => window.setTimeout(resolve, delay));

        const newArrows = [...state.value.currentShoot];
        const total = roundTotal(newArrows);
        const volley: SoloVolley = {
            index: 0,
            arrows: newArrows,
            group: selectedGroup,
            total,
            success: total >= state.value.successZone,
        };

        if (Number.isInteger(editingIndexSnapshot)) {
            const replaceIndex = Math.max(0, Math.min(editingIndexSnapshot as number, state.value.volleys.length - 1));
            state.value.volleys = state.value.volleys.map((v, i) => (i === replaceIndex ? { ...volley, index: i } : v));
            state.value.lastEditedVolleyIndex = replaceIndex;
            state.value.editingVolleyIndex = null;
        } else {
            state.value.volleys = [...state.value.volleys, { ...volley, index: state.value.volleys.length }];
        }

        state.value.inputLocked = false;
        await persist();

        if (!isComplete.value) {
            state.value.currentShoot = [];
            state.value.currentArrowIndex = 0;
        }
    }

    /** Removes the last entered arrow; once the in-progress volley buffer is empty, pops the last committed volley back into it (mirrors stepBackOneArrow crossing a volley boundary). */
    function stepBackOneArrow() {
        if (state.value.inputLocked) return;
        if (state.value.editingVolleyIndex !== null && state.value.currentArrowIndex === 0) return;

        if (state.value.currentArrowIndex > 0) {
            const shoot = [...state.value.currentShoot];
            state.value.currentArrowIndex -= 1;
            shoot[state.value.currentArrowIndex] = null;
            state.value.currentShoot = shoot;
            void persist();
            return;
        }

        if (state.value.volleys.length === 0) return;
        const previous = state.value.volleys[state.value.volleys.length - 1];
        state.value.volleys = state.value.volleys.slice(0, -1);
        state.value.currentShoot = [...previous.arrows];
        state.value.currentArrowIndex = previous.arrows.length;
        state.value.selectedGroup = previous.group;
        void persist();
    }

    function editVolleyAt(index: number) {
        if (state.value.inputLocked) return;
        if (isComplete.value) return;
        if (index < 0 || index >= state.value.volleys.length) return;
        const volley = state.value.volleys[index];
        state.value.editingVolleyIndex = index;
        state.value.currentShoot = [];
        state.value.currentArrowIndex = 0;
        if (state.value.useTargetGroups) state.value.selectedGroup = volley?.group ?? null;
    }

    async function deleteVolleyAt(index: number) {
        if (state.value.inputLocked) return;
        if (index < 0 || index >= state.value.volleys.length) return;
        state.value.volleys = state.value.volleys.filter((_, i) => i !== index).map((v, i) => ({ ...v, index: i }));
        if (state.value.lastEditedVolleyIndex === index) state.value.lastEditedVolleyIndex = null;
        else if (state.value.lastEditedVolleyIndex !== null && index < state.value.lastEditedVolleyIndex) {
            state.value.lastEditedVolleyIndex -= 1;
        }
        await persist();
    }

    async function setProgressionAxis(text: string) {
        state.value.progressionAxis = text;
        await persist();
    }

    /** Mirrors app.js's buildResultsPayload(). */
    function buildResultsPayload(): HistoryEntryRecord {
        const volleys = state.value.volleys;
        const totals = volleys.map((v) => v.total);
        const best = volleys.reduce(
            (acc, v) => (v.total > acc.total ? { index: v.index, total: v.total } : acc),
            { index: -1, total: -Infinity },
        );
        const worst = volleys.reduce(
            (acc, v) => (v.total < acc.total ? { index: v.index, total: v.total } : acc),
            { index: -1, total: Infinity },
        );
        const avgVolley = volleys.length ? totals.reduce((s, v) => s + v, 0) / volleys.length : 0;
        const avgArrow = state.value.arrowsPerVolley ? avgVolley / state.value.arrowsPerVolley : 0;

        return {
            generatedAt: state.value.generatedAt ?? new Date().toISOString(),
            archivedAt: state.value.archivedAt ?? undefined,
            ruleset: state.value.ruleset,
            scoringMode: state.value.scoringMode,
            weapon: state.value.weapon,
            lieu: state.value.lieu,
            sessionDate: state.value.sessionDate,
            sessionTime: state.value.sessionTime,
            contestIdentifier: state.value.contestIdentifier,
            useTargetGroups: state.value.useTargetGroups,
            soloSessionType: state.value.soloSessionType,
            timerMode: state.value.timerMode,
            useTimer: state.value.timerMode !== "none",
            showScores: state.value.showScores,
            targetCount: state.value.targetCount,
            arrowsPerVolley: state.value.arrowsPerVolley,
            successZone: state.value.successZone,
            completed: isComplete.value,
            total: totalScore.value,
            avgVolley,
            avgArrow,
            bestVolley: best.index >= 0 ? best : null,
            worstVolley: worst.index >= 0 ? worst : null,
            allowedPoints: state.value.allowedPoints,
            distribution: totals,
            volleys,
            progressionAxis: state.value.progressionAxis,
        };
    }

    /** Incremental save after every completed volley / edit / delete, mirroring updateSoloHistoryEntryFromCurrentSession(). */
    async function persist() {
        const payload = buildResultsPayload();
        const saved = await upsert(payload);
        state.value.archivedAt = saved?.archivedAt ?? state.value.archivedAt;
    }

    async function resumeIfIncomplete(): Promise<HistoryEntryRecord | null> {
        return getLatestIncomplete();
    }

    function restoreIncompleteSession(entry: HistoryEntryRecord) {
        const ruleset = (entry.ruleset as Ruleset) ?? "nature";
        const scoringMode = normalizeScoringMode(entry.scoringMode, ruleset);
        const arrowsPerVolley = Number(entry.arrowsPerVolley) || getArrowsPerVolley(ruleset, scoringMode);
        const allowedPoints = (entry.allowedPoints as number[]) ?? presets[ruleset] ?? presets.nature;
        const volleys = ((entry.volleys as SoloVolley[]) ?? []).map((v, i) => ({ ...v, index: i }));

        state.value = {
            ...state.value,
            ruleset,
            scoringMode,
            weapon: String(entry.weapon ?? ""),
            lieu: String(entry.lieu ?? ""),
            sessionDate: String(entry.sessionDate ?? state.value.sessionDate),
            sessionTime: String(entry.sessionTime ?? state.value.sessionTime),
            contestIdentifier: String(entry.contestIdentifier ?? ""),
            useTargetGroups: Boolean(entry.useTargetGroups),
            soloSessionType: (entry.soloSessionType as "training" | "contest") ?? "training",
            timerMode: normalizeSoloTimerMode(entry.timerMode, "none"),
            showScores: entry.showScores !== false,
            successZone: Number(entry.successZone) || 1,
            targetCount: Number(entry.targetCount) || getTargetCountForRuleset(ruleset),
            arrowsPerVolley,
            allowedPoints,
            phase: "scoring",
            currentShoot: [],
            currentArrowIndex: 0,
            volleys,
            selectedGroup: volleys[volleys.length - 1]?.group ?? getGroupsForRuleset(ruleset)[0] ?? null,
            inputLocked: false,
            archivedAt: entry.archivedAt ?? null,
            generatedAt: entry.generatedAt,
            editingVolleyIndex: null,
            lastEditedVolleyIndex: null,
            progressionAxis: String(entry.progressionAxis ?? ""),
        };
    }

    /** Prefill the setup form from an incomplete entry without entering scoring yet (mirrors applyIncompleteSoloSessionToSetup). */
    function applyIncompleteSessionToSetup(entry: HistoryEntryRecord): SoloSetupValues {
        const ruleset = (entry.ruleset as Ruleset) ?? "nature";
        return {
            ruleset,
            scoringMode: normalizeScoringMode(entry.scoringMode, ruleset),
            weapon: String(entry.weapon ?? ""),
            lieu: String(entry.lieu ?? ""),
            sessionDate: String(entry.sessionDate ?? state.value.sessionDate),
            sessionTime: String(entry.sessionTime ?? state.value.sessionTime),
            contestIdentifier: String(entry.contestIdentifier ?? ""),
            useTargetGroups: Boolean(entry.useTargetGroups),
            soloSessionType: (entry.soloSessionType as "training" | "contest") ?? "training",
            timerMode: normalizeSoloTimerMode(entry.timerMode, "none"),
            showScores: entry.showScores !== false,
            successZone: Number(entry.successZone) || 1,
            targetCount: Number(entry.targetCount) || getTargetCountForRuleset(ruleset),
        };
    }

    function reset() {
        state.value = {
            ...createDefaultSetup(),
            ...freshScoringDefaults(),
        };
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
        configureForSetup,
        selectGroup,
        startScoring,
        registerScore,
        stepBackOneArrow,
        editVolleyAt,
        deleteVolleyAt,
        setProgressionAxis,
        buildResultsPayload,
        resumeIfIncomplete,
        restoreIncompleteSession,
        applyIncompleteSessionToSetup,
        reset,
    };
}
