// Peloton mode ("Mode Multi" peloton sub-mode): up to 6 named archers each
// have their own independent volley/target progression and take turns in
// rotation, ported from app.js's state.pelotonRoster/state.pelotonByArcher +
// registerPelotonScore/getNextPelotonArcherId/PELOTON_BONUS_EVENTS/etc.
import {
    getArrowsPerVolley,
    getMaxShootTotalForConfig,
    getSelectablePointsForArrow,
    getTargetCountForRuleset,
    presets,
} from "~/utils/scoring-engine";
import type { Ruleset } from "~/utils/scoring-format";
import {
    applyPelotonBonusEvent,
    checkPelotonVolleyReachedMax,
    getDuelTotal,
    getNextPelotonArcherId,
    getPelotonGlobalTargetIndex,
    getPelotonHeaderNames,
    getPelotonVolleyMaxScore,
    pickWeightedEvent,
    PELOTON_BONUS_EVENTS,
    type PelotonArcherState as RotationArcherState,
} from "~/utils/multi-engine";

const LAST_SCORE_PREVIEW_MS = 700;
const EVENT_FLASH_MS = 5000;

export type PelotonScore = number | null;

export interface PelotonSetup {
    ruleset: Ruleset;
    ludicMode: boolean;
    archers: { index: number; name: string }[];
}

interface PelotonArcherState {
    name: string;
    scores: PelotonScore[][];
    currentTargetIndex: number;
    currentArrowIndex: number;
    completed: boolean;
}

interface ExtraArrowState {
    archerIndex: number;
    archerName: string;
    targetIndex: number;
    nextTargetIndex: number;
    nextArrowIndex: number;
}

interface EventFlashState {
    label: string;
    description: string;
}

interface PelotonState {
    phase: "setup" | "scoring";
    ruleset: Ruleset;
    targetCount: number;
    arrowsPerTarget: number;
    allowedPoints: number[];
    ludicMode: boolean;
    roster: { index: number; name: string }[];
    byArcher: Record<number, PelotonArcherState>;
    activeArcherIndex: number | null;
    previewLocked: boolean;
    completed: boolean;
    extraArrow: ExtraArrowState | null;
    eventFlash: EventFlashState | null;
}

function buildInitialState(): PelotonState {
    return {
        phase: "setup",
        ruleset: "nature",
        targetCount: 0,
        arrowsPerTarget: 2,
        allowedPoints: [],
        ludicMode: false,
        roster: [],
        byArcher: {},
        activeArcherIndex: null,
        previewLocked: false,
        completed: false,
        extraArrow: null,
        eventFlash: null,
    };
}

function buildArcherState(name: string, targetCount: number, arrowsPerTarget: number): PelotonArcherState {
    return {
        name,
        scores: Array.from({ length: targetCount }, () => Array(arrowsPerTarget).fill(null)),
        currentTargetIndex: 0,
        currentArrowIndex: 0,
        completed: false,
    };
}

export function usePelotonSession() {
    const state = useState<PelotonState>("peloton-session-state", buildInitialState);

    let previewTimeoutId: number | null = null;
    let eventFlashTimeoutId: number | null = null;

    function clearTimers() {
        if (previewTimeoutId !== null) {
            window.clearTimeout(previewTimeoutId);
            previewTimeoutId = null;
        }
        if (eventFlashTimeoutId !== null) {
            window.clearTimeout(eventFlashTimeoutId);
            eventFlashTimeoutId = null;
        }
    }

    const archerIds = computed(() => state.value.roster.map((a) => a.index));

    function getArcherState(id: number): RotationArcherState | null {
        const s = state.value.byArcher[id];
        if (!s) return null;
        return { index: id, completed: s.completed, currentTargetIndex: s.currentTargetIndex };
    }

    const activeArcher = computed<PelotonArcherState | null>(() => {
        const idx = state.value.activeArcherIndex;
        if (idx === null) return null;
        return state.value.byArcher[idx] ?? null;
    });

    const activeArcherName = computed(() => {
        const idx = state.value.activeArcherIndex;
        return state.value.roster.find((a) => a.index === idx)?.name ?? "";
    });

    const globalTargetIndex = computed(() =>
        getPelotonGlobalTargetIndex(archerIds.value, getArcherState, state.value.targetCount),
    );

    const headerNames = computed(() =>
        getPelotonHeaderNames(state.value.roster, state.value.ruleset, globalTargetIndex.value),
    );

    const selectablePoints = computed(() => {
        const archer = activeArcher.value;
        if (!archer) return [];
        return getSelectablePointsForArrow(state.value.ruleset, "individual", archer.currentArrowIndex, state.value.allowedPoints);
    });

    /** Bonus arrow always uses the first-arrow point pattern (mirrors app.js's openPelotonExtraArrowModal). */
    const extraArrowSelectablePoints = computed(() =>
        getSelectablePointsForArrow(state.value.ruleset, "individual", 0, state.value.allowedPoints),
    );

    const isLocked = computed(() => state.value.previewLocked || state.value.completed || !activeArcher.value || activeArcher.value.completed);

    const maxVolleyTotal = computed(() =>
        getMaxShootTotalForConfig(state.value.ruleset, "individual", state.value.arrowsPerTarget, state.value.allowedPoints),
    );

    function archerTotal(index: number): number {
        const archer = state.value.byArcher[index];
        return archer ? getDuelTotal(archer.scores) : 0;
    }

    const leaderIndices = computed<Set<number>>(() => {
        const allCompleted = state.value.roster.every((a) => state.value.byArcher[a.index]?.completed);
        if (!(allCompleted || globalTargetIndex.value > 0)) return new Set();

        let bestTotal = -Infinity;
        const leaders = new Set<number>();
        state.value.roster.forEach((archer) => {
            const total = archerTotal(archer.index);
            if (total > bestTotal) {
                bestTotal = total;
                leaders.clear();
                leaders.add(archer.index);
            } else if (total === bestTotal) {
                leaders.add(archer.index);
            }
        });
        return leaders;
    });

    function configure(setup: PelotonSetup) {
        clearTimers();
        const targetCount = getTargetCountForRuleset(setup.ruleset);
        const arrowsPerTarget = getArrowsPerVolley(setup.ruleset, "individual");
        const allowedPoints = [...new Set(presets[setup.ruleset] || [0])].sort((a, b) => b - a);

        const byArcher: Record<number, PelotonArcherState> = {};
        setup.archers.forEach((a) => {
            byArcher[a.index] = buildArcherState(a.name, targetCount, arrowsPerTarget);
        });

        state.value = {
            phase: "scoring",
            ruleset: setup.ruleset,
            targetCount,
            arrowsPerTarget,
            allowedPoints,
            ludicMode: setup.ludicMode,
            roster: setup.archers,
            byArcher,
            activeArcherIndex: setup.archers[0]?.index ?? null,
            previewLocked: false,
            completed: false,
            extraArrow: null,
            eventFlash: null,
        };
    }

    function reset() {
        clearTimers();
        state.value = buildInitialState();
    }

    function selectArcher(index: number, manualSelection = false) {
        const archer = state.value.byArcher[index];
        if (!archer) return;
        if (manualSelection && archer.completed) {
            archer.completed = false;
            archer.currentTargetIndex = Math.max(0, state.value.targetCount - 1);
            archer.currentArrowIndex = Math.max(0, state.value.arrowsPerTarget - 1);
        }
        state.value.activeArcherIndex = index;
    }

    function finishAllOrAdvanceTo(nextArcherId: number | null) {
        if (nextArcherId !== null) {
            state.value.activeArcherIndex = nextArcherId;
            return;
        }
        state.value.completed = true;
    }

    function registerScore(score: number) {
        const peloton = state.value;
        const archerIndex = peloton.activeArcherIndex;
        if (archerIndex === null) return;
        const archer = peloton.byArcher[archerIndex];
        if (!archer || archer.completed || peloton.previewLocked) return;
        const { targetCount, arrowsPerTarget } = peloton;
        const { currentTargetIndex, currentArrowIndex } = archer;
        if (currentTargetIndex >= targetCount) return;
        if (!selectablePoints.value.includes(score)) return;

        if (!archer.scores[currentTargetIndex]) {
            archer.scores[currentTargetIndex] = Array(arrowsPerTarget).fill(null);
        }
        archer.scores[currentTargetIndex]![currentArrowIndex] = score;

        let nextTargetIndex = currentTargetIndex;
        let nextArrowIndex = currentArrowIndex + 1;
        let volleyCompleted = false;
        if (nextArrowIndex >= arrowsPerTarget) {
            volleyCompleted = true;
            nextArrowIndex = 0;
            nextTargetIndex += 1;
        }

        if (!volleyCompleted) {
            archer.currentTargetIndex = nextTargetIndex;
            archer.currentArrowIndex = nextArrowIndex;
            return;
        }

        peloton.previewLocked = true;

        const finishedTargetIndex = currentTargetIndex;
        const volleyTotal = archer.scores[finishedTargetIndex]!.reduce((sum, v) => sum + (v == null ? 0 : v), 0);
        const maxScore = getPelotonVolleyMaxScore(peloton.ruleset, peloton.arrowsPerTarget, peloton.allowedPoints);
        const volleyReachedMax = checkPelotonVolleyReachedMax(volleyTotal, maxScore);
        const shouldApplyLudicBonus = peloton.ludicMode && volleyReachedMax;

        if (shouldApplyLudicBonus) {
            previewTimeoutId = window.setTimeout(() => {
                previewTimeoutId = null;
                peloton.extraArrow = {
                    archerIndex,
                    archerName: archer.name,
                    targetIndex: finishedTargetIndex,
                    nextTargetIndex,
                    nextArrowIndex,
                };
            }, LAST_SCORE_PREVIEW_MS);
            return;
        }

        previewTimeoutId = window.setTimeout(() => {
            previewTimeoutId = null;
            peloton.previewLocked = false;
            if (nextTargetIndex >= targetCount) {
                archer.completed = true;
            } else {
                archer.currentTargetIndex = nextTargetIndex;
                archer.currentArrowIndex = nextArrowIndex;
            }
            const nextArcherId = getNextPelotonArcherId(archerIds.value, getArcherState, archerIndex, finishedTargetIndex, peloton.ruleset);
            finishAllOrAdvanceTo(nextArcherId);
        }, LAST_SCORE_PREVIEW_MS);
    }

    /** Bonus arrow: never stored — only whether it hits max triggers a random event. */
    function submitExtraArrow(score: number) {
        const peloton = state.value;
        const extra = peloton.extraArrow;
        if (!extra) return;
        const archer = peloton.byArcher[extra.archerIndex];
        peloton.extraArrow = null;

        const selectable = getSelectablePointsForArrow(peloton.ruleset, "individual", 0, peloton.allowedPoints);
        const maxBonusScore = Math.max(...selectable.filter((p) => Number.isFinite(p)));

        if (score === maxBonusScore) {
            const event = pickWeightedEvent(PELOTON_BONUS_EVENTS);
            const others = peloton.roster
                .filter((a) => a.index !== extra.archerIndex)
                .map((a) => {
                    const otherArcher = peloton.byArcher[a.index]!;
                    return { name: a.name, arrows: otherArcher.scores[extra.targetIndex]! };
                });
            const result = applyPelotonBonusEvent(event.id, others, peloton.allowedPoints);
            peloton.eventFlash = result;
            if (eventFlashTimeoutId !== null) window.clearTimeout(eventFlashTimeoutId);
            eventFlashTimeoutId = window.setTimeout(() => {
                eventFlashTimeoutId = null;
                peloton.eventFlash = null;
            }, EVENT_FLASH_MS);
        }

        peloton.previewLocked = true;
        previewTimeoutId = window.setTimeout(() => {
            previewTimeoutId = null;
            peloton.previewLocked = false;
            if (extra.nextTargetIndex >= peloton.targetCount) {
                if (archer) archer.completed = true;
            } else if (archer) {
                archer.currentTargetIndex = extra.nextTargetIndex;
                archer.currentArrowIndex = extra.nextArrowIndex;
            }
            const nextArcherId = getNextPelotonArcherId(archerIds.value, getArcherState, extra.archerIndex, extra.targetIndex, peloton.ruleset);
            finishAllOrAdvanceTo(nextArcherId);
        }, LAST_SCORE_PREVIEW_MS);
    }

    return {
        state,
        activeArcher,
        activeArcherName,
        globalTargetIndex,
        headerNames,
        selectablePoints,
        extraArrowSelectablePoints,
        isLocked,
        maxVolleyTotal,
        leaderIndices,
        archerTotal,
        configure,
        reset,
        selectArcher,
        registerScore,
        submitExtraArrow,
        getDuelTotal,
    };
}
