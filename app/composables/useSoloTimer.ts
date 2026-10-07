// Mode Solo per-volley timer modal, ported from app.js's solo-volley timer:
// openSoloBeepsTimerModal()/tickSoloBeepsTimer()/completeSoloBeepsTimer()
// ("Beeps" mode) and openSoloVolleyTimerModal()/tickTrainingCycle() in its
// "solo-volley" branch/completeSoloVolleyTimer() ("Tps tenue" mode), plus the
// shared toggle/pause/resume (trainingCycleToggleBtn) and close
// (closeTrainingHoldModal()) handlers. The modal opens paused once per volley;
// locking/unlocking the points pad is left to the caller (onComplete/onClose).
import { speakTrainingMessage } from "~/utils/training-audio";

interface BeepSpec {
    frequency: number;
    duration: number;
    delay?: number;
    gain?: number;
}

let audioContext: AudioContext | null = null;

/** Mirrors app.js's getTrainingAudioContext(). */
function getTrainingAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!audioContext) {
        const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        audioContext = new Ctor();
    }
    if (audioContext.state === "suspended") void audioContext.resume();
    return audioContext;
}

/** Mirrors app.js's playTrainingBeepSequence(). */
function playTrainingBeepSequence(beeps: BeepSpec[]) {
    const ctx = getTrainingAudioContext();
    if (!ctx || beeps.length === 0) return;
    const startAt = ctx.currentTime + 0.02;
    beeps.forEach((beep, index) => {
        const duration = Number.isFinite(beep.duration) ? Math.max(0.04, beep.duration) : 0.12;
        const frequency = Number.isFinite(beep.frequency) ? beep.frequency : 880;
        const delay = Number.isFinite(beep.delay) ? Math.max(0, beep.delay as number) : index * 0.18;
        const gain = Number.isFinite(beep.gain) ? Math.min(0.95, Math.max(0.05, beep.gain as number)) : 0.7;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        const beepStart = startAt + delay;
        const beepEnd = beepStart + duration;

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, beepStart);
        gainNode.gain.setValueAtTime(0.0001, beepStart);
        gainNode.gain.exponentialRampToValueAtTime(gain, beepStart + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, beepEnd);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.start(beepStart);
        oscillator.stop(beepEnd + 0.02);
    });
}

/** Mirrors app.js's playShortDoubleBeepEndSequence(). */
function playShortDoubleBeepEndSequence() {
    playTrainingBeepSequence([
        { frequency: 1500, duration: 0.14, delay: 0, gain: 0.95 },
        { frequency: 1500, duration: 0.14, delay: 0.22, gain: 0.95 },
    ]);
}

function cancelSpeech() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
    }
}

/** Mirrors app.js's soloBeepsTimerState. */
interface SoloBeepsTimerState {
    preparationSeconds: number;
    tiringSeconds: number;
    arrowsPerVolley: number;
    shotIntervalSeconds: number;
    tiringElapsedSeconds: number;
    nextShotBeepIndex: number;
    phase: "preparation" | "tiring";
    secondsRemaining: number;
    isPaused: boolean;
}

/** Mirrors app.js's trainingCycleState in its mode: "solo-volley" shape. */
interface SoloVolleyCycleState {
    totalArrows: number;
    arrowsRemaining: number;
    holdSeconds: number;
    restSeconds: number;
    phase: "rest" | "hold";
    secondsRemaining: number;
    isPaused: boolean;
}

export interface SoloBeepsTimerOptions {
    preparationSeconds: number;
    tiringSeconds: number;
    arrowsPerVolley: number;
}

export interface SoloHoldTimerOptions {
    arrowsPerVolley: number;
    holdSeconds: number;
    restSeconds: number;
}

export function useSoloTimer() {
    const visible = ref(false);
    const beeps = ref<SoloBeepsTimerState | null>(null);
    const cycle = ref<SoloVolleyCycleState | null>(null);
    // "Termine" end frame (completeSoloVolleyTimer/completeSoloBeepsTimer render it right before hiding).
    const finished = ref(false);
    const running = ref(false);
    let intervalId: number | null = null;
    let onComplete: (() => void) | null = null;

    function clearTick() {
        if (intervalId !== null) window.clearInterval(intervalId);
        intervalId = null;
        running.value = false;
    }

    /** Mirrors stopTrainingCycle(): clears the tick, cancels speech and drops both timer states. */
    function stop() {
        clearTick();
        cancelSpeech();
        cycle.value = null;
        beeps.value = null;
        finished.value = false;
    }

    // --- Beeps mode (openSoloBeepsTimerModal / tickSoloBeepsTimer) ---

    function openBeeps(options: SoloBeepsTimerOptions, done: () => void) {
        const arrowsPerVolley = Math.max(1, options.arrowsPerVolley || 1);
        stop();
        onComplete = done;
        beeps.value = {
            preparationSeconds: options.preparationSeconds,
            tiringSeconds: options.tiringSeconds,
            arrowsPerVolley,
            shotIntervalSeconds: options.tiringSeconds / arrowsPerVolley,
            tiringElapsedSeconds: 0,
            nextShotBeepIndex: 1,
            phase: "preparation",
            secondsRemaining: options.preparationSeconds,
            isPaused: true,
        };
        visible.value = true;
    }

    function resumeSoloBeepsTimer() {
        const timer = beeps.value;
        if (!timer || intervalId !== null) return;
        timer.isPaused = false;
        if (timer.phase === "preparation" && timer.secondsRemaining === timer.preparationSeconds && timer.preparationSeconds > 0) {
            speakTrainingMessage("Préparez-vous");
        }
        intervalId = window.setInterval(tickSoloBeepsTimer, 1000);
        running.value = true;
        if (timer.phase === "preparation" && timer.secondsRemaining === 0) {
            tickSoloBeepsTimer();
        }
    }

    function tickSoloBeepsTimer() {
        const timer = beeps.value;
        if (!timer || timer.isPaused) return;

        if (timer.phase === "preparation") {
            if (timer.secondsRemaining > 0) {
                timer.secondsRemaining -= 1;
                return;
            }
            timer.phase = "tiring";
            timer.secondsRemaining = timer.tiringSeconds;
            timer.tiringElapsedSeconds = 0;
            timer.nextShotBeepIndex = 1;
            playTrainingBeepSequence([{ frequency: 1000, duration: 0.12, delay: 0 }]);
            return;
        }

        if (timer.secondsRemaining > 0) {
            timer.secondsRemaining -= 1;
            timer.tiringElapsedSeconds += 1;
        }

        const maxIntervalBeeps = Math.max(0, (timer.arrowsPerVolley || 1) - 1);
        while (
            timer.nextShotBeepIndex <= maxIntervalBeeps
            && timer.tiringElapsedSeconds >= timer.shotIntervalSeconds * timer.nextShotBeepIndex
        ) {
            playTrainingBeepSequence([{ frequency: 1080, duration: 0.1, delay: 0 }]);
            timer.nextShotBeepIndex += 1;
        }

        if (timer.secondsRemaining > 0) return;
        completeSoloBeepsTimer();
    }

    /** Mirrors completeSoloBeepsTimer() (no speech cancel there, unlike the hold mode). */
    function completeSoloBeepsTimer() {
        clearTick();
        finished.value = true;
        beeps.value = null;
        visible.value = false;
        playShortDoubleBeepEndSequence();
        finished.value = false;
        const done = onComplete;
        onComplete = null;
        done?.();
    }

    // --- Hold mode (openSoloVolleyTimerModal / tickTrainingCycle "solo-volley") ---

    function openHold(options: SoloHoldTimerOptions, done: () => void) {
        stop();
        onComplete = done;
        cycle.value = {
            totalArrows: options.arrowsPerVolley,
            arrowsRemaining: options.arrowsPerVolley,
            holdSeconds: options.holdSeconds,
            restSeconds: options.restSeconds,
            phase: "rest",
            secondsRemaining: options.restSeconds,
            isPaused: true,
        };
        visible.value = true;
    }

    /** Mirrors speakSoloVolleyPreparation() (hold cue mode). */
    function emitSoloVolleyPreparationCue() {
        const state = cycle.value;
        if (!state) return;
        const arrowNumber = Math.max(1, state.totalArrows - state.arrowsRemaining + 1);
        const spokenArrowNumber = arrowNumber === 1 ? "une" : String(arrowNumber);
        speakTrainingMessage(`Préparation flèche ${spokenArrowNumber}`, { cancelPrevious: false });
    }

    function resumeTrainingCycle() {
        const state = cycle.value;
        if (!state || intervalId !== null) return;
        state.isPaused = false;
        if (state.phase === "rest" && state.secondsRemaining === state.restSeconds) {
            emitSoloVolleyPreparationCue();
        }
        intervalId = window.setInterval(tickTrainingCycle, 1000);
        running.value = true;
    }

    function tickTrainingCycle() {
        const state = cycle.value;
        if (!state || state.isPaused) return;

        if (state.secondsRemaining > 0) {
            state.secondsRemaining -= 1;
            return;
        }

        if (state.phase === "rest") {
            state.phase = "hold";
            state.secondsRemaining = state.holdSeconds;
            speakTrainingMessage("Traction", { cancelPrevious: false });
            return;
        }

        speakTrainingMessage("Libération", { cancelPrevious: false });
        state.arrowsRemaining -= 1;
        if (state.arrowsRemaining > 0) {
            state.phase = "rest";
            state.secondsRemaining = state.restSeconds;
            emitSoloVolleyPreparationCue();
            return;
        }

        completeSoloVolleyTimer();
    }

    /** Mirrors completeSoloVolleyTimer(): "Termine" frame, then stopTrainingCycle() + hide. */
    function completeSoloVolleyTimer() {
        finished.value = true;
        stop();
        visible.value = false;
        const done = onComplete;
        onComplete = null;
        done?.();
    }

    // --- Shared toggle / pause / close ---

    function pause() {
        clearTick();
        if (cycle.value) cycle.value.isPaused = true;
        if (beeps.value) beeps.value.isPaused = true;
    }

    /** Mirrors the trainingCycleToggleBtn click handler. */
    function toggle() {
        if (beeps.value) {
            if (intervalId !== null) {
                pause();
                return;
            }
            resumeSoloBeepsTimer();
            return;
        }
        if (!cycle.value) return;
        if (intervalId !== null) {
            pause();
            return;
        }
        resumeTrainingCycle();
    }

    /** Mirrors closeTrainingHoldModal() (caller unlocks input / marks the volley as timed). */
    function close() {
        onComplete = null;
        stop();
        visible.value = false;
    }

    // --- View model (renderSoloBeepsTimer / renderTrainingCycle) ---

    const title = computed(() => (beeps.value ? "Beeps de volée" : "Timer de volee"));
    const metaLabels = computed<[string, string]>(() => (beeps.value ? ["Tps prépa", "Tps tir"] : ["Fleches", "Restantes"]));
    const metaValues = computed<[string, string]>(() => {
        if (beeps.value) return [`${beeps.value.preparationSeconds}s`, `${beeps.value.tiringSeconds}s`];
        if (cycle.value) return [String(cycle.value.totalArrows), String(cycle.value.arrowsRemaining)];
        return ["", ""];
    });
    /** syncSoloBeepsMetaBlocksColor() / syncTrainingMetaBlocksColor(phase). */
    const metaColors = computed<[string, string]>(() => {
        if (beeps.value) return ["#2d6a4f", "#c62828"];
        const color = cycle.value?.phase === "rest" ? "#2d6a4f" : "#c62828";
        return [color, color];
    });
    const ringSeconds = computed(() => {
        if (finished.value) return 0;
        const seconds = beeps.value?.secondsRemaining ?? cycle.value?.secondsRemaining ?? 0;
        return Math.max(0, Math.trunc(seconds));
    });
    const ringLabel = computed(() => {
        if (finished.value) return "Termine";
        if (beeps.value) return beeps.value.phase === "preparation" ? "Prépa" : "Tir";
        return cycle.value?.phase === "rest" ? "Repos" : "Tenue";
    });
    const ringProgress = computed(() => {
        if (finished.value) return 0;
        if (beeps.value) {
            const timer = beeps.value;
            const cycleTotal = Math.max(1, timer.preparationSeconds + timer.tiringSeconds);
            const remaining = timer.phase === "preparation"
                ? Math.max(0, timer.secondsRemaining + timer.tiringSeconds)
                : Math.max(0, timer.secondsRemaining);
            return Math.min(100, Math.max(0, (remaining / cycleTotal) * 100));
        }
        if (cycle.value) {
            const state = cycle.value;
            const cycleTotal = Math.max(1, state.restSeconds + state.holdSeconds);
            const remaining = state.secondsRemaining + (state.phase === "rest" ? state.holdSeconds : 0);
            return Math.min(100, Math.max(0, (remaining / cycleTotal) * 100));
        }
        return 0;
    });
    const ringClass = computed(() => {
        if (beeps.value) {
            return { "is-rest": beeps.value.phase === "preparation", "is-hold": beeps.value.phase === "tiring" };
        }
        return { "is-rest": cycle.value?.phase === "rest", "is-hold": cycle.value?.phase === "hold" };
    });
    const ringAriaLabel = computed(() => {
        if (beeps.value) {
            return beeps.value.phase === "preparation" ? "Décompte du temps de préparation" : "Décompte du temps de tir";
        }
        return cycle.value?.phase === "rest" ? "Décompte du temps de repos" : "Décompte du temps de tenue";
    });

    onBeforeUnmount(() => {
        onComplete = null;
        stop();
        visible.value = false;
    });

    return {
        visible,
        running,
        openBeeps,
        openHold,
        toggle,
        close,
        stop,
        title,
        metaLabels,
        metaValues,
        metaColors,
        ringSeconds,
        ringLabel,
        ringProgress,
        ringClass,
        ringAriaLabel,
    };
}
