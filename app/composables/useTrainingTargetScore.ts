// "Score cible" training exercise, ported from app.js's
// trainingTargetScoreSessionState + registerTrainingTargetScore()/
// stepBackTrainingTargetScore(). Reuses the same scoring-engine helpers as
// Mode Solo/Duel (allowed points per arrow, max volley total). Ephemeral: no
// result persisted, only the last-used ruleset/percentage/per-ruleset target
// score via useConfig's `trainingTargetScore` field.
import {
    clampSuccessZoneForConfig,
    getArrowsPerVolley,
    getMaxShootTotalForConfig,
    getSelectablePointsForArrow,
    getTargetCountForRuleset,
    presets,
    scoreToValue,
} from "~/utils/scoring-engine";
import type { Ruleset } from "~/utils/scoring-format";

export interface TrainingTargetScoreDefaults {
    ruleset: Ruleset;
    percentage: number;
}

export const TRAINING_TARGET_SCORE_DEFAULTS: TrainingTargetScoreDefaults = {
    ruleset: "nature",
    percentage: 75,
};

export function getTrainingTargetMaxScore(ruleset: Ruleset): number {
    const arrowsPerVolley = getArrowsPerVolley(ruleset, "individual");
    const allowedPoints = presets[ruleset] || [0];
    const maxVolley = getMaxShootTotalForConfig(ruleset, "individual", arrowsPerVolley, allowedPoints);
    return maxVolley * getTargetCountForRuleset(ruleset);
}

export function getTrainingTargetScoreBounds(ruleset: Ruleset) {
    const maxScore = getTrainingTargetMaxScore(ruleset);
    return { minScore: Math.ceil(maxScore * 0.5), maxScore };
}

export function clampTrainingTargetPercentage(value: number): number {
    const rounded = Math.round(value);
    return Number.isFinite(rounded) ? Math.min(100, Math.max(50, rounded)) : TRAINING_TARGET_SCORE_DEFAULTS.percentage;
}

export function clampTrainingTargetScore(value: number, ruleset: Ruleset): number {
    const { minScore, maxScore } = getTrainingTargetScoreBounds(ruleset);
    const rounded = Math.round(value);
    if (Number.isFinite(rounded)) return Math.min(maxScore, Math.max(minScore, rounded));
    return Math.min(maxScore, Math.max(minScore, Math.round(maxScore * (TRAINING_TARGET_SCORE_DEFAULTS.percentage / 100))));
}

interface TrainingTargetScoreState {
    running: boolean;
    ruleset: Ruleset;
    targetScore: number;
    successZone: number;
    targetCount: number;
    arrowsPerTarget: number;
    allowedPoints: number[];
    currentTargetIndex: number;
    currentArrowIndex: number;
    scores: (number | null)[][];
    completed: boolean;
}

function buildInitialState(): TrainingTargetScoreState {
    return {
        running: false,
        ruleset: TRAINING_TARGET_SCORE_DEFAULTS.ruleset,
        targetScore: 0,
        successZone: 1,
        targetCount: 0,
        arrowsPerTarget: 0,
        allowedPoints: [],
        currentTargetIndex: 0,
        currentArrowIndex: 0,
        scores: [],
        completed: false,
    };
}

function ensureTarget(state: TrainingTargetScoreState, targetIndex: number) {
    while (state.scores.length <= targetIndex) {
        state.scores.push(Array(state.arrowsPerTarget).fill(null));
    }
}

export function useTrainingTargetScore() {
    const state = useState<TrainingTargetScoreState>("training-target-score-state", buildInitialState);

    const total = computed(() =>
        state.value.scores.reduce((sum, target) => sum + target.reduce((s, v) => s + scoreToValue(v), 0), 0),
    );
    const percentage = computed(() => {
        const target = Math.max(1, state.value.targetScore);
        return Math.round((total.value / target) * 100);
    });
    const currentArrows = computed<(number | null)[]>(() => state.value.scores[state.value.currentTargetIndex] ?? []);
    const selectablePoints = computed(() =>
        getSelectablePointsForArrow(state.value.ruleset, "individual", state.value.currentArrowIndex, state.value.allowedPoints),
    );
    const orderedHistory = computed(() =>
        state.value.scores
            .map((arrows, index) => ({ index, arrows }))
            .filter(({ arrows }) => arrows.some((v) => v !== null && v !== undefined))
            .reverse(),
    );

    function start(options: { ruleset: Ruleset; targetScore: number; successZone: number }) {
        const ruleset = options.ruleset;
        const arrowsPerTarget = getArrowsPerVolley(ruleset, "individual");
        const allowedPoints = [...new Set(presets[ruleset] || [0])].sort((a, b) => b - a);
        const targetCount = getTargetCountForRuleset(ruleset);
        const targetScore = clampTrainingTargetScore(options.targetScore, ruleset);
        const successZone = clampSuccessZoneForConfig(options.successZone, ruleset, "individual", arrowsPerTarget, allowedPoints);

        state.value = {
            running: true,
            ruleset,
            targetScore,
            successZone,
            targetCount,
            arrowsPerTarget,
            allowedPoints,
            currentTargetIndex: 0,
            currentArrowIndex: 0,
            scores: Array.from({ length: targetCount }, () => Array(arrowsPerTarget).fill(null)),
            completed: false,
        };
    }

    function registerScore(score: number) {
        if (!state.value.running || state.value.completed) return;
        const s = state.value;
        ensureTarget(s, s.currentTargetIndex);
        const points = getSelectablePointsForArrow(s.ruleset, "individual", s.currentArrowIndex, s.allowedPoints);
        if (!points.includes(score)) return;

        s.scores[s.currentTargetIndex][s.currentArrowIndex] = score;

        if (total.value >= s.targetScore) {
            s.completed = true;
            return;
        }

        if (s.currentArrowIndex + 1 >= s.arrowsPerTarget) {
            s.currentTargetIndex += 1;
            s.currentArrowIndex = 0;
            ensureTarget(s, s.currentTargetIndex);
        } else {
            s.currentArrowIndex += 1;
        }
    }

    function getLastScorePosition(): { targetIndex: number; arrowIndex: number } | null {
        const s = state.value;
        for (let targetIndex = s.scores.length - 1; targetIndex >= 0; targetIndex -= 1) {
            const arrows = s.scores[targetIndex];
            for (let arrowIndex = arrows.length - 1; arrowIndex >= 0; arrowIndex -= 1) {
                if (arrows[arrowIndex] !== null && arrows[arrowIndex] !== undefined) return { targetIndex, arrowIndex };
            }
        }
        return null;
    }

    function stepBack() {
        const s = state.value;
        if (!s.running) return;

        if (s.completed) {
            s.completed = false;
            const lastPosition = getLastScorePosition();
            if (lastPosition) {
                s.currentTargetIndex = lastPosition.targetIndex;
                s.currentArrowIndex = lastPosition.arrowIndex;
                s.scores[lastPosition.targetIndex][lastPosition.arrowIndex] = null;
                return;
            }
        }

        if (s.currentArrowIndex > 0) {
            s.currentArrowIndex -= 1;
            s.scores[s.currentTargetIndex][s.currentArrowIndex] = null;
        } else if (s.currentTargetIndex > 0) {
            s.currentTargetIndex -= 1;
            s.currentArrowIndex = s.arrowsPerTarget - 1;
            s.scores[s.currentTargetIndex][s.currentArrowIndex] = null;
        }
    }

    function close() {
        state.value = buildInitialState();
    }

    return { state, total, percentage, currentArrows, selectablePoints, orderedHistory, start, registerScore, stepBack, close };
}
