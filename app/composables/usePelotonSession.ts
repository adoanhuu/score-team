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
    getPelotonVolleyTotal,
    pickWeightedEvent,
    PELOTON_BONUS_EVENTS,
    type PelotonArcherState as RotationArcherState,
} from "~/utils/multi-engine";

const LAST_SCORE_PREVIEW_MS = 300;
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
    /** Per-archer completion, as app.js's state.pelotonByArcher[i].completed. */
    completed: boolean;
    /** Set when the archer was picked manually (correction): limits step back to the previous target (app.js's editingMode). */
    editingMode: boolean;
}

/** Volley finished, waiting for the end of the preview (or the bonus arrow) before rotating. */
interface PendingAdvanceState {
    archerIndex: number;
    finishedTargetIndex: number;
    nextTargetIndex: number;
    nextArrowIndex: number;
    /** Fun mode: a bonus arrow is due before rotating. */
    bonus?: boolean;
}

interface ExtraArrowState extends PendingAdvanceState {
    archerName: string;
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
    pendingAdvance: PendingAdvanceState | null;
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
        pendingAdvance: null,
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
        editingMode: false,
    };
}

// Module-level so every usePelotonSession() caller shares (and can clear) them.
let previewTimeoutId: number | null = null;
let eventFlashTimeoutId: number | null = null;

export function usePelotonSession() {
    const state = useState<PelotonState>("peloton-session-state", buildInitialState);
    const { showFlash } = useFlash();

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

    /** Every archer has finished all targets. */
    const allCompleted = computed(
        () => state.value.roster.length > 0 && state.value.roster.every((a) => state.value.byArcher[a.index]?.completed),
    );

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

    /** Mirrors renderPelotonPad()'s lock: preview running or active archer finished (plus the bonus modal being open). */
    const isLocked = computed(
        () => state.value.previewLocked || Boolean(state.value.extraArrow) || !activeArcher.value || activeArcher.value.completed,
    );

    /** History pill "full volley" reference (app.js's getSessionVolleyMaxTotal). */
    const maxVolleyTotal = computed(() =>
        getMaxShootTotalForConfig(state.value.ruleset, "individual", state.value.arrowsPerTarget, state.value.allowedPoints),
    );

    function archerTotal(index: number): number {
        const archer = state.value.byArcher[index];
        return archer ? getDuelTotal(archer.scores) : 0;
    }

    const leaderIndices = computed<Set<number>>(() => {
        if (!(allCompleted.value || globalTargetIndex.value > 0)) return new Set();

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
            pendingAdvance: null,
            extraArrow: null,
            eventFlash: null,
        };
    }

    function reset() {
        clearTimers();
        state.value = buildInitialState();
    }

    /**
     * Mirrors app.js's updatePelotonArcher(): makes `index` the active archer.
     * A manual pick turns on editingMode and, for a finished archer, reopens
     * their last arrow so it can be corrected.
     */
    function selectArcher(index: number, manualSelection = false) {
        const peloton = state.value;
        const archer = peloton.byArcher[index];
        if (!archer) return;
        // Not while a volley is being rotated / the bonus arrow is pending.
        if (manualSelection && (peloton.previewLocked || peloton.extraArrow)) return;

        archer.editingMode = manualSelection;
        if (manualSelection && archer.completed) {
            archer.completed = false;
            archer.currentTargetIndex = Math.max(0, peloton.targetCount - 1);
            archer.currentArrowIndex = Math.max(0, peloton.arrowsPerTarget - 1);
        }
        peloton.activeArcherIndex = index;
        if (manualSelection) showFlash(`Archer sélectionné : ${archer.name}`);
    }

    /** End of a volley's preview (or of the bonus arrow): store the archer's progress then rotate. */
    function completePendingAdvance() {
        const peloton = state.value;
        const pending = peloton.pendingAdvance;
        peloton.previewLocked = false;
        peloton.pendingAdvance = null;
        if (!pending) return;

        const archer = peloton.byArcher[pending.archerIndex];
        if (archer) {
            if (pending.nextTargetIndex >= peloton.targetCount) {
                archer.completed = true;
            } else {
                archer.currentTargetIndex = pending.nextTargetIndex;
                archer.currentArrowIndex = pending.nextArrowIndex;
            }
        }

        const nextArcherId = getNextPelotonArcherId(
            archerIds.value,
            getArcherState,
            pending.archerIndex,
            pending.finishedTargetIndex,
            peloton.ruleset,
        );
        if (nextArcherId !== null) {
            selectArcher(nextArcherId);
            return;
        }
        showFlash("Saisie peloton terminée.");
    }

    function schedulePendingAdvance() {
        if (previewTimeoutId !== null) window.clearTimeout(previewTimeoutId);
        previewTimeoutId = window.setTimeout(() => {
            previewTimeoutId = null;
            completePendingAdvance();
        }, LAST_SCORE_PREVIEW_MS);
    }

    function registerScore(score: number) {
        const peloton = state.value;
        const archerIndex = peloton.activeArcherIndex;
        if (archerIndex === null) return;
        const archer = peloton.byArcher[archerIndex];
        if (!archer || archer.completed || peloton.previewLocked || peloton.extraArrow) return;
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

        // Show the last arrow briefly before rotating (app.js: LAST_SCORE_PREVIEW_MS).
        peloton.previewLocked = true;
        peloton.pendingAdvance = { archerIndex, finishedTargetIndex: currentTargetIndex, nextTargetIndex, nextArrowIndex };

        // Fun mode: a full volley (X counted as 5, as app.js's checkPelotonVolleyReachedMax) earns a bonus arrow.
        const volleyTotal = getPelotonVolleyTotal(archer.scores[currentTargetIndex]);
        const maxScore = getPelotonVolleyMaxScore(peloton.ruleset, arrowsPerTarget, peloton.allowedPoints);
        if (peloton.ludicMode && checkPelotonVolleyReachedMax(volleyTotal, maxScore)) {
            peloton.pendingAdvance.bonus = true;
            if (previewTimeoutId !== null) window.clearTimeout(previewTimeoutId);
            previewTimeoutId = window.setTimeout(() => {
                previewTimeoutId = null;
                openExtraArrow();
            }, LAST_SCORE_PREVIEW_MS);
            return;
        }

        schedulePendingAdvance();
    }

    /** Mirrors openPelotonExtraArrowModal(): the pending volley waits for the bonus arrow. */
    function openExtraArrow() {
        const peloton = state.value;
        const pending = peloton.pendingAdvance;
        if (!pending) return;
        peloton.extraArrow = {
            archerIndex: pending.archerIndex,
            finishedTargetIndex: pending.finishedTargetIndex,
            nextTargetIndex: pending.nextTargetIndex,
            nextArrowIndex: pending.nextArrowIndex,
            archerName: peloton.byArcher[pending.archerIndex]?.name || "Cet archer",
        };
    }

    /** Bonus arrow: never stored — only whether it hits max triggers a random event. */
    function submitExtraArrow(score: number) {
        const peloton = state.value;
        const extra = peloton.extraArrow;
        if (!extra) return;
        peloton.extraArrow = null;

        const selectable = getSelectablePointsForArrow(peloton.ruleset, "individual", 0, peloton.allowedPoints);
        const maxBonusScore = Math.max(...selectable.filter((p) => Number.isFinite(p)));

        if (score === maxBonusScore) {
            const event = pickWeightedEvent(PELOTON_BONUS_EVENTS);
            const others = peloton.roster
                .filter((a) => a.index !== extra.archerIndex)
                .map((a) => {
                    const otherArcher = peloton.byArcher[a.index]!;
                    return { name: a.name, arrows: otherArcher.scores[extra.finishedTargetIndex]! };
                });
            const result = applyPelotonBonusEvent(event.id, others, peloton.allowedPoints);
            peloton.eventFlash = result;
            if (eventFlashTimeoutId !== null) window.clearTimeout(eventFlashTimeoutId);
            eventFlashTimeoutId = window.setTimeout(() => {
                eventFlashTimeoutId = null;
                peloton.eventFlash = null;
            }, EVENT_FLASH_MS);
        }

        // Inputs stay locked LAST_SCORE_PREVIEW_MS more before rotating.
        peloton.previewLocked = true;
        peloton.pendingAdvance = {
            archerIndex: extra.archerIndex,
            finishedTargetIndex: extra.finishedTargetIndex,
            nextTargetIndex: extra.nextTargetIndex,
            nextArrowIndex: extra.nextArrowIndex,
        };
        schedulePendingAdvance();
    }

    /**
     * Mirrors app.js's stepBackPelotonScore(): clears the last entered arrow
     * of the active archer, searching back from the cursor (only down to the
     * previous target in editingMode), and moves the cursor there.
     */
    function stepBack() {
        const peloton = state.value;
        if (peloton.targetCount <= 0 || peloton.extraArrow) return;
        const archerIndex = peloton.activeArcherIndex;
        if (archerIndex === null) return;
        const archer = peloton.byArcher[archerIndex];
        if (!archer) return;

        // Last arrow of a volley still in its preview: cancel the rotation, the
        // cursor already points at that arrow.
        if (peloton.previewLocked) {
            if (previewTimeoutId !== null) {
                window.clearTimeout(previewTimeoutId);
                previewTimeoutId = null;
            }
            peloton.previewLocked = false;
            peloton.pendingAdvance = null;
        }

        const { arrowsPerTarget } = peloton;
        const currentTargetIndex = Math.max(0, Math.min(archer.currentTargetIndex, peloton.targetCount - 1));
        const minTargetIndex = archer.editingMode ? Math.max(0, currentTargetIndex - 1) : 0;

        let position: { targetIndex: number; arrowIndex: number } | null = null;
        for (let targetIndex = currentTargetIndex; targetIndex >= minTargetIndex && !position; targetIndex -= 1) {
            const targetScores = archer.scores[targetIndex] || [];
            let startArrowIndex: number;
            if (targetIndex === currentTargetIndex) {
                const cursorValue = targetScores[archer.currentArrowIndex];
                const isCurrentCursorFilled = cursorValue !== null && cursorValue !== undefined && archer.currentArrowIndex < arrowsPerTarget;
                startArrowIndex = isCurrentCursorFilled
                    ? Math.max(0, Math.min(archer.currentArrowIndex, arrowsPerTarget - 1))
                    : Math.max(0, Math.min(archer.currentArrowIndex - 1, arrowsPerTarget - 1));
            } else {
                startArrowIndex = arrowsPerTarget - 1;
            }
            for (let arrowIndex = startArrowIndex; arrowIndex >= 0; arrowIndex -= 1) {
                const value = targetScores[arrowIndex];
                if (value !== null && value !== undefined) {
                    position = { targetIndex, arrowIndex };
                    break;
                }
            }
        }

        if (!position) {
            showFlash("Début de volée atteint.");
            return;
        }

        archer.completed = false;
        archer.scores[position.targetIndex]![position.arrowIndex] = null;
        archer.currentTargetIndex = position.targetIndex;
        archer.currentArrowIndex = position.arrowIndex;
    }

    /** Re-arms an interrupted preview (timers lost on unmount / module reload). */
    function resume() {
        if (typeof window === "undefined") return;
        const peloton = state.value;
        if (peloton.phase !== "scoring" || previewTimeoutId !== null) return;
        if (peloton.previewLocked && peloton.pendingAdvance && !peloton.extraArrow) {
            if (peloton.pendingAdvance.bonus) openExtraArrow();
            else completePendingAdvance();
        }
    }

    return {
        state,
        activeArcher,
        activeArcherName,
        allCompleted,
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
        stepBack,
        resume,
        getDuelTotal,
    };
}
