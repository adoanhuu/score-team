// Speech-synthesis helper for the "Temps de tenue" training exercise,
// ported from app.js's speakTrainingMessage()/speakTrainingRestPrompt()/etc.
// Separate from useSoloTimer.ts's own (unexported) `speak()` since that one
// is scoped to Mode Solo's simplified per-arrow cadence, not the
// multi-series/repetition training-hold cycle.
const TRAINING_VOICE_VOLUME = 0.55;

export function speakTrainingMessage(message: string, { cancelPrevious = true }: { cancelPrevious?: boolean } = {}) {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined" || !message) {
        return;
    }
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = "fr-FR";
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = TRAINING_VOICE_VOLUME;
    if (cancelPrevious) window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
}

export function speakTrainingRestPrompt() {
    speakTrainingMessage("Exercice");
}

export function speakTrainingExercisePrompt() {
    speakTrainingMessage("Repos");
}

export function speakTrainingSeriesBreak(seriesNumber: number) {
    const safeSeriesNumber = Number.isInteger(seriesNumber) && seriesNumber > 0 ? seriesNumber : null;
    speakTrainingMessage(safeSeriesNumber ? `Fin de série ${safeSeriesNumber}` : "Fin de série");
}

export function speakTrainingExerciseEnd() {
    speakTrainingMessage("fin exercice");
}

export function speakTrainingExerciseStart() {
    speakTrainingMessage("Début exercice");
}
