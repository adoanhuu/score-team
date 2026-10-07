<script setup lang="ts">
import {
  formatRulesetLabel,
  formatRulesetOptionLabel,
  formatScore,
  normalizeSoloSessionType,
  FIELD_X,
  type Ruleset,
} from "~/utils/scoring-format";
import {
  isScoringModeAllowedForRuleset,
  normalizeScoringMode,
  normalizeSoloTimerMode,
  isSoloTimerEnabled,
  getWeaponsForRuleset,
  isWeaponAllowedForRuleset,
  formatWeaponLabel,
  getTargetCountForRuleset,
  getArrowsPerVolley,
  presets,
  canUseTimerForSetup,
  getVolleyPillClass,
  getMaxShootTotalForConfig,
  getBarColorByZoneRatio,
  getSegmentCount,
  getSegmentTotals,
  SOLO_BEEPS_PREPARATION_MAX_SECONDS,
  SOLO_BEEPS_TIRING_MIN_SECONDS,
  getSoloBeepsMaxTiringSecondsByRuleset,
  getSoloBeepsDefaultTiringSecondsByRuleset,
  type ScoringMode,
  type SoloTimerMode,
} from "~/utils/scoring-engine";
import type { HistoryEntryRecord } from "../composables/useDb";
import {
  computeSoloContestDeviceUserId,
  getCurrentSessionDateTime,
  getStoredSoloContestParticipant,
  storeSoloContestParticipant,
  type ContestInfo,
  type SoloContestParticipant,
  type SoloSetupValues,
} from "../composables/useSoloSession";

const session = useSoloSession();
const timer = useSoloTimer();
// Instantiating useContest() here (even though scoring itself lives in useSoloSession)
// keeps its contest-sync watcher alive while the user is actively scoring a
// Concours-linked session (the watcher would otherwise be torn down when the
// mode-multi.vue setup screen that first called useContest() unmounts).
useContest();
const { confirmAction } = useConfirm();
const { showFlash } = useFlash();
const { config, load: loadConfig, save: saveConfig } = useConfig();
const { remove: removeHistoryEntry } = useHistory();
const { user } = useAuth();

const FFTA_RULESETS: Ruleset[] = ["nature", "campagne", "3d"];
const FFTL_RULESETS: Ruleset[] = ["3d2", "3dh", "ar", "field"];
const SCORING_MODES: { value: ScoringMode; label: string }[] = [
  { value: "individual", label: "Individuel" },
  { value: "team", label: "Équipe" },
  { value: "mixed", label: "Mixte" },
];

const loading = ref(true);
const starting = ref(false);
/** Mirrors app.js's pendingSoloResumeArchivedAt: incomplete history entry offered for resume. */
const resumeEntry = ref<HistoryEntryRecord | null>(null);
const showStats = ref(false);
const setupReadonly = computed(() => Boolean(resumeEntry.value));

const state = computed(() => session.state.value);

const { date: initialDate, time: initialTime } = getCurrentSessionDateTime();
const form = ref<SoloSetupValues>({
  ruleset: "nature",
  scoringMode: "individual",
  weapon: getWeaponsForRuleset("nature")[0] ?? "",
  lieu: "",
  sessionDate: initialDate,
  sessionTime: initialTime,
  contestIdentifier: "",
  useTargetGroups: true,
  soloSessionType: "training",
  timerMode: "hold",
  showScores: true,
  successZone: 1,
  targetCount: getTargetCountForRuleset("nature"),
});

// ---------------------------------------------------------------------------
// Setup form
// ---------------------------------------------------------------------------

/** Guards programmatic form updates from the "user changed a field" watchers. */
let applyingSetup = false;
function withApplyingSetup(fn: () => void) {
  const previous = applyingSetup;
  applyingSetup = true;
  try {
    fn();
  } finally {
    applyingSetup = previous;
  }
}

/** Mirrors cancelPendingSoloResume(). */
function cancelPendingSoloResume() {
  if (applyingSetup) return;
  resumeEntry.value = null;
}

const setupScoringMode = computed(() =>
  normalizeScoringMode(form.value.scoringMode, form.value.ruleset),
);

/** Mirrors canUseTimerForCurrentSetup() (no timer in a Multi-joined contest). */
const canUseTimer = computed(
  () =>
    !state.value.contestMode &&
    canUseTimerForSetup(setupScoringMode.value, form.value.ruleset),
);
/** Mirrors getSelectedSoloTimerMode(). */
const selectedTimerMode = computed<SoloTimerMode>(() =>
  canUseTimer.value ? normalizeSoloTimerMode(form.value.timerMode) : "none",
);
/** Mirrors updateWeaponSelectVisibility(). */
const showWeaponSelect = computed(
  () => form.value.scoringMode !== "team" || state.value.contestMode,
);

function isRulesetEnabled(ruleset: string) {
  return (config.value.enabledRulesets ?? []).includes(ruleset);
}

/** Mirrors updateRulesetSelectOptions(): falls back to the first enabled ruleset (as a ruleset "change"). */
function ensureEnabledRuleset() {
  if (state.value.phase !== "setup" || isRulesetEnabled(form.value.ruleset))
    return;
  const firstEnabled = [...FFTA_RULESETS, ...FFTL_RULESETS].find((r) =>
    isRulesetEnabled(r),
  );
  if (!firstEnabled) return;
  withApplyingSetup(() => {
    form.value.ruleset = firstEnabled;
  });
  onZoneConfigChange();
}
watch(
  () => config.value.enabledRulesets,
  () => {
    if (!loading.value) ensureEnabledRuleset();
  },
  { deep: true },
);

/** Mirrors getMaxSuccessZoneForSetup(): max volley total for ruleset + mode (Nature: 35 individual, 105 team). */
const successZoneMax = computed(() => {
  const arrowsPerVolley = getArrowsPerVolley(
    form.value.ruleset,
    setupScoringMode.value,
  );
  const allowedPoints = presets[form.value.ruleset] ?? presets.nature;
  return getMaxShootTotalForConfig(
    form.value.ruleset,
    setupScoringMode.value,
    arrowsPerVolley,
    allowedPoints,
  );
});

/** Mirrors getSuccessZoneColor(). */
const successZoneColor = computed(() => {
  const max = successZoneMax.value;
  if (max <= 0) return "#6b7280";
  const pct = (form.value.successZone / max) * 100;
  if (pct >= 90) return "#9b2226";
  if (pct >= 80) return "#d68c45";
  if (pct >= 70) return "#2d6a4f";
  return "#6b7280";
});

function zoneKey(ruleset: string, scoringMode: string, weapon: string) {
  return `${ruleset}:${scoringMode}:${weapon}`;
}
/** app.js's state._lastRuleset / _lastScoringMode / _lastWeapon. */
let lastZoneConfig = { ruleset: "", scoringMode: "", weapon: "" };
function rememberZoneConfig() {
  lastZoneConfig = {
    ruleset: form.value.ruleset,
    scoringMode: setupScoringMode.value,
    weapon: form.value.weapon,
  };
}

/** Mirrors updateSuccessZoneSlider(): clamp to [1, max] and remember it for ruleset:mode:weapon. */
function updateSuccessZoneSlider() {
  let value = form.value.successZone;
  if (!Number.isInteger(value) || value < 1) value = 1;
  if (value > successZoneMax.value) value = successZoneMax.value;
  withApplyingSetup(() => {
    form.value.successZone = value;
  });
  config.value.successZoneByRuleset = {
    ...(config.value.successZoneByRuleset ?? {}),
    [zoneKey(form.value.ruleset, setupScoringMode.value, form.value.weapon)]:
      value,
  };
  void saveConfig();
}

/** Mirrors syncSoloBeepsTiringInputForRuleset() + updateSoloBeepsTiringDisplay(): clamp tir to [5, max] and save. */
function syncSoloBeepsTiringForRuleset() {
  const ruleset = form.value.ruleset;
  const maxSeconds = getSoloBeepsMaxTiringSecondsByRuleset(ruleset);
  const savedSeconds = Number.parseInt(
    String(config.value.soloBeeps?.tiringSecondsByRuleset?.[ruleset] ?? ""),
    10,
  );
  const safeSeconds = Number.isInteger(savedSeconds)
    ? Math.min(maxSeconds, Math.max(SOLO_BEEPS_TIRING_MIN_SECONDS, savedSeconds))
    : getSoloBeepsDefaultTiringSecondsByRuleset(ruleset);
  soloBeepsTiring.value = safeSeconds;
}

/**
 * Ruleset / scoring-mode / weapon change (the three app.js "change"
 * listeners): save the zone under the previous ruleset:mode:weapon key,
 * normalize mode + weapon, set the new max, then load the zone remembered for
 * the new key (if any), clamp it and save it under the new key.
 */
function onZoneConfigChange() {
  const previousKey = zoneKey(
    lastZoneConfig.ruleset,
    lastZoneConfig.scoringMode,
    lastZoneConfig.weapon,
  );
  const previousValue = form.value.successZone;
  const modeChanged = lastZoneConfig.scoringMode !== setupScoringMode.value;
  if (
    lastZoneConfig.ruleset &&
    Number.isInteger(previousValue) &&
    previousValue >= 1
  ) {
    config.value.successZoneByRuleset = {
      ...(config.value.successZoneByRuleset ?? {}),
      [previousKey]: previousValue,
    };
  }
  withApplyingSetup(() => {
    const ruleset = form.value.ruleset;
    // syncScoringModeFieldset(): keep an allowed mode checked.
    if (!isScoringModeAllowedForRuleset(form.value.scoringMode, ruleset)) {
      form.value.scoringMode = normalizeScoringMode(
        form.value.scoringMode,
        ruleset,
      );
    }
    // syncWeaponSelectOptions(): keep an allowed weapon selected.
    const weapons = getWeaponsForRuleset(ruleset);
    if (!weapons.includes(form.value.weapon))
      form.value.weapon = weapons[0] ?? "";
    form.value.targetCount = getTargetCountForRuleset(ruleset);
    const saved =
      config.value.successZoneByRuleset?.[
        zoneKey(ruleset, setupScoringMode.value, form.value.weapon)
      ];
    if (Number.isInteger(saved) && (saved as number) >= 1) {
      form.value.successZone = saved as number;
    }
  });
  updateSuccessZoneSlider();
  syncSoloBeepsTiringForRuleset();
  if (modeChanged) syncSessionDateTimeForSoloMode();
  rememberZoneConfig();
}

watch(
  () =>
    `${form.value.ruleset}|${form.value.scoringMode}|${form.value.weapon}`,
  () => {
    if (applyingSetup || loading.value) return;
    cancelPendingSoloResume();
    onZoneConfigChange();
  },
  { flush: "sync" },
);
watch(
  () => form.value.successZone,
  () => {
    if (applyingSetup || loading.value) return;
    cancelPendingSoloResume();
    updateSuccessZoneSlider();
  },
  { flush: "sync" },
);
// `:value` + @input rather than v-model: Vue patches `value` after `max`, so
// a restored zone is never clamped by the browser against the previous max
// ("Update slider max BEFORE restoring value", app.js).
function onSuccessZoneInput(event: Event) {
  form.value.successZone = Number.parseInt(
    (event.target as HTMLInputElement).value,
    10,
  );
}
// Every other setup field: cancel a pending resume, then auto-save the setup snapshot.
watch(
  () => [
    form.value.sessionDate,
    form.value.sessionTime,
    form.value.contestIdentifier,
    form.value.useTargetGroups,
    form.value.soloSessionType,
    form.value.timerMode,
    form.value.showScores,
    form.value.lieu,
  ],
  () => {
    if (applyingSetup || loading.value) return;
    cancelPendingSoloResume();
  },
  { flush: "sync" },
);
watch(
  form,
  () => {
    if (loading.value || state.value.phase !== "setup") return;
    session.saveSetupSnapshot(form.value, selectedTimerMode.value);
  },
  { deep: true },
);

/** Mirrors syncSessionDateTimeForSoloMode(): refill an empty date/time, or force the current one. */
function syncSessionDateTimeForSoloMode(forceCurrent = false) {
  if (state.value.contestMode) return;
  const { date, time } = getCurrentSessionDateTime();
  withApplyingSetup(() => {
    if (!form.value.sessionDate?.trim() || forceCurrent)
      form.value.sessionDate = date;
    if (!form.value.sessionTime?.trim() || forceCurrent)
      form.value.sessionTime = time;
  });
}

function rangeProgress(value: number, min: number, max: number) {
  const span = max - min;
  const pct = span > 0 ? ((value - min) / span) * 100 : 0;
  return `${Math.min(100, Math.max(0, pct))}%`;
}

const tiringMax = computed(() =>
  getSoloBeepsMaxTiringSecondsByRuleset(form.value.ruleset),
);
/** Beeps sliders read/write appConfig.soloBeeps and save it (updateSoloBeeps*Display()). */
const soloBeepsPreparation = computed({
  get: () => {
    const parsed = Number.parseInt(
      String(config.value.soloBeeps?.preparationSeconds ?? ""),
      10,
    );
    return Number.isInteger(parsed)
      ? Math.min(SOLO_BEEPS_PREPARATION_MAX_SECONDS, Math.max(0, parsed))
      : 5;
  },
  set: (value: number) => {
    config.value = {
      ...config.value,
      soloBeeps: {
        preparationSeconds: value,
        tiringSecondsByRuleset:
          config.value.soloBeeps?.tiringSecondsByRuleset ?? {},
      },
    };
    void saveConfig();
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
    void saveConfig();
  },
});

/** Applies the remembered setup snapshot (restorePersistedState()'s setup part). */
function applySetupSnapshot() {
  const setup = session.getSetupSnapshot();
  if (!setup) return false;
  withApplyingSetup(() => {
    if (setup.ruleset && setup.ruleset in presets)
      form.value.ruleset = setup.ruleset as Ruleset;
    const ruleset = form.value.ruleset;
    if (
      (setup.scoringMode === "team" ||
        setup.scoringMode === "individual" ||
        setup.scoringMode === "mixed") &&
      isScoringModeAllowedForRuleset(setup.scoringMode, ruleset)
    ) {
      form.value.scoringMode = setup.scoringMode;
    } else {
      form.value.scoringMode = normalizeScoringMode(
        form.value.scoringMode,
        ruleset,
      );
    }
    form.value.weapon = isWeaponAllowedForRuleset(setup.weapon || "", ruleset)
      ? setup.weapon
      : (getWeaponsForRuleset(ruleset)[0] ?? "");
    form.value.targetCount = getTargetCountForRuleset(ruleset);
    if (Number.isInteger(setup.successZone))
      form.value.successZone = setup.successZone;
    if (typeof setup.sessionDate === "string")
      form.value.sessionDate = setup.sessionDate;
    if (typeof setup.sessionTime === "string")
      form.value.sessionTime = setup.sessionTime;
    if (typeof setup.contestIdentifier === "string")
      form.value.contestIdentifier = setup.contestIdentifier;
    if (typeof setup.useTargetGroups === "boolean")
      form.value.useTargetGroups = setup.useTargetGroups;
    form.value.soloSessionType = normalizeSoloSessionType(
      setup.soloSessionType,
    ) as "training" | "contest";
    form.value.timerMode = normalizeSoloTimerMode(
      setup.timerMode,
      normalizeSoloTimerMode(setup.useTimer),
    );
    if (typeof setup.showScores === "boolean")
      form.value.showScores = setup.showScores;
  });
  return true;
}

/** Mirrors applyIncompleteSoloSessionToSetup(): prefills the (read-only) form and offers "Reprendre". */
function applyIncompleteSoloSessionToSetup(entry: HistoryEntryRecord) {
  const ruleset = entry?.ruleset as Ruleset;
  if (!entry || !presets[ruleset]) return false;
  withApplyingSetup(() => {
    form.value.ruleset = ruleset;
    form.value.scoringMode = normalizeScoringMode(entry.scoringMode, ruleset);
    form.value.weapon = isWeaponAllowedForRuleset(
      String(entry.weapon || ""),
      ruleset,
    )
      ? String(entry.weapon)
      : (getWeaponsForRuleset(ruleset)[0] ?? "");
    form.value.targetCount = getTargetCountForRuleset(ruleset);
    const successZone = Number.parseInt(String(entry.successZone), 10);
    if (Number.isInteger(successZone) && successZone >= 1) {
      form.value.successZone = Math.min(successZoneMax.value, successZone);
    }
    form.value.lieu = String(entry.lieu || "");
    form.value.sessionDate = String(entry.sessionDate || "");
    form.value.sessionTime = String(entry.sessionTime || "");
    form.value.contestIdentifier = String(entry.contestIdentifier || "");
    form.value.useTargetGroups =
      typeof entry.useTargetGroups === "boolean" ? entry.useTargetGroups : true;
    form.value.soloSessionType = normalizeSoloSessionType(
      entry.soloSessionType,
    ) as "training" | "contest";
    form.value.timerMode = normalizeSoloTimerMode(
      entry.timerMode || entry.useTimer,
    );
    form.value.showScores =
      typeof entry.showScores === "boolean" ? entry.showScores : true;
  });
  updateSuccessZoneSlider();
  rememberZoneConfig();
  resumeEntry.value = entry.archivedAt ? entry : null;
  return Boolean(resumeEntry.value);
}

/** Setup shown from home: remembered values, then pending resume or individual + current date/time (showSetupFromHome()). */
async function initSetup() {
  applySetupSnapshot();
  rememberZoneConfig();
  ensureEnabledRuleset();
  if (!session.getSetupSnapshot()) {
    // No remembered value yet: use the zone memorized for this ruleset:mode:weapon, if any.
    const saved =
      config.value.successZoneByRuleset?.[
        zoneKey(form.value.ruleset, setupScoringMode.value, form.value.weapon)
      ];
    if (Number.isInteger(saved) && (saved as number) >= 1) {
      withApplyingSetup(() => {
        form.value.successZone = saved as number;
      });
    }
  }
  updateSuccessZoneSlider();

  const entry = await session.resumeIfIncomplete();
  if (entry && applyIncompleteSoloSessionToSetup(entry)) return;

  resumeEntry.value = null;
  // Pre-select individual mode so the timer option is visible by default.
  if (
    form.value.scoringMode !== "individual" &&
    isScoringModeAllowedForRuleset("individual", form.value.ruleset)
  ) {
    withApplyingSetup(() => {
      form.value.scoringMode = "individual";
    });
    onZoneConfigChange();
  }
  syncSessionDateTimeForSoloMode(true);
}

onMounted(async () => {
  await loadConfig();
  if (state.value.phase !== "scoring" && !session.restorePersistedScoring()) {
    await initSetup();
    session.saveSetupSnapshot(form.value, selectedTimerMode.value);
  }
  loading.value = false;
  await nextTick();
  syncSoloScoringCardHeight();
});

// ---------------------------------------------------------------------------
// Start / resume / delete incomplete
// ---------------------------------------------------------------------------

function extractContestIsoDate(value: unknown): string {
  if (typeof value !== "string") return "";
  const match = value.match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : "";
}

/** Mirrors isSessionDateWithinContestRange(). */
function isSessionDateWithinContestRange(sessionDate: string, contest: any) {
  const sessionDay = extractContestIsoDate(sessionDate);
  const startDay = extractContestIsoDate(
    contest?.start_date || contest?.startDate || "",
  );
  const endDay = extractContestIsoDate(
    contest?.end_date || contest?.endDate || "",
  );
  if (!sessionDay || !startDay || !endDay) return false;
  return sessionDay >= startDay && sessionDay <= endDay;
}

function normalizeContestRuleset(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

/** True for an HTTP error response (as opposed to a network failure) thrown by $fetch. */
function isHttpError(error: unknown): error is { data?: { error?: string } } {
  return Boolean((error as { response?: unknown })?.response);
}

type SoloContestLink = {
  info: ContestInfo;
  participant: SoloContestParticipant;
};

/**
 * Mirrors validateSoloContestIdentifierBeforeStart(): null = no contest to
 * link (plain start), false = abort, otherwise the validated contest + participant.
 */
async function validateSoloContestIdentifierBeforeStart(): Promise<
  SoloContestLink | null | false
> {
  if (state.value.contestMode) return null;
  if (form.value.soloSessionType !== "contest") return null;
  const contestIdentifier = form.value.contestIdentifier.trim();
  if (!contestIdentifier) return null;

  const ruleset = form.value.ruleset;
  const sessionDate = form.value.sessionDate;
  let payload: { exists?: boolean; contest?: any };
  try {
    payload = await $fetch("/api/contest/connect", {
      method: "POST",
      body: { uuid: contestIdentifier, ruleset },
    });
  } catch (error) {
    if (isHttpError(error)) {
      showFlash(
        translateErrorToFrench(error.data?.error || "Failed to verify contest"),
      );
    } else {
      showFlash("Impossible de vérifier le concours pour le moment.");
    }
    return false;
  }

  const contest = payload?.contest;
  if (!payload?.exists || !contest) {
    showFlash("Aucun concours ne correspond à cet identifiant pour ce parcours.");
    return false;
  }
  if (
    normalizeContestRuleset(contest.ruleset) !== normalizeContestRuleset(ruleset)
  ) {
    showFlash(
      "Le concours trouvé ne correspond pas au type de parcours sélectionné.",
    );
    return false;
  }
  if (!isSessionDateWithinContestRange(sessionDate, contest)) {
    showFlash(
      "La date de session n'est pas comprise dans les dates du concours.",
    );
    return false;
  }

  const info: ContestInfo = {
    id: contest.id,
    uuid: contest.uuid || contestIdentifier,
    name: contest.name || "Concours",
    ruleset: contest.ruleset || ruleset,
    startDate: contest.start_date || "",
    endDate: contest.end_date || "",
  };
  const participant = await openSoloContestParticipantModal(info);
  if (!participant) return false;
  return { info, participant };
}

/** Mirrors fetchSoloContestUserProgress(). */
async function fetchSoloContestUserProgress(
  contestUuid: string,
  participant: SoloContestParticipant,
): Promise<{ ok: boolean; entry: any | null }> {
  const uuid = contestUuid.trim();
  if (!uuid || !participant?.userId) return { ok: true, entry: null };
  try {
    const payload = await $fetch<{ found?: boolean; entry?: any }>(
      "/api/contest/users",
      { method: "GET", query: { contest_uuid: uuid, user_id: participant.userId } },
    );
    return {
      ok: true,
      entry: payload?.found && payload?.entry ? payload.entry : null,
    };
  } catch (error) {
    if (isHttpError(error)) {
      showFlash(
        translateErrorToFrench(
          error.data?.error || "Failed to load contest user",
        ),
      );
    } else {
      showFlash("Impossible de récupérer l'historique du concours.");
    }
    return { ok: false, entry: null };
  }
}

/** Mirrors handleStartScoring() + startScoring(). */
async function handleStart() {
  if (resumeEntry.value) {
    const entry = resumeEntry.value;
    if (session.restoreIncompleteSession(entry)) {
      resumeEntry.value = null;
      return;
    }
    resumeEntry.value = null;
  }

  syncSessionDateTimeForSoloMode();

  if (!Number.isInteger(form.value.successZone) || form.value.successZone < 1) {
    showFlash("Entrez une zone de réussite valide (minimum 1).");
    return;
  }

  starting.value = true;
  try {
    const soloContest = await validateSoloContestIdentifierBeforeStart();
    if (soloContest === false) return;

    let existingContestUser: any = null;
    if (soloContest) {
      const lookup = await fetchSoloContestUserProgress(
        soloContest.info.uuid,
        soloContest.participant,
      );
      if (!lookup.ok) return;
      existingContestUser = lookup.entry;
    }

    session.startScoring(
      {
        ...form.value,
        lieu: form.value.lieu.trim(),
        contestIdentifier: form.value.contestIdentifier.trim(),
        timerMode: selectedTimerMode.value,
      },
      soloContest,
    );

    if (
      existingContestUser &&
      session.restoreSoloContestUserProgress(existingContestUser)
    ) {
      showFlash("Historique concours restauré.");
    }
    if (soloContest) await session.syncSoloContestUserProgress();
  } finally {
    starting.value = false;
  }
}

/** Mirrors resetPendingSoloSession(). */
async function handleDeleteIncomplete() {
  const archivedAt = resumeEntry.value?.archivedAt;
  if (!archivedAt) {
    resumeEntry.value = null;
    return;
  }
  const confirmed = await confirmAction(
    "Supprimer cette session non terminée ? Les scores saisis seront supprimés.",
    "Supprimer",
  );
  if (!confirmed) return;
  await removeHistoryEntry(archivedAt);
  resumeEntry.value = null;
  session.clearPersistedState();
  session.saveSetupSnapshot(form.value, selectedTimerMode.value);
  showFlash("Session non terminée supprimée.");
}

// ---------------------------------------------------------------------------
// Solo contest participant modal (openSoloContestParticipantModal())
// ---------------------------------------------------------------------------

interface ParticipantModalState {
  contestUuid: string;
  ruleset: string;
  lastName: string;
  firstName: string;
  weapon: string;
  userId: string;
  feedback: string;
}
const participantModal = ref<ParticipantModalState | null>(null);
const participantLastNameInput = ref<HTMLInputElement | null>(null);
let participantResolver: ((value: SoloContestParticipant | null) => void) | null =
  null;

function resolveSoloContestParticipantModal(
  result: SoloContestParticipant | null = null,
) {
  const resolver = participantResolver;
  participantResolver = null;
  participantModal.value = null;
  resolver?.(result);
}

async function openSoloContestParticipantModal(
  contest: ContestInfo,
): Promise<SoloContestParticipant | null> {
  const contestUuid = contest?.uuid?.trim() || "";
  const ruleset = contest?.ruleset?.trim() || "";
  if (!contestUuid || !ruleset) return null;

  const storedProfile = getStoredSoloContestParticipant(contestUuid);
  const defaultWeapon = storedProfile?.weapon || form.value.weapon.trim();
  const weapons = getWeaponsForRuleset(ruleset);
  const userId =
    storedProfile?.userId || (await computeSoloContestDeviceUserId());

  if (participantResolver) resolveSoloContestParticipantModal(null);
  participantModal.value = {
    contestUuid,
    ruleset,
    firstName:
      storedProfile?.firstName || (user.value?.firstName || "").trim(),
    lastName: storedProfile?.lastName || (user.value?.lastName || "").trim(),
    weapon: isWeaponAllowedForRuleset(defaultWeapon, ruleset)
      ? defaultWeapon
      : weapons[0] || "AC",
    userId,
    feedback: "",
  };
  window.setTimeout(() => participantLastNameInput.value?.focus(), 0);

  return new Promise((resolve) => {
    participantResolver = resolve;
  });
}

/** Mirrors handleSoloContestParticipantSubmit(). */
function submitSoloContestParticipant() {
  const modal = participantModal.value;
  if (!modal) return;
  const firstName = modal.firstName.trim();
  const lastName = modal.lastName.trim();
  const weapon = modal.weapon.trim();
  const userId = modal.userId.trim();

  if (!firstName || !lastName) {
    modal.feedback = "Le nom et le prénom sont requis.";
    return;
  }
  if (!modal.contestUuid || !modal.ruleset || !userId) {
    modal.feedback = "Impossible d'initialiser l'inscription concours.";
    return;
  }
  if (!isWeaponAllowedForRuleset(weapon, modal.ruleset)) {
    modal.feedback =
      "La catégorie d'arme sélectionnée n'est pas compatible avec ce parcours.";
    return;
  }
  if (isWeaponAllowedForRuleset(weapon, form.value.ruleset)) {
    form.value.weapon = weapon;
  }
  const participant: SoloContestParticipant = {
    contestUuid: modal.contestUuid,
    firstName,
    lastName,
    weapon,
    userId,
  };
  storeSoloContestParticipant(modal.contestUuid, participant);
  resolveSoloContestParticipantModal(participant);
}

// ---------------------------------------------------------------------------
// Scoring screen
// ---------------------------------------------------------------------------

/** Mirrors restart(): drops the session (and its auto-save), then back home. */
function closeScoring() {
  timer.close();
  showStats.value = false;
  resumeEntry.value = null;
  session.reset();
  navigateTo("/");
}

const scoringCardRef = ref<HTMLElement | null>(null);
const scoreEntryPanelRef = ref<HTMLElement | null>(null);
const historyWrapRef = ref<HTMLElement | null>(null);

const HISTORY_MIN_HEIGHT = 140;

/** Mirrors syncSoloScoringCardHeight(). */
function syncSoloScoringCardHeight() {
  if (!scoringCardRef.value || !scoreEntryPanelRef.value) return;
  const viewportHeight = window.visualViewport
    ? window.visualViewport.height
    : window.innerHeight;
  const panelRect = scoreEntryPanelRef.value.getBoundingClientRect();
  const panelHeight = Math.ceil(panelRect.height || 0);
  // The card is pinned to the top of the popin container (its padding-top,
  // see #scoring-card in styles.css) and must stop 8px above the fixed panel.
  const container = scoringCardRef.value.parentElement;
  const cardTop = container
    ? Number.parseFloat(getComputedStyle(container).paddingTop) || 0
    : 0;
  const gap = 8;
  const available = Math.floor(
    Math.min(viewportHeight - panelHeight, panelRect.top || viewportHeight) -
      cardTop -
      gap,
  );
  // Keep room for at least HISTORY_MIN_HEIGHT of volley history: when the
  // fixed blocks don't leave that much, the card grows and the popin
  // container scrolls instead (its padding-bottom clears the fixed panel).
  const card = scoringCardRef.value;
  const cardStyle = getComputedStyle(card);
  let fixedContentHeight =
    (Number.parseFloat(cardStyle.paddingTop) || 0) +
    (Number.parseFloat(cardStyle.paddingBottom) || 0);
  for (const child of Array.from(card.children) as HTMLElement[]) {
    if (child === historyWrapRef.value) continue;
    if (getComputedStyle(child).position === "fixed") continue;
    const childStyle = getComputedStyle(child);
    fixedContentHeight +=
      child.offsetHeight +
      (Number.parseFloat(childStyle.marginTop) || 0) +
      (Number.parseFloat(childStyle.marginBottom) || 0);
  }
  const cardHeight = Math.max(
    320,
    available,
    Math.ceil(fixedContentHeight + HISTORY_MIN_HEIGHT),
  );
  document.documentElement.style.setProperty(
    "--solo-score-entry-height",
    `${panelHeight}px`,
  );
  document.documentElement.style.setProperty(
    "--solo-scoring-card-height",
    `${cardHeight}px`,
  );
}

onMounted(() => {
  window.addEventListener("resize", syncSoloScoringCardHeight);
  window.visualViewport?.addEventListener("resize", syncSoloScoringCardHeight);
});
onBeforeUnmount(() => {
  window.removeEventListener("resize", syncSoloScoringCardHeight);
  window.visualViewport?.removeEventListener(
    "resize",
    syncSoloScoringCardHeight,
  );
  document.documentElement.style.removeProperty("--solo-score-entry-height");
  document.documentElement.style.removeProperty("--solo-scoring-card-height");
  // Leaving the page while the volley timer is open: unlock the pad so the
  // timer is offered again on return (it is not counted as done).
  if (timer.visible.value) {
    timer.close();
    session.state.value.inputLocked = false;
  }
});

/** Mirrors scrollLiveVolleyHistoryToBottom(): newest volleys first, keep the list pinned to the top. */
function scrollLiveVolleyHistoryToTop() {
  requestAnimationFrame(() => {
    if (historyWrapRef.value) historyWrapRef.value.scrollTop = 0;
  });
}
function scrollScoringCardToBottom() {
  requestAnimationFrame(() => {
    if (scoringCardRef.value)
      scoringCardRef.value.scrollTop = scoringCardRef.value.scrollHeight;
  });
}

// refreshScoringView(): auto-save, card height and history scroll after every change.
watch(
  () => session.state.value,
  () => {
    if (loading.value) return;
    session.persistAppState();
  },
  { deep: true },
);
watch(
  () => [
    state.value.phase,
    state.value.volleys,
    state.value.currentShoot,
    state.value.editingVolleyIndex,
    session.isComplete.value,
    loading.value,
  ],
  async () => {
    if (state.value.phase !== "scoring") return;
    await nextTick();
    syncSoloScoringCardHeight();
    scrollLiveVolleyHistoryToTop();
  },
);

// Header (updateScoringHeader())
const isContestHeader = computed(
  () => state.value.contestMode && Boolean(state.value.contestInfo),
);
const volleyTitleText = computed(() =>
  isContestHeader.value
    ? `${state.value.contestInfo?.name} - ${formatRulesetLabel(state.value.ruleset)}`
    : formatRulesetLabel(state.value.ruleset),
);
const volleyWeaponTitle = computed(() => {
  if (isContestHeader.value) {
    const start = state.value.contestInfo?.startDate || "-";
    const end = state.value.contestInfo?.endDate || "-";
    return `${start} -> ${end}`;
  }
  return state.value.weapon ? formatWeaponLabel(state.value.weapon) : "";
});
const progressText = computed(() =>
  Number.isInteger(state.value.editingVolleyIndex) &&
  (state.value.editingVolleyIndex as number) >= 0
    ? `Modification de la volée ${(state.value.editingVolleyIndex as number) + 1}`
    : "",
);
const targetLabel = computed(() => {
  const shootNumber = state.value.volleys.length + 1;
  const current = Math.min(shootNumber, state.value.targetCount);
  return `${current}/${state.value.targetCount}`;
});

/** Mirrors getProjectedSessionPercent(). */
const projectedSessionPercent = computed(() => {
  const completedTargets = state.value.volleys.length;
  const maxSessionTotal = session.maxVolley.value * state.value.targetCount;
  if (completedTargets <= 0 || maxSessionTotal <= 0) return 0;
  const projectedTotal =
    (session.totalScore.value / completedTargets) * state.value.targetCount;
  return Math.max(
    0,
    Math.min(100, Math.round((projectedTotal / maxSessionTotal) * 100)),
  );
});
const showScorePercent = computed(
  () => state.value.scoringMode === "individual" && !state.value.showScores,
);
const scoreCardColors = computed(() => {
  if (state.value.volleys.length === 0) {
    return { card: { background: "#fff", borderColor: "var(--line)" }, text: {} };
  }
  const averageVolley = session.totalScore.value / state.value.volleys.length;
  const bgColor = getBarColorByZoneRatio(averageVolley, state.value.successZone);
  const textColor = bgColor === "#eab308" ? "#1f2a24" : "#fff";
  return {
    card: { background: bgColor, borderColor: bgColor },
    text: { color: textColor },
  };
});

/** Mirrors renderSegmentStats(). */
const segmentCards = computed(() => {
  const segmentCount = getSegmentCount(
    state.value.targetCount,
    state.value.ruleset,
  );
  const shoots = state.value.volleys.map((v) => v.arrows);
  const segTotals = getSegmentTotals(
    shoots,
    state.value.targetCount,
    state.value.ruleset,
  );
  return Array.from({ length: segmentCount }, (_, i) => {
    const start = Math.floor((i * state.value.targetCount) / segmentCount);
    const end = Math.floor(((i + 1) * state.value.targetCount) / segmentCount);
    const segSize = end - start;
    const isSegmentComplete = state.value.volleys.length >= end;
    const segTotal = segTotals[i] ?? 0;
    const label =
      segmentCount === 2
        ? i === 0
          ? "1ère moitié"
          : "2e moitié"
        : (["1er tiers", "2e tiers", "3e tiers"][i] ?? "");
    let value: number;
    let unit: string;
    if (state.value.showScores) {
      value = segTotal;
      unit = "pts";
    } else {
      const segmentTarget = Math.max(0, state.value.successZone * segSize);
      value =
        segmentTarget > 0 ? Math.round((segTotal / segmentTarget) * 100) : 0;
      unit = "%";
    }
    let cardStyle: Record<string, string> = {};
    let textStyle: Record<string, string> = {};
    if (isSegmentComplete && segSize > 0) {
      const bgColor = getBarColorByZoneRatio(
        segTotal / segSize,
        state.value.successZone,
      );
      const textColor = bgColor === "#eab308" ? "#1f2a24" : "#fff";
      cardStyle = { background: bgColor, borderColor: bgColor };
      textStyle = { color: textColor };
    }
    return { label, value, unit, cardStyle, textStyle };
  });
});

// Points pad (renderPad())
function isLocked() {
  return state.value.inputLocked;
}
function isScoreAllowed(score: number) {
  return session.isScoreAllowedForCurrentArrow(score);
}
async function onPointClick(score: number) {
  scrollScoringCardToBottom();
  await session.registerScore(score);
}

function pillScoreClass(value: number | null): string {
  if (value === null) return "is-empty";
  if (value === 0) return "is-miss";
  if (value === FIELD_X) return "is-x";
  return "is-hit";
}

// Live volley history (renderLiveVolleyHistory()): newest first, preview row for the volley in progress.
const historyRows = computed(() => {
  const sessionCompleted = state.value.volleys.length === state.value.targetCount;
  const rows = state.value.volleys
    .map((volley, idx) => {
      const isEditingRow = idx === state.value.editingVolleyIndex;
      return {
        idx,
        pillClass: getVolleyPillClass(
          volley.arrows,
          volley.total,
          session.maxVolley.value,
        ),
        arrowsText: isEditingRow
          ? Array(state.value.arrowsPerVolley).fill("-").join(" / ")
          : volley.arrows.map((value) => formatScore(value)).join(" / "),
        group: volley.group || "-",
        totalText: isEditingRow ? "-" : String(volley.total),
        success: volley.total >= state.value.successZone && !isEditingRow,
        edited: idx === state.value.lastEditedVolleyIndex,
        editable: !sessionCompleted,
      };
    })
    .reverse();
  return rows;
});
const previewRow = computed(() => {
  if (
    !session.hasPartialVolley.value ||
    state.value.volleys.length >= state.value.targetCount
  ) {
    return null;
  }
  return {
    number: state.value.volleys.length + 1,
    arrowsText: Array(state.value.arrowsPerVolley).fill("-").join(" / "),
    group: session.getSelectedTargetGroup() || "-",
  };
});

/** Double-click/double-tap (2 taps < 300 ms) on a row edits it; clicks on buttons are ignored. */
const DOUBLE_TAP_DELAY = 300;
const lastTapTimes = new Map<number, number>();
function onHistoryRowClick(event: MouseEvent, idx: number) {
  if ((event.target as HTMLElement | null)?.closest("button")) return;
  const now = Date.now();
  const lastTap = lastTapTimes.get(idx) ?? 0;
  if (now - lastTap < DOUBLE_TAP_DELAY) {
    lastTapTimes.delete(idx);
    session.editVolleyAt(idx);
  } else {
    lastTapTimes.set(idx, now);
  }
}

async function onDeleteVolley(index: number) {
  if (state.value.inputLocked) return;
  const confirmed = await confirmAction(
    "Confirmer la suppression de cette volée ?",
    "Supprimer",
  );
  if (!confirmed) return;
  await session.deleteVolleyAt(index);
}

function stepBack() {
  session.stepBackOneArrow();
}

function openStats() {
  if (!session.isComplete.value || state.value.volleys.length === 0) return;
  showStats.value = true;
}

async function onSaveComments(text: string) {
  await session.setProgressionAxis(text);
}

// ---------------------------------------------------------------------------
// Per-volley timer modal (maybeOpenSoloVolleyTimer())
// ---------------------------------------------------------------------------

/** Mirrors shouldUseSoloVolleyTimer(). */
const shouldUseSoloVolleyTimer = computed(() => {
  const s = state.value;
  if (loading.value || s.phase !== "scoring") return false;
  if (!isSoloTimerEnabled(s.timerMode) || s.contestMode) return false;
  if (s.volleys.length >= s.targetCount) return false;
  if (s.inputLocked) return false;
  if (Number.isInteger(s.editingVolleyIndex) && (s.editingVolleyIndex as number) >= 0)
    return false;
  if (s.currentArrowIndex !== 0) return false;
  if (session.hasPartialVolley.value) return false;
  if (s.soloTimerVolleyIndex === s.volleys.length) return false;
  return true;
});

function markSoloVolleyTimerDone() {
  session.state.value.inputLocked = false;
  session.state.value.soloTimerVolleyIndex = session.state.value.volleys.length;
}

/** Mirrors openSoloVolleyTimerModal() / openSoloBeepsTimerModal(). */
function openSoloVolleyTimerModal() {
  const s = session.state.value;
  s.inputLocked = true;
  if (s.timerMode === "beeps") {
    const maxTiring = getSoloBeepsMaxTiringSecondsByRuleset(s.ruleset);
    const savedTiring = Number.parseInt(
      String(config.value.soloBeeps?.tiringSecondsByRuleset?.[s.ruleset] ?? ""),
      10,
    );
    const tiringSeconds = Number.isInteger(savedTiring)
      ? Math.min(maxTiring, Math.max(SOLO_BEEPS_TIRING_MIN_SECONDS, savedTiring))
      : getSoloBeepsDefaultTiringSecondsByRuleset(s.ruleset);
    timer.openBeeps(
      {
        preparationSeconds: soloBeepsPreparation.value,
        tiringSeconds,
        arrowsPerVolley: s.arrowsPerVolley,
      },
      () => {
        markSoloVolleyTimerDone();
        showFlash("Timer Beeps terminé. Vous pouvez saisir la volée.");
      },
    );
    return;
  }
  const hold = Number.parseInt(String(config.value.trainingHold?.holdSeconds ?? ""), 10);
  const rest = Number.parseInt(String(config.value.trainingHold?.restSeconds ?? ""), 10);
  timer.openHold(
    {
      arrowsPerVolley: s.arrowsPerVolley,
      holdSeconds: Number.isInteger(hold) ? Math.min(12, Math.max(2, hold)) : 4,
      restSeconds: Number.isInteger(rest) ? Math.min(30, Math.max(5, rest)) : 5,
    },
    () => {
      markSoloVolleyTimerDone();
      showFlash("Timer termine. Vous pouvez saisir la volee.");
    },
  );
}

watch(
  shouldUseSoloVolleyTimer,
  (shouldOpen) => {
    if (shouldOpen && !timer.visible.value) openSoloVolleyTimerModal();
  },
  { immediate: true },
);

/** Mirrors closeTrainingHoldModal() for the solo volley timer. */
function closeSoloVolleyTimer() {
  timer.close();
  markSoloVolleyTimerDone();
}
</script>

<template>
  <main class="app">
    <p v-if="loading">Chargement…</p>

    <section
      v-else-if="state.phase === 'setup'"
      class="card"
      :class="{ 'is-readonly': setupReadonly }"
    >
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

      <div class="grid-two solo-setup-grid">
        <label>
          <span class="label-inline"
            >Parcours
            <span class="inline-meta">{{ form.targetCount }} cibles</span></span
          >
          <select v-model="form.ruleset" :disabled="setupReadonly">
            <optgroup
              label="FFTA"
              :style="
                FFTA_RULESETS.some((r) => isRulesetEnabled(r))
                  ? undefined
                  : { display: 'none' }
              "
            >
              <option
                v-for="r in FFTA_RULESETS"
                :key="r"
                :value="r"
                :disabled="!isRulesetEnabled(r)"
                :style="isRulesetEnabled(r) ? undefined : { display: 'none' }"
              >
                {{ formatRulesetOptionLabel(r) }}
              </option>
            </optgroup>
            <optgroup
              label="FFTL"
              :style="
                FFTL_RULESETS.some((r) => isRulesetEnabled(r))
                  ? undefined
                  : { display: 'none' }
              "
            >
              <option
                v-for="r in FFTL_RULESETS"
                :key="r"
                :value="r"
                :disabled="!isRulesetEnabled(r)"
                :style="isRulesetEnabled(r) ? undefined : { display: 'none' }"
              >
                {{ formatRulesetOptionLabel(r) }}
              </option>
            </optgroup>
          </select>
        </label>
        <div class="session-datetime-row">
          <label>
            <span class="label-inline">Date de la session</span>
            <input
              v-model="form.sessionDate"
              type="date"
              :disabled="setupReadonly"
            />
          </label>
          <label>
            <span class="label-inline">Heure de la session</span>
            <input
              v-model="form.sessionTime"
              type="time"
              :disabled="setupReadonly"
            />
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
                :disabled="setupReadonly"
              />
              <span>Entraînement</span>
            </label>
            <label class="switch-option">
              <input
                v-model="form.soloSessionType"
                type="radio"
                value="contest"
                :disabled="setupReadonly"
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
            <label
              v-for="mode in SCORING_MODES"
              :key="mode.value"
              class="mode-option switch-option"
              :class="{
                disabled: !isScoringModeAllowedForRuleset(
                  mode.value,
                  form.ruleset,
                ),
              }"
            >
              <input
                v-model="form.scoringMode"
                type="radio"
                :value="mode.value"
                :disabled="
                  setupReadonly ||
                  !isScoringModeAllowedForRuleset(mode.value, form.ruleset)
                "
              />
              <span>{{ mode.label }}</span>
            </label>
          </div>
        </fieldset>
        <label v-show="showWeaponSelect">
          <span class="label-inline">Type d'arme</span>
          <select v-model="form.weapon" :disabled="setupReadonly">
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
                id="success-zone-input"
                type="range"
                min="1"
                :max="successZoneMax"
                step="1"
                :value="form.successZone"
                :disabled="setupReadonly"
                :style="{
                  '--range-progress': rangeProgress(
                    form.successZone,
                    1,
                    successZoneMax,
                  ),
                  '--range-fill-color': successZoneColor,
                  '--zone-color': successZoneColor,
                }"
                @input="onSuccessZoneInput"
              />
              <strong :style="{ color: successZoneColor }">{{
                form.successZone
              }}</strong>
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
              :disabled="setupReadonly"
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
              :disabled="setupReadonly"
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
                    :disabled="setupReadonly"
                  />
                  <span>Oui</span>
                </label>
                <label class="switch-option">
                  <input
                    v-model="form.useTargetGroups"
                    type="radio"
                    :value="false"
                    :disabled="setupReadonly"
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
                  <input
                    v-model="form.showScores"
                    type="radio"
                    :value="true"
                    :disabled="setupReadonly"
                  />
                  <span>Oui</span>
                </label>
                <label class="switch-option">
                  <input
                    v-model="form.showScores"
                    type="radio"
                    :value="false"
                    :disabled="setupReadonly"
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
                  <input
                    v-model="form.timerMode"
                    type="radio"
                    value="none"
                    :disabled="setupReadonly"
                  />
                  <span>Aucun</span>
                </label>
                <label class="switch-option">
                  <input
                    v-model="form.timerMode"
                    type="radio"
                    value="beeps"
                    :disabled="setupReadonly"
                  />
                  <span>Beeps</span>
                </label>
                <label class="switch-option">
                  <input
                    v-model="form.timerMode"
                    type="radio"
                    value="hold"
                    :disabled="setupReadonly"
                  />
                  <span>Tps tenue</span>
                </label>
              </div>
            </fieldset>
          </div>
          <div v-if="selectedTimerMode === 'beeps'" class="solo-beeps-settings">
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
                  :disabled="setupReadonly"
                  :style="{
                    '--range-progress': rangeProgress(
                      soloBeepsPreparation,
                      0,
                      SOLO_BEEPS_PREPARATION_MAX_SECONDS,
                    ),
                  }"
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
                  :min="SOLO_BEEPS_TIRING_MIN_SECONDS"
                  :max="tiringMax"
                  step="1"
                  :disabled="setupReadonly"
                  :style="{
                    '--range-progress': rangeProgress(
                      soloBeepsTiring,
                      SOLO_BEEPS_TIRING_MIN_SECONDS,
                      tiringMax,
                    ),
                  }"
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
          :aria-label="resumeEntry ? 'Reprendre la saisie' : 'Démarrer la saisie'"
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
          class="btn btn-danger start-btn start-reset-btn"
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

    <section v-else id="scoring-card" ref="scoringCardRef" class="card">
      <div class="scoring-head modal-head">
        <div>
          <h2 id="volley-title" class="volley-title-row modal-title-with-icon">
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
              <span id="volley-title-text">{{ volleyTitleText }}</span>
              <span id="volley-weapon-title" class="volley-weapon-title">{{
                volleyWeaponTitle
              }}</span>
            </div>
          </h2>
          <p id="progress-text">{{ progressText }}</p>
        </div>
        <div class="head-actions">
          <button
            id="scoring-close-btn"
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
          <strong id="target-counter-display">{{ targetLabel }}</strong>
        </article>
        <article :style="scoreCardColors.card">
          <span :style="scoreCardColors.text">Score</span>
          <strong id="team-total" :style="scoreCardColors.text">
            <template v-if="showScorePercent"
              >{{ projectedSessionPercent
              }}<span class="stats-unit">%</span></template
            >
            <template v-else
              >{{ session.totalScore.value
              }}<span class="stats-unit">pts</span></template
            >
          </strong>
        </article>
        <article>
          <span>Zone de réussite</span>
          <strong id="success-zone-display"
            >{{ state.successZone }}<span class="stats-unit">pts</span></strong
          >
        </article>
      </div>
      <div
        id="segment-stats"
        class="quick-stats segment-stats"
        :style="{ gridTemplateColumns: `repeat(${segmentCards.length}, 1fr)` }"
      >
        <article
          v-for="(segment, i) in segmentCards"
          :key="i"
          :style="segment.cardStyle"
        >
          <span :style="segment.textStyle">{{ segment.label }}</span>
          <strong :style="segment.textStyle"
            >{{ segment.value
            }}<span class="stats-unit">{{ segment.unit }}</span></strong
          >
        </article>
      </div>

      <div
        v-show="!session.isComplete.value"
        id="score-entry-panel"
        ref="scoreEntryPanelRef"
        class="score-entry-sticky"
      >
        <div id="current-shoot-display" class="current-shoot-display">
          <span
            v-for="(value, i) in state.currentShoot"
            :key="i"
            class="current-shoot-pill"
            :class="pillScoreClass(value)"
            >{{ formatScore(value) }}</span
          >
        </div>
        <div class="score-actions-row">
          <div
            v-show="session.useTargetGroupsForScoring.value"
            id="target-group-select"
            class="target-group-radios"
            role="radiogroup"
            aria-label="catégorie de cible"
          >
            <label
              v-for="group in session.groupOptions.value"
              :key="group"
              class="target-group-radio"
              :class="{ active: state.selectedGroup === group }"
            >
              <input
                type="radio"
                name="target-group"
                :value="group"
                :checked="state.selectedGroup === group"
                @change="session.selectGroup(group)"
              />
              <span>{{ group }}</span>
            </label>
          </div>
        </div>
        <div class="points-pad-container">
          <div id="points-pad" class="points-pad">
            <button
              v-for="score in session.selectablePoints.value"
              :key="score"
              class="point-btn"
              :class="{
                zero: score === 0,
                'x-score': score === FIELD_X,
                'lock-disabled': isLocked(),
                'disabled-score':
                  !isLocked() &&
                  !isScoreAllowed(score) &&
                  state.scoringMode === 'team',
              }"
              :disabled="isLocked() || !isScoreAllowed(score)"
              @click="onPointClick(score)"
            >
              {{ formatScore(score) }}
            </button>
          </div>
          <button
            id="step-back-btn"
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
      <div id="live-volley-history-wrap" ref="historyWrapRef" class="table-wrap">
        <table class="history-table">
          <thead>
            <tr>
              <th>Volée</th>
              <th>Flèches</th>
              <th
                v-show="session.useTargetGroupsForScoring.value"
                id="group-column-header"
              >
                Groupe
              </th>
              <th>Total</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="live-volley-history-body">
            <tr v-if="previewRow">
              <td>
                <span class="volley-pill is-gray">{{ previewRow.number }}</span>
              </td>
              <td>{{ previewRow.arrowsText }}</td>
              <td v-if="session.useTargetGroupsForScoring.value">
                {{ previewRow.group }}
              </td>
              <td class="history-total">-</td>
              <td>-</td>
            </tr>
            <tr
              v-for="row in historyRows"
              :key="row.idx"
              :class="{ 'is-edited-row': row.edited }"
              @click="row.editable && onHistoryRowClick($event, row.idx)"
            >
              <td>
                <span class="volley-pill" :class="row.pillClass">{{
                  row.idx + 1
                }}</span>
              </td>
              <td>{{ row.arrowsText }}</td>
              <td v-if="session.useTargetGroupsForScoring.value">
                {{ row.group }}
              </td>
              <td class="history-total" :class="{ success: row.success }">
                {{ row.totalText }}
              </td>
              <td>
                <button
                  class="btn btn-danger btn-icon row-delete-btn"
                  :aria-label="`Supprimer la volée ${row.idx + 1}`"
                  @click="onDeleteVolley(row.idx)"
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

      <div
        v-show="session.isComplete.value"
        id="results-actions"
        class="actions action-icons"
      >
        <button
          id="stats-btn"
          class="btn btn-light btn-icon home-btn"
          aria-label="Statistiques"
          :disabled="!session.isComplete.value"
          @click="openStats"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M4 20h16v2H4v-2Zm1-2V9h3v9H5Zm5 0V5h3v13h-3Zm5 0v-7h3v7h-3Z"
              fill="currentColor"
            />
          </svg>
        </button>
        <button
          id="results-close-btn"
          class="btn btn-light"
          aria-label="Fermer"
          @click="closeScoring"
        >
          Fermer
        </button>
      </div>
    </section>

    <SoloStatsModal
      v-if="showStats"
      :payload="session.buildResultsPayload()"
      @close="showStats = false"
      @save-comments="onSaveComments"
    />

    <!-- Per-volley timer (app.js's #training-hold-modal in solo-volley / beeps mode) -->
    <section
      v-if="timer.visible.value"
      id="training-hold-modal"
      class="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="training-hold-modal-title"
    >
      <div class="modal-overlay"></div>
      <div class="modal-card training-hold-modal-card">
        <div class="modal-head">
          <h3 id="training-hold-modal-title" class="modal-title-with-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M9 2h6v2H9V2Zm3 4a8 8 0 1 0 8 8 8 8 0 0 0-8-8Zm0 14a6 6 0 1 1 6-6 6 6 0 0 1-6 6Zm1-10h-2v4.4l3.2 1.9 1-1.7-2.2-1.3V10Z"
                fill="currentColor"
              />
            </svg>
            <span>{{ timer.title.value }}</span>
          </h3>
          <button
            class="btn btn-light btn-icon"
            aria-label="Fermer temps de tenue"
            @click="closeSoloVolleyTimer"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>

        <div class="training-hold-meta-row">
          <strong
            class="training-hold-series-stack"
            :style="{ backgroundColor: timer.metaColors.value[0], color: '#fff' }"
          >
            <span class="training-meta-label">{{
              timer.metaLabels.value[0]
            }}</span>
            <span class="training-meta-value">{{
              timer.metaValues.value[0]
            }}</span>
          </strong>
          <strong
            class="training-hold-series-stack"
            :style="{ backgroundColor: timer.metaColors.value[1], color: '#fff' }"
          >
            <span class="training-meta-label">{{
              timer.metaLabels.value[1]
            }}</span>
            <span class="training-meta-value">{{
              timer.metaValues.value[1]
            }}</span>
          </strong>
        </div>

        <div class="training-hold-ring-wrap">
          <div
            id="training-cycle-ring"
            class="training-hold-ring"
            :class="timer.ringClass.value"
            role="img"
            :aria-label="timer.ringAriaLabel.value"
            :style="{ '--ring-progress': `${timer.ringProgress.value}` }"
          >
            <strong
              ><span class="training-time-value">{{
                timer.ringSeconds.value
              }}</span
              ><span class="training-time-unit">s</span></strong
            >
            <span id="training-cycle-ring-label">{{
              timer.ringLabel.value
            }}</span>
          </div>
        </div>

        <div class="start-action">
          <button
            class="btn btn-primary btn-icon start-btn"
            :aria-label="
              timer.running.value ? 'Mettre en pause le timer' : 'Démarrer le timer'
            "
            @click="timer.toggle()"
          >
            <span>{{ timer.running.value ? "Pause" : "Démarrer" }}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                v-if="timer.running.value"
                d="M7 5h3v14H7V5Zm7 0h3v14h-3V5Z"
                fill="currentColor"
              />
              <path v-else d="M8 5v14l11-7L8 5Z" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>
    </section>

    <!-- Solo contest registration (app.js's #solo-contest-participant-modal) -->
    <section
      v-if="participantModal"
      id="solo-contest-participant-modal"
      class="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="solo-contest-participant-title"
    >
      <div class="modal-overlay"></div>
      <div class="modal-card login-modal-card">
        <div class="modal-head">
          <h3 id="solo-contest-participant-title" class="modal-title-with-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.314 0-6 2.015-6 4.5V20h12v-1.5C18 16.015 15.314 14 12 14Z"
                fill="currentColor"
              />
            </svg>
            <span>Inscription concours</span>
          </h3>
          <button
            class="btn btn-light btn-icon"
            aria-label="Fermer inscription concours"
            @click="resolveSoloContestParticipantModal(null)"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
        <form
          class="login-form"
          novalidate
          @submit.prevent="submitSoloContestParticipant"
        >
          <p class="solo-contest-participant-help">
            Renseignez vos informations pour rattacher cette session solo au
            concours.
          </p>
          <label>
            Nom
            <input
              ref="participantLastNameInput"
              v-model="participantModal.lastName"
              type="text"
              autocomplete="family-name"
              placeholder="Votre nom"
              required
            />
          </label>
          <label>
            Prénom
            <input
              v-model="participantModal.firstName"
              type="text"
              autocomplete="given-name"
              placeholder="Votre prénom"
              required
            />
          </label>
          <label>
            Catégorie d'arme
            <select v-model="participantModal.weapon" required>
              <option
                v-for="code in getWeaponsForRuleset(participantModal.ruleset)"
                :key="code"
                :value="code"
              >
                {{ formatWeaponLabel(code) }}
              </option>
            </select>
          </label>
          <input v-model="participantModal.userId" type="hidden" />
          <div
            v-if="participantModal.feedback"
            class="login-feedback is-error"
            role="alert"
          >
            {{ participantModal.feedback }}
          </div>
          <div class="modal-actions">
            <button
              type="button"
              class="btn btn-light"
              @click="resolveSoloContestParticipantModal(null)"
            >
              Annuler
            </button>
            <button type="submit" class="btn btn-primary">Valider</button>
          </div>
        </form>
      </div>
    </section>
  </main>
</template>
