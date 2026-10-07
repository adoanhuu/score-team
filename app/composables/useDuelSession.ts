// Duel mode ("Mode Multi" duel sub-mode): 2 players (or 1 player + Paquito
// bot) alternate arrows on the same volley/target sequence, ported from
// app.js's state.duel + registerDuelScore/runDuelBotTurnIfNeeded/etc.
import {
    getArrowsPerVolley,
    getMaxShootTotalForConfig,
    getSelectablePointsForArrow,
    presets,
    scoreToValue,
} from "~/utils/scoring-engine";
import type { Ruleset } from "~/utils/scoring-format";
import {
    formatDuelHandicapLabel,
    getDuelBotMissChance,
    getDuelDisplayTotals,
    getDuelTotal,
    isPaquitoName,
    pickDuelBotScore,
} from "~/utils/multi-engine";

const LAST_SCORE_PREVIEW_MS = 300;
const BOT_FIRST_SHOT_DELAY_MS = 260;
const BOT_NEXT_SHOT_MIN_MS = 180;
const BOT_NEXT_SHOT_JITTER_MS = 260;

export interface DuelSetup {
    ruleset: Ruleset;
    targetCount: number;
    handicap: number;
    nameP1: string;
    nameP2: string;
    botMode: boolean;
    botLevel: number;
}

export type DuelScore = number | null;

interface DuelState {
    phase: "setup" | "scoring";
    ruleset: Ruleset;
    targetCount: number;
    handicap: number;
    arrowsPerTarget: number;
    allowedPoints: number[];
    currentTargetIndex: number;
    activePlayer: 1 | 2;
    currentArrowIndex: number;
    scoresP1: DuelScore[][];
    scoresP2: DuelScore[][];
    nameP1: string;
    nameP2: string;
    previewLocked: boolean;
    completed: boolean;
    botMode: boolean;
    botLevel: number;
}

function buildInitialState(): DuelState {
    return {
        phase: "setup",
        ruleset: "3d",
        targetCount: 4,
        handicap: 0,
        arrowsPerTarget: 2,
        allowedPoints: [],
        currentTargetIndex: 0,
        activePlayer: 1,
        currentArrowIndex: 0,
        scoresP1: [],
        scoresP2: [],
        nameP1: "",
        nameP2: "",
        previewLocked: false,
        completed: false,
        botMode: false,
        botLevel: 3,
    };
}

// Timer ids are module-level (not per useDuelSession() call) so every caller
// shares them: guards against two pending bot shots (app.js keeps a single
// global duelBotShotTimeoutId for the same reason).
let botTimeoutId: number | null = null;
let previewTimeoutId: number | null = null;

export function useDuelSession() {
    const state = useState<DuelState>("duel-session-state", buildInitialState);
    const { showFlash } = useFlash();

    function clearBotTimer() {
        if (botTimeoutId !== null) {
            window.clearTimeout(botTimeoutId);
            botTimeoutId = null;
        }
    }

    function clearPreviewTimer() {
        if (previewTimeoutId !== null) {
            window.clearTimeout(previewTimeoutId);
            previewTimeoutId = null;
        }
    }

    function stopAllTimers() {
        clearBotTimer();
        clearPreviewTimer();
    }

    const maxVolleyTotal = computed(() =>
        getMaxShootTotalForConfig(state.value.ruleset, "individual", state.value.arrowsPerTarget, state.value.allowedPoints),
    );

    const displayTotals = computed(() =>
        getDuelDisplayTotals(state.value.scoresP1, state.value.scoresP2, state.value.nameP2, state.value.handicap),
    );

    const currentArrows = computed<DuelScore[]>(() => {
        if (state.value.completed) return [];
        const idx = Math.max(0, Math.min(state.value.currentTargetIndex, state.value.targetCount - 1));
        return state.value.activePlayer === 1 ? state.value.scoresP1[idx] ?? [] : state.value.scoresP2[idx] ?? [];
    });

    const selectablePoints = computed(() =>
        getSelectablePointsForArrow(state.value.ruleset, "individual", state.value.currentArrowIndex, state.value.allowedPoints),
    );

    const isBotTurn = computed(() => state.value.botMode && state.value.activePlayer === 2);

    const isLocked = computed(() => state.value.previewLocked || state.value.completed || isBotTurn.value);

    const handicapLabel = computed(() => formatDuelHandicapLabel(state.value.handicap));

    function configure(setup: DuelSetup) {
        stopAllTimers();
        const arrowsPerTarget = getArrowsPerVolley(setup.ruleset, "individual");
        const allowedPoints = [...new Set(presets[setup.ruleset] || [0])].sort((a, b) => b - a);
        const botMode = setup.botMode;
        const nameP2 = botMode ? "Paquito" : setup.nameP2.trim().slice(0, 10);
        state.value = {
            phase: "scoring",
            ruleset: setup.ruleset,
            targetCount: setup.targetCount,
            handicap: botMode ? 0 : setup.handicap,
            arrowsPerTarget,
            allowedPoints,
            currentTargetIndex: 0,
            activePlayer: 1,
            currentArrowIndex: 0,
            scoresP1: Array.from({ length: setup.targetCount }, () => Array(arrowsPerTarget).fill(null)),
            scoresP2: Array.from({ length: setup.targetCount }, () => Array(arrowsPerTarget).fill(null)),
            nameP1: setup.nameP1.trim().slice(0, 10),
            nameP2,
            previewLocked: false,
            completed: false,
            botMode,
            botLevel: setup.botLevel,
        };
        runBotTurnIfNeeded();
    }

    function reset() {
        stopAllTimers();
        state.value = buildInitialState();
    }

    /**
     * Mirrors app.js's restartDuelSession(): rebuilds the duel from the
     * current setup form (ruleset / target count / handicap / bot) while
     * keeping the previous players' names.
     */
    function restart(formSetup: Omit<DuelSetup, "nameP1" | "nameP2">) {
        configure({
            ...formSetup,
            nameP1: state.value.nameP1,
            nameP2: state.value.nameP2,
        });
        showFlash("Nouveau duel démarré.");
    }

    function advanceAfterVolley() {
        const duel = state.value;
        duel.previewLocked = false;
        duel.currentArrowIndex = 0;

        if (duel.activePlayer === 1) {
            duel.activePlayer = 2;
        } else {
            duel.currentTargetIndex += 1;
            duel.activePlayer = 1;
            if (duel.currentTargetIndex >= duel.targetCount) {
                duel.completed = true;
                duel.currentTargetIndex = duel.targetCount;
                showFlash("Saisie duel terminée.");
            }
        }
        runBotTurnIfNeeded();
    }

    function registerScore(score: number) {
        const duel = state.value;
        if (duel.completed || duel.previewLocked) return;
        const { currentTargetIndex, targetCount, activePlayer, currentArrowIndex, arrowsPerTarget } = duel;
        if (currentTargetIndex < 0 || currentTargetIndex >= targetCount) return;
        if (!selectablePoints.value.includes(score)) return;

        const scores = activePlayer === 1 ? duel.scoresP1 : duel.scoresP2;
        scores[currentTargetIndex]![currentArrowIndex] = score;

        if (currentArrowIndex >= arrowsPerTarget - 1) {
            clearBotTimer();
            duel.previewLocked = true;
            previewTimeoutId = window.setTimeout(() => {
                previewTimeoutId = null;
                advanceAfterVolley();
            }, LAST_SCORE_PREVIEW_MS);
            return;
        }

        // Paquito's next arrow is scheduled by runBotTurnIfNeeded()'s own shoot loop
        // (calling it from here too would leave two pending bot timers).
        duel.currentArrowIndex += 1;
    }

    function stepBack() {
        const duel = state.value;
        if (duel.targetCount <= 0) return;

        const clearScoreAt = (targetIndex: number, player: 1 | 2, arrowIndex: number) => {
            const scores = player === 1 ? duel.scoresP1 : duel.scoresP2;
            if (!scores[targetIndex]) return;
            scores[targetIndex]![arrowIndex] = null;
        };

        clearBotTimer();

        // Last arrow of a volley still in its preview: cancel the pending
        // advance and clear that arrow (the cursor still points at it).
        if (duel.previewLocked) {
            clearPreviewTimer();
            duel.previewLocked = false;
            clearScoreAt(duel.currentTargetIndex, duel.activePlayer, duel.currentArrowIndex);
            runBotTurnIfNeeded();
            return;
        }

        if (duel.completed) {
            duel.completed = false;
            duel.currentTargetIndex = duel.targetCount - 1;
            duel.activePlayer = 2;
            duel.currentArrowIndex = duel.arrowsPerTarget - 1;
            clearScoreAt(duel.currentTargetIndex, 2, duel.currentArrowIndex);
            runBotTurnIfNeeded();
            return;
        }

        let targetIndex = duel.currentTargetIndex;
        let player = duel.activePlayer;
        let arrowIndex = duel.currentArrowIndex;

        if (targetIndex === 0 && player === 1 && arrowIndex === 0) return;

        if (arrowIndex > 0) {
            arrowIndex -= 1;
        } else if (player === 2) {
            player = 1;
            arrowIndex = duel.arrowsPerTarget - 1;
        } else {
            targetIndex -= 1;
            player = 2;
            arrowIndex = duel.arrowsPerTarget - 1;
        }

        duel.currentTargetIndex = targetIndex;
        duel.activePlayer = player;
        duel.currentArrowIndex = arrowIndex;
        clearScoreAt(targetIndex, player, arrowIndex);
        // app.js's renderDuelView() re-runs runDuelBotTurnIfNeeded() after a step back.
        runBotTurnIfNeeded();
    }

    /**
     * Resumes a duel whose timers were stopped (page unmounted while the
     * useState session survived): finishes an interrupted last-arrow
     * preview, then lets Paquito shoot if it is his turn.
     */
    function resume() {
        if (typeof window === "undefined") return;
        const duel = state.value;
        if (duel.phase !== "scoring") return;
        if (duel.previewLocked && previewTimeoutId === null) {
            advanceAfterVolley();
            return;
        }
        runBotTurnIfNeeded();
    }

    function runBotTurnIfNeeded() {
        if (typeof window === "undefined") return;
        if (!state.value.botMode || botTimeoutId !== null) return;
        const duel = state.value;
        if (duel.completed || duel.previewLocked || duel.activePlayer !== 2) return;

        const shoot = () => {
            botTimeoutId = null;
            const d = state.value;
            if (!d.botMode || d.completed || d.previewLocked || d.activePlayer !== 2) return;

            const points = getSelectablePointsForArrow(d.ruleset, "individual", d.currentArrowIndex, d.allowedPoints);
            const botScore = pickDuelBotScore(points, d.botLevel, {
                currentTargetScores: d.scoresP2[d.currentTargetIndex],
            });
            registerScore(botScore);

            const after = state.value;
            if (botTimeoutId === null && after.botMode && !after.completed && !after.previewLocked && after.activePlayer === 2) {
                botTimeoutId = window.setTimeout(shoot, BOT_NEXT_SHOT_MIN_MS + Math.floor(Math.random() * BOT_NEXT_SHOT_JITTER_MS));
            }
        };

        botTimeoutId = window.setTimeout(shoot, BOT_FIRST_SHOT_DELAY_MS);
    }

    return {
        state,
        maxVolleyTotal,
        displayTotals,
        currentArrows,
        selectablePoints,
        isBotTurn,
        isLocked,
        handicapLabel,
        configure,
        reset,
        restart,
        registerScore,
        stepBack,
        resume,
        clearBotTimer,
        stopAllTimers,
        getDuelTotal,
        getDuelBotMissChance,
        isPaquitoName,
    };
}
