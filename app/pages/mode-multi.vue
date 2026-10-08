<script setup lang="ts">
import type { ComponentPublicInstance } from "vue";
import {
  formatRulesetLabel,
  formatRulesetOptionLabel,
  formatScore,
  FIELD_X,
  type Ruleset,
} from "~/utils/scoring-format";
import {
  getScoreRuleHint,
  getWeaponsForRuleset,
  formatWeaponLabel,
  scoreToValue,
} from "~/utils/scoring-engine";
import {
  formatDuelHandicapLabel,
  getDuelBotLevelInfo,
  getDuelBotSliderColor,
  getDuelTotal,
  getDuelVolleyPillClass,
  isPaquitoName,
  type MultiScore,
} from "~/utils/multi-engine";
import {
  getStoredContestUuid,
  getStoredContestWeapon,
  storeContestWeapon,
  type ContestConnectPayload,
} from "~/composables/useContest";

const duel = useDuelSession();
const peloton = usePelotonSession();
const contest = useContest();
const { isAuthenticated } = useAuth();
const { showFlash } = useFlash();
const { config, load: loadConfig } = useConfig();

const FFTA_RULESETS: Ruleset[] = ["nature", "campagne", "3d"];
const FFTL_RULESETS: Ruleset[] = ["3d2", "3dh", "ar", "field"];

function rangeProgress(value: number, min: number, max: number) {
  const span = max - min;
  const pct = span > 0 ? ((value - min) / span) * 100 : 0;
  return `${Math.min(100, Math.max(0, pct))}%`;
}

type MultiMode = "duel" | "peloton" | "contest";

/**
 * Setup form, kept in useState like the legacy #multi-modal DOM form whose
 * values survive closing/reopening (restartDuelSession() re-reads it).
 */
interface MultiSetupForm {
  mode: MultiMode;
  ruleset: Ruleset;
  targetCount: 4 | 6;
  ludicMode: boolean;
  contestCode: string;
  contestWeapon: string;
  duelNameP1: string;
  duelNameP2: string;
  duelBotLevel: number;
  duelHandicap: number;
  pelotonNames: string[];
}

const form = useState<MultiSetupForm>("multi-setup-form", () => ({
  mode: "peloton",
  ruleset: "3d",
  targetCount: 4,
  ludicMode: false,
  contestCode: "",
  contestWeapon: getWeaponsForRuleset("3d")[0] ?? "",
  duelNameP1: "",
  duelNameP2: "",
  duelBotLevel: 3,
  duelHandicap: 0,
  pelotonNames: ["", "", "", "", "", ""],
}));

/** prepareMultiModal(): every opening starts on the first available mode. */
function prepareMultiSetup() {
  form.value.mode = "peloton";
}
prepareMultiSetup();

const duelNamesError = ref(false);
const pelotonNamesError = ref(false);
const contestCodeVisible = ref(!getStoredContestUuid());
const contestConnecting = ref(false);
const setupCardRef = ref<HTMLElement | null>(null);
const contestCodeInputRef = ref<HTMLInputElement | null>(null);

const phase = computed<"setup" | "duel" | "peloton">(() => {
  if (duel.state.value.phase === "scoring") return "duel";
  if (peloton.state.value.phase === "scoring") return "peloton";
  return "setup";
});

onMounted(async () => {
  // Timers were stopped on unmount while the useState sessions survived:
  // finish interrupted previews and let Paquito resume if it is his turn.
  duel.resume();
  peloton.resume();
  syncContestWeapon(getStoredContestWeapon());
  await loadConfig();
});

/*
 * The score dock (.score-entry-sticky) is position: fixed; a spacer of the
 * same height after the scoring card lets the popin scroll past it so the
 * end of the history is never hidden behind it.
 */
const dockSpacerHeight = ref(0);
let dockResizeObserver: ResizeObserver | null = null;
let observedDock: HTMLElement | null = null;
function setScoreDockRef(el: Element | ComponentPublicInstance | null) {
  if (el === observedDock) return;
  observedDock = el instanceof HTMLElement ? el : null;
  dockResizeObserver?.disconnect();
  dockResizeObserver = null;
  if (!(el instanceof HTMLElement)) {
    dockSpacerHeight.value = 0;
    return;
  }
  dockResizeObserver = new ResizeObserver(() => {
    // Space taken from the dock's top edge to the bottom of the viewport
    // (dock height + its bottom offset).
    dockSpacerHeight.value = Math.ceil(
      window.innerHeight - el.getBoundingClientRect().top,
    );
  });
  dockResizeObserver.observe(el);
}

onBeforeUnmount(() => {
  duel.stopAllTimers();
  dockResizeObserver?.disconnect();
});

/* ---------------- Setup: course select (updateRulesetSelectOptions) ---------------- */

const enabledRulesets = computed<string[]>(
  () => config.value.enabledRulesets ?? [],
);
const fftaOptions = computed(() =>
  FFTA_RULESETS.filter((r) => enabledRulesets.value.includes(r)),
);
const fftlOptions = computed(() =>
  FFTL_RULESETS.filter((r) => enabledRulesets.value.includes(r)),
);

// Falls back to the first enabled ruleset when the current one is disabled.
watch(
  [enabledRulesets, () => form.value.ruleset],
  () => {
    if (enabledRulesets.value.includes(form.value.ruleset)) return;
    const firstEnabled = fftaOptions.value[0] ?? fftlOptions.value[0];
    if (firstEnabled) form.value.ruleset = firstEnabled;
  },
  { immediate: true },
);

/* ---------------- Setup: contest weapon (syncMultiContestWeaponSelectOptions) ---------------- */

const contestWeaponOptions = computed(() =>
  getWeaponsForRuleset(form.value.ruleset),
);

function syncContestWeapon(preferredWeapon: string | null = null) {
  const allowedWeapons = getWeaponsForRuleset(form.value.ruleset);
  const currentWeapon = preferredWeapon || form.value.contestWeapon;
  form.value.contestWeapon = allowedWeapons.includes(currentWeapon)
    ? currentWeapon
    : (allowedWeapons[0] ?? "");
}

watch(
  () => form.value.ruleset,
  () => syncContestWeapon(getStoredContestWeapon()),
);

function onContestWeaponChange() {
  storeContestWeapon(form.value.contestWeapon);
}

/* ---------------- Setup: mode switch ---------------- */

// updateMultiContestModeAvailability(): logging out while on "Concours" falls back to duel.
watch(isAuthenticated, (loggedIn) => {
  if (!loggedIn && form.value.mode === "contest") form.value.mode = "duel";
});

watch(
  () => form.value.mode,
  async (mode) => {
    duelNamesError.value = false;
    pelotonNamesError.value = false;
    if (mode === "duel" && isPaquito.value) handicapForcedToZero();
    if (mode === "contest") await applyContestMode();
  },
);

async function focusContestCode() {
  await nextTick();
  contestCodeInputRef.value?.focus();
}

/** Mirrors the "contest" branch of applyMultiModalMode() + the mode select change handler. */
async function applyContestMode() {
  syncContestWeapon(getStoredContestWeapon());
  if (getStoredContestUuid()) {
    contestCodeVisible.value = false;
    await startContestFromStoredUuidIfAvailable();
    return;
  }
  contestCodeVisible.value = true;
  await focusContestCode();
}

/* ---------------- Setup: duel / Paquito / handicap ---------------- */

const isPaquito = computed(() => isPaquitoName(form.value.duelNameP2));
const duelBotMode = computed(
  () => form.value.mode === "duel" && isPaquito.value,
);
const botLevelInfo = computed(() =>
  getDuelBotLevelInfo(form.value.duelBotLevel),
);
const botSliderColor = computed(() =>
  getDuelBotSliderColor(form.value.duelBotLevel),
);
// syncDuelHandicapAvailability(): hidden (and forced to 0) against Paquito or outside duel.
const handicapVisible = computed(
  () => form.value.mode === "duel" && !isPaquito.value,
);
const handicapLabel = computed(() =>
  formatDuelHandicapLabel(
    isPaquito.value ? 0 : form.value.duelHandicap,
    form.value.duelNameP1,
    form.value.duelNameP2,
  ),
);
// Hint row under the handicap slider: typed first names, else "Archer N".
const handicapHintP1 = computed(
  () => form.value.duelNameP1.trim() || "Archer 1",
);
const handicapHintP2 = computed(
  () => form.value.duelNameP2.trim() || "Archer 2",
);

function handicapForcedToZero() {
  form.value.duelHandicap = 0;
}

/** Mirrors the #duel-name-p2 input handler: typing "Paquito" turns the bot on (with a shake). */
function playPaquitoShake() {
  const card = setupCardRef.value;
  if (!card) return;
  card.classList.remove("paquito-shake");
  void card.offsetWidth; // reflow pour relancer l'animation
  card.classList.add("paquito-shake");
  window.setTimeout(() => card.classList.remove("paquito-shake"), 1000);
}

watch(isPaquito, (nowPaquito, wasPaquito) => {
  if (nowPaquito && !wasPaquito) {
    handicapForcedToZero();
    playPaquitoShake();
  } else if (!nowPaquito) {
    duel.clearBotTimer();
  }
});

function startDuel() {
  const nameP1 = form.value.duelNameP1.trim();
  const nameP2 = form.value.duelNameP2.trim();
  if (!nameP1 || !nameP2) {
    duelNamesError.value = true;
    return;
  }
  duelNamesError.value = false;
  duel.configure({
    ruleset: form.value.ruleset,
    targetCount: form.value.targetCount,
    handicap: isPaquito.value ? 0 : form.value.duelHandicap,
    nameP1,
    nameP2,
    botMode: isPaquito.value,
    botLevel: form.value.duelBotLevel,
  });
}

/** Mirrors restartDuelSession(): same names, config re-read from the setup form. */
function restartDuel() {
  const botMode = isPaquitoName(duel.state.value.nameP2);
  duel.restart({
    ruleset: form.value.ruleset,
    targetCount: form.value.targetCount,
    handicap: botMode ? 0 : form.value.duelHandicap,
    botMode,
    botLevel: form.value.duelBotLevel,
  });
}

/* ---------------- Setup: peloton ---------------- */

function startPeloton() {
  const archers = form.value.pelotonNames
    .map((name, i) => ({ index: i + 1, name: name.trim().slice(0, 10) }))
    .filter((a) => a.name.length > 0);
  if (archers.length === 0) {
    pelotonNamesError.value = true;
    return;
  }
  pelotonNamesError.value = false;
  peloton.configure({
    ruleset: form.value.ruleset,
    ludicMode: form.value.ludicMode,
    archers,
  });
}

/* ---------------- Setup: contest join ---------------- */

function launchContest(info: ContestConnectPayload): boolean {
  if (!contest.startContestScoring(info, form.value.contestWeapon)) return false;
  navigateTo("/mode-solo");
  return true;
}

/** Mirrors startContestFromStoredUuidIfAvailable(). */
async function startContestFromStoredUuidIfAvailable(): Promise<boolean> {
  const storedContestUuid = getStoredContestUuid();
  if (!storedContestUuid) return false;

  const ruleset = (form.value.ruleset || "").trim();
  if (!ruleset) {
    showFlash("Sélectionnez un type de parcours.");
    return false;
  }

  contestConnecting.value = true;
  const info = await contest.connect(storedContestUuid, ruleset);
  contestConnecting.value = false;

  if (!info) {
    contestCodeVisible.value = true;
    await focusContestCode();
    return false;
  }
  return launchContest(info);
}

/** Mirrors the #multi-start-btn "contest" branch. */
async function startContest() {
  const ruleset = (form.value.ruleset || "").trim();
  if (!ruleset) {
    showFlash("Sélectionnez un type de parcours.");
    return;
  }
  const code = form.value.contestCode.trim();
  if (!code) {
    if (await startContestFromStoredUuidIfAvailable()) return;
    showFlash("Saisissez un code concours.");
    contestCodeVisible.value = true;
    await focusContestCode();
    return;
  }

  contestConnecting.value = true;
  const info = await contest.connect(code, ruleset);
  contestConnecting.value = false;
  if (info) launchContest(info);
}

function closeMulti() {
  duel.reset();
  peloton.reset();
  navigateTo("/");
}

/* ---------------- Shared scoring helpers ---------------- */

function isZero(score: number) {
  return score === 0;
}
function isFieldX(score: number) {
  return score === FIELD_X;
}
/** Mirrors renderCurrentShootPills()'s pill classes. */
function pillScoreClass(value: number | null): string {
  if (value === null || value === undefined) return "is-empty";
  if (value === 0) return "is-miss";
  if (value === FIELD_X) return "is-x";
  return "is-hit";
}
function currentPills(arrows: MultiScore[], arrowCount: number) {
  return Array.from({ length: arrowCount }, (_, i) => arrows[i] ?? null);
}

interface HistoryRow {
  index: number;
  arrowsText: string;
  total: number;
  cls: string;
}

/** Mirrors renderDuelVolleyHistory(): rows with any score, arrows sorted desc (X = 5), totals via scoreToValue. */
function buildVolleyHistoryRows(
  scoresByTarget: MultiScore[][],
  opponentScoresByTarget: MultiScore[][] | null,
  options: {
    maxVolleyTotal: number;
    highlightBestScore?: boolean;
    reverseOrder?: boolean;
  },
): HistoryRow[] {
  const indexes = scoresByTarget.map((_, index) => index);
  if (options.reverseOrder) indexes.reverse();
  return indexes
    .filter((index) =>
      (scoresByTarget[index] ?? []).some((v) => v !== null && v !== undefined),
    )
    .map((index) => {
      const arrows = scoresByTarget[index] ?? [];
      const sorted = [...arrows].sort((a, b) => {
        const av = a === null || a === undefined ? -1 : scoreToValue(a);
        const bv = b === null || b === undefined ? -1 : scoreToValue(b);
        return bv - av;
      });
      const total = arrows.reduce(
        (sum: number, v) => sum + scoreToValue(v ?? null),
        0,
      );
      const cls = getDuelVolleyPillClass(
        arrows,
        opponentScoresByTarget?.[index] ?? null,
        {
          maxVolleyTotal: options.maxVolleyTotal,
          highlightBestScore: options.highlightBestScore === true,
        },
      );
      return {
        index,
        arrowsText: sorted.map((v) => formatScore(v)).join(" / "),
        total,
        cls,
      };
    });
}

/* ---------------- Duel scoring view ---------------- */

const duelCurrentPills = computed(() =>
  currentPills(duel.currentArrows.value, duel.state.value.arrowsPerTarget),
);
const duelPointsRuleHint = computed(() =>
  duel.state.value.completed
    ? getScoreRuleHint(duel.state.value.ruleset, "individual", 0)
    : getScoreRuleHint(
        duel.state.value.ruleset,
        "individual",
        duel.state.value.currentArrowIndex,
      ),
);
const duelHistoryP1 = computed(() =>
  buildVolleyHistoryRows(duel.state.value.scoresP1, duel.state.value.scoresP2, {
    maxVolleyTotal: duel.maxVolleyTotal.value,
    highlightBestScore: true,
  }),
);
const duelHistoryP2 = computed(() =>
  buildVolleyHistoryRows(duel.state.value.scoresP2, duel.state.value.scoresP1, {
    maxVolleyTotal: duel.maxVolleyTotal.value,
    highlightBestScore: true,
  }),
);
const duelBotTitle = computed(
  () =>
    duel.state.value.botMode || isPaquitoName(duel.state.value.nameP2),
);

/* ---------------- Peloton scoring view ---------------- */

const pelotonCurrentPills = computed(() => {
  const archer = peloton.activeArcher.value;
  const arrows =
    !archer || archer.completed
      ? []
      : (archer.scores[
          Math.max(
            0,
            Math.min(archer.currentTargetIndex, peloton.state.value.targetCount - 1),
          )
        ] ?? []);
  return currentPills(arrows, peloton.state.value.arrowsPerTarget);
});
const pelotonHistoryRows = computed(() => {
  const archer = peloton.activeArcher.value;
  if (!archer) return [];
  return buildVolleyHistoryRows(archer.scores, null, {
    maxVolleyTotal: peloton.maxVolleyTotal.value,
    reverseOrder: true,
  });
});

function onArcherCardKeydown(event: KeyboardEvent, index: number) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  peloton.selectArcher(index, true);
}

/* Peloton end-of-game history slider (renderPelotonHistorySwiper) */

const showPelotonHistorySwiper = computed(() =>
  Boolean(peloton.activeArcher.value?.completed),
);
const pelotonHistorySlides = computed(() => {
  const roster = peloton.state.value.roster;
  const slides: {
    label: string;
    archers: { index: number; name: string; total: number; rows: HistoryRow[] }[];
  }[] = [];
  for (let i = 0; i < roster.length; i += 2) {
    const pair = roster.slice(i, i + 2);
    slides.push({
      label: pair.map((a) => a.name).join(" / "),
      archers: pair.map((a) => {
        const scores = peloton.state.value.byArcher[a.index]?.scores ?? [];
        return {
          index: a.index,
          name: a.name,
          total: getDuelTotal(scores),
          rows: buildVolleyHistoryRows(scores, null, {
            maxVolleyTotal: peloton.maxVolleyTotal.value,
            reverseOrder: true,
          }),
        };
      }),
    });
  }
  return slides;
});
const pelotonHistoryTrackRef = ref<HTMLElement | null>(null);
const pelotonActiveSlideIndex = ref(0);
let pelotonHistoryRafId = 0;
let isSyncingHistoryScroll = false;

function scrollPelotonHistoryToSlide(index: number, behavior: ScrollBehavior) {
  const track = pelotonHistoryTrackRef.value;
  const count = pelotonHistorySlides.value.length;
  if (!track || count === 0) return;
  const boundedIndex = Math.max(0, Math.min(index, count - 1));
  const width = track.clientWidth || 1;
  track.scrollTo({ left: boundedIndex * width, behavior });
  pelotonActiveSlideIndex.value = boundedIndex;
}

function onPelotonHistoryTrackScroll() {
  if (pelotonHistoryRafId) return;
  pelotonHistoryRafId = window.requestAnimationFrame(() => {
    pelotonHistoryRafId = 0;
    const track = pelotonHistoryTrackRef.value;
    if (!track) return;
    const width = track.clientWidth || 1;
    const index = Math.round(track.scrollLeft / width);
    pelotonActiveSlideIndex.value = Math.max(
      0,
      Math.min(index, pelotonHistorySlides.value.length - 1),
    );
  });
}

/** Keeps every archer card of the slider at the same vertical scroll. */
function onPelotonHistoryCardScroll(event: Event) {
  if (isSyncingHistoryScroll) return;
  const card = event.currentTarget as HTMLElement;
  const track = pelotonHistoryTrackRef.value;
  if (!card || !track) return;
  isSyncingHistoryScroll = true;
  const nextScrollTop = card.scrollTop;
  track
    .querySelectorAll<HTMLElement>(".peloton-history-archer-card")
    .forEach((otherCard) => {
      if (otherCard === card) return;
      if (Math.abs(otherCard.scrollTop - nextScrollTop) > 1) {
        otherCard.scrollTop = nextScrollTop;
      }
    });
  isSyncingHistoryScroll = false;
}

// Opens on the active archer's pair.
watch(
  [showPelotonHistorySwiper, () => peloton.state.value.activeArcherIndex],
  async ([visible]) => {
    if (!visible) return;
    const roster = peloton.state.value.roster;
    const position = Math.max(
      0,
      roster.findIndex((a) => a.index === peloton.state.value.activeArcherIndex),
    );
    const initialSlideIndex = Math.floor(position / 2);
    pelotonActiveSlideIndex.value = initialSlideIndex;
    await nextTick();
    window.requestAnimationFrame(() =>
      scrollPelotonHistoryToSlide(initialSlideIndex, "auto"),
    );
  },
  { immediate: true },
);
</script>

<template>
  <main class="app">
    <!-- ===================== SETUP ===================== -->
    <section
      v-if="phase === 'setup'"
      id="multi-modal"
      ref="setupCardRef"
      class="card"
    >
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
            <input v-model="form.mode" type="radio" value="peloton" />
            <span>Peloton</span>
          </label>
          <label class="mode-option switch-option">
            <input v-model="form.mode" type="radio" value="duel" />
            <span>Duel</span>
          </label>
          <label v-if="isAuthenticated" class="mode-option switch-option">
            <input v-model="form.mode" type="radio" value="contest" />
            <span>Concours</span>
          </label>
        </div>
      </fieldset>

      <div class="grid-two">
        <label>
          <span class="label-inline">Type de parcours</span>
          <select v-model="form.ruleset">
            <optgroup v-if="fftaOptions.length" label="FFTA">
              <option v-for="r in fftaOptions" :key="r" :value="r">
                {{ formatRulesetOptionLabel(r) }}
              </option>
            </optgroup>
            <optgroup v-if="fftlOptions.length" label="FFTL">
              <option v-for="r in fftlOptions" :key="r" :value="r">
                {{ formatRulesetOptionLabel(r) }}
              </option>
            </optgroup>
          </select>
        </label>

        <fieldset v-if="form.mode === 'duel'" class="mode-fieldset">
          <legend class="label-inline">Nombre de cibles</legend>
          <div
            class="yes-no-switch"
            role="radiogroup"
            aria-label="Nombre de cibles"
          >
            <label class="switch-option">
              <input v-model.number="form.targetCount" type="radio" :value="4" />
              <span>4 cibles</span>
            </label>
            <label class="switch-option">
              <input v-model.number="form.targetCount" type="radio" :value="6" />
              <span>6 cibles</span>
            </label>
          </div>
        </fieldset>

        <div
          v-if="form.mode === 'peloton'"
          class="solo-session-type-inline yes-no-fieldset"
        >
          <span class="label-inline">Mode ludique</span>
          <div class="yes-no-switch" role="radiogroup" aria-label="Mode ludique">
            <label class="switch-option">
              <input v-model="form.ludicMode" type="radio" :value="true" />
              <span>Oui</span>
            </label>
            <label class="switch-option">
              <input v-model="form.ludicMode" type="radio" :value="false" />
              <span>Non</span>
            </label>
          </div>
        </div>

        <label v-if="form.mode === 'contest'">
          <span class="label-inline">Type d'arme</span>
          <select v-model="form.contestWeapon" @change="onContestWeaponChange">
            <option v-for="code in contestWeaponOptions" :key="code" :value="code">
              {{ code }} - {{ formatWeaponLabel(code) }}
            </option>
          </select>
        </label>
      </div>

      <!-- Concours join code (hidden while a stored contest UUID is tried) -->
      <div
        v-if="form.mode === 'contest' && contestCodeVisible"
        id="contest-code-container"
        class="duel-names-row"
      >
        <label>
          <span class="label-inline">Code du concours</span>
          <input
            id="contest-code-input"
            ref="contestCodeInputRef"
            v-model="form.contestCode"
            type="text"
            placeholder="Code concours"
            maxlength="40"
            autocomplete="off"
          />
        </label>
      </div>

      <!-- Duel names (player 2 "Paquito" = bot) -->
      <div v-if="form.mode === 'duel'" id="duel-names-container" class="duel-names-row">
        <label>
          <span class="label-inline">Archer 1</span>
          <input
            id="duel-name-p1"
            v-model="form.duelNameP1"
            type="text"
            maxlength="10"
            placeholder="Prénom A"
            autocomplete="off"
            required
          />
        </label>
        <label>
          <span class="label-inline">Archer 2</span>
          <input
            id="duel-name-p2"
            v-model="form.duelNameP2"
            type="text"
            maxlength="10"
            placeholder="Prénom B"
            autocomplete="off"
            required
          />
        </label>
      </div>

      <div v-if="duelBotMode" id="duel-bot-row" class="visible" aria-live="polite">
        <div id="duel-bot-slider-wrap">
          <div id="duel-bot-main">
            <div id="duel-bot-left">
              <div id="duel-bot-badge">
                <img
                  :src="`/icons/icon-lvl-${botLevelInfo.avatarLevel}.png`"
                  :alt="`Paquito ${botLevelInfo.label}`"
                  class="duel-bot-icon"
                />
              </div>
            </div>
            <div id="duel-bot-right">
              <input
                id="duel-bot-level-slider"
                v-model.number="form.duelBotLevel"
                type="range"
                min="1"
                max="20"
                step="1"
                aria-label="Niveau de tir de Paquito"
                :style="{
                  '--duel-bot-color': botSliderColor,
                  '--duel-bot-progress': `${((form.duelBotLevel - 1) / 19) * 100}%`,
                }"
              />
              <div id="duel-bot-headline">
                Mode Bot activé : {{ botLevelInfo.label }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="form.mode === 'duel' && duelNamesError"
        id="duel-names-error"
        class="duel-names-error"
        role="alert"
      >
        Veuillez renseigner les 2 noms d'archers
      </div>

      <label
        v-if="handicapVisible"
        id="duel-handicap-field"
        class="duel-handicap-field"
        for="duel-handicap-slider"
      >
        <div class="duel-handicap-head">
          <span class="label-inline">Handicap</span>
          <strong id="duel-handicap-value" class="duel-handicap-value">{{
            handicapLabel
          }}</strong>
        </div>
        <div class="duel-handicap-slider-row">
          <input
            id="duel-handicap-slider"
            v-model.number="form.duelHandicap"
            type="range"
            min="-50"
            max="50"
            step="5"
            aria-describedby="duel-handicap-hint"
            :style="{
              '--range-progress': rangeProgress(form.duelHandicap, -50, 50),
            }"
          />
        </div>
        <div id="duel-handicap-hint" class="duel-handicap-hint" aria-hidden="true">
          <span>{{ handicapHintP1 }}</span>
          <span>Neutre</span>
          <span>{{ handicapHintP2 }}</span>
        </div>
      </label>

      <!-- Peloton names -->
      <div v-if="form.mode === 'peloton'" id="peloton-names-container" class="peloton-names-row">
        <label v-for="i in 6" :key="i">
          <span class="label-inline">Archer {{ i }}</span>
          <input
            v-model="form.pelotonNames[i - 1]"
            type="text"
            maxlength="10"
            :placeholder="'Prénom ' + String.fromCharCode(64 + i)"
            autocomplete="off"
          />
        </label>
      </div>
      <div
        v-if="form.mode === 'peloton' && pelotonNamesError"
        id="peloton-names-error"
        class="peloton-names-error"
        role="alert"
      >
        Veuillez renseigner au moins un nom d'archer
      </div>

      <div class="actions">
        <button
          v-if="form.mode === 'duel'"
          class="btn btn-primary btn-icon start-btn"
          @click="startDuel"
        >
          Démarrer le duel
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M8 5v14l11-7L8 5Z" fill="currentColor" />
          </svg>
        </button>
        <button
          v-else-if="form.mode === 'contest'"
          class="btn btn-primary btn-icon start-btn"
          :disabled="contestConnecting"
          @click="startContest"
        >
          {{ contestConnecting ? "Connexion..." : "Rejoindre le concours" }}
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M8 5v14l11-7L8 5Z" fill="currentColor" />
          </svg>
        </button>
        <button
          v-else
          class="btn btn-primary btn-icon start-btn"
          @click="startPeloton"
        >
          Démarrer le peloton
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M8 5v14l11-7L8 5Z" fill="currentColor" />
          </svg>
        </button>
      </div>
    </section>

    <!-- ===================== DUEL SCORING ===================== -->
    <section v-else-if="phase === 'duel'" id="duel-modal" class="card">
      <div class="setup-head">
        <h2 id="duel-modal-title" class="modal-title-with-icon">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 1c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5ZM8 13c-2.67 0-8 1.34-8 4v2h7v-2.5c0-.95.37-1.81 1.05-2.56-.02-.3-.03-.6-.05-.94Z"
              fill="currentColor"
            />
          </svg>
          <span id="duel-modal-title-text"
            >Mode duel<template v-if="duelBotTitle">
              <img
                :src="`/icons/icon.png`"
                alt="Bot"
                class="duel-bot-icon duel-bot-title-icon"
            /></template>
            - {{ formatRulesetLabel(duel.state.value.ruleset) }}</span
          >
        </h2>
        <div class="setup-head-actions">
          <button
            id="duel-close-btn"
            class="btn btn-light btn-icon home-btn"
            aria-label="Fermer mode duel"
            @click="closeMulti"
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

      <div class="quick-stats quick-stats-two duel-current-row">
        <article
          v-for="(rows, playerIndex) in [duelHistoryP1, duelHistoryP2]"
          :id="`duel-current-card-p${playerIndex + 1}`"
          :key="playerIndex"
        >
          <div
            :id="`duel-history-p${playerIndex + 1}`"
            class="duel-volley-history"
          >
            <div v-if="rows.length === 0" class="duel-volley-empty">
              Aucune volée
            </div>
            <div v-else class="table-wrap duel-history-table-wrap">
              <table class="history-table duel-history-table">
                <tbody>
                  <tr v-for="row in rows" :key="row.index">
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
        </article>
      </div>

      <div
        id="duel-score-entry-panel"
        :ref="setScoreDockRef"
        class="score-entry-sticky"
      >
        <div id="duel-current-shoot-display" class="current-shoot-display">
          <span
            v-for="(value, i) in duelCurrentPills"
            :key="i"
            class="current-shoot-pill"
            :class="pillScoreClass(value)"
            >{{ formatScore(value) }}</span
          >
        </div>
        <div class="points-pad-container">
          <div id="duel-points-pad" class="points-pad">
            <button
              v-for="score in duel.selectablePoints.value"
              :key="score"
              class="point-btn"
              :class="{
                zero: isZero(score),
                'x-score': isFieldX(score),
                'lock-disabled': duel.isLocked.value,
              }"
              :disabled="duel.isLocked.value"
              @click="duel.registerScore(score)"
            >
              {{ formatScore(score) }}
            </button>
          </div>
          <button
            id="duel-step-back-btn"
            class="btn btn-light btn-icon back-btn"
            aria-label="Effacer la dernière saisie duel"
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
        <div
          id="duel-points-rule-hint"
          class="points-rule-hint"
          :class="{ hidden: !duelPointsRuleHint }"
          aria-live="polite"
        >
          {{ duelPointsRuleHint }}
        </div>
        <div v-if="duel.state.value.completed" class="duel-restart-action">
          <button
            id="duel-restart-btn"
            class="btn btn-primary start-btn"
            aria-label="Démarrer"
            @click="restartDuel"
          >
            Démarrer
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M8 5v14l11-7L8 5Z" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>
    </section>

    <!-- ===================== PELOTON SCORING ===================== -->
    <section v-else id="peloton-modal" class="card">
      <div class="setup-head">
        <h2 id="peloton-modal-title" class="modal-title-with-icon">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 1c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5ZM8 13c-2.67 0-8 1.34-8 4v2h7v-2.5c0-.95.37-1.81 1.05-2.56-.02-.3-.03-.6-.05-.94Z"
              fill="currentColor"
            />
          </svg>
          <span id="peloton-modal-title-text"
            >Mode peloton -
            {{ formatRulesetLabel(peloton.state.value.ruleset) }}</span
          >
        </h2>
        <div class="setup-head-actions">
          <button
            id="peloton-close-btn"
            class="btn btn-light btn-icon home-btn"
            aria-label="Fermer mode peloton"
            @click="closeMulti"
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

      <h4 id="peloton-station-header" class="peloton-station-header">
        <span class="peloton-station-label"
          >Cible n°<span
            id="peloton-station-number"
            class="peloton-station-number"
            >{{ peloton.globalTargetIndex.value + 1 }}</span
          ></span
        >
        <span
          id="peloton-station-archer-name"
          class="peloton-station-archer-name"
          >{{ peloton.headerNames.value }}</span
        >
      </h4>

      <div id="peloton-archers-grid" class="peloton-archers-grid" role="list">
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
          :aria-label="`Sélectionner ${archer.name} pour modifier le score`"
          @click="peloton.selectArcher(archer.index, true)"
          @keydown="onArcherCardKeydown($event, archer.index)"
        >
          <span class="peloton-archer-card-name">{{ archer.name }}</span>
          <span class="peloton-archer-card-total"
            >{{ peloton.archerTotal(archer.index)
            }}<span class="stats-unit">pts</span></span
          >
        </div>
      </div>

      <div
        v-if="peloton.state.value.eventFlash"
        id="peloton-event-flash"
        class="peloton-event-flash"
        role="status"
        aria-live="polite"
      >
        <strong class="peloton-event-label">{{
          peloton.state.value.eventFlash.label
        }}</strong>
        <span class="peloton-event-detail">{{
          peloton.state.value.eventFlash.description
        }}</span>
      </div>

      <div class="quick-stats duel-current-row">
        <article id="peloton-current-card">
          <div id="peloton-history" class="duel-volley-history">
            <!-- End of game: every archer's history, two per slide -->
            <div v-if="showPelotonHistorySwiper" class="peloton-history-swiper">
              <div
                ref="pelotonHistoryTrackRef"
                class="peloton-history-track"
                aria-label="Historique par archer"
                @scroll.passive="onPelotonHistoryTrackScroll"
              >
                <section
                  v-for="(slide, slideIndex) in pelotonHistorySlides"
                  :key="slideIndex"
                  class="peloton-history-slide"
                  :class="{ 'is-active': slideIndex === pelotonActiveSlideIndex }"
                  :data-slide-index="slideIndex"
                  :aria-label="`Historique ${slide.label}`"
                >
                  <article
                    v-for="archer in slide.archers"
                    :key="archer.index"
                    class="peloton-history-archer-card"
                    @scroll.passive="onPelotonHistoryCardScroll"
                  >
                    <header class="peloton-history-slide-head">
                      <strong class="peloton-history-slide-name">{{
                        archer.name
                      }}</strong>
                      <span class="peloton-history-slide-total"
                        >{{ archer.total
                        }}<span class="stats-unit">pts</span></span
                      >
                    </header>
                    <div
                      class="peloton-history-slide-body"
                      :data-archer-index="archer.index"
                    >
                      <div v-if="archer.rows.length === 0" class="duel-volley-empty">
                        Aucune volée
                      </div>
                      <div v-else class="table-wrap duel-history-table-wrap">
                        <table class="history-table duel-history-table">
                          <tbody>
                            <tr v-for="row in archer.rows" :key="row.index">
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
                  </article>
                </section>
              </div>
            </div>
            <div v-else-if="pelotonHistoryRows.length === 0" class="duel-volley-empty">
              Aucune volée
            </div>
            <div v-else class="table-wrap duel-history-table-wrap">
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
          </div>
        </article>
      </div>

      <div
        id="peloton-score-entry-panel"
        :ref="setScoreDockRef"
        class="score-entry-sticky"
      >
        <div id="peloton-current-shoot-display" class="current-shoot-display">
          <span
            v-for="(value, i) in pelotonCurrentPills"
            :key="i"
            class="current-shoot-pill"
            :class="pillScoreClass(value)"
            >{{ formatScore(value) }}</span
          >
        </div>
        <div class="points-pad-container">
          <div id="peloton-points-pad" class="points-pad">
            <button
              v-for="score in peloton.selectablePoints.value"
              :key="score"
              class="point-btn"
              :class="{
                zero: isZero(score),
                'x-score': isFieldX(score),
                'lock-disabled': peloton.isLocked.value,
              }"
              :disabled="peloton.isLocked.value"
              @click="peloton.registerScore(score)"
            >
              {{ formatScore(score) }}
            </button>
          </div>
          <button
            id="peloton-step-back-btn"
            class="btn btn-light btn-icon back-btn"
            aria-label="Effacer la dernière saisie peloton"
            @click="peloton.stepBack()"
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

      <!-- Fun mode bonus arrow (blocking, no close: #peloton-extra-arrow-modal) -->
      <section
        v-if="peloton.state.value.extraArrow"
        id="peloton-extra-arrow-modal"
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="peloton-extra-arrow-modal-title"
      >
        <div class="modal-overlay"></div>
        <div class="modal-card peloton-extra-arrow-modal-card">
          <div class="modal-head">
            <h3 id="peloton-extra-arrow-modal-title" class="modal-title-with-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9Z"
                  fill="currentColor"
                />
              </svg>
              <span>Flèche bonus</span>
            </h3>
          </div>
          <div class="modal-content">
            <p id="peloton-extra-arrow-message" class="peloton-extra-arrow-message">
              <span
                id="peloton-extra-arrow-archer-name"
                class="peloton-extra-arrow-archer-name"
                >{{ peloton.state.value.extraArrow.archerName }}</span
              >
              doit tirer une flèche bonus.
            </p>
            <div
              id="peloton-extra-arrow-points-pad"
              class="points-pad peloton-extra-arrow-points-pad"
            >
              <button
                v-for="score in peloton.extraArrowSelectablePoints.value"
                :key="score"
                class="point-btn"
                :class="{ zero: isZero(score), 'x-score': isFieldX(score) }"
                @click="peloton.submitExtraArrow(score)"
              >
                {{ formatScore(score) }}
              </button>
            </div>
          </div>
        </div>
      </section>
    </section>
    <div
      v-if="phase !== 'setup'"
      class="multi-dock-spacer"
      aria-hidden="true"
      :style="{ height: `${dockSpacerHeight}px` }"
    ></div>
  </main>
</template>
