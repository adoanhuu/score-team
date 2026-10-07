<script setup lang="ts">
import {
  formatRulesetLabel,
  formatScore,
  FIELD_X,
  type Ruleset,
} from "~/utils/scoring-format";
import {
  getWeaponsForRuleset,
  formatWeaponLabel,
  presets,
  scoreToValue,
} from "~/utils/scoring-engine";
import type { ShieldCategory } from "~/utils/training-quiz";
import {
  clampTrainingHoldSeries,
  clampTrainingHoldRepetitions,
  clampTrainingHoldSeconds,
  clampTrainingRestSeconds,
  getTrainingRingColorByPhase,
  type TrainingHoldSettings,
} from "~/composables/useTrainingHold";
import {
  clampTrainingVolumeSeries,
  clampTrainingVolumeVolleysPerSeries,
  clampTrainingVolumeArrowsPerVolley,
  type TrainingVolumeSettings,
} from "~/composables/useTrainingVolume";
import {
  TRAINING_TARGET_SCORE_DEFAULTS,
  getTrainingTargetScoreBounds,
  clampTrainingTargetScore,
  clampTrainingTargetPercentage,
  getStoredTrainingTargetScore,
} from "~/composables/useTrainingTargetScore";

const hold = useTrainingHold();
const volume = useTrainingVolume();
const quiz = useTrainingQuiz();
const targetScore = useTrainingTargetScore();
const { config, load: loadConfig, save: saveConfig } = useConfig();
const { showFlash } = useFlash();

const FFTA_RULESETS: Ruleset[] = ["nature", "campagne", "3d"];
const FFTL_RULESETS: Ruleset[] = ["3d2", "3dh", "ar", "field"];

type ExerciseKey =
  | "hold-time"
  | "volume-arrows"
  | "quiz-shields"
  | "target-score";
const selectedExercise = ref<ExerciseKey>("hold-time");

const loading = ref(true);
onMounted(async () => {
  await loadConfig();
  loading.value = false;
});

// Leaving the page stops every exercise like closing the legacy modals
// (closeTrainingHoldModal()/closeTrainingVolumeModal()/
// closeTrainingQuizShieldsModal()/closeTrainingTargetScoreSessionModal()):
// hold interval + speech, quiz timeout, and all sessions reset.
onBeforeUnmount(() => {
  hold.close();
  volume.close();
  quiz.close();
  targetScore.close();
});

function rangeProgress(value: number, min: number, max: number) {
  const span = max - min;
  const pct = span > 0 ? ((value - min) / span) * 100 : 0;
  return `${Math.min(100, Math.max(0, pct))}%`;
}

// Saved settings are clamped on read, like loadConfig() in app.js does for
// trainingHold/trainingVolume/trainingTargetScore (Number.parseInt + clamp,
// default when not an integer).
function parseSavedInt(value: unknown) {
  return Number.parseInt(String(value ?? ""), 10);
}

// 3-digit counter (hundreds/tens/units), zero-padded and capped to 999.
function toCounterDigits(value: number) {
  return String(Math.max(0, Math.min(999, value))).padStart(3, "0");
}

const running = computed(() => {
  // Hold-time stops its own `running` flag as soon as the cycle finishes
  // (mirrors app.js: the modal stays open on the "Terminé" state until the
  // user explicitly closes it), so `finished` must also keep this view open.
  if (hold.state.value.running || hold.state.value.finished)
    return "hold-time" as const;
  if (volume.state.value.running) return "volume-arrows" as const;
  if (quiz.state.value.running) return "quiz-shields" as const;
  if (targetScore.state.value.running) return "target-score" as const;
  return null;
});

// ---------------- Temps de tenue ----------------
const holdSettings = computed<TrainingHoldSettings>(() => {
  const saved = config.value.trainingHold;
  return {
    series: clampTrainingHoldSeries(parseSavedInt(saved?.series)),
    repetitions: clampTrainingHoldRepetitions(
      parseSavedInt(saved?.repetitions),
    ),
    holdSeconds: clampTrainingHoldSeconds(parseSavedInt(saved?.holdSeconds)),
    restSeconds: clampTrainingRestSeconds(parseSavedInt(saved?.restSeconds)),
  };
});

async function updateHoldSettings(patch: Partial<TrainingHoldSettings>) {
  config.value = {
    ...config.value,
    trainingHold: { ...holdSettings.value, ...patch },
  };
  await saveConfig();
}

const holdSeries = computed({
  get: () => holdSettings.value.series,
  set: (value: number) =>
    updateHoldSettings({ series: clampTrainingHoldSeries(value) }),
});
const holdRepetitions = computed({
  get: () => holdSettings.value.repetitions,
  set: (value: number) =>
    updateHoldSettings({ repetitions: clampTrainingHoldRepetitions(value) }),
});
const holdSeconds = computed({
  get: () => holdSettings.value.holdSeconds,
  set: (value: number) =>
    updateHoldSettings({ holdSeconds: clampTrainingHoldSeconds(value) }),
});
const restSeconds = computed({
  get: () => holdSettings.value.restSeconds,
  set: (value: number) =>
    updateHoldSettings({ restSeconds: clampTrainingRestSeconds(value) }),
});

function startHold() {
  hold.start(holdSettings.value);
}
// Mirrors the #training-cycle-toggle-btn click handler (pause / resume /
// restart a fresh cycle once finished).
function toggleHold() {
  hold.toggle(holdSettings.value);
}
function closeHold() {
  hold.close();
}
// Pause button shown only while the cycle ticks (updateTrainingCycleToggleButton()).
const holdShowStart = computed(
  () => !hold.state.value.running || hold.state.value.paused,
);
// Mirrors syncTrainingMetaBlocksColor().
const holdMetaStyle = computed(() => ({
  backgroundColor: getTrainingRingColorByPhase(hold.state.value.phase),
  color: "#fff",
}));
watch(
  () => hold.state.value.finished,
  (finished) => {
    if (finished) showFlash("Séance Temps de tenue terminée.");
  },
);

// ---------------- Volume de flèches ----------------
const volumeSettings = computed<TrainingVolumeSettings>(() => {
  const saved = config.value.trainingVolume;
  return {
    series: clampTrainingVolumeSeries(parseSavedInt(saved?.series)),
    volleysPerSeries: clampTrainingVolumeVolleysPerSeries(
      parseSavedInt(saved?.volleysPerSeries),
    ),
    arrowsPerVolley: clampTrainingVolumeArrowsPerVolley(
      parseSavedInt(saved?.arrowsPerVolley),
    ),
  };
});

async function updateVolumeSettings(patch: Partial<TrainingVolumeSettings>) {
  config.value = {
    ...config.value,
    trainingVolume: { ...volumeSettings.value, ...patch },
  };
  await saveConfig();
}

const volumeSeries = computed({
  get: () => volumeSettings.value.series,
  set: (value: number) =>
    updateVolumeSettings({ series: clampTrainingVolumeSeries(value) }),
});
const volumeVolleysPerSeries = computed({
  get: () => volumeSettings.value.volleysPerSeries,
  set: (value: number) =>
    updateVolumeSettings({
      volleysPerSeries: clampTrainingVolumeVolleysPerSeries(value),
    }),
});
const volumeArrowsPerVolley = computed({
  get: () => volumeSettings.value.arrowsPerVolley,
  set: (value: number) =>
    updateVolumeSettings({
      arrowsPerVolley: clampTrainingVolumeArrowsPerVolley(value),
    }),
});
// Setup total counter, mirrors updateTrainingVolumeDisplay().
const volumeTotalDigits = computed(() =>
  toCounterDigits(
    volumeSeries.value *
      volumeVolleysPerSeries.value *
      volumeArrowsPerVolley.value,
  ),
);

function startVolume() {
  volume.start(volumeSettings.value);
}
function closeVolume() {
  volume.close();
}
function registerVolumeVolley() {
  volume.registerNextVolley();
  if (volume.completed.value) showFlash("Séance volume terminée.");
}
const volumeArrowsLabel = computed(() => {
  const n = volume.state.value.arrowsPerVolley;
  return `Tirer ${n} ${n > 1 ? "flèches" : "flèche"}`;
});
// Session counter, mirrors renderTrainingVolumeSession().
const volumeCounterDigits = computed(() =>
  toCounterDigits(volume.state.value.arrowsFired),
);

// ---------------- Quiz blasons ----------------
const QUIZ_CATEGORIES: ShieldCategory[] = ["PA", "PG", "MG", "GG"];
const shieldPa = ref(true);
const shieldPg = ref(true);
const shieldMg = ref(true);
const shieldGg = ref(true);

function selectedShieldCategories(): ShieldCategory[] {
  const categories: ShieldCategory[] = [];
  if (shieldPa.value) categories.push("PA");
  if (shieldPg.value) categories.push("PG");
  if (shieldMg.value) categories.push("MG");
  if (shieldGg.value) categories.push("GG");
  return categories.length > 0 ? categories : ["PA", "PG", "MG", "GG"];
}

function startQuiz() {
  const ok = quiz.start(selectedShieldCategories());
  if (!ok) showFlash("Aucun blason disponible pour démarrer le quiz.");
}
function closeQuiz() {
  quiz.close();
}
// Mirrors restartQuizShields().
function restartQuiz() {
  if (!quiz.restart())
    showFlash("Aucun blason disponible pour redemarrer le quiz.");
}
function answerQuiz(category: ShieldCategory) {
  quiz.answer(category);
}
// Mirrors the button state classes toggled in loadNextQuizShieldsQuestion()/
// handleQuizShieldsAnswer().
function quizButtonClass(category: ShieldCategory) {
  const s = quiz.state.value;
  if (!s.answered) return "quiz-option-default";
  if (category === s.currentShield?.category) return "correct";
  if (category === s.lastAnswerCategory) return "incorrect";
  return "quiz-option-muted";
}
// The legacy "Cible" value is not updated past the last question.
const quizQuestionLabel = computed(() => {
  const s = quiz.state.value;
  return `${Math.min(s.currentQuestion, s.totalQuestions)}/${s.totalQuestions}`;
});

// ---------------- Score cible ----------------
// Derived from config (not snapshotted into refs) so the saved course/score
// show up once the async loadConfig() resolves.
const enabledRulesets = computed(() => config.value.enabledRulesets ?? []);
const enabledFftaRulesets = computed(() =>
  FFTA_RULESETS.filter((r) => enabledRulesets.value.includes(r)),
);
const enabledFftlRulesets = computed(() =>
  FFTL_RULESETS.filter((r) => enabledRulesets.value.includes(r)),
);

// Mirrors getTrainingTargetRuleset() + updateRulesetSelectOptions(): a
// saved course that is now disabled falls back to the first enabled one.
const targetRuleset = computed<Ruleset>({
  get: () => {
    const saved = config.value.trainingTargetScore?.ruleset as Ruleset;
    const isKnown = (r: string): r is Ruleset =>
      Object.prototype.hasOwnProperty.call(presets, r);
    if (saved && isKnown(saved) && enabledRulesets.value.includes(saved))
      return saved;
    const firstEnabled = [...FFTA_RULESETS, ...FFTL_RULESETS].find((r) =>
      enabledRulesets.value.includes(r),
    );
    if (firstEnabled) return firstEnabled;
    return saved && isKnown(saved)
      ? saved
      : TRAINING_TARGET_SCORE_DEFAULTS.ruleset;
  },
  set: (ruleset: Ruleset) => {
    // updateTrainingTargetScoreDisplay({ useStoredValue: true }) on change.
    void saveTargetScoreSettings(
      ruleset,
      getStoredTrainingTargetScore(ruleset, config.value.trainingTargetScore),
    );
  },
});

const targetBounds = computed(() =>
  getTrainingTargetScoreBounds(targetRuleset.value),
);
const targetScoreValue = computed({
  get: () =>
    getStoredTrainingTargetScore(
      targetRuleset.value,
      config.value.trainingTargetScore,
    ),
  set: (value: number) => {
    void saveTargetScoreSettings(targetRuleset.value, value);
  },
});
const targetScoreDigits = computed(() =>
  toCounterDigits(targetScoreValue.value),
);

// Mirrors the appConfig writes at the end of updateTrainingTargetScoreDisplay():
// ruleset, percentage (fallback for rulesets without a saved score) and the
// per-ruleset target score.
async function saveTargetScoreSettings(ruleset: Ruleset, score: number) {
  const safeScore = clampTrainingTargetScore(score, ruleset);
  const { maxScore } = getTrainingTargetScoreBounds(ruleset);
  const saved = config.value.trainingTargetScore;
  config.value = {
    ...config.value,
    trainingTargetScore: {
      ...saved,
      ruleset,
      percentage: clampTrainingTargetPercentage((safeScore / maxScore) * 100),
      targetScoresByRuleset: {
        ...(saved?.targetScoresByRuleset ?? {}),
        [ruleset]: safeScore,
      },
    },
  };
  await saveConfig();
}

const targetWeapon = ref(getWeaponsForRuleset(targetRuleset.value)[0] ?? "");
watch(targetRuleset, (newRuleset) => {
  const weapons = getWeaponsForRuleset(newRuleset);
  if (!weapons.includes(targetWeapon.value))
    targetWeapon.value = weapons[0] ?? "";
});

// Mirrors getTrainingTargetSuccessZone(): saved zone for
// "ruleset:individual:weapon", clamped (non-integer -> 1) by the composable.
function startTargetScore() {
  const zoneKey = `${targetRuleset.value}:individual:${targetWeapon.value}`;
  const savedZone = Number.parseInt(
    String(config.value.successZoneByRuleset?.[zoneKey] ?? ""),
    10,
  );
  targetScore.start({
    ruleset: targetRuleset.value,
    targetScore: targetScoreValue.value,
    successZone: Number.isInteger(savedZone) ? savedZone : Number.NaN,
  });
}
function closeTargetScore() {
  targetScore.close();
}
function registerTargetScore(score: number) {
  targetScore.registerScore(score);
  if (targetScore.state.value.completed) {
    showFlash(`Score cible atteint : ${targetScore.total.value} pts.`);
  }
}
function stepBackTargetScore() {
  targetScore.stepBack();
}
function isZero(score: number) {
  return score === 0;
}
function isFieldX(score: number) {
  return score === FIELD_X;
}
// Mirrors renderCurrentShootPills().
function pillScoreClass(value: number | null) {
  if (value === null || value === undefined) return "is-empty";
  if (value === 0) return "is-miss";
  if (value === FIELD_X) return "is-x";
  return "is-hit";
}
function targetRowTotal(arrows: (number | null)[]) {
  return arrows.reduce<number>((s, v) => s + scoreToValue(v), 0);
}
</script>

<template>
  <main class="app">
    <!-- ===================== SETUP / MENU ===================== -->
    <section v-if="!loading && !running" class="card">
      <div class="setup-head">
        <h2 class="modal-title-with-icon">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M2 8h2v8H2V8Zm3-2h3v12H5V6Zm3 4h8v4H8v-4Zm8-4h3v12h-3V6Zm4 2h2v8h-2V8Z"
              fill="currentColor"
            />
          </svg>
          <span>Entraînement</span>
        </h2>
        <div class="setup-head-actions">
          <NuxtLink
            to="/"
            class="btn btn-light btn-icon home-btn"
            aria-label="Fermer entraînement"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5Z"
                fill="currentColor"
              />
            </svg>
          </NuxtLink>
        </div>
      </div>

      <div class="grid-two solo-setup-grid">
        <label for="training-option-select">
          <span class="label-inline">Exercice</span>
          <select id="training-option-select" v-model="selectedExercise">
            <option value="hold-time">Temps de tenue</option>
            <option value="volume-arrows">Volume de flèches</option>
            <option value="quiz-shields">Quiz blasons</option>
            <option value="target-score">Score cible</option>
          </select>
        </label>

        <!-- Temps de tenue form -->
        <div v-if="selectedExercise === 'hold-time'" id="training-hold-time-form">
          <label for="training-series-input">
            <span class="label-inline">Nombre de séries</span>
            <div class="slider-row">
              <input
                id="training-series-input"
                type="range"
                min="3"
                max="6"
                step="1"
                :value="holdSeries"
                :style="{ '--range-progress': rangeProgress(holdSeries, 3, 6) }"
                @input="
                  holdSeries = Number(($event.target as HTMLInputElement).value)
                "
              />
              <strong>{{ holdSeries }}</strong>
            </div>
          </label>
          <label for="training-repetitions-input">
            <span class="label-inline">Nombre de répétitions</span>
            <div class="slider-row">
              <input
                id="training-repetitions-input"
                type="range"
                min="3"
                max="6"
                step="1"
                :value="holdRepetitions"
                :style="{
                  '--range-progress': rangeProgress(holdRepetitions, 3, 6),
                }"
                @input="
                  holdRepetitions = Number(
                    ($event.target as HTMLInputElement).value,
                  )
                "
              />
              <strong>{{ holdRepetitions }}</strong>
            </div>
          </label>
          <label for="training-hold-seconds-input">
            <span class="label-inline">Temps de tenue en secondes</span>
            <div class="slider-row">
              <input
                id="training-hold-seconds-input"
                type="range"
                min="2"
                max="12"
                step="1"
                :value="holdSeconds"
                :style="{
                  '--range-progress': rangeProgress(holdSeconds, 2, 12),
                }"
                @input="
                  holdSeconds = Number(
                    ($event.target as HTMLInputElement).value,
                  )
                "
              />
              <strong>{{ holdSeconds }}s</strong>
            </div>
          </label>
          <label for="training-rest-seconds-input">
            <span class="label-inline">Temps de repos en secondes</span>
            <div class="slider-row">
              <input
                id="training-rest-seconds-input"
                type="range"
                min="5"
                max="30"
                step="1"
                :value="restSeconds"
                :style="{
                  '--range-progress': rangeProgress(restSeconds, 5, 30),
                }"
                @input="
                  restSeconds = Number(
                    ($event.target as HTMLInputElement).value,
                  )
                "
              />
              <strong>{{ restSeconds }}s</strong>
            </div>
          </label>
          <div class="start-action">
            <button
              id="training-start-btn"
              class="btn btn-primary btn-icon start-btn"
              aria-label="Démarrer entraînement temps de tenue"
              @click="startHold"
            >
              Démarrer
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M8 5v14l11-7L8 5Z" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Volume de flèches form -->
        <div
          v-else-if="selectedExercise === 'volume-arrows'"
          id="training-volume-form"
        >
          <label for="training-volume-series-input">
            <span class="label-inline">Nombre de séries</span>
            <div class="slider-row">
              <input
                id="training-volume-series-input"
                type="range"
                min="1"
                max="10"
                step="1"
                :value="volumeSeries"
                :style="{
                  '--range-progress': rangeProgress(volumeSeries, 1, 10),
                }"
                @input="
                  volumeSeries = Number(
                    ($event.target as HTMLInputElement).value,
                  )
                "
              />
              <strong>{{ volumeSeries }}</strong>
            </div>
          </label>
          <label for="training-volume-volleys-input">
            <span class="label-inline">Nombre de volées par série</span>
            <div class="slider-row">
              <input
                id="training-volume-volleys-input"
                type="range"
                min="1"
                max="6"
                step="1"
                :value="volumeVolleysPerSeries"
                :style="{
                  '--range-progress': rangeProgress(
                    volumeVolleysPerSeries,
                    1,
                    6,
                  ),
                }"
                @input="
                  volumeVolleysPerSeries = Number(
                    ($event.target as HTMLInputElement).value,
                  )
                "
              />
              <strong>{{ volumeVolleysPerSeries }}</strong>
            </div>
          </label>
          <label for="training-volume-arrows-input">
            <span class="label-inline">Nombre de flèches par volée</span>
            <div class="slider-row">
              <input
                id="training-volume-arrows-input"
                type="range"
                min="1"
                max="12"
                step="1"
                :value="volumeArrowsPerVolley"
                :style="{
                  '--range-progress': rangeProgress(
                    volumeArrowsPerVolley,
                    1,
                    12,
                  ),
                }"
                @input="
                  volumeArrowsPerVolley = Number(
                    ($event.target as HTMLInputElement).value,
                  )
                "
              />
              <strong>{{ volumeArrowsPerVolley }}</strong>
            </div>
          </label>
          <div class="training-volume-total" aria-live="polite">
            <div
              class="training-volume-counter"
              aria-label="Compteur total de flèches à tirer"
            >
              <span
                v-for="(digit, i) in volumeTotalDigits"
                :key="i"
                class="training-volume-digit"
                >{{ digit }}</span
              >
            </div>
          </div>
          <div class="start-action">
            <button
              id="training-volume-start-btn"
              class="btn btn-primary btn-icon start-btn"
              aria-label="Démarrer entraînement volume de flèches"
              @click="startVolume"
            >
              Démarrer
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M8 5v14l11-7L8 5Z" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Quiz blasons form -->
        <div
          v-else-if="selectedExercise === 'quiz-shields'"
          id="training-quiz-shields-form"
        >
          <div class="quiz-shields-sponsor">
            <a
              href="https://www.obosticker.com/#archerie"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Sponsor OBO Sticker"
            >
              <img
                src="/images/obo-sticker.png"
                alt="OBO Sticker"
                class="sponsor-logo"
              />
            </a>
          </div>

          <fieldset class="shields-checkboxes">
            <legend>Catégories de blasons</legend>
            <div class="checkbox-item">
              <input
                id="shield-pa-checkbox"
                v-model="shieldPa"
                type="checkbox"
                value="PA"
              />
              <label for="shield-pa-checkbox">
                <span class="checkbox-label-text">Petit Animal (PA)</span>
              </label>
            </div>
            <div class="checkbox-item">
              <input
                id="shield-pg-checkbox"
                v-model="shieldPg"
                type="checkbox"
                value="PG"
              />
              <label for="shield-pg-checkbox">
                <span class="checkbox-label-text">Petit Gibier (PG)</span>
              </label>
            </div>
            <div class="checkbox-item">
              <input
                id="shield-mg-checkbox"
                v-model="shieldMg"
                type="checkbox"
                value="MG"
              />
              <label for="shield-mg-checkbox">
                <span class="checkbox-label-text">Moyen Gibier (MG)</span>
              </label>
            </div>
            <div class="checkbox-item">
              <input
                id="shield-gg-checkbox"
                v-model="shieldGg"
                type="checkbox"
                value="GG"
              />
              <label for="shield-gg-checkbox">
                <span class="checkbox-label-text">Grand Gibier (GG)</span>
              </label>
            </div>
          </fieldset>

          <div class="start-action">
            <button
              id="training-quiz-shields-start-btn"
              class="btn btn-primary btn-icon start-btn"
              aria-label="Démarrer quiz blasons"
              @click="startQuiz"
            >
              Démarrer
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M8 5v14l11-7L8 5Z" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Score cible form -->
        <div v-else id="training-target-score-form">
          <div class="training-target-score-content">
            <label for="training-target-ruleset-select">
              <span class="label-inline">Type de parcours</span>
              <select id="training-target-ruleset-select" v-model="targetRuleset">
                <optgroup v-if="enabledFftaRulesets.length > 0" label="FFTA">
                  <option
                    v-for="r in enabledFftaRulesets"
                    :key="r"
                    :value="r"
                  >
                    {{ formatRulesetLabel(r) }}
                  </option>
                </optgroup>
                <optgroup v-if="enabledFftlRulesets.length > 0" label="FFTL">
                  <option
                    v-for="r in enabledFftlRulesets"
                    :key="r"
                    :value="r"
                  >
                    {{ formatRulesetLabel(r) }}
                  </option>
                </optgroup>
              </select>
            </label>
            <label for="training-target-weapon-select">
              <span class="label-inline">Arme</span>
              <select id="training-target-weapon-select" v-model="targetWeapon">
                <option
                  v-for="w in getWeaponsForRuleset(targetRuleset)"
                  :key="w"
                  :value="w"
                >
                  {{ formatWeaponLabel(w) }}
                </option>
              </select>
            </label>

            <div class="training-target-score-control">
              <label for="training-target-score-input" class="label-inline"
                >Score cible</label
              >
              <div
                class="training-volume-total training-target-score-total"
                aria-live="polite"
              >
                <div
                  class="training-volume-counter"
                  aria-label="Compteur du score cible"
                >
                  <span
                    v-for="(digit, i) in targetScoreDigits"
                    :key="i"
                    class="training-volume-digit"
                    >{{ digit }}</span
                  >
                </div>
              </div>
              <div class="slider-row">
                <input
                  id="training-target-score-input"
                  type="range"
                  :min="targetBounds.minScore"
                  :max="targetBounds.maxScore"
                  step="1"
                  :value="targetScoreValue"
                  :style="{
                    '--range-progress': rangeProgress(
                      targetScoreValue,
                      targetBounds.minScore,
                      targetBounds.maxScore,
                    ),
                    '--range-fill-color': '#2d6a4f',
                  }"
                  @input="
                    targetScoreValue = Number(
                      ($event.target as HTMLInputElement).value,
                    )
                  "
                />
              </div>
            </div>

            <div class="start-action">
              <button
                id="training-target-score-start-btn"
                class="btn btn-primary btn-icon start-btn"
                aria-label="Démarrer entraînement score cible"
                @click="startTargetScore"
              >
                Démarrer
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M8 5v14l11-7L8 5Z" fill="currentColor" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===================== TEMPS DE TENUE (running) ===================== -->
    <section v-else-if="running === 'hold-time'" class="card">
      <div class="setup-head">
        <h2 class="modal-title-with-icon">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M9 2h6v2H9V2Zm3 4a8 8 0 1 0 8 8 8 8 0 0 0-8-8Zm0 14a6 6 0 1 1 6-6 6 6 0 0 1-6 6Zm1-10h-2v4.4l3.2 1.9 1-1.7-2.2-1.3V10Z"
              fill="currentColor"
            />
          </svg>
          <span>Temps de tenue</span>
        </h2>
        <button
          class="btn btn-light btn-icon home-btn"
          aria-label="Fermer temps de tenue"
          @click="closeHold"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>
      <!-- Remaining counts, mirrors renderTrainingCycle(). -->
      <div class="training-hold-meta-row">
        <strong class="training-hold-series-stack" :style="holdMetaStyle">
          <span class="training-meta-label">Série</span>
          <span class="training-meta-value">{{
            hold.state.value.seriesRemaining
          }}</span>
        </strong>
        <strong class="training-hold-series-stack" :style="holdMetaStyle">
          <span class="training-meta-label">Répétition</span>
          <span class="training-meta-value">{{
            hold.state.value.repetitionsRemaining
          }}</span>
        </strong>
      </div>
      <div class="training-hold-ring-wrap">
        <div
          class="training-hold-ring"
          :class="{
            'is-rest': hold.state.value.phase === 'rest',
            'is-series-break': hold.state.value.phase === 'series-break',
            'is-hold': hold.state.value.phase === 'hold',
          }"
          :style="{ '--ring-progress': hold.ringProgressPct.value }"
          role="img"
          :aria-label="hold.ringAriaLabel.value"
        >
          <strong>
            <span class="training-time-value">{{
              hold.state.value.secondsRemaining
            }}</span
            ><span class="training-time-unit">s</span>
          </strong>
          <span id="training-cycle-ring-label">{{
            hold.phaseLabel.value
          }}</span>
        </div>
      </div>
      <div class="start-action">
        <button
          id="training-cycle-toggle-btn"
          class="btn btn-primary btn-icon start-btn"
          :aria-label="
            holdShowStart ? 'Démarrer le timer' : 'Mettre en pause le timer'
          "
          @click="toggleHold"
        >
          <span>{{ holdShowStart ? "Démarrer" : "Pause" }}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              v-if="holdShowStart"
              d="M8 5v14l11-7L8 5Z"
              fill="currentColor"
            />
            <path v-else d="M7 5h3v14H7V5Zm7 0h3v14h-3V5Z" fill="currentColor" />
          </svg>
        </button>
      </div>
    </section>

    <!-- ===================== VOLUME DE FLÈCHES (running) ===================== -->
    <section v-else-if="running === 'volume-arrows'" class="card">
      <div class="setup-head">
        <h2 class="modal-title-with-icon">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M4 4h16v4H4V4Zm0 6h16v4H4v-4Zm0 6h16v4H4v-4Z"
              fill="currentColor"
            />
          </svg>
          <span>Volume de flèches</span>
        </h2>
        <button
          class="btn btn-light btn-icon home-btn"
          aria-label="Fermer volume de flèches"
          @click="closeVolume"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>
      <div class="training-volume-meta-row">
        <strong class="training-volume-meta-block">
          <span class="training-meta-label">Série</span>
          <span class="training-meta-value"
            >{{ volume.state.value.currentSeries }}/{{
              volume.state.value.seriesTotal
            }}</span
          >
        </strong>
        <strong class="training-volume-meta-block">
          <span class="training-meta-label">Volée</span>
          <span class="training-meta-value"
            >{{ volume.state.value.currentVolley }}/{{
              volume.state.value.volleysPerSeries
            }}</span
          >
        </strong>
      </div>
      <div class="training-volume-progress-wrap">
        <div class="training-volume-progress-head">
          <span>Progression des flèches</span>
          <strong>{{ volume.progressPct.value }}%</strong>
        </div>
        <input
          id="training-volume-progress-input"
          type="range"
          min="0"
          max="100"
          step="1"
          :value="volume.progressPct.value"
          :style="{
            '--range-progress': rangeProgress(volume.progressPct.value, 0, 100),
            '--range-fill-color': '#1f6feb',
          }"
          disabled
        />
      </div>
      <div class="start-action">
        <button
          id="training-volume-next-btn"
          class="btn btn-primary btn-icon start-btn"
          :aria-label="
            volume.completed.value ? 'Séance terminée' : volumeArrowsLabel
          "
          :disabled="volume.completed.value"
          @click="registerVolumeVolley"
        >
          <span>{{ volumeArrowsLabel }}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M8 5v14l11-7L8 5Z" fill="currentColor" />
          </svg>
        </button>
      </div>
      <div class="training-volume-counter-wrap" aria-live="polite">
        <div
          class="training-volume-counter"
          aria-label="Compteur analogique de flèches"
        >
          <span
            v-for="(digit, i) in volumeCounterDigits"
            :key="i"
            class="training-volume-digit"
            >{{ digit }}</span
          >
        </div>
      </div>
    </section>

    <!-- ===================== QUIZ BLASONS (running) ===================== -->
    <section v-else-if="running === 'quiz-shields'" class="card">
      <div class="setup-head">
        <h2 class="modal-title-with-icon">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M12 3C6.48 3 2 6.58 2 11c0 2.24 1.17 4.26 3.06 5.69-.18 1.17-.69 2.33-1.5 3.31 1.92-.23 3.77-.93 5.31-2.02.99.27 2.04.41 3.13.41 5.52 0 10-3.58 10-8S17.52 3 12 3Z"
              fill="currentColor"
            />
          </svg>
          <span>Quiz blasons</span>
        </h2>
        <button
          class="btn btn-light btn-icon home-btn"
          aria-label="Fermer quiz blasons"
          @click="closeQuiz"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>

      <div class="quiz-shields-content">
        <div class="quiz-shields-meta-row">
          <strong class="quiz-shields-meta-block">
            <span class="training-meta-label">Score</span>
            <span class="training-meta-value">{{
              quiz.state.value.score
            }}</span>
          </strong>
          <strong class="quiz-shields-meta-block">
            <span class="training-meta-label">Cible</span>
            <span class="training-meta-value">{{ quizQuestionLabel }}</span>
          </strong>
        </div>

        <template v-if="!quiz.state.value.showResults">
          <div
            v-if="quiz.state.value.currentShield"
            class="quiz-shields-image-container"
          >
            <img
              class="quiz-shields-image"
              :src="`/images/blasons/${quiz.state.value.currentShield.category}/${quiz.state.value.currentShield.image}`"
              :alt="`Blason à identifier - ${quiz.state.value.currentShield.category}`"
            />
          </div>
          <div class="quiz-shields-buttons">
            <button
              v-for="category in QUIZ_CATEGORIES"
              :key="category"
              class="btn btn-primary quiz-shields-option-btn"
              :class="quizButtonClass(category)"
              :data-category="category"
              :disabled="quiz.state.value.answered"
              @click="answerQuiz(category)"
            >
              <span class="btn-text">{{ category }}</span>
            </button>
          </div>
        </template>

        <div v-else class="quiz-shields-results" aria-live="polite">
          <div class="results-content">
            <h2 class="results-title">Quiz terminé !</h2>
            <div class="results-stats">
              <div
                class="quiz-shields-result-ring"
                :style="{ '--ring-progress': quiz.resultPercentage.value }"
              >
                <span class="quiz-shields-result-percentage"
                  >{{ quiz.resultPercentage.value }}%</span
                >
              </div>
            </div>
            <div class="results-actions">
              <button
                id="quiz-shields-restart-btn"
                class="btn btn-primary btn-icon start-btn"
                aria-label="Recommencer le quiz"
                @click="restartQuiz"
              >
                Recommencer
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M8 5v14l11-7L8 5Z" fill="currentColor" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===================== SCORE CIBLE (running) ===================== -->
    <section v-else-if="running === 'target-score'" class="card">
      <div class="setup-head">
        <h2 class="modal-title-with-icon">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M12 2a10 10 0 1 0 10 10h-2a8 8 0 1 1-8-8V2Zm0 4a6 6 0 1 0 6 6h-2a4 4 0 1 1-4-4V6Zm7.3-3.7L16 5.6V9h3.4l3.3-3.3-2.4-.4-.4-2.4Z"
              fill="currentColor"
            />
          </svg>
          <span>Score cible</span>
        </h2>
        <button
          class="btn btn-light btn-icon home-btn"
          aria-label="Fermer score cible"
          @click="closeTargetScore"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>
      <!-- Mirrors renderTrainingTargetScoreSession(). -->
      <div class="quick-stats training-target-score-session-stats">
        <article>
          <span>Score</span>
          <strong
            >{{ targetScore.total.value
            }}<span class="stats-unit">pts</span></strong
          >
        </article>
        <article>
          <span>Progression</span>
          <strong>{{ targetScore.percentage.value }}%</strong>
        </article>
        <article>
          <span>Cible</span>
          <strong>{{ targetScore.state.value.currentTargetIndex + 1 }}</strong>
        </article>
      </div>

      <h3 class="training-target-score-history-title">Historique des scores</h3>
      <div class="training-target-score-history">
        <div
          v-if="targetScore.orderedHistory.value.length === 0"
          class="duel-volley-empty"
        >
          Aucun score saisi
        </div>
        <div v-else class="table-wrap duel-history-table-wrap">
          <table class="history-table duel-history-table">
            <thead>
              <tr>
                <th>Cible</th>
                <th>Flèches</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in targetScore.orderedHistory.value"
                :key="row.index"
              >
                <td>
                  <span class="volley-pill is-gray">{{ row.index + 1 }}</span>
                </td>
                <td>{{ row.arrows.map((v) => formatScore(v)).join(" / ") }}</td>
                <td
                  class="history-total"
                  :class="{
                    success:
                      targetRowTotal(row.arrows) >=
                      targetScore.state.value.successZone,
                  }"
                >
                  {{ targetRowTotal(row.arrows) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="score-entry-sticky training-target-score-entry-panel">
        <div class="current-shoot-display">
          <span
            v-for="(value, i) in targetScore.currentArrows.value"
            :key="i"
            class="current-shoot-pill"
            :class="pillScoreClass(value)"
            >{{ formatScore(value) }}</span
          >
        </div>
        <div class="points-pad-container">
          <div class="points-pad">
            <button
              v-for="score in targetScore.selectablePoints.value"
              :key="score"
              class="point-btn"
              :class="{
                zero: isZero(score),
                'x-score': isFieldX(score),
                'lock-disabled': targetScore.state.value.completed,
              }"
              :disabled="targetScore.state.value.completed"
              @click="registerTargetScore(score)"
            >
              {{ formatScore(score) }}
            </button>
          </div>
          <button
            class="btn btn-light btn-icon back-btn"
            aria-label="Effacer la dernière flèche score cible"
            @click="stepBackTargetScore"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M16.24 3.56l4.95 4.94c.78.79.78 2.05 0 2.84L12 20.53a4.008 4.008 0 0 1-5.66 0L2.81 17c-.78-.79-.78-2.05 0-2.84l10.6-10.6c.79-.78 2.05-.78 2.83 0M4.22 15.58l3.54 3.53c.78.79 2.04.79 2.83 0l3.53-3.53-6.36-6.36-3.54 3.54c-.78.78-.78 2.05 0 2.82Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
      </div>
    </section>
  </main>
</template>
