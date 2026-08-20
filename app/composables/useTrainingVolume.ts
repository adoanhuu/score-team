// "Volume de flèches" training exercise, ported from app.js's
// trainingVolumeSessionState + registerNextTrainingVolumeVolley(). Purely
// manual (user-paced) counter, no timer. Ephemeral: no result persisted,
// only the last-used settings via useConfig's `trainingVolume` field.
export interface TrainingVolumeSettings {
    series: number;
    volleysPerSeries: number;
    arrowsPerVolley: number;
}

export const TRAINING_VOLUME_DEFAULTS: TrainingVolumeSettings = {
    series: 3,
    volleysPerSeries: 3,
    arrowsPerVolley: 6,
};

export function clampTrainingVolumeSeries(value: number) {
    return Number.isInteger(value) ? Math.min(10, Math.max(1, value)) : TRAINING_VOLUME_DEFAULTS.series;
}
export function clampTrainingVolumeVolleysPerSeries(value: number) {
    return Number.isInteger(value) ? Math.min(6, Math.max(1, value)) : TRAINING_VOLUME_DEFAULTS.volleysPerSeries;
}
export function clampTrainingVolumeArrowsPerVolley(value: number) {
    return Number.isInteger(value) ? Math.min(12, Math.max(1, value)) : TRAINING_VOLUME_DEFAULTS.arrowsPerVolley;
}

interface TrainingVolumeState {
    running: boolean;
    seriesTotal: number;
    volleysPerSeries: number;
    arrowsPerVolley: number;
    totalVolleys: number;
    totalArrows: number;
    currentSeries: number;
    currentVolley: number;
    completedVolleys: number;
    arrowsFired: number;
}

function buildInitialState(): TrainingVolumeState {
    return {
        running: false,
        seriesTotal: TRAINING_VOLUME_DEFAULTS.series,
        volleysPerSeries: TRAINING_VOLUME_DEFAULTS.volleysPerSeries,
        arrowsPerVolley: TRAINING_VOLUME_DEFAULTS.arrowsPerVolley,
        totalVolleys: 0,
        totalArrows: 0,
        currentSeries: 1,
        currentVolley: 1,
        completedVolleys: 0,
        arrowsFired: 0,
    };
}

export function useTrainingVolume() {
    const state = useState<TrainingVolumeState>("training-volume-state", buildInitialState);

    const progressPct = computed(() =>
        state.value.totalArrows > 0 ? Math.min(100, Math.round((state.value.arrowsFired / state.value.totalArrows) * 100)) : 0,
    );
    const completed = computed(() => state.value.completedVolleys >= state.value.totalVolleys);

    function start(settings: TrainingVolumeSettings) {
        const safeSeries = clampTrainingVolumeSeries(settings.series);
        const safeVolleysPerSeries = clampTrainingVolumeVolleysPerSeries(settings.volleysPerSeries);
        const safeArrowsPerVolley = clampTrainingVolumeArrowsPerVolley(settings.arrowsPerVolley);
        const totalVolleys = safeSeries * safeVolleysPerSeries;
        const totalArrows = totalVolleys * safeArrowsPerVolley;

        state.value = {
            running: true,
            seriesTotal: safeSeries,
            volleysPerSeries: safeVolleysPerSeries,
            arrowsPerVolley: safeArrowsPerVolley,
            totalVolleys,
            totalArrows,
            currentSeries: 1,
            currentVolley: 1,
            completedVolleys: 0,
            arrowsFired: 0,
        };
    }

    function registerNextVolley() {
        if (!state.value.running || state.value.completedVolleys >= state.value.totalVolleys) return;

        state.value.completedVolleys += 1;
        state.value.arrowsFired = Math.min(state.value.totalArrows, state.value.completedVolleys * state.value.arrowsPerVolley);

        if (state.value.completedVolleys < state.value.totalVolleys) {
            state.value.currentSeries = Math.floor(state.value.completedVolleys / state.value.volleysPerSeries) + 1;
            state.value.currentVolley = (state.value.completedVolleys % state.value.volleysPerSeries) + 1;
        }
    }

    function close() {
        state.value = buildInitialState();
    }

    return { state, progressPct, completed, start, registerNextVolley, close };
}
