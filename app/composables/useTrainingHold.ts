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

type HoldPhase = "rest" | "hold" | "series-break";

interface TrainingHoldState {
    running: boolean;
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

export function useTrainingHold() {
    const state = useState<TrainingHoldState>("training-hold-state", buildInitialState);
    let intervalId: number | null = null;

    function stopTimer() {
        if (intervalId !== null) {
            window.clearInterval(intervalId);
            intervalId = null;
        }
    }

    const phaseLabel = computed(() => {
        if (state.value.finished) return "Terminé";
        if (state.value.phase === "rest") return "Repos";
        if (state.value.phase === "series-break") return "Fin de série";
        return "Tenue";
    });

    const ringProgressPct = computed(() => {
        const cycleTotal = Math.max(1, state.value.restSeconds + state.value.holdSeconds);
        const total = state.value.phase === "series-break" ? Math.max(1, state.value.seriesBreakSeconds) : cycleTotal;
        const remaining =
            state.value.phase === "series-break"
                ? state.value.secondsRemaining
                : state.value.secondsRemaining + (state.value.phase === "rest" ? state.value.holdSeconds : 0);
        return Math.min(100, Math.max(0, (remaining / total) * 100));
    });

    function tick() {
        if (!state.value.running) return;

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

        state.value.finished = true;
        state.value.running = false;
        speakTrainingExerciseEnd();
        stopTimer();
    }

    function start(settings: TrainingHoldSettings) {
        stopTimer();
        const safeSeries = clampTrainingHoldSeries(settings.series);
        const safeRepetitions = clampTrainingHoldRepetitions(settings.repetitions);
        const safeHold = clampTrainingHoldSeconds(settings.holdSeconds);
        const safeRest = clampTrainingRestSeconds(settings.restSeconds);

        state.value = {
            running: true,
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
        intervalId = window.setInterval(tick, 1000);
    }

    function close() {
        stopTimer();
        state.value = buildInitialState();
    }

    return { state, phaseLabel, ringProgressPct, start, close };
}
