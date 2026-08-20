// Simplified, self-contained timer for Mode Solo (beeps / hold-time cues).
// Unlike app.js's shared trainingCycleState (also used by the not-yet-migrated
// "Entraînement" exercises), this composable is scoped to a single volley's
// per-arrow prep -> shot cadence and does not persist/replay across pages.
import { getSoloBeepsMaxTiringSecondsByRuleset, type SoloTimerMode } from "~/utils/scoring-engine";

const TRAINING_VOICE_VOLUME = 0.85;

interface BeepSpec {
    frequency: number;
    duration: number;
    delay?: number;
    gain?: number;
}

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!audioContext) {
        const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        audioContext = new Ctor();
    }
    if (audioContext.state === "suspended") void audioContext.resume();
    return audioContext;
}

function playBeepSequence(beeps: BeepSpec[]) {
    const ctx = getAudioContext();
    if (!ctx || beeps.length === 0) return;
    const startAt = ctx.currentTime + 0.02;
    beeps.forEach((beep, index) => {
        const duration = Math.max(0.04, beep.duration);
        const delay = beep.delay ?? index * 0.18;
        const gain = Math.min(0.95, Math.max(0.05, beep.gain ?? 0.7));
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        const beepStart = startAt + Math.max(0, delay);
        const beepEnd = beepStart + duration;

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(beep.frequency, beepStart);
        gainNode.gain.setValueAtTime(0.0001, beepStart);
        gainNode.gain.exponentialRampToValueAtTime(gain, beepStart + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, beepEnd);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.start(beepStart);
        oscillator.stop(beepEnd + 0.02);
    });
}

function speak(message: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") return;
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = "fr-FR";
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = TRAINING_VOICE_VOLUME;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
}

function emitPreparationCue(mode: SoloTimerMode) {
    if (mode === "beeps") {
        playBeepSequence([
            { frequency: 720, duration: 0.12, delay: 0 },
            { frequency: 720, duration: 0.12, delay: 0.22 },
        ]);
    } else {
        speak("Préparation");
    }
}

function emitStartCue(mode: SoloTimerMode) {
    if (mode === "beeps") {
        playBeepSequence([{ frequency: 920, duration: 0.14, delay: 0 }]);
    } else {
        speak("Tirez");
    }
}

function emitEndCue(mode: SoloTimerMode) {
    if (mode === "beeps") {
        playBeepSequence([
            { frequency: 1500, duration: 0.14, delay: 0, gain: 0.95 },
            { frequency: 1500, duration: 0.14, delay: 0.22, gain: 0.95 },
        ]);
    } else {
        speak("Fin du temps");
    }
}

/**
 * Runs one preparation -> shooting-time cycle for the current arrow. Returns
 * a stop() function to cancel pending timeouts (e.g. if the arrow is scored
 * early or the page unmounts).
 */
export function useSoloTimer() {
    const phase = useState<"idle" | "preparation" | "shooting" | "done">("solo-timer-phase", () => "idle");
    const remainingSeconds = useState<number>("solo-timer-remaining", () => 0);
    let intervalId: number | null = null;
    let timeoutIds: number[] = [];

    function clearTimers() {
        if (intervalId !== null) window.clearInterval(intervalId);
        intervalId = null;
        timeoutIds.forEach((id) => window.clearTimeout(id));
        timeoutIds = [];
    }

    function stop() {
        clearTimers();
        phase.value = "idle";
        remainingSeconds.value = 0;
    }

    function startCycle(mode: SoloTimerMode, ruleset: string, preparationSeconds: number, tiringSeconds: number) {
        clearTimers();
        if (mode === "none") {
            phase.value = "idle";
            return;
        }
        const maxTiring = getSoloBeepsMaxTiringSecondsByRuleset(ruleset);
        const safeTiring = Math.min(maxTiring, Math.max(1, tiringSeconds));
        const safePreparation = Math.max(0, preparationSeconds);

        phase.value = "preparation";
        remainingSeconds.value = safePreparation;
        emitPreparationCue(mode);

        if (safePreparation > 0) {
            intervalId = window.setInterval(() => {
                remainingSeconds.value = Math.max(0, remainingSeconds.value - 1);
            }, 1000);
        }

        const toShootingId = window.setTimeout(() => {
            if (intervalId !== null) window.clearInterval(intervalId);
            phase.value = "shooting";
            remainingSeconds.value = safeTiring;
            emitStartCue(mode);
            intervalId = window.setInterval(() => {
                remainingSeconds.value = Math.max(0, remainingSeconds.value - 1);
            }, 1000);

            const toEndId = window.setTimeout(() => {
                if (intervalId !== null) window.clearInterval(intervalId);
                phase.value = "done";
                remainingSeconds.value = 0;
                emitEndCue(mode);
            }, safeTiring * 1000);
            timeoutIds.push(toEndId);
        }, safePreparation * 1000);
        timeoutIds.push(toShootingId);
    }

    return { phase, remainingSeconds, startCycle, stop };
}
