<script setup lang="ts">
import {
  formatRulesetLabel,
  formatScore,
  FIELD_X,
  type Ruleset,
} from "~/utils/scoring-format";
import {
  isScoringModeAllowedForRuleset,
  normalizeScoringMode,
  getWeaponsForRuleset,
  formatWeaponLabel,
  getTargetCountForRuleset,
  getArrowsPerVolley,
  presets,
  canUseTimerForSetup,
  getVolleyPillClass,
  clampSuccessZoneForConfig,
  SOLO_BEEPS_PREPARATION_MAX_SECONDS,
  getSoloBeepsMaxTiringSecondsByRuleset,
  getSoloBeepsDefaultTiringSecondsByRuleset,
} from "~/utils/scoring-engine";
import type { HistoryEntryRecord } from "../composables/useDb";
import type { SoloSetupValues } from "../composables/useSoloSession";

const session = useSoloSession();
const timer = useSoloTimer();
// Instantiating useContest() here (even though scoring itself lives in useSoloSession)
// keeps its contest-sync watcher alive while the user is actively scoring a
// Concours-linked session (the watcher would otherwise be torn down when the
// mode-multi.vue setup screen that first called useContest() unmounts).
useContest();
const { confirmAction } = useConfirm();
const { showFlash } = useFlash();
const { config, load: loadConfig } = useConfig();
const { remove: removeHistoryEntry } = useHistory();

const FFTA_RULESETS: Ruleset[] = ["nature", "campagne", "3d"];
const FFTL_RULESETS: Ruleset[] = ["3d2", "3dh", "ar", "field"];

const loading = ref(true);
const starting = ref(false);
const resumeEntry = ref<HistoryEntryRecord | null>(null);
const showStats = ref(false);

function nowDate() {
  return new Date().toISOString().slice(0, 10);
}
function nowTime() {
  return new Date().toISOString().slice(11, 16);
}

const form = ref<SoloSetupValues>({
  ruleset: "nature",
  scoringMode: "team",
  weapon: getWeaponsForRuleset("nature")[0] ?? "",
  lieu: "",
  sessionDate: nowDate(),
  sessionTime: nowTime(),
  contestIdentifier: "",
  useTargetGroups: true,
  soloSessionType: "training",
  timerMode: "none",
  showScores: true,
  successZone: 1,
  targetCount: getTargetCountForRuleset("nature"),
});

onMounted(async () => {
  await loadConfig();
  const entry = await session.resumeIfIncomplete();
  if (entry) {
    resumeEntry.value = entry;
    form.value = session.applyIncompleteSessionToSetup(entry);
  }
  loading.value = false;
});

watch(
  () => form.value.ruleset,
  (ruleset) => {
    form.value.targetCount = getTargetCountForRuleset(ruleset);
    if (!isScoringModeAllowedForRuleset(form.value.scoringMode, ruleset)) {
      form.value.scoringMode = normalizeScoringMode(
        form.value.scoringMode,
        ruleset,
      );
    }
    const weapons = getWeaponsForRuleset(ruleset);
    if (!weapons.includes(form.value.weapon))
      form.value.weapon = weapons[0] ?? "";
    if (!canUseTimerForSetup(form.value.scoringMode, ruleset))
      form.value.timerMode = "none";
    form.value.successZone = clampSuccessZoneForConfigForForm();
  },
);
watch(
  () => form.value.scoringMode,
  () => {
    if (!canUseTimerForSetup(form.value.scoringMode, form.value.ruleset))
      form.value.timerMode = "none";
    form.value.successZone = clampSuccessZoneForConfigForForm();
  },
);

function clampSuccessZoneForConfigForForm(): number {
  const scoringMode = normalizeScoringMode(
    form.value.scoringMode,
    form.value.ruleset,
  );
  const arrowsPerVolley = getArrowsPerVolley(form.value.ruleset, scoringMode);
  const allowedPoints = presets[form.value.ruleset] ?? presets.nature;
  return clampSuccessZoneForConfig(
    form.value.successZone,
    form.value.ruleset,
    scoringMode,
    arrowsPerVolley,
    allowedPoints,
  );
}

const canUseTimer = computed(() =>
  canUseTimerForSetup(form.value.scoringMode, form.value.ruleset),
);
const tiringMax = computed(() =>
  getSoloBeepsMaxTiringSecondsByRuleset(form.value.ruleset),
);

const soloBeepsPreparation = computed({
  get: () => config.value.soloBeeps?.preparationSeconds ?? 5,
  set: (value: number) => {
    config.value = {
      ...config.value,
      soloBeeps: {
        preparationSeconds: value,
        tiringSecondsByRuleset:
          config.value.soloBeeps?.tiringSecondsByRuleset ?? {},
      },
    };
  },
});
const soloBeepsTiring = computed({
  get: () =>
    config.value.soloBeeps?.tiringSecondsByRuleset?.[form.value.ruleset] ??
    getSoloBeepsDefaultTiringSecondsByRuleset(form.value.ruleset),
  set: (value: number) => {
    config.value = {
      ...config.value,
      soloBeeps: {
        preparationSeconds: config.value.soloBeeps?.preparationSeconds ?? 5,
        tiringSecondsByRuleset: {
          ...(config.value.soloBeeps?.tiringSecondsByRuleset ?? {}),
          [form.value.ruleset]: value,
        },
      },
    };
  },
});

async function handleStart() {
  if (!Number.isInteger(form.value.successZone) || form.value.successZone < 1) {
    showFlash("Entrez une zone de réussite valide (minimum 1).");
    return;
  }
  starting.value = true;
  try {
    if (resumeEntry.value) {
      session.restoreIncompleteSession(resumeEntry.value);
    } else {
      session.startScoring(form.value);
    }
    resumeEntry.value = null;
  } finally {
    starting.value = false;
  }
}

async function handleDeleteIncomplete() {
  if (!resumeEntry.value?.archivedAt) return;
  const confirmed = await confirmAction(
    "Supprimer la session non terminée ?",
    "Supprimer",
  );
  if (!confirmed) return;
  await removeHistoryEntry(resumeEntry.value.archivedAt);
  resumeEntry.value = null;
  showFlash("Session supprimée.");
}

function closeScoring() {
  timer.stop();
  navigateTo("/");
}

// Points pad
const pointButtons = computed(() => session.selectablePoints.value);
function isZero(score: number) {
  return score === 0;
}
function isFieldX(score: number) {
  return score === FIELD_X;
}
async function onPointClick(score: number) {
  await session.registerScore(score);
}

// Live volley history (newest first)
const orderedVolleys = computed(() =>
  [...session.state.value.volleys].reverse(),
);
function pillClass(arrows: (number | null)[], total: number) {
  return getVolleyPillClass(arrows, total, session.maxVolley.value);
}
async function onDeleteVolley(index: number) {
  const confirmed = await confirmAction(
    "Confirmer la suppression de cette volée ?",
    "Supprimer",
  );
  if (!confirmed) return;
  await session.deleteVolleyAt(index);
}
function onEditVolley(index: number) {
  session.editVolleyAt(index);
  showFlash(`Modification volée ${index + 1} : la ligne sera remplacée.`);
}

const currentShootPills = computed(() => {
  const arr = Array(session.state.value.arrowsPerVolley)
    .fill(null)
    .map((_, i) => session.state.value.currentShoot[i] ?? null);
  return arr;
});
function pillScoreClass(value: number | null): string {
  if (value === null) return "is-empty";
  if (value === 0) return "is-miss";
  if (value === FIELD_X) return "is-x";
  return "is-hit";
}

const globalTotal = computed(() => session.totalScore.value);
const targetLabel = computed(() => {
  const shootNumber = session.state.value.volleys.length + 1;
  const current = Math.min(shootNumber, session.state.value.targetCount);
  return `${current}/${session.state.value.targetCount}`;
});

async function stepBack() {
  session.stepBackOneArrow();
}

// Timer: start a prep->shoot cycle whenever a new arrow is awaited.
const arrowCursor = computed(
  () =>
    `${session.state.value.volleys.length}-${session.state.value.currentArrowIndex}`,
);
watch(arrowCursor, () => {
  if (session.state.value.phase !== "scoring") return;
  if (session.state.value.timerMode === "none") return;
  if (session.isComplete.value) return;
  if (session.state.value.inputLocked) return;
  timer.startCycle(
    session.state.value.timerMode,
    session.state.value.ruleset,
    config.value.soloBeeps?.preparationSeconds ?? 5,
    config.value.soloBeeps?.tiringSecondsByRuleset?.[
      session.state.value.ruleset
    ] ?? getSoloBeepsDefaultTiringSecondsByRuleset(session.state.value.ruleset),
  );
});

onBeforeUnmount(() => timer.stop());
</script>

<template>
  <main class="app">
    <p v-if="loading">Chargement…</p>

    <section v-else-if="session.state.value.phase === 'setup'" class="card">
      <div class="setup-head">
        <h2 class="modal-title-with-icon">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M12 12c2.76 0 5-2.24 5-5S14.76 2 12 2 7 4.24 7 7s2.24 5 5 5Zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5Z"
              fill="currentColor"
            />
          </svg>
          <span>Mode Solo</span>
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

      <div class="grid-two">
        <label>
          <span class="label-inline"
            >Parcours
            <span class="inline-meta">{{ form.targetCount }} cibles</span></span
          >
          <select v-model="form.ruleset">
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
        <div class="session-datetime-row">
          <label>
            <span class="label-inline">Date de la session</span>
            <input v-model="form.sessionDate" type="date" />
          </label>
          <label>
            <span class="label-inline">Heure de la session</span>
            <input v-model="form.sessionTime" type="time" />
          </label>
        </div>
        <div class="solo-session-type-inline yes-no-fieldset">
          <span class="label-inline">Type de session</span>
          <div
            class="yes-no-switch session-type-switch"
            role="radiogroup"
            aria-label="Type de session solo"
          >
            <label class="switch-option">
              <input
                v-model="form.soloSessionType"
                type="radio"
                value="training"
              />
              <span>Entraînement</span>
            </label>
            <label class="switch-option">
              <input
                v-model="form.soloSessionType"
                type="radio"
                value="contest"
              />
              <span>Concours</span>
            </label>
          </div>
        </div>
        <fieldset class="mode-fieldset">
          <legend class="label-inline">Mode de saisie</legend>
          <div
            class="yes-no-switch mode-switch"
            role="radiogroup"
            aria-label="Mode de saisie"
          >
            <label class="mode-option switch-option">
              <input
                v-model="form.scoringMode"
                type="radio"
                value="individual"
              />
              <span>Individuel</span>
            </label>
            <label
              v-if="isScoringModeAllowedForRuleset('team', form.ruleset)"
              class="mode-option switch-option"
            >
              <input v-model="form.scoringMode" type="radio" value="team" />
              <span>Équipe</span>
            </label>
            <label
              v-if="isScoringModeAllowedForRuleset('mixed', form.ruleset)"
              class="mode-option switch-option"
            >
              <input v-model="form.scoringMode" type="radio" value="mixed" />
              <span>Mixte</span>
            </label>
          </div>
        </fieldset>
        <label v-if="form.scoringMode !== 'team'">
          <span class="label-inline">Type d'arme</span>
          <select v-model="form.weapon">
            <option
              v-for="code in getWeaponsForRuleset(form.ruleset)"
              :key="code"
              :value="code"
            >
              {{ code }} - {{ formatWeaponLabel(code) }}
            </option>
          </select>
        </label>
      </div>

      <details class="solo-options-panel">
        <summary>Plus d'options</summary>
        <div class="solo-options-panel-body">
          <label>
            Zone de réussite (pts / volée)
            <div class="slider-row">
              <input
                v-model.number="form.successZone"
                type="range"
                min="1"
                max="120"
                step="1"
              />
              <strong>{{ form.successZone }}</strong>
            </div>
          </label>
          <label v-if="form.soloSessionType === 'contest'">
            <span class="label-inline">Identifiant concours</span>
            <input
              v-model="form.contestIdentifier"
              type="text"
              placeholder="UUID ou code concours"
              autocomplete="off"
              maxlength="40"
            />
          </label>
          <label>
            Lieu
            <input
              v-model="form.lieu"
              type="text"
              placeholder="Ex : Forêt de Rambouillet"
              autocomplete="off"
              maxlength="30"
            />
          </label>
          <div class="setup-options-row">
            <fieldset class="use-target-groups-fieldset yes-no-fieldset">
              <legend>Catégories de cibles</legend>
              <div
                class="yes-no-switch"
                role="radiogroup"
                aria-label="Catégories de cibles"
              >
                <label class="switch-option">
                  <input
                    v-model="form.useTargetGroups"
                    type="radio"
                    :value="true"
                  />
                  <span>Oui</span>
                </label>
                <label class="switch-option">
                  <input
                    v-model="form.useTargetGroups"
                    type="radio"
                    :value="false"
                  />
                  <span>Non</span>
                </label>
              </div>
            </fieldset>
            <fieldset class="show-scores-fieldset yes-no-fieldset">
              <legend>Afficher des scores</legend>
              <div
                class="yes-no-switch"
                role="radiogroup"
                aria-label="Afficher des scores"
              >
                <label class="switch-option">
                  <input v-model="form.showScores" type="radio" :value="true" />
                  <span>Oui</span>
                </label>
                <label class="switch-option">
                  <input
                    v-model="form.showScores"
                    type="radio"
                    :value="false"
                  />
                  <span>Non</span>
                </label>
              </div>
            </fieldset>
            <fieldset
              v-if="canUseTimer"
              class="use-timer-fieldset yes-no-fieldset"
            >
              <legend>Timer</legend>
              <div
                class="yes-no-switch timer-mode-switch"
                role="radiogroup"
                aria-label="Mode de timer"
              >
                <label class="switch-option">
                  <input v-model="form.timerMode" type="radio" value="none" />
                  <span>Aucun</span>
                </label>
                <label class="switch-option">
                  <input v-model="form.timerMode" type="radio" value="beeps" />
                  <span>Beeps</span>
                </label>
                <label class="switch-option">
                  <input v-model="form.timerMode" type="radio" value="hold" />
                  <span>Tps tenue</span>
                </label>
              </div>
            </fieldset>
          </div>
          <div
            v-if="canUseTimer && form.timerMode !== 'none'"
            class="solo-beeps-settings"
          >
            <label>
              <span class="label-inline"
                >Temps de préparation
                <span class="label-optional"
                  >max {{ SOLO_BEEPS_PREPARATION_MAX_SECONDS }}s</span
                ></span
              >
              <div class="slider-row">
                <input
                  v-model.number="soloBeepsPreparation"
                  type="range"
                  min="0"
                  :max="SOLO_BEEPS_PREPARATION_MAX_SECONDS"
                  step="1"
                />
                <strong>{{ soloBeepsPreparation }}s</strong>
              </div>
            </label>
            <label>
              <span class="label-inline"
                >Temps de tir
                <span class="label-optional">max {{ tiringMax }}s</span></span
              >
              <div class="slider-row">
                <input
                  v-model.number="soloBeepsTiring"
                  type="range"
                  min="5"
                  :max="tiringMax"
                  step="1"
                />
                <strong>{{ soloBeepsTiring }}s</strong>
              </div>
            </label>
          </div>
        </div>
      </details>

      <div class="start-action">
        <button
          class="btn btn-primary btn-icon start-btn"
          :disabled="starting"
          @click="handleStart"
        >
          {{ resumeEntry ? "Reprendre" : "Démarrer" }}
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M8 5v14l11-7L8 5Z" fill="currentColor" />
          </svg>
        </button>
        <button
          v-if="resumeEntry"
          class="btn btn-primary btn-icon start-btn start-reset-btn"
          aria-label="Supprimer la session non terminée"
          @click="handleDeleteIncomplete"
        >
          Supprimer
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h2v9H7V9Zm4 0h2v9h-2V9Zm4 0h2v9h-2V9ZM6 7h12l-1 14H7L6 7Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>
    </section>

    <section v-else class="card">
      <div class="scoring-head modal-head">
        <div>
          <h2 class="volley-title-row modal-title-with-icon">
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
              class="volley-user-icon"
            >
              <path
                d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.314 0-6 2.015-6 4.5V20h12v-1.5C18 16.015 15.314 14 12 14Z"
                fill="currentColor"
              />
            </svg>
            <div class="volley-title-content">
              <span>{{ formatRulesetLabel(session.state.value.ruleset) }}</span>
              <span class="volley-weapon-title">{{
                session.state.value.weapon
                  ? formatWeaponLabel(session.state.value.weapon)
                  : ""
              }}</span>
            </div>
          </h2>
          <p v-if="session.state.value.editingVolleyIndex !== null">
            Modification de la volée
            {{ session.state.value.editingVolleyIndex + 1 }}
          </p>
          <p
            v-if="session.state.value.contestMode"
            class="contest-scoring-badge"
          >
            Concours : {{ session.state.value.contestInfo?.name }}
            <NuxtLink to="/concours">Voir le concours</NuxtLink>
          </p>
        </div>
        <div class="head-actions">
          <button
            class="btn btn-icon"
            aria-label="Fermer"
            @click="closeScoring"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
      </div>

      <div class="quick-stats">
        <article>
          <span>Cibles</span>
          <strong>{{ targetLabel }}</strong>
        </article>
        <article>
          <span>Score</span>
          <strong>{{ globalTotal }}<span class="stats-unit">pts</span></strong>
        </article>
        <article>
          <span>Zone de réussite</span>
          <strong
            >{{ session.state.value.successZone
            }}<span class="stats-unit">pts</span></strong
          >
        </article>
      </div>

      <div
        v-if="timer.phase.value !== 'idle'"
        class="quick-stats segment-stats"
      >
        <article>
          <span>{{
            timer.phase.value === "preparation"
              ? "Préparation"
              : timer.phase.value === "shooting"
                ? "Tir"
                : "Terminé"
          }}</span>
          <strong>{{ timer.remainingSeconds.value }}s</strong>
        </article>
      </div>

      <div class="score-entry-sticky">
        <div class="current-shoot-display">
          <span
            v-for="(value, i) in currentShootPills"
            :key="i"
            class="current-shoot-pill"
            :class="pillScoreClass(value)"
            >{{ formatScore(value) }}</span
          >
        </div>
        <div
          v-if="session.useTargetGroupsForScoring.value"
          class="score-actions-row"
        >
          <div
            class="target-group-radios"
            role="radiogroup"
            aria-label="catégorie de cible"
          >
            <label
              v-for="group in session.groupOptions.value"
              :key="group"
              class="target-group-radio"
              :class="{ active: session.state.value.selectedGroup === group }"
            >
              <input
                type="radio"
                name="target-group"
                :value="group"
                :checked="session.state.value.selectedGroup === group"
                @change="session.selectGroup(group)"
              />
              <span>{{ group }}</span>
            </label>
          </div>
        </div>
        <div class="points-pad-container">
          <div class="points-pad">
            <button
              v-for="score in pointButtons"
              :key="score"
              class="point-btn"
              :class="{ zero: isZero(score), 'x-score': isFieldX(score) }"
              :disabled="session.state.value.inputLocked"
              @click="onPointClick(score)"
            >
              {{ formatScore(score) }}
            </button>
          </div>
          <button
            class="btn btn-light btn-icon back-btn"
            aria-label="Effacer la dernière flèche"
            @click="stepBack"
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

      <h3>Historique des volées</h3>
      <div class="table-wrap">
        <table class="history-table">
          <thead>
            <tr>
              <th>Volée</th>
              <th>Flèches</th>
              <th v-if="session.useTargetGroupsForScoring.value">Groupe</th>
              <th>Total</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="volley in orderedVolleys"
              :key="volley.index"
              @dblclick="onEditVolley(volley.index)"
            >
              <td>
                <span
                  class="volley-pill"
                  :class="pillClass(volley.arrows, volley.total)"
                  >{{ volley.index + 1 }}</span
                >
              </td>
              <td>
                {{
                  volley.arrows
                    .map((v: number | null) => formatScore(v))
                    .join(" / ")
                }}
              </td>
              <td v-if="session.useTargetGroupsForScoring.value">
                {{ volley.group || "-" }}
              </td>
              <td
                class="history-total"
                :class="{
                  success: volley.total >= session.state.value.successZone,
                }"
              >
                {{ volley.total }}
              </td>
              <td>
                <button
                  class="btn btn-danger btn-icon row-delete-btn"
                  :aria-label="`Supprimer la volée ${volley.index + 1}`"
                  @click="onDeleteVolley(volley.index)"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path
                      d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h2v9H7V9Zm4 0h2v9h-2V9Zm4 0h2v9h-2V9ZM6 7h12l-1 14H7L6 7Z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="session.isComplete.value" class="actions action-icons">
        <button
          class="btn btn-light btn-icon home-btn"
          aria-label="Statistiques"
          @click="showStats = true"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M4 20h16v2H4v-2Zm1-2V9h3v9H5Zm5 0V5h3v13h-3Zm5 0v-7h3v7h-3Z"
              fill="currentColor"
            />
          </svg>
        </button>
        <button class="btn btn-light" aria-label="Fermer" @click="closeScoring">
          Fermer
        </button>
      </div>
    </section>

    <SoloStatsModal
      v-if="showStats"
      :payload="session.buildResultsPayload()"
      @close="showStats = false"
      @save-comments="
        (text: string) => {
          session.setProgressionAxis(text);
          showFlash('Enregistré ✓');
        }
      "
    />
  </main>
</template>
