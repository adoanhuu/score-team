<script setup lang="ts">
import {
  formatRulesetLabel,
  formatScore,
  FIELD_X,
  type Ruleset,
} from "~/utils/scoring-format";
import {
  getVolleyPillClass,
  getWeaponsForRuleset,
  formatWeaponLabel,
} from "~/utils/scoring-engine";
import {
  getDuelBotLevelInfo,
  getDuelBotSliderColor,
  getDuelVolleyPillClass,
} from "~/utils/multi-engine";

const duel = useDuelSession();
const peloton = usePelotonSession();
const contest = useContest();
const { isAuthenticated } = useAuth();
const { showFlash } = useFlash();

const FFTA_RULESETS: Ruleset[] = ["nature", "campagne", "3d"];
const FFTL_RULESETS: Ruleset[] = ["3d2", "3dh", "ar", "field"];

type MultiMode = "duel" | "peloton" | "contest";

const mode = ref<MultiMode>("peloton");
const ruleset = ref<Ruleset>("3d");
const targetCount = ref<4 | 6>(4);
const ludicMode = ref(false);

// Concours (contest) setup
const contestCode = ref("");
const contestWeapon = ref(getWeaponsForRuleset(ruleset.value)[0] ?? "");
const contestError = ref("");
const contestConnecting = ref(false);

watch(ruleset, (newRuleset) => {
  const weapons = getWeaponsForRuleset(newRuleset);
  if (!weapons.includes(contestWeapon.value))
    contestWeapon.value = weapons[0] ?? "";
});

// Duel setup
const duelNameP1 = ref("");
const duelNameP2 = ref("");
const duelBotMode = ref(false);
const duelBotLevel = ref(3);
const duelHandicap = ref(0);
const duelNamesError = ref(false);

// Peloton setup
const pelotonNames = ref<string[]>(["", "", "", "", "", ""]);
const pelotonNamesError = ref(false);

const phase = computed<"setup" | "duel" | "peloton">(() => {
  if (duel.state.value.phase === "scoring") return "duel";
  if (peloton.state.value.phase === "scoring") return "peloton";
  return "setup";
});

onBeforeUnmount(() => {
  duel.stopAllTimers();
});

function isPaquito(name: string) {
  return name.trim().toLowerCase() === "paquito";
}

const botLevelInfo = computed(() => getDuelBotLevelInfo(duelBotLevel.value));
const botSliderColor = computed(() =>
  getDuelBotSliderColor(duelBotLevel.value),
);
const handicapDisabled = computed(
  () => duelBotMode.value || isPaquito(duelNameP2.value),
);

function startDuel() {
  const nameP1 = duelNameP1.value.trim();
  const nameP2 = duelBotMode.value ? "Paquito" : duelNameP2.value.trim();
  if (!nameP1 || !nameP2) {
    duelNamesError.value = true;
    return;
  }
  duelNamesError.value = false;
  duel.configure({
    ruleset: ruleset.value,
    targetCount: targetCount.value,
    handicap: handicapDisabled.value ? 0 : duelHandicap.value,
    nameP1,
    nameP2,
    botMode: duelBotMode.value,
    botLevel: duelBotLevel.value,
  });
}

function startPeloton() {
  const archers = pelotonNames.value
    .map((name, i) => ({ index: i + 1, name: name.trim().slice(0, 10) }))
    .filter((a) => a.name.length > 0);
  if (archers.length === 0) {
    pelotonNamesError.value = true;
    return;
  }
  pelotonNamesError.value = false;
  peloton.configure({
    ruleset: ruleset.value,
    ludicMode: ludicMode.value,
    archers,
  });
}

async function startContest() {
  const code = contestCode.value.trim();
  if (!code) {
    contestError.value = "Merci de renseigner le code du concours.";
    return;
  }
  contestConnecting.value = true;
  contestError.value = "";
  const info = await contest.connect(code, ruleset.value);
  contestConnecting.value = false;
  if (!info) {
    contestError.value =
      contest.error.value || "Aucun concours ne correspond à ce code.";
    return;
  }
  contest.configureAndStartSoloSession(info, contestWeapon.value);
  navigateTo("/mode-solo");
}

function closeMulti() {
  duel.reset();
  peloton.reset();
  navigateTo("/");
}

/* ---------------- Duel scoring view ---------------- */

function isZero(score: number) {
  return score === 0;
}
function isFieldX(score: number) {
  return score === FIELD_X;
}
function pillScoreClass(value: number | null): string {
  if (value === null) return "is-empty";
  if (value === 0) return "is-miss";
  if (value === FIELD_X) return "is-x";
  return "is-hit";
}
const duelCurrentPills = computed(() => {
  const arr = Array(duel.state.value.arrowsPerTarget)
    .fill(null)
    .map((_, i) => duel.currentArrows.value[i] ?? null);
  return arr;
});
function onDuelPointClick(score: number) {
  duel.registerScore(score);
}
function duelHistoryRows(
  scoresByTarget: (number | null)[][],
  opponentScoresByTarget: (number | null)[][],
) {
  return scoresByTarget
    .map((arrows, index) => ({ arrows, index }))
    .filter(({ arrows }) => arrows.some((v) => v !== null && v !== undefined))
    .reverse()
    .map(({ arrows, index }) => {
      const sorted = [...arrows].sort((a, b) => {
        const av = a === null || a === undefined ? -1 : a;
        const bv = b === null || b === undefined ? -1 : b;
        return bv - av;
      });
      const total = arrows.reduce((sum: number, v) => sum + (v ?? 0), 0);
      const opponentArrows = opponentScoresByTarget[index] ?? null;
      const cls = getDuelVolleyPillClass(arrows, opponentArrows, {
        maxVolleyTotal: duel.maxVolleyTotal.value,
        highlightBestScore: true,
      });
      return {
        index,
        arrowsText: sorted.map((v) => formatScore(v)).join(" / "),
        total,
        cls,
      };
    });
}
const duelHistoryP1 = computed(() =>
  duelHistoryRows(duel.state.value.scoresP1, duel.state.value.scoresP2),
);
const duelHistoryP2 = computed(() =>
  duelHistoryRows(duel.state.value.scoresP2, duel.state.value.scoresP1),
);

/* ---------------- Peloton scoring view ---------------- */

function onPelotonPointClick(score: number) {
  peloton.registerScore(score);
}
const pelotonCurrentPills = computed(() => {
  const archer = peloton.activeArcher.value;
  if (!archer) return [];
  return Array(peloton.state.value.arrowsPerTarget)
    .fill(null)
    .map((_, i) => archer.scores[archer.currentTargetIndex]?.[i] ?? null);
});
const pelotonHistoryRows = computed(() => {
  const archer = peloton.activeArcher.value;
  if (!archer) return [];
  return archer.scores
    .map((arrows, index) => ({ arrows, index }))
    .filter(({ arrows }) => arrows.some((v) => v !== null && v !== undefined))
    .reverse()
    .map(({ arrows, index }) => {
      const sorted = [...arrows].sort((a, b) => {
        const av = a === null || a === undefined ? -1 : a;
        const bv = b === null || b === undefined ? -1 : b;
        return bv - av;
      });
      const total = arrows.reduce((sum: number, v) => sum + (v ?? 0), 0);
      const cls = getVolleyPillClass(
        arrows,
        total,
        peloton.maxVolleyTotal.value,
      );
      return {
        index,
        arrowsText: sorted.map((v) => formatScore(v)).join(" / "),
        total,
        cls,
      };
    });
});

function onSubmitExtraArrow(score: number) {
  peloton.submitExtraArrow(score);
}
</script>

<template>
  <main class="app">
    <!-- ===================== SETUP ===================== -->
    <section v-if="phase === 'setup'" class="card">
      <div class="setup-head">
        <h2 class="modal-title-with-icon">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3Zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3Zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5Zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5Z"
              fill="currentColor"
            />
          </svg>
          <span>Mode Multi</span>
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

      <fieldset class="mode-fieldset">
        <legend class="label-inline">Type de partie</legend>
        <div
          class="yes-no-switch mode-switch"
          role="radiogroup"
          aria-label="Type de partie multi"
        >
          <label class="mode-option switch-option">
            <input v-model="mode" type="radio" value="peloton" />
            <span>Peloton</span>
          </label>
          <label class="mode-option switch-option">
            <input v-model="mode" type="radio" value="duel" />
            <span>Duel</span>
          </label>
          <label v-if="isAuthenticated" class="mode-option switch-option">
            <input v-model="mode" type="radio" value="contest" />
            <span>Concours</span>
          </label>
        </div>
      </fieldset>

      <div class="grid-two">
        <label>
          <span class="label-inline">Parcours</span>
          <select v-model="ruleset">
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

        <fieldset v-if="mode === 'duel'" class="mode-fieldset">
          <legend class="label-inline">Nombre de cibles</legend>
          <div
            class="yes-no-switch"
            role="radiogroup"
            aria-label="Nombre de cibles"
          >
            <label class="switch-option">
              <input v-model.number="targetCount" type="radio" :value="4" />
              <span>4</span>
            </label>
            <label class="switch-option">
              <input v-model.number="targetCount" type="radio" :value="6" />
              <span>6</span>
            </label>
          </div>
        </fieldset>

        <div
          v-if="mode === 'peloton'"
          class="solo-session-type-inline yes-no-fieldset"
        >
          <span class="label-inline">Mode ludique</span>
          <div
            class="yes-no-switch"
            role="radiogroup"
            aria-label="Mode ludique peloton"
          >
            <label class="switch-option">
              <input v-model="ludicMode" type="radio" :value="true" />
              <span>Activé</span>
            </label>
            <label class="switch-option">
              <input v-model="ludicMode" type="radio" :value="false" />
              <span>Désactivé</span>
            </label>
          </div>
        </div>

        <label v-if="mode === 'contest'">
          <span class="label-inline">Type d'arme</span>
          <select v-model="contestWeapon">
            <option
              v-for="code in getWeaponsForRuleset(ruleset)"
              :key="code"
              :value="code"
            >
              {{ code }} - {{ formatWeaponLabel(code) }}
            </option>
          </select>
        </label>
      </div>

      <!-- Concours join code -->
      <div v-if="mode === 'contest'" class="duel-names-row">
        <label>
          <span class="label-inline">Code du concours</span>
          <input
            v-model="contestCode"
            type="text"
            placeholder="Code ou identifiant"
            autocomplete="off"
          />
        </label>
        <p v-if="contestError" class="duel-names-error">{{ contestError }}</p>
      </div>

      <!-- Duel names / bot / handicap -->
      <div v-if="mode === 'duel'" class="duel-names-row">
        <label>
          <span class="label-inline">Joueur 1</span>
          <input
            v-model="duelNameP1"
            type="text"
            maxlength="10"
            placeholder="Nom"
            autocomplete="off"
          />
        </label>
        <label v-if="!duelBotMode">
          <span class="label-inline">Joueur 2</span>
          <input
            v-model="duelNameP2"
            type="text"
            maxlength="10"
            placeholder="Nom"
            autocomplete="off"
          />
        </label>
        <label class="switch-option">
          <input v-model="duelBotMode" type="checkbox" />
          <span>Affronter Paquito (bot)</span>
        </label>
        <p v-if="duelNamesError" class="duel-names-error">
          Merci de renseigner les deux noms.
        </p>
      </div>

      <div
        v-if="mode === 'duel' && duelBotMode"
        id="duel-bot-row"
        class="visible"
      >
        <div id="duel-bot-main">
          <div id="duel-bot-left">
            <span id="duel-bot-badge">
              <img
                :src="`icons/icon-lvl-${botLevelInfo.avatarLevel}.png`"
                :alt="botLevelInfo.label"
                width="36"
                height="36"
              />
            </span>
          </div>
          <div id="duel-bot-right">
            <span id="duel-bot-headline"
              >Mode Bot activé : {{ botLevelInfo.label }}</span
            >
            <input
              id="duel-bot-level-slider"
              v-model.number="duelBotLevel"
              type="range"
              min="1"
              max="20"
              step="1"
              :style="{
                '--duel-bot-color': botSliderColor,
                '--duel-bot-progress': `${((duelBotLevel - 1) / 19) * 100}%`,
              }"
            />
          </div>
        </div>
      </div>

      <div
        v-if="mode === 'duel' && !handicapDisabled"
        class="duel-handicap-field"
      >
        <span class="label-inline">Handicap</span>
        <div class="duel-handicap-slider-row">
          <input
            v-model.number="duelHandicap"
            type="range"
            min="-50"
            max="50"
            step="1"
          />
          <strong class="duel-handicap-value">{{
            duel.handicapLabel.value
          }}</strong>
        </div>
        <p class="duel-handicap-hint">
          Négatif = avantage Joueur 1, positif = avantage Joueur 2.
        </p>
      </div>

      <!-- Peloton names -->
      <div v-if="mode === 'peloton'" class="peloton-names-row">
        <label v-for="i in 6" :key="i">
          <span class="label-inline">Archer {{ i }}</span>
          <input
            v-model="pelotonNames[i - 1]"
            type="text"
            maxlength="10"
            placeholder="Nom (optionnel)"
            autocomplete="off"
          />
        </label>
        <p v-if="pelotonNamesError" class="peloton-names-error">
          Renseignez au moins un nom d'archer.
        </p>
      </div>

      <div class="actions">
        <button
          v-if="mode === 'duel'"
          class="btn btn-primary"
          @click="startDuel"
        >
          Démarrer le duel
        </button>
        <button
          v-else-if="mode === 'contest'"
          class="btn btn-primary"
          :disabled="contestConnecting"
          @click="startContest"
        >
          {{ contestConnecting ? "Connexion..." : "Rejoindre le concours" }}
        </button>
        <button v-else class="btn btn-primary" @click="startPeloton">
          Démarrer le peloton
        </button>
      </div>
    </section>

    <!-- ===================== DUEL SCORING ===================== -->
    <section v-else-if="phase === 'duel'" class="card">
      <div class="setup-head">
        <h2 class="modal-title-with-icon">
          <span>Duel — {{ formatRulesetLabel(duel.state.value.ruleset) }}</span>
        </h2>
        <div class="setup-head-actions">
          <button class="btn btn-icon" aria-label="Fermer" @click="closeMulti">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
      </div>

      <div class="duel-meta-row">
        <span id="duel-target-counter">
          Cible
          {{
            duel.state.value.completed
              ? duel.state.value.targetCount
              : duel.state.value.currentTargetIndex + 1
          }}/{{ duel.state.value.targetCount }}
        </span>
      </div>

      <div class="duel-summary-row quick-stats-two quick-stats">
        <article
          id="duel-summary-card-p1"
          :class="{
            'is-active-archer':
              !duel.state.value.completed &&
              duel.state.value.activePlayer === 1,
            'is-winner-archer':
              duel.displayTotals.value.p1Total !==
                duel.displayTotals.value.p2Total &&
              duel.displayTotals.value.p1Total >
                duel.displayTotals.value.p2Total,
          }"
        >
          <span id="duel-p1-label">{{
            duel.state.value.nameP1 || "Joueur 1"
          }}</span>
          <strong id="duel-total-p1"
            >{{ duel.displayTotals.value.p1Total
            }}<span class="stats-unit">pts</span></strong
          >
        </article>
        <article
          id="duel-summary-card-p2"
          :class="{
            'is-active-archer':
              !duel.state.value.completed &&
              duel.state.value.activePlayer === 2,
            'is-winner-archer':
              duel.displayTotals.value.p1Total !==
                duel.displayTotals.value.p2Total &&
              duel.displayTotals.value.p2Total >
                duel.displayTotals.value.p1Total,
          }"
        >
          <span id="duel-p2-label">{{
            duel.state.value.nameP2 || "Joueur 2"
          }}</span>
          <strong id="duel-total-p2"
            >{{ duel.displayTotals.value.p2Total
            }}<span class="stats-unit">pts</span></strong
          >
        </article>
      </div>

      <p class="duel-current-row">
        {{
          duel.state.value.completed
            ? "Saisie terminée"
            : `Tour : ${duel.state.value.activePlayer === 1 ? duel.state.value.nameP1 || "Joueur 1" : duel.state.value.nameP2 || "Joueur 2"}`
        }}
      </p>

      <div class="score-entry-sticky">
        <div class="current-shoot-display">
          <span
            v-for="(value, i) in duelCurrentPills"
            :key="i"
            class="current-shoot-pill"
            :class="pillScoreClass(value)"
            >{{ formatScore(value) }}</span
          >
        </div>
        <div class="points-pad-container">
          <div class="points-pad">
            <button
              v-for="score in duel.selectablePoints.value"
              :key="score"
              class="point-btn"
              :class="{ zero: isZero(score), 'x-score': isFieldX(score) }"
              :disabled="duel.isLocked.value"
              @click="onDuelPointClick(score)"
            >
              {{ formatScore(score) }}
            </button>
          </div>
          <button
            class="btn btn-light btn-icon back-btn"
            aria-label="Effacer la dernière flèche"
            @click="duel.stepBack()"
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

      <div v-if="duel.state.value.completed" class="duel-restart-action">
        <button
          id="duel-restart-btn"
          class="btn btn-primary"
          @click="duel.restart()"
        >
          Nouveau duel
        </button>
      </div>

      <div class="duel-volley-history">
        <div>
          <h3>{{ duel.state.value.nameP1 || "Joueur 1" }}</h3>
          <div class="table-wrap duel-history-table-wrap">
            <table class="history-table duel-history-table">
              <tbody>
                <tr v-for="row in duelHistoryP1" :key="row.index">
                  <td>
                    <span class="volley-pill" :class="row.cls">{{
                      row.index + 1
                    }}</span>
                  </td>
                  <td>{{ row.arrowsText }}</td>
                  <td class="history-total">{{ row.total }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <h3>{{ duel.state.value.nameP2 || "Joueur 2" }}</h3>
          <div class="table-wrap duel-history-table-wrap">
            <table class="history-table duel-history-table">
              <tbody>
                <tr v-for="row in duelHistoryP2" :key="row.index">
                  <td>
                    <span class="volley-pill" :class="row.cls">{{
                      row.index + 1
                    }}</span>
                  </td>
                  <td>{{ row.arrowsText }}</td>
                  <td class="history-total">{{ row.total }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>

    <!-- ===================== PELOTON SCORING ===================== -->
    <section v-else class="card">
      <div class="setup-head">
        <h2 class="modal-title-with-icon">
          <span
            >Peloton —
            {{ formatRulesetLabel(peloton.state.value.ruleset) }}</span
          >
        </h2>
        <div class="setup-head-actions">
          <button class="btn btn-icon" aria-label="Fermer" @click="closeMulti">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
      </div>

      <div id="peloton-station-header">
        <span class="peloton-station-label"
          >Cible
          <span class="peloton-station-number">{{
            peloton.globalTargetIndex.value + 1
          }}</span></span
        >
        <span
          id="peloton-station-archer-name"
          class="peloton-station-archer-name"
          >{{ peloton.headerNames.value }}</span
        >
      </div>

      <div v-if="peloton.state.value.eventFlash" class="peloton-event-flash">
        <strong class="peloton-event-label">{{
          peloton.state.value.eventFlash.label
        }}</strong>
        <span class="peloton-event-detail">{{
          peloton.state.value.eventFlash.description
        }}</span>
      </div>

      <div class="peloton-archers-grid" role="list">
        <div
          v-for="archer in peloton.state.value.roster"
          :key="archer.index"
          class="peloton-archer-card"
          :class="{
            'is-active': archer.index === peloton.state.value.activeArcherIndex,
            'is-completed':
              peloton.state.value.byArcher[archer.index]?.completed,
            'is-best-total': peloton.leaderIndices.value.has(archer.index),
          }"
          role="listitem"
          tabindex="0"
          @click="peloton.selectArcher(archer.index, true)"
        >
          <span class="peloton-archer-card-name">{{ archer.name }}</span>
          <span class="peloton-archer-card-total"
            >{{ peloton.archerTotal(archer.index)
            }}<span class="stats-unit">pts</span></span
          >
        </div>
      </div>

      <p v-if="peloton.state.value.completed" class="duel-current-row">
        Saisie peloton terminée.
      </p>

      <template v-if="!peloton.state.value.extraArrow">
        <div class="score-entry-sticky">
          <div class="current-shoot-display">
            <span
              v-for="(value, i) in pelotonCurrentPills"
              :key="i"
              class="current-shoot-pill"
              :class="pillScoreClass(value)"
              >{{ formatScore(value) }}</span
            >
          </div>
          <div class="points-pad-container">
            <div class="points-pad">
              <button
                v-for="score in peloton.selectablePoints.value"
                :key="score"
                class="point-btn"
                :class="{ zero: isZero(score), 'x-score': isFieldX(score) }"
                :disabled="peloton.isLocked.value"
                @click="onPelotonPointClick(score)"
              >
                {{ formatScore(score) }}
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- Extra "bonus" arrow modal (ludic mode) -->
      <div v-else class="peloton-extra-arrow-modal-card">
        <p>
          Flèche bonus pour {{ peloton.state.value.extraArrow.archerName }} !
        </p>
        <div class="points-pad">
          <button
            v-for="score in peloton.extraArrowSelectablePoints.value"
            :key="score"
            class="point-btn"
            :class="{ zero: isZero(score), 'x-score': isFieldX(score) }"
            @click="onSubmitExtraArrow(score)"
          >
            {{ formatScore(score) }}
          </button>
        </div>
      </div>

      <h3>Historique — {{ peloton.activeArcher.value?.name }}</h3>
      <div class="table-wrap duel-history-table-wrap">
        <table class="history-table duel-history-table">
          <tbody>
            <tr v-for="row in pelotonHistoryRows" :key="row.index">
              <td>
                <span class="volley-pill" :class="row.cls">{{
                  row.index + 1
                }}</span>
              </td>
              <td>{{ row.arrowsText }}</td>
              <td class="history-total">{{ row.total }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</template>
