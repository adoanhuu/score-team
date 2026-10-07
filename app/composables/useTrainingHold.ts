// "Temps de tenue" (hold-time) training exercise, ported from app.js's
// trainingCycleState + startTrainingCycle()/tickTrainingCycle(). Multi-series
// / multi-repetition phase machine (rest -> hold -> series-break) with French
// voice announcements at each phase transition. Ephemeral: no result is ever
// persisted, only the last-used settings (series/repetitions/hold/rest) via
// useConfig's `trainingHold` field, mirroring appConfig.trainingHold.
import {
    speakTrainingExerciseEnd,
    speakTrainingExercisePrompt,
    speakTrainingExerciseStart,
    speakTrainingRestPrompt,
    speakTrainingSeriesBreak,
} from "~/utils/training-audio";

export const TRAINING_SERIES_BREAK_SECONDS = 5;

export interface TrainingHoldSettings {
    series: number;
    repetitions: number;
    holdSeconds: number;
    restSeconds: number;
}

export const TRAINING_HOLD_DEFAULTS: TrainingHoldSettings = {
    series: 3,
    repetitions: 3,
    holdSeconds: 4,
    restSeconds: 5,
};

export type HoldPhase = "rest" | "hold" | "series-break";

interface TrainingHoldState {
    running: boolean;
    // Mirrors trainingCycleState.isPaused (pauseTrainingCycle()/resumeTrainingCycle()).
    paused: boolean;
    initialSeriesCount: number;
    seriesRemaining: number;
    repetitionsPerSeries: number;
    repetitionsRemaining: number;
    holdSeconds: number;
    restSeconds: number;
    seriesBreakSeconds: number;
    phase: HoldPhase;
    secondsRemaining: number;
    finished: boolean;
}

export function clampTrainingHoldSeries(value: number) {
    return Number.isInteger(value) ? Math.min(6, Math.max(3, value)) : TRAINING_HOLD_DEFAULTS.series;
}
export function clampTrainingHoldRepetitions(value: number) {
    return Number.isInteger(value) ? Math.min(6, Math.max(3, value)) : TRAINING_HOLD_DEFAULTS.repetitions;
}
export function clampTrainingHoldSeconds(value: number) {
    return Number.isInteger(value) ? Math.min(12, Math.max(2, value)) : TRAINING_HOLD_DEFAULTS.holdSeconds;
}
export function clampTrainingRestSeconds(value: number) {
    return Number.isInteger(value) ? Math.min(30, Math.max(5, value)) : TRAINING_HOLD_DEFAULTS.restSeconds;
}

function buildInitialState(): TrainingHoldState {
    return {
        running: false,
        paused: false,
        initialSeriesCount: TRAINING_HOLD_DEFAULTS.series,
        seriesRemaining: TRAINING_HOLD_DEFAULTS.series,
        repetitionsPerSeries: TRAINING_HOLD_DEFAULTS.repetitions,
        repetitionsRemaining: TRAINING_HOLD_DEFAULTS.repetitions,
        holdSeconds: TRAINING_HOLD_DEFAULTS.holdSeconds,
        restSeconds: TRAINING_HOLD_DEFAULTS.restSeconds,
        seriesBreakSeconds: TRAINING_SERIES_BREAK_SECONDS,
        phase: "rest",
        secondsRemaining: TRAINING_HOLD_DEFAULTS.restSeconds,
        finished: false,
    };
}

// Interval id kept at module scope (like app.js's trainingCycleIntervalId)
// rather than per composable instance, so a fresh useTrainingHold() call
// (e.g. after leaving and re-entering /entrainement) can still clear a timer
// started by a previous instance, and a restart never stacks two intervals.
let trainingCycleIntervalId: number | null = null;

function clearTrainingCycleInterval() {
    if (trainingCycleIntervalId !== null) {
        window.clearInterval(trainingCycleIntervalId);
        trainingCycleIntervalId = null;
    }
}

function cancelTrainingSpeech() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
    }
}

// Phase colors, mirrors getTrainingRingColorByPhase().
export function getTrainingRingColorByPhase(phase: HoldPhase) {
    if (phase === "rest") return "#2d6a4f";
    if (phase === "series-break") return "#1558c0";
    return "#c62828";
}

export function useTrainingHold() {
    const state = useState<TrainingHoldState>("training-hold-state", buildInitialState);

    const phaseLabel = computed(() => {
        if (state.value.finished) return "Terminé";
        if (state.value.phase === "rest") return "Repos";
        if (state.value.phase === "series-break") return "Fin de série";
        return "Tenue";
    });

    // Mirrors the ring aria-label set in renderTrainingCycle().
    const ringAriaLabel = computed(() => {
        if (state.value.phase === "rest") return "Décompte du temps de repos";
        if (state.value.phase === "series-break") return "Décompte de la pause entre les séries";
        return "Décompte du temps de tenue";
    });

    const ringProgressPct = computed(() => {
        if (state.value.finished) return 0;
        const cycleTotal = Math.max(1, state.value.restSeconds + state.value.holdSeconds);
        const total = state.value.phase === "series-break" ? Math.max(1, state.value.seriesBreakSeconds) : cycleTotal;
        const remaining =
            state.value.phase === "series-break"
                ? state.value.secondsRemaining
                : state.value.secondsRemaining + (state.value.phase === "rest" ? state.value.holdSeconds : 0);
        return Math.min(100, Math.max(0, (remaining / total) * 100));
    });

    // Mirrors tickTrainingCycle() (training-hold mode only).
    function tick() {
        if (!state.value.running || state.value.paused) return;

        if (state.value.secondsRemaining > 0) {
            state.value.secondsRemaining -= 1;
            return;
        }

        if (state.value.phase === "rest") {
            state.value.phase = "hold";
            state.value.secondsRemaining = state.value.holdSeconds;
            speakTrainingRestPrompt();
            return;
        }

        if (state.value.phase === "series-break") {
            state.value.phase = "rest";
            state.value.secondsRemaining = state.value.restSeconds;
            speakTrainingExercisePrompt();
            return;
        }

        state.value.repetitionsRemaining -= 1;
        if (state.value.repetitionsRemaining > 0) {
            state.value.phase = "rest";
            state.value.secondsRemaining = state.value.restSeconds;
            speakTrainingExercisePrompt();
            return;
        }

        state.value.seriesRemaining -= 1;
        if (state.value.seriesRemaining > 0) {
            const currentSeriesNumber = state.value.initialSeriesCount - state.value.seriesRemaining;
            state.value.repetitionsRemaining = state.value.repetitionsPerSeries;
            state.value.phase = "series-break";
            state.value.secondsRemaining = state.value.seriesBreakSeconds;
            speakTrainingSeriesBreak(currentSeriesNumber);
            return;
        }

        // Unlike legacy (which calls stopTrainingCycle() -> speechSynthesis.cancel()
        // right after queuing it, cutting the announcement off), only the
        // interval is cleared here so "fin exercice" is actually heard.
        state.value.seriesRemaining = 0;
        state.value.repetitionsRemaining = 0;
        state.value.secondsRemaining = 0;
        state.value.finished = true;
        state.value.running = false;
        state.value.paused = false;
        speakTrainingExerciseEnd();
        clearTrainingCycleInterval();
    }

    // Mirrors startTrainingCycle().
    function start(settings: TrainingHoldSettings) {
        clearTrainingCycleInterval();
        cancelTrainingSpeech();
        const safeSeries = clampTrainingHoldSeries(settings.series);
        const safeRepetitions = clampTrainingHoldRepetitions(settings.repetitions);
        const safeHold = clampTrainingHoldSeconds(settings.holdSeconds);
        const safeRest = clampTrainingRestSeconds(settings.restSeconds);

        state.value = {
            running: true,
            paused: false,
            initialSeriesCount: safeSeries,
            seriesRemaining: safeSeries,
            repetitionsPerSeries: safeRepetitions,
            repetitionsRemaining: safeRepetitions,
            holdSeconds: safeHold,
            restSeconds: safeRest,
            seriesBreakSeconds: TRAINING_SERIES_BREAK_SECONDS,
            phase: "rest",
            secondsRemaining: safeRest,
            finished: false,
        };

        speakTrainingExerciseStart();
        trainingCycleIntervalId = window.setInterval(tick, 1000);
    }

    // Mirrors pauseTrainingCycle().
    function pause() {
        clearTrainingCycleInterval();
        if (state.value.running) state.value.paused = true;
    }

    // Mirrors resumeTrainingCycle(): keeps the remaining seconds.
    function resume() {
        if (!state.value.running || trainingCycleIntervalId !== null) return;
        state.value.paused = false;
        trainingCycleIntervalId = window.setInterval(tick, 1000);
    }

    // Mirrors the #training-cycle-toggle-btn click handler: a finished (or
    // never started) cycle restarts from scratch with the current settings,
    // a ticking one pauses, a paused one resumes.
    function toggle(settings: TrainingHoldSettings) {
        if (!state.value.running) {
            start(settings);
            return;
        }
        if (state.value.paused) {
            resume();
            return;
        }
        pause();
    }

    // Mirrors closeTrainingHoldModal() -> stopTrainingCycle().
    function close() {
        clearTrainingCycleInterval();
        cancelTrainingSpeech();
        state.value = buildInitialState();
    }

    return { state, phaseLabel, ringAriaLabel, ringProgressPct, start, pause, resume, toggle, close };
}
