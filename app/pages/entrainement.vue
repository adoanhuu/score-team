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
  scoreToValue,
} from "~/utils/scoring-engine";
import type { ShieldCategory } from "~/utils/training-quiz";
import {
  TRAINING_HOLD_DEFAULTS,
  clampTrainingHoldSeries,
  clampTrainingHoldRepetitions,
  clampTrainingHoldSeconds,
  clampTrainingRestSeconds,
} from "~/composables/useTrainingHold";
import {
  TRAINING_VOLUME_DEFAULTS,
  clampTrainingVolumeSeries,
  clampTrainingVolumeVolleysPerSeries,
  clampTrainingVolumeArrowsPerVolley,
} from "~/composables/useTrainingVolume";
import {
  TRAINING_TARGET_SCORE_DEFAULTS,
  getTrainingTargetMaxScore,
  clampTrainingTargetScore,
  clampTrainingTargetPercentage,
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

function rangeProgress(value: number, min: number, max: number) {
  const span = max - min;
  const pct = span > 0 ? ((value - min) / span) * 100 : 0;
  return `${Math.min(100, Math.max(0, pct))}%`;
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
const holdSeries = computed({
  get: () => config.value.trainingHold?.series ?? TRAINING_HOLD_DEFAULTS.series,
  set: async (value: number) => {
    const safe = clampTrainingHoldSeries(value);
    config.value = {
      ...config.value,
      trainingHold: {
        ...(config.value.trainingHold ?? TRAINING_HOLD_DEFAULTS),
        series: safe,
      },
    };
    await saveConfig();
  },
});
const holdRepetitions = computed({
  get: () =>
    config.value.trainingHold?.repetitions ??
    TRAINING_HOLD_DEFAULTS.repetitions,
  set: async (value: number) => {
    const safe = clampTrainingHoldRepetitions(value);
    config.value = {
      ...config.value,
      trainingHold: {
        ...(config.value.trainingHold ?? TRAINING_HOLD_DEFAULTS),
        repetitions: safe,
      },
    };
    await saveConfig();
  },
});
const holdSeconds = computed({
  get: () =>
    config.value.trainingHold?.holdSeconds ??
    TRAINING_HOLD_DEFAULTS.holdSeconds,
  set: async (value: number) => {
    const safe = clampTrainingHoldSeconds(value);
    config.value = {
      ...config.value,
      trainingHold: {
        ...(config.value.trainingHold ?? TRAINING_HOLD_DEFAULTS),
        holdSeconds: safe,
      },
    };
    await saveConfig();
  },
});
const restSeconds = computed({
  get: () =>
    config.value.trainingHold?.restSeconds ??
    TRAINING_HOLD_DEFAULTS.restSeconds,
  set: async (value: number) => {
    const safe = clampTrainingRestSeconds(value);
    config.value = {
      ...config.value,
      trainingHold: {
        ...(config.value.trainingHold ?? TRAINING_HOLD_DEFAULTS),
        restSeconds: safe,
      },
    };
    await saveConfig();
  },
});

function startHold() {
  hold.start({
    series: holdSeries.value,
    repetitions: holdRepetitions.value,
    holdSeconds: holdSeconds.value,
    restSeconds: restSeconds.value,
  });
}
function closeHold() {
  hold.close();
}
watch(
  () => hold.state.value.finished,
  (finished) => {
    if (finished) showFlash("Séance Temps de tenue terminée.");
  },
);

// ---------------- Volume de flèches ----------------
const volumeSeries = computed({
  get: () =>
    config.value.trainingVolume?.series ?? TRAINING_VOLUME_DEFAULTS.series,
  set: async (value: number) => {
    const safe = clampTrainingVolumeSeries(value);
    config.value = {
      ...config.value,
      trainingVolume: {
        ...(config.value.trainingVolume ?? TRAINING_VOLUME_DEFAULTS),
        series: safe,
      },
    };
    await saveConfig();
  },
});
const volumeVolleysPerSeries = computed({
  get: () =>
    config.value.trainingVolume?.volleysPerSeries ??
    TRAINING_VOLUME_DEFAULTS.volleysPerSeries,
  set: async (value: number) => {
    const safe = clampTrainingVolumeVolleysPerSeries(value);
    config.value = {
      ...config.value,
      trainingVolume: {
        ...(config.value.trainingVolume ?? TRAINING_VOLUME_DEFAULTS),
        volleysPerSeries: safe,
      },
    };
    await saveConfig();
  },
});
const volumeArrowsPerVolley = computed({
  get: () =>
    config.value.trainingVolume?.arrowsPerVolley ??
    TRAINING_VOLUME_DEFAULTS.arrowsPerVolley,
  set: async (value: number) => {
    const safe = clampTrainingVolumeArrowsPerVolley(value);
    config.value = {
      ...config.value,
      trainingVolume: {
        ...(config.value.trainingVolume ?? TRAINING_VOLUME_DEFAULTS),
        arrowsPerVolley: safe,
      },
    };
    await saveConfig();
  },
});
const volumeTotalArrows = computed(
  () =>
    volumeSeries.value *
    volumeVolleysPerSeries.value *
    volumeArrowsPerVolley.value,
);

function startVolume() {
  volume.start({
    series: volumeSeries.value,
    volleysPerSeries: volumeVolleysPerSeries.value,
    arrowsPerVolley: volumeArrowsPerVolley.value,
  });
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
const volumeCounterDigits = computed(() =>
  String(Math.max(0, Math.min(999, volume.state.value.arrowsFired))).padStart(
    3,
    "0",
  ),
);

// ---------------- Quiz blasons ----------------
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
function restartQuiz() {
  quiz.restart();
}
function answerQuiz(category: ShieldCategory) {
  quiz.answer(category);
}
function quizButtonClass(category: ShieldCategory) {
  const s = quiz.state.value;
  if (!s.answered) return "quiz-option-default";
  if (category === s.currentShield?.category) return "correct";
  if (category === s.lastAnswerCategory) return "incorrect";
  return "quiz-option-muted";
}

// ---------------- Score cible ----------------
const targetRuleset = ref<Ruleset>(
  (config.value.trainingTargetScore?.ruleset as Ruleset) ??
    TRAINING_TARGET_SCORE_DEFAULTS.ruleset,
);
const targetWeapon = ref(getWeaponsForRuleset(targetRuleset.value)[0] ?? "");
const targetPercentage = ref(
  config.value.trainingTargetScore?.percentage ??
    TRAINING_TARGET_SCORE_DEFAULTS.percentage,
);

watch(targetRuleset, (newRuleset) => {
  const weapons = getWeaponsForRuleset(newRuleset);
  if (!weapons.includes(targetWeapon.value))
    targetWeapon.value = weapons[0] ?? "";
});

const targetMaxScore = computed(() =>
  getTrainingTargetMaxScore(targetRuleset.value),
);
const targetScoreValue = computed(() =>
  clampTrainingTargetScore(
    Math.round(targetMaxScore.value * (targetPercentage.value / 100)),
    targetRuleset.value,
  ),
);

async function onTargetPercentageChange(value: number) {
  targetPercentage.value = clampTrainingTargetPercentage(value);
  config.value = {
    ...config.value,
    trainingTargetScore: {
      ...(config.value.trainingTargetScore ?? {}),
      ruleset: targetRuleset.value,
      percentage: targetPercentage.value,
    },
  };
  await saveConfig();
}
async function onTargetRulesetChange() {
  config.value = {
    ...config.value,
    trainingTargetScore: {
      ...(config.value.trainingTargetScore ?? {}),
      ruleset: targetRuleset.value,
      percentage: targetPercentage.value,
    },
  };
  await saveConfig();
}

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
function pillScoreClass(value: number | null) {
  if (value === null || value === undefined) return "";
  if (value === 0) return "is-zero";
  return "";
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
            aria-label="Fermer"
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

      <label>
        <span class="label-inline">Exercice</span>
        <select v-model="selectedExercise">
          <option value="hold-time">Temps de tenue</option>
          <option value="volume-arrows">Volume de flèches</option>
          <option value="quiz-shields">Quiz blasons</option>
          <option value="target-score">Score cible</option>
        </select>
      </label>

      <!-- Temps de tenue form -->
      <div v-if="selectedExercise === 'hold-time'" class="setup-options-row">
        <label>
          <span class="label-inline"
            >Séries <strong>{{ holdSeries }}</strong></span
          >
          <input
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
        </label>
        <label>
          <span class="label-inline"
            >Répétitions par série <strong>{{ holdRepetitions }}</strong></span
          >
          <input
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
        </label>
        <label>
          <span class="label-inline"
            >Temps de tenue <strong>{{ holdSeconds }}s</strong></span
          >
          <input
            type="range"
            min="2"
            max="12"
            step="1"
            :value="holdSeconds"
            :style="{ '--range-progress': rangeProgress(holdSeconds, 2, 12) }"
            @input="
              holdSeconds = Number(($event.target as HTMLInputElement).value)
            "
          />
        </label>
        <label>
          <span class="label-inline"
            >Temps de repos <strong>{{ restSeconds }}s</strong></span
          >
          <input
            type="range"
            min="5"
            max="30"
            step="1"
            :value="restSeconds"
            :style="{ '--range-progress': rangeProgress(restSeconds, 5, 30) }"
            @input="
              restSeconds = Number(($event.target as HTMLInputElement).value)
            "
          />
        </label>
        <button class="btn btn-primary btn-icon start-btn" @click="startHold">
          Démarrer
        </button>
      </div>

      <!-- Volume de flèches form -->
      <div
        v-else-if="selectedExercise === 'volume-arrows'"
        class="setup-options-row"
      >
        <label>
          <span class="label-inline"
            >Séries <strong>{{ volumeSeries }}</strong></span
          >
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            :value="volumeSeries"
            :style="{ '--range-progress': rangeProgress(volumeSeries, 1, 10) }"
            @input="
              volumeSeries = Number(($event.target as HTMLInputElement).value)
            "
          />
        </label>
        <label>
          <span class="label-inline"
            >Volées par série
            <strong>{{ volumeVolleysPerSeries }}</strong></span
          >
          <input
            type="range"
            min="1"
            max="6"
            step="1"
            :value="volumeVolleysPerSeries"
            :style="{
              '--range-progress': rangeProgress(volumeVolleysPerSeries, 1, 6),
            }"
            @input="
              volumeVolleysPerSeries = Number(
                ($event.target as HTMLInputElement).value,
              )
            "
          />
        </label>
        <label>
          <span class="label-inline"
            >Flèches par volée
            <strong>{{ volumeArrowsPerVolley }}</strong></span
          >
          <input
            type="range"
            min="1"
            max="12"
            step="1"
            :value="volumeArrowsPerVolley"
            :style="{
              '--range-progress': rangeProgress(volumeArrowsPerVolley, 1, 12),
            }"
            @input="
              volumeArrowsPerVolley = Number(
                ($event.target as HTMLInputElement).value,
              )
            "
          />
        </label>
        <p class="training-volume-total">
          Total <strong>{{ volumeTotalArrows }}</strong> flèches
        </p>
        <button class="btn btn-primary btn-icon start-btn" @click="startVolume">
          Démarrer
        </button>
      </div>

      <!-- Quiz blasons form -->
      <div
        v-else-if="selectedExercise === 'quiz-shields'"
        class="setup-options-row"
      >
        <fieldset class="mode-fieldset">
          <legend class="label-inline">Catégories</legend>
          <label class="switch-option"
            ><input v-model="shieldPa" type="checkbox" />
            <span>Petit animal (PA)</span></label
          >
          <label class="switch-option"
            ><input v-model="shieldPg" type="checkbox" />
            <span>Petit gibier (PG)</span></label
          >
          <label class="switch-option"
            ><input v-model="shieldMg" type="checkbox" />
            <span>Moyen gibier (MG)</span></label
          >
          <label class="switch-option"
            ><input v-model="shieldGg" type="checkbox" />
            <span>Grand gibier (GG)</span></label
          >
        </fieldset>
        <button class="btn btn-primary btn-icon start-btn" @click="startQuiz">
          Démarrer
        </button>
      </div>

      <!-- Score cible form -->
      <div v-else class="setup-options-row">
        <label>
          <span class="label-inline">Parcours</span>
          <select v-model="targetRuleset" @change="onTargetRulesetChange">
            <optgroup label="FFTA">
              <option v-for="r in FFTA_RULESETS" :key="r" :value="r">
                {{ formatRulesetLabel(r) }}
              </option>
            </optgroup>
            <optgroup label="FFTL">
              <option v-for="r in FFTL_RULESETS" :key="r" :value="r">
                {{ formatRulesetLabel(r) }}
              </option>
            </optgroup>
          </select>
        </label>
        <label>
          <span class="label-inline">Arme</span>
          <select v-model="targetWeapon">
            <option
              v-for="w in getWeaponsForRuleset(targetRuleset)"
              :key="w"
              :value="w"
            >
              {{ formatWeaponLabel(w) }}
            </option>
          </select>
        </label>
        <label>
          <span class="label-inline"
            >Objectif <strong>{{ targetPercentage }}%</strong></span
          >
          <input
            type="range"
            min="50"
            max="100"
            step="1"
            :value="targetPercentage"
            :style="{
              '--range-progress': rangeProgress(targetPercentage, 50, 100),
            }"
            @input="
              onTargetPercentageChange(
                Number(($event.target as HTMLInputElement).value),
              )
            "
          />
        </label>
        <p class="training-volume-total">
          Score cible <strong>{{ targetScoreValue }}</strong> /
          {{ targetMaxScore }} pts
        </p>
        <button
          class="btn btn-primary btn-icon start-btn"
          @click="startTargetScore"
        >
          Démarrer
        </button>
      </div>
    </section>

    <!-- ===================== TEMPS DE TENUE (running) ===================== -->
    <section v-else-if="running === 'hold-time'" class="card">
      <div class="setup-head">
        <h2 class="modal-title-with-icon">Temps de tenue</h2>
        <button
          class="btn btn-light btn-icon home-btn"
          aria-label="Fermer"
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
      <div class="training-meta-row">
        <div class="training-meta-block">
          <span class="training-meta-label">Série</span>
          <span class="training-meta-value"
            >{{
              hold.state.value.finished
                ? 0
                : hold.state.value.initialSeriesCount -
                  hold.state.value.seriesRemaining +
                  1
            }}/{{ hold.state.value.initialSeriesCount }}</span
          >
        </div>
        <div class="training-meta-block">
          <span class="training-meta-label">Répétition</span>
          <span class="training-meta-value"
            >{{
              hold.state.value.finished
                ? 0
                : hold.state.value.repetitionsPerSeries -
                  hold.state.value.repetitionsRemaining +
                  1
            }}/{{ hold.state.value.repetitionsPerSeries }}</span
          >
        </div>
      </div>
      <div class="training-hold-ring-wrap">
        <div
          class="training-hold-ring"
          :class="{
            'is-rest': hold.state.value.phase === 'rest',
            'is-series-break': hold.state.value.phase === 'series-break',
          }"
          :style="{ '--ring-progress': hold.ringProgressPct.value }"
        >
          <strong>
            <span class="training-time-value">{{
              hold.state.value.finished ? 0 : hold.state.value.secondsRemaining
            }}</span
            ><span class="training-time-unit">s</span>
          </strong>
          <span id="training-cycle-ring-label">{{
            hold.phaseLabel.value
          }}</span>
        </div>
      </div>
    </section>

    <!-- ===================== VOLUME DE FLÈCHES (running) ===================== -->
    <section v-else-if="running === 'volume-arrows'" class="card">
      <div class="setup-head">
        <h2 class="modal-title-with-icon">Volume de flèches</h2>
        <button
          class="btn btn-light btn-icon home-btn"
          aria-label="Fermer"
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
        <div class="training-volume-meta-block">
          <span class="training-meta-label">Série</span>
          <span class="training-meta-value"
            >{{ volume.state.value.currentSeries }}/{{
              volume.state.value.seriesTotal
            }}</span
          >
        </div>
        <div class="training-volume-meta-block">
          <span class="training-meta-label">Volée</span>
          <span class="training-meta-value"
            >{{ volume.state.value.currentVolley }}/{{
              volume.state.value.volleysPerSeries
            }}</span
          >
        </div>
      </div>
      <div class="training-volume-progress-wrap">
        <div class="training-volume-progress-head">
          <span>Progression</span>
          <span>{{ volume.progressPct.value }}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          :value="volume.progressPct.value"
          disabled
        />
      </div>
      <div class="training-volume-counter-wrap">
        <span>{{ volumeCounterDigits[0] }}</span
        ><span>{{ volumeCounterDigits[1] }}</span
        ><span>{{ volumeCounterDigits[2] }}</span>
      </div>
      <button
        class="btn btn-primary btn-icon start-btn"
        :disabled="volume.completed.value"
        @click="registerVolumeVolley"
      >
        {{ volumeArrowsLabel }}
      </button>
    </section>

    <!-- ===================== QUIZ BLASONS (running) ===================== -->
    <section v-else-if="running === 'quiz-shields'" class="card">
      <div class="setup-head">
        <h2 class="modal-title-with-icon">Quiz blasons</h2>
        <button
          class="btn btn-light btn-icon home-btn"
          aria-label="Fermer"
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

      <template v-if="!quiz.state.value.showResults">
        <div class="training-meta-row">
          <div class="training-meta-block">
            <span class="training-meta-label">Question</span>
            <span class="training-meta-value"
              >{{ quiz.state.value.currentQuestion }}/{{
                quiz.state.value.totalQuestions
              }}</span
            >
          </div>
          <div class="training-meta-block">
            <span class="training-meta-label">Score</span>
            <span class="training-meta-value">{{
              quiz.state.value.score
            }}</span>
          </div>
        </div>
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
        <div class="quiz-shields-options grid-two">
          <button
            v-for="category in ['PA', 'PG', 'MG', 'GG'] as const"
            :key="category"
            class="btn quiz-option-btn"
            :class="quizButtonClass(category)"
            :disabled="quiz.state.value.answered"
            @click="answerQuiz(category)"
          >
            {{ category }}
          </button>
        </div>
      </template>

      <template v-else>
        <div class="results-content">
          <p class="results-title">Résultats du quiz</p>
          <div
            class="quiz-shields-result-ring"
            :style="{ '--ring-progress': quiz.resultPercentage.value }"
          >
            <span class="quiz-shields-result-percentage"
              >{{ quiz.resultPercentage.value }}%</span
            >
          </div>
          <p>
            {{ quiz.state.value.score }} /
            {{ quiz.state.value.totalQuestions }} bonnes réponses
          </p>
          <button
            class="btn btn-primary btn-icon start-btn"
            @click="restartQuiz"
          >
            Rejouer
          </button>
        </div>
      </template>
    </section>

    <!-- ===================== SCORE CIBLE (running) ===================== -->
    <section v-else-if="running === 'target-score'" class="card">
      <div class="setup-head">
        <h2 class="modal-title-with-icon">
          Score cible — {{ targetScore.percentage.value }}%
        </h2>
        <button
          class="btn btn-light btn-icon home-btn"
          aria-label="Fermer"
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
      <div class="training-meta-row">
        <div class="training-meta-block">
          <span class="training-meta-label">Total</span>
          <span class="training-meta-value"
            >{{ targetScore.total.value
            }}<span class="stats-unit">pts</span></span
          >
        </div>
        <div class="training-meta-block">
          <span class="training-meta-label">Cible</span>
          <span class="training-meta-value">{{
            targetScore.state.value.currentTargetIndex + 1
          }}</span>
        </div>
      </div>

      <div class="score-entry-sticky">
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
              :class="{ zero: isZero(score), 'x-score': isFieldX(score) }"
              :disabled="targetScore.state.value.completed"
              @click="registerTargetScore(score)"
            >
              {{ formatScore(score) }}
            </button>
          </div>
          <button
            class="btn btn-light btn-icon back-btn"
            aria-label="Effacer la dernière flèche"
            @click="stepBackTargetScore"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M11 5v4H4.83l3.58-3.59L7 4l-6 6 6 6 1.41-1.41L4.83 11H13a4 4 0 0 1 4 4v4h2v-4a6 6 0 0 0-6-6h-2V5h-2Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
      </div>

      <h3 class="history-title">Historique</h3>
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
                    row.arrows.reduce((s, v) => s + scoreToValue(v), 0) >=
                    targetScore.state.value.successZone,
                }"
              >
                {{ row.arrows.reduce((s, v) => s + scoreToValue(v), 0) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</template>
