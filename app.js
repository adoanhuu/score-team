const ARROWS_PER_VOLLEY = 6;
const TEAM_ARCHERS_PER_VOLLEY = 3;
const APP_VERSION = "v2.3.9";
const LAST_SCORE_PREVIEW_MS = 300;
const AUTO_SAVE_KEY = "score-team-autosave-v1";
const HISTORY_KEY = "score-team-history-v1";
const CONFIG_KEY = "score-team-config-v1";
const MAX_HISTORY_ITEMS = 50;
const FLASH_INFO_MS = 2600;
const AUTH_TOKEN_KEY = "score-team-auth-token-v1";
const AUTH_USER_ID_KEY = "score-team-auth-user-id-v1";
const AUTH_USER_EMAIL_KEY = "score-team-auth-user-email-v1";
const AUTH_USER_FIRST_NAME_KEY = "score-team-auth-user-first-name-v1";
const AUTH_USER_LAST_NAME_KEY = "score-team-auth-user-last-name-v1";
const CONTEST_UUID_KEY = "score-team-contest-uuid-v1";
const CONTEST_PROGRESS_KEY = "score-team-contest-progress-v1";
const CONTEST_WEAPON_KEY = "score-team-contest-weapon-v1";
const WELCOME_MODAL_MS = 2000;
const TRAINING_SERIES_BREAK_SECONDS = 5;
const TRAINING_SETTINGS_DEFAULTS = {
  series: 3,
  repetitions: 3,
  holdSeconds: 4,
  restSeconds: 5,
};

const state = {
  targetCount: 21,
  successZone: 0,
  scoringMode: "team",
  arrowsPerVolley: ARROWS_PER_VOLLEY,
  currentshoot: Array(ARROWS_PER_VOLLEY).fill(null),
  currentArrowIndex: 0,
  shoots: [],
  activeRuleset: "nature",
  allowedPoints: [20, 15, 10, 0],
  shootGroups: [],
  resultsPayload: null,
  activeStatsPayload: null,
  inputLocked: false,
  completionArchived: false,
  statsOpenedFromHistory: false,
  useTargetGroups: true,
  showScores: true,
  editingVolleyIndex: null,
  lastEditedVolleyIndex: null,
  progressionAxis: "",
  sessionDate: "",
  sessionTime: "",
  generalStatsGraphEnabled: false,
  duel: {
    ruleset: "3d",
    mode: "duel",
    targetCount: 4,
    arrowsPerTarget: 3,
    allowedPoints: [20, 15, 10, 0],
    currentTargetIndex: 0,
    activePlayer: 1,
    currentArrowIndex: 0,
    scoresP1: [],
    scoresP2: [],
    nameP1: "",
    nameP2: "",
    completed: false,
  },
  pelotonRoster: [],
  pelotonByArcher: {},
  pelotonActiveArcherIndex: null,
  peloton: null,
  contestMode: false,
  contestInfo: null,
};

const els = {
  homeTitle: document.getElementById("home-title"),
  homeSubtitle: document.getElementById("home-subtitle"),
  setupCard: document.getElementById("setup-card"),
  scoringCard: document.getElementById("scoring-card"),
  targetsCountText: document.getElementById("targets-count-text"),
  successZoneInput: document.getElementById("success-zone-input"),
  successZoneValue: document.getElementById("success-zone-value"),
  lieuInput: document.getElementById("lieu-input"),
  sessionDateInput: document.getElementById("session-date-input"),
  sessionTimeInput: document.getElementById("session-time-input"),
  rulesetSelect: document.getElementById("ruleset-select"),
  scoringModeInputs: document.querySelectorAll('input[name="scoring-mode"]'),
  setupCloseBtn: document.getElementById("setup-close-btn"),
  scoringCloseBtn: document.getElementById("scoring-close-btn"),
  startBtn: document.getElementById("start-btn"),
  backSetupBtn: document.getElementById("back-setup-btn"),
  helpBtn: document.getElementById("help-btn"),
  stepBackBtn: document.getElementById("step-back-btn"),
  shootTitle: document.getElementById("volley-title"),
  progressText: document.getElementById("progress-text"),
  volleyWeaponTitle: document.getElementById("volley-weapon-title"),
  targetCounterDisplay: document.getElementById("target-counter-display"),
  teamTotal: document.getElementById("team-total"),
  successZoneDisplay: document.getElementById("success-zone-display"),
  scoreEntryPanel: document.getElementById("score-entry-panel"),
  targetGroupSelect: document.getElementById("target-group-select"),
  pointsPad: document.getElementById("points-pad"),
  currentShootDisplay: document.getElementById("current-shoot-display"),
  liveVolleyHistoryWrap: document.getElementById("live-volley-history-wrap"),
  liveVolleyHistoryBody: document.getElementById("live-volley-history-body"),
  resultsActions: document.getElementById("results-actions"),
  historyBtn: document.getElementById("history-btn"),
  statsBtn: document.getElementById("stats-btn"),
  resultsCloseBtn: document.getElementById("results-close-btn"),

  statsModal: document.getElementById("stats-modal"),
  statsModalOverlay: document.getElementById("stats-modal-overlay"),
  statsCloseBtn: document.getElementById("stats-close-btn"),
  statsTotalPoints: document.getElementById("stats-total-points"),
  generalStatsModal: document.getElementById("general-stats-modal"),
  generalStatsModalOverlay: document.getElementById("general-stats-modal-overlay"),
  generalStatsCloseBtn: document.getElementById("general-stats-close-btn"),
  generalStatsRulesetFilter: document.getElementById("general-stats-ruleset-filter"),
  generalStatsWeaponFilter: document.getElementById("general-stats-weapon-filter"),
  generalStatsSessionCount: document.getElementById("general-stats-session-count"),
  generalStatsAvgSession: document.getElementById("general-stats-avg-session"),
  generalStatsAvgArrow: document.getElementById("general-stats-avg-arrow"),
  generalStatsSuccessRate: document.getElementById("general-stats-success-rate"),
  generalStatsBestSession: document.getElementById("general-stats-best-session"),
  generalStatsBestSessionDate: document.getElementById("general-stats-best-session-date"),
  generalStatsBestVolley: document.getElementById("general-stats-best-volley"),
  generalStatsEvolutionRow: document.getElementById("general-stats-evolution-row"),
  generalStatsEvolutionWrap: document.getElementById("general-stats-evolution-wrap"),
  generalStatsEvolutionChart: document.getElementById("general-stats-evolution-chart"),
  generalStatsEvolutionPath: document.getElementById("general-stats-evolution-path"),
  generalStatsEvolutionAvgLine: document.getElementById("general-stats-evolution-avg-line"),
  generalStatsEvolutionAxis: document.getElementById("general-stats-evolution-axis"),
  helpModal: document.getElementById("help-modal"),
  helpModalOverlay: document.getElementById("help-modal-overlay"),
  helpCloseBtn: document.getElementById("help-close-btn"),
  helpPagination: document.getElementById("help-pagination"),
  historyModal: document.getElementById("history-modal"),
  historyModalOverlay: document.getElementById("history-modal-overlay"),
  historyCloseBtn: document.getElementById("history-close-btn"),
  confirmModal: document.getElementById("confirm-modal"),
  confirmModalOverlay: document.getElementById("confirm-modal-overlay"),
  confirmModalMessage: document.getElementById("confirm-modal-message"),
  confirmModalCancelBtn: document.getElementById("confirm-modal-cancel-btn"),
  confirmModalConfirmBtn: document.getElementById("confirm-modal-confirm-btn"),
  welcomeModal: document.getElementById("welcome-modal"),
  welcomeModalOverlay: document.getElementById("welcome-modal-overlay"),
  welcomeModalMessage: document.getElementById("welcome-modal-message"),
  historyModeFilter: document.getElementById("history-mode-filter"),
  historyRulesetFilter: document.getElementById("history-ruleset-filter"),
  historyResetFiltersBtn: document.getElementById("history-reset-filters-btn"),
  historyPagination: document.getElementById("history-pagination"),
  historyList: document.getElementById("history-list"),
  statsSuccessZone: document.getElementById("stats-success-zone"),
  statsBestVolley: document.getElementById("stats-best-volley"),
  statsWorstVolley: document.getElementById("stats-worst-volley"),
  statsBar1: document.getElementById("stats-bar-1"),
  statsBar2: document.getElementById("stats-bar-2"),
  statsBar3: document.getElementById("stats-bar-3"),
  statsBar1Value: document.getElementById("stats-bar-1-value"),
  statsBar2Value: document.getElementById("stats-bar-2-value"),
  statsBar3Value: document.getElementById("stats-bar-3-value"),
  statsBar1Points: document.getElementById("stats-bar-1-points"),
  statsBar2Points: document.getElementById("stats-bar-2-points"),
  statsBar3Points: document.getElementById("stats-bar-3-points"),
  statsGlobalAvg: document.getElementById("stats-global-avg"),
  statsGlobalPoints: document.getElementById("stats-global-points"),
  statsGlobalBar: document.getElementById("stats-global-bar"),
  statsEvolutionPath: document.getElementById("stats-evolution-path"),
  statsEvolutionSuccessLine: document.getElementById("stats-evolution-success-line"),
  statsEvolutionRange: document.getElementById("stats-evolution-range"),
  statsEvolutionAxis: document.getElementById("stats-evolution-axis"),
  statsFullCount: document.getElementById("stats-full-count"),
  statsMissCount: document.getElementById("stats-miss-count"),
  statsDoubleMissCount: document.getElementById("stats-double-miss-count"),
  statsScoreDist: document.getElementById("stats-score-dist"),
  statsTabSummary: document.getElementById("stats-tab-summary"),
  statsTabGroups: document.getElementById("stats-tab-groups"),
  statsGroupDistCard: document.getElementById("stats-group-dist-card"),
  statsGroupDist: document.getElementById("stats-group-dist"),
  appVersion: document.getElementById("app-version"),
  flashInfo: document.getElementById("flash-info"),
  configBtn: document.getElementById("config-btn"),
  configModal: document.getElementById("config-modal"),
  configModalOverlay: document.getElementById("config-modal-overlay"),
  configCloseBtn: document.getElementById("config-close-btn"),
  configExportHistoryBtn: document.getElementById("config-export-history-btn"),
  configImportHistoryBtn: document.getElementById("config-import-history-btn"),
  configImportHistoryInput: document.getElementById("config-import-history-input"),
  configSaveServerBtn: document.getElementById("config-save-server-btn"),
  configRestoreServerBtn: document.getElementById("config-restore-server-btn"),
  weaponSelect: document.getElementById("weapon-select"),
  soloOptionsPanel: document.getElementById("solo-options-panel"),
  volleyTitleText: document.getElementById("volley-title-text"),
  volleyCounter: document.getElementById("volley-counter"),
  volleyWeaponLabel: document.getElementById("volley-weapon-label"),
  segmentStats: document.getElementById("segment-stats"),
  configFullTargetTeam: document.getElementById("config-full-target-team"),
  configFullTargetTeamValue: document.getElementById("config-full-target-team-value"),
  configFullTargetIndiv: document.getElementById("config-full-target-indiv"),
  configFullTargetIndivValue: document.getElementById("config-full-target-indiv-value"),
  configMissLimitTeam: document.getElementById("config-miss-limit-team"),
  configMissLimitTeamValue: document.getElementById("config-miss-limit-team-value"),
  configMissLimitIndiv: document.getElementById("config-miss-limit-indiv"),
  configMissLimitIndivValue: document.getElementById("config-miss-limit-indiv-value"),
  useTargetGroupsInputs: document.querySelectorAll('input[name="use-target-groups"]'),
  showScoresInputs: document.querySelectorAll('input[name="show-scores"]'),
  groupColumnHeader: document.getElementById("group-column-header"),
  statsTabGroupsBtn: document.getElementById("stats-tab-groups-btn"),
  statsTabComments: document.getElementById("stats-tab-comments"),
  statsCommentsInput: document.getElementById("stats-comments-input"),
  statsCommentsCount: document.getElementById("stats-comments-count"),
  statsCommentsSaveBtn: document.getElementById("stats-comments-save-btn"),
  statsCommentsSaveFeedback: document.getElementById("stats-comments-save-feedback"),
  homeScreen: document.getElementById("home-screen"),
  homeTrainingBtn: document.getElementById("home-training-btn"),
  homeTrainingTileBtn: document.getElementById("home-training-tile-btn"),
  homePelotonBtn: document.getElementById("home-peloton-btn"),
  homeHistoryBtn: document.getElementById("home-history-btn"),
  homeStatsBtn: document.getElementById("home-stats-btn"),
  homeConfigBtn: document.getElementById("home-config-btn"),
  homeLoginBtn: document.getElementById("home-login-btn"),
  homeHelpBtn: document.getElementById("home-help-btn"),
  loginModal: document.getElementById("login-modal"),
  loginModalOverlay: document.getElementById("login-modal-overlay"),
  loginCloseBtn: document.getElementById("login-close-btn"),
  loginForm: document.getElementById("login-form"),
  loginEmailInput: document.getElementById("login-email-input"),
  loginPasswordInput: document.getElementById("login-password-input"),
  loginFeedback: document.getElementById("login-feedback"),
  loginSubmitBtn: document.getElementById("login-submit-btn"),
  multiModal: document.getElementById("multi-modal"),
  multiModalOverlay: document.getElementById("multi-modal-overlay"),
  multiCloseBtn: document.getElementById("multi-close-btn"),
  multiRulesetSelect: document.getElementById("multi-ruleset-select"),
  rulesetLabel: document.getElementById("ruleset-label"),
  multiModeSelect: document.getElementById("multi-mode-select"),
  multiModeOptionContest: document.getElementById("multi-mode-option-contest"),
  contestCodeContainer: document.getElementById("contest-code-container"),
  contestCodeInput: document.getElementById("contest-code-input"),
  contestWeaponContainer: document.getElementById("contest-weapon-container"),
  multiContestWeaponSelect: document.getElementById("multi-contest-weapon-select"),
  multiStartBtn: document.getElementById("multi-start-btn"),
  multiTargetCountInputs: document.querySelectorAll('input[name="multi-target-count"]'),
  trainingModal: document.getElementById("training-modal"),
  trainingModalOverlay: document.getElementById("training-modal-overlay"),
  trainingCloseBtn: document.getElementById("training-close-btn"),
  trainingOptionSelect: document.getElementById("training-option-select"),
  trainingHoldTimeForm: document.getElementById("training-hold-time-form"),
  trainingStartBtn: document.getElementById("training-start-btn"),
  trainingSeriesInput: document.getElementById("training-series-input"),
  trainingSeriesValue: document.getElementById("training-series-value"),
  trainingRepetitionsInput: document.getElementById("training-repetitions-input"),
  trainingRepetitionsValue: document.getElementById("training-repetitions-value"),
  trainingHoldSecondsInput: document.getElementById("training-hold-seconds-input"),
  trainingHoldSecondsValue: document.getElementById("training-hold-seconds-value"),
  trainingRestSecondsInput: document.getElementById("training-rest-seconds-input"),
  trainingRestSecondsValue: document.getElementById("training-rest-seconds-value"),
  trainingHoldModal: document.getElementById("training-hold-modal"),
  trainingHoldModalOverlay: document.getElementById("training-hold-modal-overlay"),
  trainingHoldCloseBtn: document.getElementById("training-hold-close-btn"),
  trainingHoldSeriesText: document.getElementById("training-hold-series-text"),
  trainingHoldSeriesValue: document.getElementById("training-hold-series-value"),
  trainingHoldRepetitionsText: document.getElementById("training-hold-repetitions-text"),
  trainingHoldRepetitionsValue: document.getElementById("training-hold-repetitions-value"),
  trainingCycleRing: document.getElementById("training-cycle-ring"),
  trainingCycleRingValue: document.getElementById("training-cycle-ring-value"),
  trainingCycleRingLabel: document.getElementById("training-cycle-ring-label"),
  trainingCycleToggleBtn: document.getElementById("training-cycle-toggle-btn"),
  trainingCycleToggleText: document.getElementById("training-cycle-toggle-text"),
  trainingCycleToggleIcon: document.getElementById("training-cycle-toggle-icon"),
  targetCountFieldset: document.getElementById("target-count-fieldset"),
  duelNamesContainer: document.getElementById("duel-names-container"),
    duelNamesError: document.getElementById("duel-names-error"),
  pelotonNamesContainer: document.getElementById("peloton-names-container"),
  pelotonNamesError: document.getElementById("peloton-names-error"),
  pelotonNameInputs: [1, 2, 3, 4, 5, 6].map((i) => document.getElementById(`peloton-name-p${i}`)),
  pelotonModal: document.getElementById("peloton-modal"),
  pelotonModalOverlay: document.getElementById("peloton-modal-overlay"),
  pelotonModalTitleText: document.getElementById("peloton-modal-title-text"),
  pelotonCloseBtn: document.getElementById("peloton-close-btn"),
  pelotonArchersGrid: document.getElementById("peloton-archers-grid"),
  pelotonStationNumber: document.getElementById("peloton-station-number"),
  pelotonStationArcherName: document.getElementById("peloton-station-archer-name"),
  pelotonSummaryCard: document.getElementById("peloton-summary-card"),
  pelotonArcherLabel: document.getElementById("peloton-archer-label"),
  pelotonTotal: document.getElementById("peloton-total"),
  pelotonCurrentCard: document.getElementById("peloton-current-card"),
  pelotonHistory: document.getElementById("peloton-history"),
  pelotonCurrentShootDisplay: document.getElementById("peloton-current-shoot-display"),
  pelotonPointsPad: document.getElementById("peloton-points-pad"),
  pelotonStepBackBtn: document.getElementById("peloton-step-back-btn"),
  pelotonRestartBtn: document.getElementById("peloton-restart-btn"),
  pelotonScoreEntryPanel: document.getElementById("peloton-score-entry-panel"),
  duelModal: document.getElementById("duel-modal"),
  duelModalOverlay: document.getElementById("duel-modal-overlay"),
  duelModalTitleText: document.getElementById("duel-modal-title-text"),
  duelCloseBtn: document.getElementById("duel-close-btn"),
  duelVolleyNumber: document.getElementById("duel-volley-number"),
  duelTargetCounter: document.getElementById("duel-target-counter"),
  duelActivePlayer: document.getElementById("duel-active-player"),
  duelTotalP1: document.getElementById("duel-total-p1"),
  duelTotalP2: document.getElementById("duel-total-p2"),
  duelCurrentP1: document.getElementById("duel-current-p1"),
  duelCurrentP2: document.getElementById("duel-current-p2"),
  duelCurrentShootDisplay: document.getElementById("duel-current-shoot-display"),
  duelPointsPad: document.getElementById("duel-points-pad"),
  duelPointsRuleHint: document.getElementById("duel-points-rule-hint"),
  duelStepBackBtn: document.getElementById("duel-step-back-btn"),
  duelRestartBtn: document.getElementById("duel-restart-btn"),
  duelNameP1: document.getElementById("duel-name-p1"),
  duelNameP2: document.getElementById("duel-name-p2"),
  duelBotRow: document.getElementById("duel-bot-row"),
  duelBotSliderWrap: document.getElementById("duel-bot-slider-wrap"),
  duelBotBadge: document.getElementById("duel-bot-badge"),
  duelBotLevelSlider: document.getElementById("duel-bot-level-slider"),
  duelBotHeadline: document.getElementById("duel-bot-headline"),
  multiModalCard: document.getElementById("multi-modal-card"),
  duelP1Label: document.getElementById("duel-p1-label"),
  duelP2Label: document.getElementById("duel-p2-label"),
  duelP1CurrentLabel: document.getElementById("duel-p1-current-label"),
  duelP2CurrentLabel: document.getElementById("duel-p2-current-label"),
  duelSummaryCardP1: document.getElementById("duel-summary-card-p1"),
  duelSummaryCardP2: document.getElementById("duel-summary-card-p2"),
  duelHistoryP1: document.getElementById("duel-history-p1"),
  duelHistoryP2: document.getElementById("duel-history-p2"),
  helpVersion: document.getElementById("help-version"),
};

// Sentinel for "X" score (Field/Hunter: inner-bull, counted as 5 pts)
const FIELD_X = 5.5;

const presets = {
  nature: [20, 15, 10, 0],
  campagne: [6, 5, 4, 3, 2, 1, 0],
  "3d": [11, 10, 8, 5, 0],
  field: [FIELD_X, 5, 4, 3, 0],
  "3d2": [10, 8, 5, 0],
  "3dh": [20, 16, 10, 0],
  ar: [20, 18, 16, 14, 12, 10, 0],
};

let statsCommentsSaveFeedbackTimeout = null;
let welcomeModalTimer = null;
let trainingCycleIntervalId = null;
let duelBotMode = false;
let duelBotShotTimeoutId = null;
let trainingCycleState = null;
let trainingAudioContext = null;
const TRAINING_VOICE_VOLUME = 0.55;

function getTrainingAudioContext() {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) return null;
  if (!trainingAudioContext) {
    trainingAudioContext = new AudioContextCtor();
  }
  if (trainingAudioContext.state === "suspended") {
    trainingAudioContext.resume().catch(() => {
      // Ignore audio resume failures.
    });
  }
  return trainingAudioContext;
}

function mixHexColor(startHex, endHex, ratio) {
  const safeRatio = Math.max(0, Math.min(1, ratio));
  const startR = Number.parseInt(startHex.slice(1, 3), 16);
  const startG = Number.parseInt(startHex.slice(3, 5), 16);
  const startB = Number.parseInt(startHex.slice(5, 7), 16);
  const endR = Number.parseInt(endHex.slice(1, 3), 16);
  const endG = Number.parseInt(endHex.slice(3, 5), 16);
  const endB = Number.parseInt(endHex.slice(5, 7), 16);

  const r = Math.round(startR + (endR - startR) * safeRatio);
  const g = Math.round(startG + (endG - startG) * safeRatio);
  const b = Math.round(startB + (endB - startB) * safeRatio);

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function getDuelBotSliderColor(level) {
  const normalized = Math.max(0, Math.min(1, level / 20));
  const colorStops = [
    { at: 0, color: "#1f6feb" },
    { at: 0.25, color: "#2d6a4f" },
    { at: 0.5, color: "#facc15" },
    { at: 0.75, color: "#f59e0b" },
    { at: 1, color: "#c62828" },
  ];

  for (let i = 0; i < colorStops.length - 1; i += 1) {
    const left = colorStops[i];
    const right = colorStops[i + 1];
    if (normalized <= right.at) {
      const localRatio = (normalized - left.at) / (right.at - left.at);
      return mixHexColor(left.color, right.color, localRatio);
    }
  }

  return colorStops[colorStops.length - 1].color;
}

function updateDuelBotLevelUI() {
  if (!els.duelBotLevelSlider || !els.duelBotHeadline) return;
  const value = Number.parseInt(els.duelBotLevelSlider.value, 10);
  const safeValue = Number.isInteger(value) ? Math.min(20, Math.max(1, value)) : 3;
  els.duelBotLevelSlider.value = String(safeValue);

  const progressPct = ((safeValue - 1) / 19) * 100;
  const trackColor = getDuelBotSliderColor(safeValue);
  els.duelBotLevelSlider.style.setProperty("--duel-bot-progress", `${progressPct}%`);
  els.duelBotLevelSlider.style.setProperty("--duel-bot-color", trackColor);

  let levelLabel = "Débutant";
  if (safeValue === 20) {
    levelLabel = "Élite";
  } else if (safeValue >= 18) {
    levelLabel = "Expert";
  } else if (safeValue >= 14) {
    levelLabel = "Pro";
  } else if (safeValue >= 10) {
    levelLabel = "Avancé";
  } else if (safeValue >= 8) {
    levelLabel = "Intermédiare";
  }

  els.duelBotHeadline.textContent = `Mode Bot activé : ${levelLabel}`;
}

function getCurrentDuelBotLevel() {
  if (!els.duelBotLevelSlider) return 3;
  const value = Number.parseInt(els.duelBotLevelSlider.value, 10);
  return Number.isInteger(value) ? Math.min(20, Math.max(1, value)) : 3;
}

function clearDuelBotShotTimer() {
  if (!duelBotShotTimeoutId) return;
  window.clearTimeout(duelBotShotTimeoutId);
  duelBotShotTimeoutId = null;
}

function getDuelBotMissChance(level) {
  const safeLevel = Math.min(20, Math.max(1, Number(level) || 1));
  const minMissChance = 0.03;
  // More progressive curve: still ~40% at level 1 and ~5% at level 20,
  // with higher miss chance in mid-levels compared to the previous tuning.
  const hyperbolaBase = -0.005263157894736858;
  const hyperbolaScale = 1.2157894736842105;
  const hyperbolaOffset = 2;
  const rawMissChance = hyperbolaBase + hyperbolaScale / (safeLevel + hyperbolaOffset);
  return Math.max(minMissChance, rawMissChance);
}

function pickDuelBotScore(selectablePoints, level) {
  if (!Array.isArray(selectablePoints) || selectablePoints.length === 0) return 0;

  const sorted = [...selectablePoints].sort((a, b) => scoreToValue(b) - scoreToValue(a));
  const missValue = sorted.find((point) => scoreToValue(point) === 0);
  const scoringOnly = sorted.filter((point) => scoreToValue(point) > 0);
  if (scoringOnly.length === 0) return missValue ?? 0;

  const missChance = getDuelBotMissChance(level);
  const topBandChance = Math.min(0.95, 0.10 + level * 0.035);
  const highBandCount = Math.max(1, Math.ceil(scoringOnly.length * 0.45));
  const highBand = scoringOnly.slice(0, highBandCount);
  const lowBand = scoringOnly.slice(highBandCount);

  const roll = Math.random();
  if (missValue !== undefined && roll < missChance) {
    return missValue;
  }

  const roll2 = Math.random();
  const pool = roll2 < topBandChance || lowBand.length === 0 ? highBand : lowBand;

  // Higher levels skew draws toward the best scores while keeping occasional variance.
  const spread = Math.max(0, pool.length - 1);
  const exponent = 1 + level * 0.12;
  const index = Math.min(spread, Math.floor(Math.pow(Math.random(), exponent) * (spread + 1)));
  return pool[index] ?? pool[0];
}

function runDuelBotTurnIfNeeded() {
  if (!duelBotMode || duelBotShotTimeoutId) return;
  if (!state.duel || state.duel.completed || state.duel.previewLocked || state.duel.activePlayer !== 2) return;

  const shoot = () => {
    duelBotShotTimeoutId = null;
    if (!duelBotMode || !state.duel || state.duel.completed || state.duel.previewLocked || state.duel.activePlayer !== 2) {
      return;
    }

    const selectablePoints = getSelectablePointsForArrow(
      state.duel.ruleset,
      "individual",
      state.duel.currentArrowIndex,
      state.duel.allowedPoints,
    );
    const botLevel = getCurrentDuelBotLevel();
    const botScore = pickDuelBotScore(selectablePoints, botLevel);
    registerDuelScore(botScore);

    if (duelBotMode && state.duel && !state.duel.completed && !state.duel.previewLocked && state.duel.activePlayer === 2) {
      duelBotShotTimeoutId = window.setTimeout(shoot, 180 + Math.floor(Math.random() * 260));
    }
  };

  duelBotShotTimeoutId = window.setTimeout(shoot, 260);
}

function playTrainingBeepSequence(beeps = []) {
  const audioContext = getTrainingAudioContext();
  if (!audioContext || !Array.isArray(beeps) || beeps.length === 0) return;

  const startAt = audioContext.currentTime + 0.02;
  beeps.forEach((beep, index) => {
    const duration = Number.isFinite(beep.duration) ? Math.max(0.04, beep.duration) : 0.12;
    const frequency = Number.isFinite(beep.frequency) ? beep.frequency : 880;
    const delay = Number.isFinite(beep.delay) ? Math.max(0, beep.delay) : index * 0.18;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const beepStart = startAt + delay;
    const beepEnd = beepStart + duration;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, beepStart);
    gainNode.gain.setValueAtTime(0.0001, beepStart);
    gainNode.gain.exponentialRampToValueAtTime(0.22, beepStart + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, beepEnd);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start(beepStart);
    oscillator.stop(beepEnd + 0.02);
  });
}

function speakTrainingRestPrompt() {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
    return;
  }
  const utterance = new SpeechSynthesisUtterance("Exercice");
  utterance.lang = "fr-FR";
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = TRAINING_VOICE_VOLUME;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function speakTrainingExercisePrompt() {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
    return;
  }
  const utterance = new SpeechSynthesisUtterance("Repos");
  utterance.lang = "fr-FR";
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = TRAINING_VOICE_VOLUME;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function speakTrainingSeriesBreak(seriesNumber) {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
    return;
  }
  const safeSeriesNumber = Number.isInteger(seriesNumber) && seriesNumber > 0 ? seriesNumber : null;
  const message = safeSeriesNumber ? `Fin de série ${safeSeriesNumber}` : "Fin de série";
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = "fr-FR";
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = TRAINING_VOICE_VOLUME;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function speakTrainingExerciseEnd() {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
    return;
  }
  const utterance = new SpeechSynthesisUtterance("fin exercice");
  utterance.lang = "fr-FR";
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = TRAINING_VOICE_VOLUME;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function speakTrainingExerciseStart() {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
    return;
  }
  const utterance = new SpeechSynthesisUtterance("Début exercice");
  utterance.lang = "fr-FR";
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = TRAINING_VOICE_VOLUME;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function scoreToValue(s) {
  return s === FIELD_X ? 5 : (s ?? 0);
}

function scoreLabel(s) {
  if (s === null) return "-";
  if (s === 0) return "M";
  if (s === FIELD_X) return "X";
  return String(s);
}

const defaultTargetsByRuleset = {
  nature: 21,
  campagne: 24,
  "3d": 24,
  field: 14,
  "3d2": 14,
  "3dh": 14,
  ar: 14,
};

const appConfig = {
  fullTarget_team: 7,
  fullTarget_individual: 5,
  missLimit_team: 5,
  missLimit_individual: 3,
  successZoneByRuleset: {},
  trainingHold: {
    ...TRAINING_SETTINGS_DEFAULTS,
  },
  enabledRulesets: ["nature", "campagne", "3d", "3d2", "3dh", "ar", "field"],
};

function loadConfig() {
  try {
    const raw = window.localStorage.getItem(CONFIG_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      // Migrate legacy single-value config
      if (Number.isFinite(saved.fullTarget) && saved.fullTarget_team === undefined) {
        appConfig.fullTarget_team = saved.fullTarget;
        appConfig.fullTarget_individual = saved.fullTarget;
      }
      if (Number.isFinite(saved.missLimit) && saved.missLimit_team === undefined) {
        appConfig.missLimit_team = saved.missLimit;
        appConfig.missLimit_individual = saved.missLimit;
      }
      if (Number.isFinite(saved.fullTarget_team)) appConfig.fullTarget_team = saved.fullTarget_team;
      if (Number.isFinite(saved.fullTarget_individual)) appConfig.fullTarget_individual = saved.fullTarget_individual;
      if (Number.isFinite(saved.missLimit_team)) appConfig.missLimit_team = saved.missLimit_team;
      if (Number.isFinite(saved.missLimit_individual)) appConfig.missLimit_individual = saved.missLimit_individual;
      if (saved.successZoneByRuleset && typeof saved.successZoneByRuleset === "object") {
        Object.assign(appConfig.successZoneByRuleset, saved.successZoneByRuleset);
      }
      if (saved.trainingHold && typeof saved.trainingHold === "object") {
        const parsedSeries = Number.parseInt(saved.trainingHold.series, 10);
        const parsedRepetitions = Number.parseInt(saved.trainingHold.repetitions, 10);
        const parsedHoldSeconds = Number.parseInt(saved.trainingHold.holdSeconds, 10);
        const parsedRestSeconds = Number.parseInt(saved.trainingHold.restSeconds, 10);
        appConfig.trainingHold.series = Number.isInteger(parsedSeries)
          ? Math.min(6, Math.max(3, parsedSeries))
          : TRAINING_SETTINGS_DEFAULTS.series;
        appConfig.trainingHold.repetitions = Number.isInteger(parsedRepetitions)
          ? Math.min(6, Math.max(3, parsedRepetitions))
          : TRAINING_SETTINGS_DEFAULTS.repetitions;
        appConfig.trainingHold.holdSeconds = Number.isInteger(parsedHoldSeconds)
          ? Math.min(12, Math.max(2, parsedHoldSeconds))
          : TRAINING_SETTINGS_DEFAULTS.holdSeconds;
        appConfig.trainingHold.restSeconds = Number.isInteger(parsedRestSeconds)
          ? Math.min(30, Math.max(5, parsedRestSeconds))
          : TRAINING_SETTINGS_DEFAULTS.restSeconds;
      }
      if (Array.isArray(saved.enabledRulesets)) {
        appConfig.enabledRulesets = saved.enabledRulesets;
      }
    }
  } catch { /* ignore */ }
}

function saveConfig() {
  try {
    window.localStorage.setItem(CONFIG_KEY, JSON.stringify(appConfig));
  } catch { /* ignore */ }
}

function syncConfigSliderMax() {
  const max = getTargetCountForRuleset(els.rulesetSelect.value);
  els.configFullTargetTeam.max = String(max);
  els.configFullTargetIndiv.max = String(max);
  els.configMissLimitTeam.max = String(max);
  els.configMissLimitIndiv.max = String(max);
  let changed = false;
  if (appConfig.fullTarget_team > max) { appConfig.fullTarget_team = max; changed = true; }
  if (appConfig.fullTarget_individual > max) { appConfig.fullTarget_individual = max; changed = true; }
  if (appConfig.missLimit_team > max) { appConfig.missLimit_team = max; changed = true; }
  if (appConfig.missLimit_individual > max) { appConfig.missLimit_individual = max; changed = true; }
  if (changed) saveConfig();
}

function openConfigModal() {
  closeStatsModal();
  closeGeneralStatsModal();
  closeHelpModal();
  closeTrainingModal();
  closeTrainingHoldModal();
  closeLoginModal();
  closeHistoryModal();
  closeMultiModal();
  closeDuelModal();
  syncConfigSliderMax();
  els.configFullTargetTeam.value = String(appConfig.fullTarget_team);
  els.configFullTargetTeamValue.textContent = String(appConfig.fullTarget_team);
  els.configFullTargetIndiv.value = String(appConfig.fullTarget_individual);
  els.configFullTargetIndivValue.textContent = String(appConfig.fullTarget_individual);
  els.configMissLimitTeam.value = String(appConfig.missLimit_team);
  els.configMissLimitTeamValue.textContent = String(appConfig.missLimit_team);
  els.configMissLimitIndiv.value = String(appConfig.missLimit_individual);
  els.configMissLimitIndivValue.textContent = String(appConfig.missLimit_individual);
  syncRulesetCheckboxes();
  els.configModal.classList.remove("hidden");
}

function closeConfigModal() {
  els.configModal.classList.add("hidden");
  updateRulesetSelectOptions();
}

function syncRulesetCheckboxes() {
  const rulesetCheckboxes = document.querySelectorAll(".config-ruleset-cb");
  rulesetCheckboxes.forEach((cb) => {
    cb.checked = appConfig.enabledRulesets.includes(cb.value);
  });
  syncFederationCheckboxes();
}

function syncFederationCheckboxes() {
  const fftaCheckboxes = document.querySelectorAll('.config-ruleset-cb[data-federation="FFTA"]');
  const fftlCheckboxes = document.querySelectorAll('.config-ruleset-cb[data-federation="FFTL"]');
  const fftaCheckbox = document.getElementById("config-fed-ffta");
  const fftlCheckbox = document.getElementById("config-fed-fftl");
  
  if (fftaCheckbox) {
    const allFFTAChecked = Array.from(fftaCheckboxes).every((cb) => cb.checked);
    const someFFTAChecked = Array.from(fftaCheckboxes).some((cb) => cb.checked);
    fftaCheckbox.checked = allFFTAChecked;
    fftaCheckbox.indeterminate = someFFTAChecked && !allFFTAChecked;
  }
  
  if (fftlCheckbox) {
    const allFFTLChecked = Array.from(fftlCheckboxes).every((cb) => cb.checked);
    const someFFTLChecked = Array.from(fftlCheckboxes).some((cb) => cb.checked);
    fftlCheckbox.checked = allFFTLChecked;
    fftlCheckbox.indeterminate = someFFTLChecked && !allFFTLChecked;
  }
}

function updateRulesetSelectOptions() {
  const selects = [els.rulesetSelect, els.multiRulesetSelect].filter(Boolean);

  selects.forEach((select) => {
    const currentValue = select.value;
    const allOptions = select.querySelectorAll("option");

    allOptions.forEach((option) => {
      const value = option.value;
      if (value && appConfig.enabledRulesets.includes(value)) {
        option.disabled = false;
        option.style.display = "";
      } else if (value) {
        option.disabled = true;
        option.style.display = "none";
      }
    });

    // Masquer les optgroups vides
    const optgroups = select.querySelectorAll("optgroup");
    optgroups.forEach((optgroup) => {
      const visibleOptions = Array.from(optgroup.querySelectorAll("option")).filter(
        (opt) => opt.value && appConfig.enabledRulesets.includes(opt.value)
      );
      if (visibleOptions.length === 0) {
        optgroup.style.display = "none";
      } else {
        optgroup.style.display = "";
      }
    });

    // Si l'option actuelle est désactivée, sélectionner la première option activée
    if (currentValue && !appConfig.enabledRulesets.includes(currentValue)) {
      const firstEnabledOption = Array.from(allOptions).find(
        (option) => option.value && appConfig.enabledRulesets.includes(option.value)
      );
      if (firstEnabledOption) {
        select.value = firstEnabledOption.value;
        if (select === els.rulesetSelect) {
          select.dispatchEvent(new Event("change"));
        }
      }
    }
  });
}

const maxArrowValuesByRuleset = {
  nature: {
    team: [20, 15, 20, 15, 20, 15],
    individual: [20, 15],
  },
  campagne: [6, 6, 6],
  "3d": {
    team: [11, 11, 11, 11, 11, 11],
    individual: [11, 11],
    mixed: [11, 11, 11, 11],
  },
  field: [5, 5, 5, 5],
  "3d2": [10, 10],
  "3dh": [20],
  ar: [20, 16, 12],
};

const targetGroupsByRuleset = {
  nature: ["PA", "PG", "MG", "GG"],
  "3d": ["G1", "G2", "G3", "G4"],
  field: ["65", "50", "35", "20"],
  "3d2": ["G1", "G2", "G3", "G4"],
  "3dh": ["G1", "G2", "G3", "G4"],
  ar: ["G1", "G2", "G3", "G4"],
};

let flashTimerId = null;

function showFlashInfo(message) {
  els.flashInfo.textContent = message;
  els.flashInfo.classList.remove("hidden");
  if (flashTimerId) {
    window.clearTimeout(flashTimerId);
  }
  flashTimerId = window.setTimeout(() => {
    els.flashInfo.classList.add("hidden");
    flashTimerId = null;
  }, FLASH_INFO_MS);
}

function getSetupSnapshot() {
  return {
    ruleset: els.rulesetSelect.value,
    scoringMode: getSelectedScoringMode(),
    weapon: els.weaponSelect ? els.weaponSelect.value : "",
    successZone: Number.parseInt(els.successZoneInput.value, 10) || 1,
    sessionDate: els.sessionDateInput ? els.sessionDateInput.value : "",
    sessionTime: els.sessionTimeInput ? els.sessionTimeInput.value : "",
    useTargetGroups: getSelectedUseTargetGroups(),
    showScores: getSelectedShowScores(),
  };
}

function getGroupsForRuleset(ruleset) {
  return targetGroupsByRuleset[ruleset] || [];
}

const weaponsByFederation = {
  FFTA: [
    { code: "AC", libelle: "Arc de chasse" },
    { code: "AD", libelle: "Arc droit" },
    { code: "BB", libelle: "Barebow" },
    { code: "CL", libelle: "Classique" },
    { code: "CO", libelle: "Compound" },
    { code: "TL", libelle: "Tir libre" },
  ],
  FFTL: [
    { code: "BB-C", libelle: "Barebow compound" },
    { code: "BB-R", libelle: "Barebow recurve" },
    { code: "BH-C", libelle: "Bowhunter compound" },
    { code: "BH-R", libelle: "Bowhunter recurve" },
    { code: "BL", libelle: "Bowhunter limited" },
    { code: "BU", libelle: "Bowhunter unlimited" },
    { code: "FS-R", libelle: "Freestyle recurve" },
    { code: "FS-C", libelle: "Freestyle compound" },
    { code: "FU", libelle: "Freestyle unlimited" },
    { code: "HB", libelle: "Historical bow" },
    { code: "LB", libelle: "Longbow" },
    { code: "TR", libelle: "Traditional recurve" },
  ],
};

function getFederationByRuleset(ruleset) {
  return isFFTLRuleset(ruleset) ? "FFTL" : "FFTA";
}

function formatWeaponLabel(code) {
  for (const weapon of weaponsByFederation.FFTA) {
    if (weapon.code === code) return weapon.libelle;
  }
  for (const weapon of weaponsByFederation.FFTL) {
    if (weapon.code === code) return weapon.libelle;
  }
  return code || "";
}

function formatRulesetLabel(value) {
  if (value === "nature") return "Nature";
  if (value === "campagne") return "Campagne";
  if (value === "3d") return "3D";
  if (value === "field") return "Field / Hunter";
  if (value === "3d2") return "3D Two Shoots";
  if (value === "3dh") return "3D Hunting";
  if (value === "ar") return "Animal round";
  return value || "-";
}

function getWeaponsForRuleset(ruleset) {
  const federation = getFederationByRuleset(ruleset);
  return (weaponsByFederation[federation] || []).map((weapon) => weapon.code);
}

function isWeaponAllowedForRuleset(weapon, ruleset) {
  return getWeaponsForRuleset(ruleset).includes(weapon);
}

function syncWeaponSelectOptions(preferredWeapon = null) {
  if (!els.weaponSelect) return;
  const ruleset = els.rulesetSelect.value;
  const federation = getFederationByRuleset(ruleset);
  const federationWeapons = weaponsByFederation[federation] || [];
  const allowedWeapons = getWeaponsForRuleset(ruleset);
  const currentWeapon = preferredWeapon || els.weaponSelect.value;
  const selectedWeapon = allowedWeapons.includes(currentWeapon) ? currentWeapon : allowedWeapons[0];

  els.weaponSelect.innerHTML = federationWeapons
    .map((weapon) => `<option value="${weapon.code}">${weapon.code} - ${weapon.libelle}</option>`)
    .join("");
  els.weaponSelect.value = selectedWeapon;
}

function syncMultiContestWeaponSelectOptions(preferredWeapon = null) {
  if (!els.multiContestWeaponSelect) return;
  const ruleset = els.multiRulesetSelect?.value || els.rulesetSelect.value;
  const federation = getFederationByRuleset(ruleset);
  const federationWeapons = weaponsByFederation[federation] || [];
  const allowedWeapons = getWeaponsForRuleset(ruleset);
  const currentWeapon = preferredWeapon || els.multiContestWeaponSelect.value;
  const selectedWeapon = allowedWeapons.includes(currentWeapon)
    ? currentWeapon
    : (allowedWeapons[0] || "");

  els.multiContestWeaponSelect.innerHTML = federationWeapons
    .map((weapon) => `<option value="${weapon.code}">${weapon.code} - ${weapon.libelle}</option>`)
    .join("");

  if (selectedWeapon) {
    els.multiContestWeaponSelect.value = selectedWeapon;
  }
}

function getStoredContestWeapon() {
  try {
    return (window.localStorage.getItem(CONTEST_WEAPON_KEY) || "").trim();
  } catch {
    return "";
  }
}

function storeContestWeapon(weapon) {
  if (typeof weapon !== "string") return;
  const normalizedWeapon = weapon.trim();
  try {
    if (!normalizedWeapon) {
      window.localStorage.removeItem(CONTEST_WEAPON_KEY);
      return;
    }
    window.localStorage.setItem(CONTEST_WEAPON_KEY, normalizedWeapon);
  } catch {
    // Ignore storage failures.
  }
}

function getGroupLabel(group) {
  if (group === "PA") return "Petit animal";
  if (group === "PG") return "Petit gibier";
  if (group === "MG") return "Moyen gibier";
  if (group === "GG") return "Grand gibier";
  if (group === "G1") return "Groupe 1";
  if (group === "G2") return "Groupe 2";
  if (group === "G3") return "Groupe 3";
  if (group === "G4") return "Groupe 4";
  return group;
}

function getSelectedTargetGroup() {
  if (!state.useTargetGroups || state.contestMode) {
    return "";
  }
  const checked = els.targetGroupSelect.querySelector('input[name="target-group"]:checked');
  return checked ? checked.value : "";
}

function shouldUseTargetGroupsForScoring() {
  return state.useTargetGroups && !state.contestMode;
}

function syncTargetGroupSelect(selectedValue = null) {
  const groups = getGroupsForRuleset(state.activeRuleset || els.rulesetSelect.value);
  els.targetGroupSelect.innerHTML = groups.map((group) => {
    const checked = selectedValue ? group === selectedValue : group === groups[0];
    return `<label class="target-group-radio${checked ? " active" : ""}">
      <input type="radio" name="target-group" value="${group}" ${checked ? "checked" : ""} />
      <span>${group}</span>
    </label>`;
  }).join("");
  els.targetGroupSelect.querySelectorAll('input[name="target-group"]').forEach((input) => {
    input.addEventListener("change", () => {
      els.targetGroupSelect.querySelectorAll(".target-group-radio").forEach((l) => l.classList.toggle("active", l.querySelector("input").checked));
      persistAppState();
    });
  });
}

function persistAppState() {
  try {
    const isScoringVisible = !els.scoringCard.classList.contains("hidden");
    const payload = {
      version: 1,
      setup: getSetupSnapshot(),
      screen: isScoringVisible ? "scoring" : "setup",
      scoring: isScoringVisible
        ? {
            targetCount: state.targetCount,
            successZone: state.successZone,
            lieu: state.lieu || "",
            sessionDate: state.sessionDate || "",
            sessionTime: state.sessionTime || "",
            scoringMode: state.scoringMode,
            weapon: state.weapon || "",
            useTargetGroups: state.useTargetGroups,
            showScores: state.showScores,
            arrowsPerVolley: state.arrowsPerVolley,
            currentArrowIndex: state.currentArrowIndex,
            shoots: state.shoots.map((volley) => [...volley]),
            currentshoot: [...state.currentshoot],
            activeRuleset: state.activeRuleset,
            allowedPoints: [...state.allowedPoints],
            shootGroups: [...state.shootGroups],
            currentGroup: getSelectedTargetGroup(),
            editingVolleyIndex: state.editingVolleyIndex,
            progressionAxis: state.progressionAxis || "",
          }
        : null,
    };
    window.localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage failures (private mode / quota).
  }

  persistContestProgressState();
}

function getContestProgressStorageKey(contestInfo) {
  if (!contestInfo) return "";
  const uuid = typeof contestInfo.uuid === "string" ? contestInfo.uuid.trim() : "";
  const ruleset = typeof contestInfo.ruleset === "string" ? contestInfo.ruleset.trim() : "";
  if (!uuid || !ruleset) return "";
  return `${uuid}:${ruleset}`;
}

function persistContestProgressState() {
  if (!state.contestMode || !state.contestInfo) return;

  const contestKey = getContestProgressStorageKey(state.contestInfo);
  if (!contestKey) return;

  const scoring = {
    targetCount: state.targetCount,
    successZone: state.successZone,
    lieu: state.lieu || "",
    sessionDate: state.sessionDate || "",
    sessionTime: state.sessionTime || "",
    scoringMode: state.scoringMode,
    weapon: state.weapon || "",
    useTargetGroups: state.useTargetGroups,
    showScores: state.showScores,
    arrowsPerVolley: state.arrowsPerVolley,
    currentArrowIndex: state.currentArrowIndex,
    shoots: state.shoots.map((volley) => [...volley]),
    currentshoot: [...state.currentshoot],
    activeRuleset: state.activeRuleset,
    allowedPoints: [...state.allowedPoints],
    shootGroups: [...state.shootGroups],
    currentGroup: getSelectedTargetGroup(),
    editingVolleyIndex: state.editingVolleyIndex,
    progressionAxis: state.progressionAxis || "",
    completionArchived: state.completionArchived,
  };

  try {
    const raw = window.localStorage.getItem(CONTEST_PROGRESS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const entries = parsed && typeof parsed === "object" ? parsed : {};
    entries[contestKey] = {
      updatedAt: new Date().toISOString(),
      scoring,
    };
    window.localStorage.setItem(CONTEST_PROGRESS_KEY, JSON.stringify(entries));
  } catch {
    // Ignore storage failures (private mode / quota).
  }
}

function getStoredContestProgressScoring(contestInfo) {
  const contestKey = getContestProgressStorageKey(contestInfo);
  if (!contestKey) return null;

  try {
    const raw = window.localStorage.getItem(CONTEST_PROGRESS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.[contestKey]?.scoring || null;
  } catch {
    return null;
  }
}

function restoreContestProgressState(contestInfo, initialScoring = null) {
  const scoring = initialScoring || getStoredContestProgressScoring(contestInfo);

  if (!scoring || scoring.activeRuleset !== state.activeRuleset) {
    return false;
  }

  state.targetCount = Number.isInteger(scoring.targetCount) ? scoring.targetCount : state.targetCount;
  state.successZone = Number.isInteger(scoring.successZone) ? scoring.successZone : state.successZone;
  state.lieu = scoring.lieu || "";
  state.sessionDate = scoring.sessionDate || "";
  state.sessionTime = scoring.sessionTime || "";
  state.scoringMode = normalizeScoringMode(scoring.scoringMode, scoring.activeRuleset);
  state.weapon = isWeaponAllowedForRuleset(scoring.weapon || "", scoring.activeRuleset)
    ? scoring.weapon
    : getWeaponsForRuleset(scoring.activeRuleset)[0];
  state.useTargetGroups = typeof scoring.useTargetGroups === "boolean" ? scoring.useTargetGroups : state.useTargetGroups;
  state.showScores = typeof scoring.showScores === "boolean" ? scoring.showScores : state.showScores;
  state.arrowsPerVolley = getArrowsPerVolley(scoring.activeRuleset, state.scoringMode);
  state.activeRuleset = scoring.activeRuleset;
  state.allowedPoints = Array.isArray(scoring.allowedPoints) && scoring.allowedPoints.length
    ? [...scoring.allowedPoints]
    : [...presets[scoring.activeRuleset]];
  state.successZone = clampSuccessZoneForConfig(
    state.successZone,
    state.activeRuleset,
    state.scoringMode,
    state.arrowsPerVolley,
    state.allowedPoints,
  );
  state.shootGroups = Array.isArray(scoring.shootGroups) ? [...scoring.shootGroups] : [];
  state.editingVolleyIndex = Number.isInteger(scoring.editingVolleyIndex) ? scoring.editingVolleyIndex : null;
  state.shoots = Array.isArray(scoring.shoots)
    ? scoring.shoots
      .map((shoot) => (Array.isArray(shoot) ? [...shoot] : []))
      .filter((shoot) => shoot.length === state.arrowsPerVolley)
    : [];
  state.currentshoot = Array.isArray(scoring.currentshoot)
    ? [...scoring.currentshoot].slice(0, state.arrowsPerVolley)
    : Array(state.arrowsPerVolley).fill(null);
  while (state.currentshoot.length < state.arrowsPerVolley) state.currentshoot.push(null);
  state.currentArrowIndex = Number.isInteger(scoring.currentArrowIndex)
    ? Math.max(0, Math.min(scoring.currentArrowIndex, state.arrowsPerVolley))
    : state.currentshoot.findIndex((value) => value === null);
  if (state.currentArrowIndex < 0) state.currentArrowIndex = state.arrowsPerVolley;
  state.progressionAxis = scoring.progressionAxis || "";
  state.completionArchived = typeof scoring.completionArchived === "boolean"
    ? scoring.completionArchived
    : state.shoots.length === state.targetCount;
  state.resultsPayload = state.shoots.length === state.targetCount ? buildResultsPayload() : null;
  syncTargetGroupSelect(scoring.currentGroup);
  return true;
}

function clearPersistedState() {
  try {
    window.localStorage.removeItem(AUTO_SAVE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

function restorePersistedState() {
  let payload;
  try {
    const raw = window.localStorage.getItem(AUTO_SAVE_KEY);
    if (!raw) return false;
    payload = JSON.parse(raw);
  } catch {
    return false;
  }

  const setup = payload?.setup || {};
  if (setup.ruleset && presets[setup.ruleset]) {
    els.rulesetSelect.value = setup.ruleset;
  }
  syncScoringModeFieldset();
  syncWeaponSelectOptions(setup.weapon || null);
  if ((setup.scoringMode === "team" || setup.scoringMode === "individual" || setup.scoringMode === "mixed")
    && isScoringModeAllowedForRuleset(setup.scoringMode, els.rulesetSelect.value)) {
    els.scoringModeInputs.forEach((input) => {
      input.checked = input.value === setup.scoringMode;
    });
    updateWeaponSelectVisibility();
  }
  if (Number.isInteger(setup.successZone)) {
    els.successZoneInput.value = String(setup.successZone);
  }
  if (els.sessionDateInput && typeof setup.sessionDate === "string") {
    els.sessionDateInput.value = setup.sessionDate;
  }
  if (els.sessionTimeInput && typeof setup.sessionTime === "string") {
    els.sessionTimeInput.value = setup.sessionTime;
  }
  if (typeof setup.useTargetGroups === "boolean") {
    const targetValue = setup.useTargetGroups ? "yes" : "no";
    const input = [...els.useTargetGroupsInputs].find((i) => i.value === targetValue);
    if (input) input.checked = true;
  }
  if (typeof setup.showScores === "boolean") {
    const targetValue = setup.showScores ? "yes" : "no";
    const input = [...els.showScoresInputs].find((i) => i.value === targetValue);
    if (input) input.checked = true;
  }
  syncTargetCountDisplay();
  updateSuccessZoneSlider();

  if (payload?.screen !== "scoring" || !payload.scoring) {
    persistAppState();
    return true;
  }

  const saved = payload.scoring;
  if (!presets[saved.activeRuleset]) {
    return true;
  }

  state.targetCount = Number.isInteger(saved.targetCount) ? saved.targetCount : getTargetCountForRuleset(saved.activeRuleset);
  state.successZone = Number.isInteger(saved.successZone) ? saved.successZone : 1;
  state.lieu = saved.lieu || "";
  state.sessionDate = saved.sessionDate || "";
  state.sessionTime = saved.sessionTime || "";
  if (els.sessionDateInput && saved.sessionDate) {
    els.sessionDateInput.value = saved.sessionDate;
  }
  if (els.sessionTimeInput && saved.sessionTime) {
    els.sessionTimeInput.value = saved.sessionTime;
  }
  state.scoringMode = normalizeScoringMode(saved.scoringMode, saved.activeRuleset);
  state.weapon = isWeaponAllowedForRuleset(saved.weapon || "", saved.activeRuleset)
    ? saved.weapon
    : getWeaponsForRuleset(saved.activeRuleset)[0];
  state.useTargetGroups = typeof saved.useTargetGroups === "boolean" ? saved.useTargetGroups : true;
  state.showScores = typeof saved.showScores === "boolean"
    ? saved.showScores
    : (typeof setup.showScores === "boolean" ? setup.showScores : true);
  state.arrowsPerVolley = getArrowsPerVolley(saved.activeRuleset, state.scoringMode);
  state.activeRuleset = saved.activeRuleset;
  state.allowedPoints = Array.isArray(saved.allowedPoints) && saved.allowedPoints.length ? [...saved.allowedPoints] : [...presets[saved.activeRuleset]];
  // Ensure FIELD_X is present for field sessions (handles stale saved data from before X was added)
  if (saved.activeRuleset === "field" && !state.allowedPoints.includes(FIELD_X)) {
    state.allowedPoints = [...presets.field];
  }
  state.successZone = clampSuccessZoneForConfig(
    state.successZone,
    state.activeRuleset,
    state.scoringMode,
    state.arrowsPerVolley,
    state.allowedPoints,
  );
  state.shootGroups = Array.isArray(saved.shootGroups) ? [...saved.shootGroups] : [];
  state.editingVolleyIndex = Number.isInteger(saved.editingVolleyIndex) ? saved.editingVolleyIndex : null;
  state.shoots = Array.isArray(saved.shoots) ? saved.shoots.map((shoot) => (Array.isArray(shoot) ? [...shoot] : [])).filter((shoot) => shoot.length === state.arrowsPerVolley) : [];
  state.currentshoot = Array.isArray(saved.currentshoot) ? [...saved.currentshoot].slice(0, state.arrowsPerVolley) : Array(state.arrowsPerVolley).fill(null);
  while (state.currentshoot.length < state.arrowsPerVolley) state.currentshoot.push(null);
  state.currentArrowIndex = Number.isInteger(saved.currentArrowIndex) ? Math.max(0, Math.min(saved.currentArrowIndex, state.arrowsPerVolley)) : state.currentshoot.findIndex((value) => value === null);
  if (state.currentArrowIndex < 0) state.currentArrowIndex = state.arrowsPerVolley;
  state.inputLocked = false;
  state.completionArchived = state.shoots.length === state.targetCount;
  state.resultsPayload = state.shoots.length === state.targetCount ? buildResultsPayload() : null;
  state.progressionAxis = saved.progressionAxis || "";
  syncTargetGroupSelect(saved.currentGroup);

  els.setupCard.classList.add("hidden");
  els.scoringCard.classList.remove("hidden");
  els.homeScreen.classList.add("hidden");
  closeStatsModal();
  closeGeneralStatsModal();
  closeHelpModal();
  closeHistoryModal();
  refreshScoringView();
  persistAppState();
  return true;
}

function resetRoundBuffer() {
  state.currentshoot = Array(state.arrowsPerVolley).fill(null);
  state.currentArrowIndex = 0;
}

function roundTotal(round) {
  return round.reduce((sum, value) => sum + scoreToValue(value), 0);
}

function formatScore(value) {
  return scoreLabel(value);
}

function globalTotal() {
  return state.shoots.reduce((sum, volley) => sum + roundTotal(volley), 0);
}

function getProjectedSessionPercent() {
  const completedTargets = state.shoots.length;
  const maxVolley = getMaxVolleyForCurrentConfig();
  const maxSessionTotal = maxVolley * state.targetCount;

  if (completedTargets <= 0 || maxSessionTotal <= 0) {
    return 0;
  }

  const projectedTotal = (globalTotal() / completedTargets) * state.targetCount;
  return Math.max(0, Math.min(100, Math.round((projectedTotal / maxSessionTotal) * 100)));
}

function isSuccessfulVolley(total) {
  return total >= state.successZone;
}

function renderPad() {
  els.pointsPad.innerHTML = "";
  const locked = state.inputLocked;
  getSelectablePointsForCurrentArrow().forEach((score) => {
    const button = document.createElement("button");
    button.className = "point-btn";
    if (score === 0) {
      button.classList.add("zero");
    }
    if (score === FIELD_X) {
      button.classList.add("x-score");
    }
    const isValidForSequence = isScoreAllowedForCurrentArrow(score);
    if (locked) {
      button.classList.add("lock-disabled");
      button.disabled = true;
    } else if (!isValidForSequence) {
      button.disabled = true;
      if (state.scoringMode === "team") {
        button.classList.add("disabled-score");
      }
    }
    button.textContent = scoreLabel(score);
    if (!locked && isValidForSequence) {
      button.addEventListener("click", () => registerScore(score));
    }
    els.pointsPad.appendChild(button);
  });
}

function updateScoringHeader() {
  const shootNumber = state.shoots.length + 1;
  const currentTarget = Math.min(shootNumber, state.targetCount);
  const totalCard = els.teamTotal ? els.teamTotal.closest("article") : null;
  const totalCardLabel = totalCard ? totalCard.querySelector("span") : null;
  if (els.volleyTitleText) {
    if (state.contestMode && state.contestInfo) {
      els.volleyTitleText.textContent = `${state.contestInfo.name} - ${formatRulesetLabel(state.activeRuleset)}`;
    } else {
      els.volleyTitleText.textContent = formatRulesetLabel(state.activeRuleset);
    }
  }
  if (els.volleyWeaponTitle) {
    if (state.contestMode && state.contestInfo) {
      const start = state.contestInfo.startDate || "-";
      const end = state.contestInfo.endDate || "-";
      els.volleyWeaponTitle.textContent = `${start} -> ${end}`;
    } else if (state.weapon) {
      els.volleyWeaponTitle.textContent = formatWeaponLabel(state.weapon);
    } else {
      els.volleyWeaponTitle.textContent = "";
    }
  }
  if (els.volleyWeaponLabel) {
    if (state.contestMode && state.contestInfo) {
      const start = state.contestInfo.startDate || "-";
      const end = state.contestInfo.endDate || "-";
      els.volleyWeaponLabel.textContent = `${start} -> ${end}`;
    } else {
      els.volleyWeaponLabel.textContent = state.weapon ? formatWeaponLabel(state.weapon) : "";
    }
  }
  if (els.targetCounterDisplay) {
    els.targetCounterDisplay.textContent = `${currentTarget}/${state.targetCount}`;
  }
  if (Number.isInteger(state.editingVolleyIndex) && state.editingVolleyIndex >= 0) {
    els.progressText.textContent = `Modification de la volée ${state.editingVolleyIndex + 1}`;
  } else {
    els.progressText.textContent = "";
  }

  if (state.scoringMode === "individual" && !state.showScores) {
    els.teamTotal.innerHTML = `${getProjectedSessionPercent()}<span class="stats-unit">%</span>`;
  } else {
    els.teamTotal.innerHTML = `${globalTotal()}<span class="stats-unit">pts</span>`;
  }

  if (totalCard) {
    if (state.shoots.length > 0) {
      const averageVolley = globalTotal() / state.shoots.length;
      const bgColor = getBarColorByZoneRatio(averageVolley, state.successZone);
      const textColor = bgColor === "#eab308" ? "#1f2a24" : "#fff";
      totalCard.style.background = bgColor;
      totalCard.style.borderColor = bgColor;
      els.teamTotal.style.color = textColor;
      if (totalCardLabel) {
        totalCardLabel.style.color = textColor;
      }
    } else {
      totalCard.style.background = "#fff";
      totalCard.style.borderColor = "var(--line)";
      els.teamTotal.style.color = "";
      if (totalCardLabel) {
        totalCardLabel.style.color = "";
      }
    }
  }

  els.successZoneDisplay.innerHTML = `${state.successZone}<span class="stats-unit">pts</span>`;
  renderSegmentStats();
}

function updateCurrentShootDisplay() {
  if (!els.currentShootDisplay) return;
  const pills = state.currentshoot
    .map((value) => {
      const label = formatScore(value);
      const scoreClass = value === null
        ? "is-empty"
        : value === 0
          ? "is-miss"
          : value === FIELD_X
            ? "is-x"
            : "is-hit";
      return `<span class="current-shoot-pill ${scoreClass}">${label}</span>`;
    })
    .join("");
    els.currentShootDisplay.innerHTML = `${pills}`;
}

function renderCurrentShootPills(container, arrows, arrowCount) {
  if (!container) return;
  const source = Array.isArray(arrows) ? arrows : [];
  const normalized = Array(arrowCount).fill(null).map((_, index) => source[index] ?? null);
  const pills = normalized
    .map((value) => {
      const label = formatScore(value);
      const scoreClass = value === null
        ? "is-empty"
        : value === 0
          ? "is-miss"
          : value === FIELD_X
            ? "is-x"
            : "is-hit";
      return `<span class="current-shoot-pill ${scoreClass}">${label}</span>`;
    })
    .join("");
  container.innerHTML = pills;
}

function refreshScoringView(options = {}) {
  const { scrollHistory = true, scrollCard = false } = options;
  syncSoloScoringCardHeight();
  renderPad();
  updateScoringHeader();
  updateCurrentShootDisplay();
  updateTargetGroupsVisibility();
  renderLiveVolleyHistory();
  updateResultsAvailability();
  persistAppState();
  if (scrollHistory) {
    scrollLiveVolleyHistoryToBottom();
  }
  if (scrollCard) {
    scrollScoringCardToBottom();
  }
}

function updateTargetGroupsVisibility() {
  const show = shouldUseTargetGroupsForScoring();
  if (els.targetGroupSelect) {
    els.targetGroupSelect.style.display = show ? "" : "none";
  }
  if (els.groupColumnHeader) {
    els.groupColumnHeader.style.display = show ? "" : "none";
  }
}

function scrollLiveVolleyHistoryToBottom() {
  if (!els.liveVolleyHistoryWrap) {
    return;
  }
  requestAnimationFrame(() => {
    els.liveVolleyHistoryWrap.scrollTop = els.liveVolleyHistoryWrap.scrollHeight;
  });
}

function syncSoloScoringCardHeight() {
  if (!els.scoringCard || !els.scoreEntryPanel) {
    return;
  }
  const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  const panelHeight = Math.ceil(els.scoreEntryPanel.getBoundingClientRect().height || 0);
  const cardHeight = Math.max(320, Math.floor(viewportHeight - panelHeight));

  document.documentElement.style.setProperty("--solo-score-entry-height", `${panelHeight}px`);
  document.documentElement.style.setProperty("--solo-scoring-card-height", `${cardHeight}px`);
}

function scrollScoringCardToBottom() {
  if (!els.scoringCard) {
    return;
  }
  requestAnimationFrame(() => {
    els.scoringCard.scrollTop = els.scoringCard.scrollHeight;
  });
}

function scrollPelotonHistoryToBottom() {
  if (!els.pelotonHistory) {
    return;
  }
  requestAnimationFrame(() => {
    els.pelotonHistory.scrollTop = els.pelotonHistory.scrollHeight;
  });
}

function renderLiveVolleyHistory() {
  els.liveVolleyHistoryBody.innerHTML = "";
  const maxVolley = getMaxVolleyForCurrentConfig();
  const sessionCompleted = state.shoots.length === state.targetCount;
  state.shoots.forEach((volley, idx) => {
    const isEditingRow = idx === state.editingVolleyIndex;
    const total = roundTotal(volley);
    const successful = isSuccessfulVolley(total);
    const pillClass = getVolleyPillClass(volley, total, maxVolley);
    const row = document.createElement("tr");
    row.classList.toggle("is-edited-row", idx === state.lastEditedVolleyIndex);
    const arrowsText = isEditingRow
      ? Array(state.arrowsPerVolley).fill("-").join(" / ")
      : volley.map((value) => formatScore(value)).join(" / ");
    const totalText = isEditingRow ? "-" : String(total);
    const groupCell = shouldUseTargetGroupsForScoring() ? `<td>${state.shootGroups[idx] || "-"}</td>` : "";
    row.innerHTML = `
      <td><span class="volley-pill ${pillClass}">${idx + 1}</span></td>
      <td>${arrowsText}</td>
      ${groupCell}
      <td class="history-total ${successful && !isEditingRow ? "success" : ""}">${totalText}</td>
      <td>
        <button class="btn btn-danger btn-icon row-delete-btn" aria-label="Supprimer la volée ${idx + 1}">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h2v9H7V9Zm4 0h2v9h-2V9Zm4 0h2v9h-2V9ZM6 7h12l-1 14H7L6 7Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </td>
    `;
    if (!sessionCompleted) {
      // Double-click/double-tap to edit row
      let lastTapTime = 0;
      const DOUBLE_TAP_DELAY = 300;
      
      row.addEventListener("click", (e) => {
        // Ignore clicks on buttons
        if (e.target.closest("button")) return;
        
        const now = Date.now();
        if (now - lastTapTime < DOUBLE_TAP_DELAY) {
          editVolleyAt(idx);
          lastTapTime = 0;
        } else {
          lastTapTime = now;
        }
      });
    }
    row.querySelector(".row-delete-btn").addEventListener("click", () => {
      void deleteVolleyAt(idx);
    });
    els.liveVolleyHistoryBody.appendChild(row);
  });

  const partial = state.currentshoot.some((value) => value !== null);
  if (partial && state.shoots.length < state.targetCount) {
    const idx = state.shoots.length;
    const previewRow = document.createElement("tr");
    const previewGroupCell = shouldUseTargetGroupsForScoring() ? `<td>${getSelectedTargetGroup() || "-"}</td>` : "";
    previewRow.innerHTML = `
      <td><span class="volley-pill is-gray">${idx + 1}</span></td>
      <td>${Array(state.arrowsPerVolley).fill("-").join(" / ")}</td>
      ${previewGroupCell}
      <td class="history-total">-</td>
      <td>-</td>
    `;
    els.liveVolleyHistoryBody.appendChild(previewRow);
  }
}

function getSelectablePointsForArrow(ruleset, scoringMode, arrowIndex, allowedPoints) {
  const sourcePoints = Array.isArray(allowedPoints) && allowedPoints.length ? allowedPoints : [0];

  if (ruleset === "nature") {
    if (scoringMode === "team") {
      const candidateScores = [20, 15, 10, 0];
      return candidateScores.filter((score) => sourcePoints.includes(score));
    }
    const isFirstArrowOfPair = arrowIndex % 2 === 0;
    const candidateScores = isFirstArrowOfPair ? [20, 15, 0] : [15, 10, 0];
    return candidateScores.filter((score) => sourcePoints.includes(score));
  }

  if (ruleset === "ar") {
    const arrowScores = [[20, 18, 0], [16, 14, 0], [12, 10, 0]];
    const candidates = arrowScores[arrowIndex] || [0];
    return candidates.filter((score) => sourcePoints.includes(score));
  }

  return sourcePoints;
}

function getSelectablePointsForCurrentArrow() {
  return getSelectablePointsForArrow(
    state.activeRuleset,
    state.scoringMode,
    state.currentArrowIndex,
    state.allowedPoints,
  );
}

function getScoreRuleHint(ruleset, arrowIndex) {
  if (ruleset === "nature") {
    if (state.scoringMode === "team") {
      return "Equipe : 20 / 15 / 10 / M, max 3x20, 6x15, 3x10";
    }
    const isFirstArrowOfPair = arrowIndex % 2 === 0;
    const arrowLabel = isFirstArrowOfPair ? "1re flèche" : "2e flèche";
    const values = isFirstArrowOfPair ? "20 / 15 / M" : "15 / 10 / M";
    return `${arrowLabel} : ${values}`;
  }

  if (ruleset === "ar") {
    const valuesByArrow = ["20 / 18 / M", "16 / 14 / M", "12 / 10 / M"];
    const values = valuesByArrow[arrowIndex];
    if (!values) return "";
    return `Flèche ${arrowIndex + 1} : ${values}`;
  }

  return "";
}

function updatePointsRuleHint(element, ruleset, arrowIndex) {
  if (!element) return;

  const hint = getScoreRuleHint(ruleset, arrowIndex);
  if (!hint) {
    element.textContent = "";
    element.classList.add("hidden");
    return;
  }

  element.textContent = hint;
  element.classList.remove("hidden");
}

function getSessionVolleyMaxTotal(ruleset, arrowsPerTarget, allowedPoints) {
  return getMaxShootTotalForConfig(ruleset, "individual", arrowsPerTarget, allowedPoints);
}

function getCurrentShootPartialTotal() {
  return state.currentshoot.reduce((sum, value) => sum + scoreToValue(value), 0);
}

function getPerArrowMaxValues(ruleset, scoringMode, arrowsPerVolley, allowedPoints) {
  const entry = maxArrowValuesByRuleset[ruleset];
  let maxValues = null;

  if (Array.isArray(entry)) {
    maxValues = [...entry];
  } else if (entry && typeof entry === "object") {
    const byMode = entry[scoringMode];
    if (Array.isArray(byMode)) {
      maxValues = [...byMode];
    }
  }

  if (Array.isArray(maxValues) && maxValues.length > 0) {
    if (maxValues.length >= arrowsPerVolley) {
      return maxValues.slice(0, arrowsPerVolley);
    }
    const fallback = maxValues[maxValues.length - 1] ?? 0;
    const extended = [...maxValues];
    while (extended.length < arrowsPerVolley) {
      extended.push(fallback);
    }
    return extended;
  }

  const maxPoint = Math.max(...(allowedPoints || []).map(scoreToValue), 0);
  return Array(arrowsPerVolley).fill(maxPoint);
}

function getMaxShootTotalForConfig(ruleset, scoringMode, arrowsPerVolley, allowedPoints) {
  const perArrowMaxValues = getPerArrowMaxValues(ruleset, scoringMode, arrowsPerVolley, allowedPoints);
  return perArrowMaxValues.reduce((sum, value) => sum + value, 0);
}

function getMaxShootTotalForRuleset() {
  return getMaxShootTotalForConfig(
    state.activeRuleset,
    state.scoringMode,
    state.arrowsPerVolley,
    state.allowedPoints,
  );
}

function getMaxVolleyForCurrentConfig() {
  // Calculate the max score using the individual mode as reference (base pattern)
  // Then multiply by the number of archers (derived from arrows count ratio)
  // This ensures "faire le plein" is consistent: nature team=(20+15)*3=105, 3d team=(11+11)*3=66, etc.
  const arrowsPerVolleyIndividual = getArrowsPerVolley(state.activeRuleset, "individual");
  const maxSingleArcher = getMaxShootTotalForConfig(
    state.activeRuleset,
    "individual",
    arrowsPerVolleyIndividual,
    state.allowedPoints,
  );
  
  // Calculate number of archers from the current arrows per volley vs individual
  const numberOfArchers = state.arrowsPerVolley / arrowsPerVolleyIndividual;
  
  if (maxSingleArcher !== null) {
    return maxSingleArcher * numberOfArchers;
  }
  
  return state.arrowsPerVolley * Math.max(...state.allowedPoints.map(scoreToValue), 0);
}

function isDoubleZeroVolley(volley) {
  return volley.length >= 2 && volley[0] === 0 && volley[1] === 0;
}

function hasSingleMiss(volley) {
  return volley.some((v) => v === 0);
}

function getVolleyPillClass(volley, total, maxVolley) {
  if (isDoubleZeroVolley(volley)) return "is-red";
  if (total === maxVolley) return "is-green";
  if (hasSingleMiss(volley)) return "is-orange";
  return "is-gray";
}

function isNatureTeamQuotaAllowed(score) {
  const nextShoot = [...state.currentshoot];
  nextShoot[state.currentArrowIndex] = score;

  const counts = nextShoot.reduce((result, value) => {
    if (value === 20) result.twenty += 1;
    if (value === 15) result.fifteen += 1;
    if (value === 10) result.ten += 1;
    return result;
  }, { twenty: 0, fifteen: 0, ten: 0 });

  return counts.twenty <= 3 && counts.fifteen <= 6 && counts.ten <= 3;
}

function isScoreAllowedForCurrentArrow(score) {
  if (state.currentArrowIndex === 0) {
    if (state.activeRuleset === "nature" && state.scoringMode === "team") {
      return isNatureTeamQuotaAllowed(score);
    }
    const maxShootTotal = getMaxShootTotalForRuleset();
    return maxShootTotal === null || score <= maxShootTotal;
  }
  if (state.activeRuleset === "nature" && state.scoringMode === "team") {
    if (!isNatureTeamQuotaAllowed(score)) {
      return false;
    }
  }

  const maxShootTotal = getMaxShootTotalForRuleset();
  if (maxShootTotal === null) {
    return true;
  }

  return getCurrentShootPartialTotal() + score <= maxShootTotal;
}

function registerScore(score) {
  if (state.inputLocked) {
    return;
  }

  const isEditing = Number.isInteger(state.editingVolleyIndex) && state.editingVolleyIndex >= 0;
  if (state.shoots.length >= state.targetCount && !isEditing) {
    return;
  }

  if (state.currentArrowIndex >= state.arrowsPerVolley) {
    return;
  }

  if (!getSelectablePointsForCurrentArrow().includes(score)) {
    return;
  }

  if (!isScoreAllowedForCurrentArrow(score)) {
    return;
  }

  state.currentshoot[state.currentArrowIndex] = score;
  state.currentArrowIndex += 1;
  state.resultsPayload = null;
  state.completionArchived = false;

  if (state.currentArrowIndex === state.arrowsPerVolley) {
    state.inputLocked = true;
    refreshScoringView({ scrollCard: true });
    const editingIndexSnapshot = isEditing ? state.editingVolleyIndex : null;
    const delay = isEditing ? 0 : LAST_SCORE_PREVIEW_MS;
    window.setTimeout(() => {
      const unsortedRulesets = ["nature", "ar"];
      const newShoot = unsortedRulesets.includes(state.activeRuleset)
        ? [...state.currentshoot]
        : [...state.currentshoot].sort((a, b) => b - a);
      const selectedGroup = getSelectedTargetGroup();
      if (Number.isInteger(editingIndexSnapshot)) {
        const replaceIndex = Math.max(0, Math.min(editingIndexSnapshot, state.shoots.length - 1));
        state.shoots[replaceIndex] = newShoot;
        state.shootGroups[replaceIndex] = selectedGroup;
        state.lastEditedVolleyIndex = replaceIndex;
        state.editingVolleyIndex = null;
      } else {
        state.shoots.push(newShoot);
        state.shootGroups.push(selectedGroup);
      }

      // Save immediately when a full volley is validated.
      persistAppState();

      if (state.contestMode && state.contestInfo?.uuid) {
        const completedTargets = state.shoots.length;
        const shouldSyncContestSession = completedTargets > 0
          && (completedTargets % 3 === 0 || completedTargets === state.targetCount);
        if (shouldSyncContestSession) {
          void upsertContestUserFromLocalProfile(
            state.contestInfo.uuid,
            state.weapon,
            buildContestUserDataSnapshot(),
            state.contestInfo?.ruleset || state.activeRuleset,
          );
        }
      }

      state.inputLocked = false;
      if (state.shoots.length === state.targetCount) {
        state.resultsPayload = buildResultsPayload();
        if (state.resultsPayload && !state.completionArchived) {
          if (!state.contestMode) {
            state.resultsPayload = addHistoryEntry(state.resultsPayload) || state.resultsPayload;
            showFlashInfo("Parcours enregistré dans l'historique.");
          } else {
            showFlashInfo("Concours terminé.");
          }
          state.completionArchived = true;
        }

        if (state.contestMode && state.contestInfo?.uuid) {
          // Force one last persisted snapshot at contest completion.
          persistAppState();
          void upsertContestUserFromLocalProfile(
            state.contestInfo.uuid,
            state.weapon,
            buildContestUserDataSnapshot(),
            state.contestInfo?.ruleset || state.activeRuleset,
          );
        }

        refreshScoringView({ scrollHistory: true, scrollCard: true });
        return;
      }
      resetRoundBuffer();
      refreshScoringView({ scrollHistory: true, scrollCard: true });
    }, delay);
    return;
  }

  refreshScoringView({ scrollHistory: true, scrollCard: true });
}

function editVolleyAt(index) {
  if (state.inputLocked) {
    return;
  }
  if (state.shoots.length === state.targetCount) {
    showFlashInfo("Session terminée : modification désactivée.");
    return;
  }
  if (!Number.isInteger(index) || index < 0 || index >= state.shoots.length) {
    return;
  }

  const originalGroup = state.shootGroups[index] || null;
  state.editingVolleyIndex = index;
  resetRoundBuffer();
  if (state.useTargetGroups) {
    syncTargetGroupSelect(originalGroup);
  }
  state.resultsPayload = null;
  state.completionArchived = false;
  showFlashInfo(`Modification volée ${index + 1} : la ligne sera remplacée.`);
  refreshScoringView({ scrollHistory: true });
}

async function deleteVolleyAt(index) {
  if (state.inputLocked) {
    return;
  }

  if (!Number.isInteger(index) || index < 0 || index >= state.shoots.length) {
    return;
  }
  const confirmed = await confirmAction("Confirmer la suppression de cette volée ?", "Supprimer");
  if (!confirmed) {
    return;
  }
  state.shoots.splice(index, 1);
  state.shootGroups.splice(index, 1);
  if (state.lastEditedVolleyIndex === index) {
    state.lastEditedVolleyIndex = null;
  } else if (Number.isInteger(state.lastEditedVolleyIndex) && index < state.lastEditedVolleyIndex) {
    state.lastEditedVolleyIndex -= 1;
  }
  state.resultsPayload = null;
  state.completionArchived = false;
  refreshScoringView();
}

function stepBackOneArrow() {
  if (state.inputLocked) {
    return;
  }

  if (state.editingVolleyIndex !== null && state.currentArrowIndex === 0) {
    showFlashInfo("Volée en modification : saisissez les flèches ou validez la nouvelle volée.");
    return;
  }

  if (state.currentArrowIndex > 0) {
    state.currentArrowIndex -= 1;
    state.currentshoot[state.currentArrowIndex] = null;
    state.resultsPayload = null;
    state.completionArchived = false;
    refreshScoringView();
    return;
  }

  if (state.shoots.length === 0) {
    return;
  }

  const previous = state.shoots.pop();
  const previousGroup = state.shootGroups.pop();
  state.currentshoot = [...previous];
  state.currentArrowIndex = state.arrowsPerVolley - 1;
  state.currentshoot[state.currentArrowIndex] = null;
  syncTargetGroupSelect(previousGroup);
  state.resultsPayload = null;
  state.completionArchived = false;
  refreshScoringView();
}

function getSelectedScoringMode() {
  const checked = [...els.scoringModeInputs].find((input) => input.checked);
  const rawMode = checked ? checked.value : "team";
  return normalizeScoringMode(rawMode, els.rulesetSelect.value);
}

function updateWeaponSelectVisibility() {
  const scoringMode = getSelectedScoringMode();
  const weaponWrapper = document.getElementById("weapon-select-wrapper");
  if (weaponWrapper) {
    const shouldShowWeapon = scoringMode !== "team" || state.contestMode;
    weaponWrapper.style.display = shouldShowWeapon ? "block" : "none";
  }
}

function getSelectedUseTargetGroups() {
  const checked = [...els.useTargetGroupsInputs].find((input) => input.checked);
  return checked ? checked.value === "yes" : true;
}

function getSelectedShowScores() {
  const checked = [...els.showScoresInputs].find((input) => input.checked);
  return checked ? checked.value === "yes" : true;
}

function getCurrentConfigForSetup() {
  const ruleset = els.rulesetSelect.value;
  const scoringMode = getSelectedScoringMode();
  const arrowsPerVolley = getArrowsPerVolley(ruleset, scoringMode);

  const points = presets[ruleset];

  const maxPoint = Math.max(...points.filter((p) => Number.isFinite(p)).map(scoreToValue), 0);
  return { arrowsPerVolley, maxPoint };
}

function getTargetCountForRuleset(ruleset) {
  return defaultTargetsByRuleset[ruleset] ?? 21;
}

function isScoringModeAllowedForRuleset(mode, ruleset) {
  if (mode === "mixed") {
    return ruleset === "3d";
  }
  if (mode === "team") {
    return !isFFTLRuleset(ruleset);
  }
  return mode === "individual";
}

function normalizeScoringMode(mode, ruleset) {
  if (isScoringModeAllowedForRuleset(mode, ruleset)) {
    return mode;
  }
  return isFFTLRuleset(ruleset) ? "individual" : "team";
}

function isFFTLRuleset(ruleset) {
  return ruleset === "3d2" || ruleset === "3dh" || ruleset === "ar" || ruleset === "field";
}

function getArrowsPerVolley(ruleset, scoringMode) {
  let arrowsPerArcher = 2;

  if (ruleset === "3dh") {
    arrowsPerArcher = 1;
  } else if (ruleset === "ar") {
    arrowsPerArcher = 3;
  } else if (ruleset === "field") {
    arrowsPerArcher = 4;
  } else if (ruleset === "campagne") {
    arrowsPerArcher = 3;
  } else if (ruleset === "nature") {
    arrowsPerArcher = 2;
  } else if (ruleset === "3d" || ruleset === "3d2") {
    arrowsPerArcher = 2;
  }

  if (scoringMode === "mixed" && ruleset === "3d") {
    return 4;
  }

  if (scoringMode === "team") {
    return arrowsPerArcher * TEAM_ARCHERS_PER_VOLLEY;
  }

  return arrowsPerArcher;
}

function syncScoringModeFieldset() {
  const ruleset = els.rulesetSelect.value;
  const fallbackMode = normalizeScoringMode(getSelectedScoringMode(), ruleset);
  let hasCheckedAllowed = false;

  els.scoringModeInputs.forEach((input) => {
    const allowed = isScoringModeAllowedForRuleset(input.value, ruleset);
    input.disabled = !allowed;
    input.closest("label").classList.toggle("disabled", !allowed);
    if (input.checked && allowed) {
      hasCheckedAllowed = true;
    }
  });

  if (!hasCheckedAllowed) {
    const targetInput = [...els.scoringModeInputs].find((input) => input.value === fallbackMode && !input.disabled);
    if (targetInput) {
      targetInput.checked = true;
    }
  }
}

function syncTargetCountDisplay() {
  const targets = getTargetCountForRuleset(els.rulesetSelect.value);
  els.targetsCountText.textContent = `${targets} cibles`;
}

function getMaxSuccessZoneForSetup() {
  const ruleset = els.rulesetSelect.value;
  const scoringMode = getSelectedScoringMode();
  const { arrowsPerVolley, maxPoint } = getCurrentConfigForSetup();
  const points = presets[ruleset] || [];
  const sourcePoints = points.length ? points : [maxPoint];
  return getMaxShootTotalForConfig(ruleset, scoringMode, arrowsPerVolley, sourcePoints);
}

function clampSuccessZoneForConfig(value, ruleset, scoringMode, arrowsPerVolley, allowedPoints) {
  const max = getMaxShootTotalForConfig(ruleset, scoringMode, arrowsPerVolley, allowedPoints);
  if (!Number.isInteger(value) || value < 1) return 1;
  return Math.min(value, Math.max(1, max));
}

function getSuccessZoneColor(value, ruleset, scoringMode) {
  const max = getMaxSuccessZoneForSetup();
  if (max <= 0) return "#6b7280";
  const pct = (value / max) * 100;
  if (pct >= 90) return "#9b2226";
  if (pct >= 80) return "#d68c45";
  if (pct >= 70) return "#2d6a4f";
  return "#6b7280";
}

function setRangeProgress(input, fillColor = "") {
  if (!input) return;
  const min = Number.parseFloat(input.min || "0");
  const max = Number.parseFloat(input.max || "100");
  const value = Number.parseFloat(input.value || "0");
  const span = max - min;
  const pct = span > 0 ? ((value - min) / span) * 100 : 0;
  const clampedPct = Math.min(100, Math.max(0, pct));
  input.style.setProperty("--range-progress", `${clampedPct}%`);
  if (fillColor) {
    input.style.setProperty("--range-fill-color", fillColor);
  } else {
    input.style.removeProperty("--range-fill-color");
  }
}

function updateSuccessZoneSlider() {
  const ruleset = els.rulesetSelect.value;
  const scoringMode = getSelectedScoringMode();
  const weapon = els.weaponSelect ? els.weaponSelect.value : "";
  const zoneKey = `${ruleset}:${scoringMode}:${weapon}`;
  const max = getMaxSuccessZoneForSetup();
  els.successZoneInput.min = "1";
  els.successZoneInput.max = String(max);
  let value = Number.parseInt(els.successZoneInput.value, 10);
  if (!Number.isInteger(value) || value < 1) value = 1;
  if (value > max) value = max;
  els.successZoneInput.value = String(value);
  els.successZoneValue.textContent = String(value);
  appConfig.successZoneByRuleset[zoneKey] = value;
  saveConfig();
  const zoneColor = getSuccessZoneColor(value, ruleset, scoringMode);
  els.successZoneInput.style.setProperty("--zone-color", zoneColor);
  setRangeProgress(els.successZoneInput, zoneColor);
  els.successZoneValue.style.color = zoneColor;
  persistAppState();
}

function startScoring() {
  const parsedSuccessZone = Number.parseInt(els.successZoneInput.value, 10);
  if (!Number.isInteger(parsedSuccessZone) || parsedSuccessZone < 1) {
    window.alert("Entrez une zone de réussite valide (minimum 1).");
    return;
  }

  const points = presets[els.rulesetSelect.value];

  state.targetCount = getTargetCountForRuleset(els.rulesetSelect.value);
  state.successZone = parsedSuccessZone;
  state.lieu = els.lieuInput ? els.lieuInput.value.trim() : "";
  state.sessionDate = els.sessionDateInput ? els.sessionDateInput.value : "";
  state.sessionTime = els.sessionTimeInput ? els.sessionTimeInput.value : "";
  state.activeRuleset = els.rulesetSelect.value;
  state.scoringMode = getSelectedScoringMode();
  state.weapon = els.weaponSelect ? els.weaponSelect.value : "";
  state.useTargetGroups = getSelectedUseTargetGroups();
  state.showScores = getSelectedShowScores();
  state.arrowsPerVolley = getArrowsPerVolley(els.rulesetSelect.value, state.scoringMode);
  state.allowedPoints = [...new Set(points)].sort((a, b) => b - a);
  state.successZone = clampSuccessZoneForConfig(
    parsedSuccessZone,
    state.activeRuleset,
    state.scoringMode,
    state.arrowsPerVolley,
    state.allowedPoints,
  );
  state.shoots = [];
  state.shootGroups = [];
  state.resultsPayload = null;
  state.progressionAxis = "";
  state.completionArchived = false;
  state.editingVolleyIndex = null;
  state.lastEditedVolleyIndex = null;
  resetRoundBuffer();
  syncTargetGroupSelect();

  els.setupCard.classList.add("hidden");
  els.scoringCard.classList.remove("hidden");
  els.homeScreen.classList.add("hidden");
  closeStatsModal();
  closeHelpModal();

  refreshScoringView();
}

function buildContestUserDataSnapshot() {
  const completedTargets = state.shoots.length;
  return {
    updatedAt: new Date().toISOString(),
    ruleset: state.activeRuleset,
    scoringMode: state.scoringMode,
    targetCount: state.targetCount,
    completedTargets,
    arrowsPerVolley: state.arrowsPerVolley,
    total: globalTotal(),
    successZone: state.successZone,
    completed: state.targetCount > 0 && completedTargets === state.targetCount,
    shoots: state.shoots.map((volley) => [...volley]),
    shootGroups: [...state.shootGroups],
  };
}

function getContestScoringFromLocalStorage(contestUuid, contestRuleset = "") {
  const uuid = typeof contestUuid === "string" ? contestUuid.trim() : "";
  const ruleset = typeof contestRuleset === "string" ? contestRuleset.trim() : "";
  if (!uuid || !ruleset) return null;

  try {
    const raw = window.localStorage.getItem(CONTEST_PROGRESS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const key = `${uuid}:${ruleset}`;
    const entry = parsed?.[key];
    const scoring = entry?.scoring;
    if (!scoring || typeof scoring !== "object" || Array.isArray(scoring)) {
      return null;
    }

    const updatedAt = typeof entry?.updatedAt === "string" ? entry.updatedAt : "";
    if (updatedAt && !scoring.updatedAt) {
      return { ...scoring, updatedAt };
    }
    return scoring;
  } catch {
    return null;
  }
}

async function upsertContestUserFromLocalProfile(contestUuid, weapon, data = null, contestRuleset = "") {
  const uuid = typeof contestUuid === "string" ? contestUuid.trim() : "";
  if (!uuid) return;

  const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) return;

  const firstName = (window.localStorage.getItem(AUTH_USER_FIRST_NAME_KEY) || "").trim() || "Archer";
  const lastName = (window.localStorage.getItem(AUTH_USER_LAST_NAME_KEY) || "").trim() || "Inconnu";
  const safeWeapon = typeof weapon === "string" && weapon.trim() ? weapon.trim() : "-";
  const localStorageScoring = getContestScoringFromLocalStorage(uuid, contestRuleset || state.activeRuleset);
  const memoryData = data && typeof data === "object" && !Array.isArray(data) ? data : null;
  const localUpdatedAt = Date.parse(localStorageScoring?.updatedAt || "");
  const memoryUpdatedAt = Date.parse(memoryData?.updatedAt || "");
  const payloadData = Number.isFinite(memoryUpdatedAt) && (!Number.isFinite(localUpdatedAt) || memoryUpdatedAt >= localUpdatedAt)
    ? (memoryData || localStorageScoring || undefined)
    : (localStorageScoring || memoryData || undefined);

  try {
    await fetch("/api/contest/users", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        contest_uuid: uuid,
        first_name: firstName,
        last_name: lastName,
        weapon: safeWeapon,
        data: payloadData,
      }),
    });
  } catch {
    // Keep contest flow resilient if contest-user sync fails.
  }
}

function startContestScoring(contest, preferredWeapon = "") {
  if (!contest || !contest.ruleset || !presets[contest.ruleset]) {
    showFlashInfo("Configuration concours invalide.");
    return;
  }

  if (els.rulesetSelect) {
    els.rulesetSelect.value = contest.ruleset;
    els.rulesetSelect.dispatchEvent(new Event("change"));
  }

  const forcedMode = normalizeScoringMode("individual", contest.ruleset);
  els.scoringModeInputs.forEach((input) => {
    input.checked = input.value === forcedMode;
  });

  if (
    els.weaponSelect
    && typeof preferredWeapon === "string"
    && preferredWeapon
    && isWeaponAllowedForRuleset(preferredWeapon, contest.ruleset)
  ) {
    els.weaponSelect.value = preferredWeapon;
  }

  if (els.weaponSelect?.value) {
    storeContestWeapon(els.weaponSelect.value);
  }

  syncScoringModeFieldset();
  updateWeaponSelectVisibility();
  updateSuccessZoneSlider();

  const contestInfo = {
    id: contest.id,
    uuid: contest.uuid,
    name: contest.name || "Concours",
    ruleset: contest.ruleset,
    startDate: contest.start_date || "",
    endDate: contest.end_date || "",
  };
  const storedContestScoring = getStoredContestProgressScoring(contestInfo);

  state.contestMode = true;
  state.contestInfo = contestInfo;

  startScoring();

  if (restoreContestProgressState(state.contestInfo, storedContestScoring)) {
    refreshScoringView();
    showFlashInfo("Scores concours restaurés.");
  }

  void upsertContestUserFromLocalProfile(
    state.contestInfo?.uuid || "",
    state.weapon,
    buildContestUserDataSnapshot(),
    state.contestInfo?.ruleset || state.activeRuleset,
  );
}

function buildResultsPayload() {
  if (state.shoots.length === 0) {
    return null;
  }

  const totals = state.shoots.map((volley) => roundTotal(volley));
  const total = totals.reduce((sum, value) => sum + value, 0);
  setRangeProgress(els.configFullTargetTeam);
  setRangeProgress(els.configFullTargetIndiv);
  setRangeProgress(els.configMissLimitTeam);
  setRangeProgress(els.configMissLimitIndiv);
  const avgshoot = total / state.shoots.length;
  const avgArrow = total / (state.shoots.length * state.arrowsPerVolley);

  let bestshoot = 0;
  let worstshoot = 0;
  totals.forEach((value, index) => {
    if (value > totals[bestshoot]) bestshoot = index;
    if (value < totals[worstshoot]) worstshoot = index;
  });

  const distribution = new Map();
  state.allowedPoints.forEach((point) => distribution.set(point, 0));
  state.shoots.flat().forEach((point) => {
    distribution.set(point, (distribution.get(point) || 0) + 1);
  });

  return {
    generatedAt: new Date().toISOString(),
    ruleset: state.activeRuleset,
    scoringMode: state.scoringMode,
    weapon: state.weapon || "",
    lieu: state.lieu || "",
    sessionDate: state.sessionDate || "",
    sessionTime: state.sessionTime || "",
    useTargetGroups: state.useTargetGroups,
    showScores: state.showScores,
    targetCount: state.targetCount,
    arrowsPerVolley: state.arrowsPerVolley,
    successZone: state.successZone,
    total,
    avgVolley: Number(avgshoot.toFixed(2)),
    avgArrow: Number(avgArrow.toFixed(2)),
    bestVolley: {
      index: bestshoot + 1,
      total: totals[bestshoot],
    },
    worstVolley: {
      index: worstshoot + 1,
      total: totals[worstshoot],
    },
    allowedPoints: state.allowedPoints,
    distribution: Object.fromEntries(distribution.entries()),
    volleys: state.shoots.map((volley, idx) => ({
      index: idx + 1,
      arrows: volley,
      group: state.shootGroups[idx] || null,
      total: roundTotal(volley),
      success: isSuccessfulVolley(roundTotal(volley)),
    })),
    progressionAxis: state.progressionAxis,
  };
}

function updateResultsAvailability() {
  const done = state.shoots.length === state.targetCount && state.targetCount > 0;
  els.scoreEntryPanel.classList.toggle("hidden", done);
  els.resultsActions.classList.toggle("hidden", !done);
  els.statsBtn.disabled = !done;
}

function getSegmentCount(targetCount, ruleset = state.activeRuleset) {
  if (isFFTLRuleset(ruleset)) return 2;
  if (targetCount >= 18) return 3;
  if (targetCount >= 10) return 2;
  return 1;
}

function getSegmentTotals(shoots, targetCount, ruleset = state.activeRuleset) {
  const segmentCount = getSegmentCount(targetCount, ruleset);
  const totals = [];
  for (let i = 0; i < segmentCount; i++) {
    const start = Math.floor((i * targetCount) / segmentCount);
    const end = Math.floor(((i + 1) * targetCount) / segmentCount);
    let segTotal = 0;
    for (let j = start; j < end && j < shoots.length; j++) {
      segTotal += roundTotal(shoots[j]);
    }
    totals.push(segTotal);
  }
  return totals;
}

function renderSegmentStats() {
  const segmentCount = getSegmentCount(state.targetCount, state.activeRuleset);
  const segTotals = getSegmentTotals(state.shoots, state.targetCount, state.activeRuleset);
  els.segmentStats.style.gridTemplateColumns = `repeat(${segmentCount}, 1fr)`;
  els.segmentStats.innerHTML = "";
  for (let i = 0; i < segmentCount; i++) {
    const start = Math.floor((i * state.targetCount) / segmentCount);
    const end = Math.floor(((i + 1) * state.targetCount) / segmentCount);
    const segSize = end - start;
    const isComplete = state.shoots.length >= end;

    const art = document.createElement("article");
    const span = document.createElement("span");
    span.textContent = segmentCount === 2
      ? (i === 0 ? "1ère moitié" : "2e moitié")
      : ["1er tiers", "2e tiers", "3e tiers"][i];
    const strong = document.createElement("strong");
    if (state.showScores) {
      strong.innerHTML = `${segTotals[i]}<span class="stats-unit">pts</span>`;
    } else {
      const segmentTarget = Math.max(0, state.successZone * segSize);
      const successRate = segmentTarget > 0 ? Math.round((segTotals[i] / segmentTarget) * 100) : 0;
      strong.innerHTML = `${successRate}<span class="stats-unit">%</span>`;
    }

    if (isComplete && segSize > 0) {
      const avgVolley = segTotals[i] / segSize;
      const bgColor = getBarColorByZoneRatio(avgVolley, state.successZone);
      const textColor = bgColor === "#eab308" ? "#1f2a24" : "#fff";
      art.style.background = bgColor;
      art.style.borderColor = bgColor;
      span.style.color = textColor;
      strong.style.color = textColor;
    }

    art.appendChild(span);
    art.appendChild(strong);
    els.segmentStats.appendChild(art);
  }
}

function getSegmentAverages(totals, segmentCount) {
  const segments = [];
  for (let i = 0; i < segmentCount; i += 1) {
    const start = Math.floor((i * totals.length) / segmentCount);
    const end = Math.floor(((i + 1) * totals.length) / segmentCount);
    const part = totals.slice(start, end);
    const avg = part.length ? part.reduce((sum, value) => sum + value, 0) / part.length : 0;
    segments.push(Number(avg.toFixed(2)));
  }
  return segments;
}

function getMaxVolleyFromPayload(payload) {
  const sourcePoints = Array.isArray(payload.allowedPoints) && payload.allowedPoints.length ? payload.allowedPoints : [0];
  const arrowsPerVolley = payload.arrowsPerVolley || 0;
  return getMaxShootTotalForConfig(payload.ruleset, payload.scoringMode, arrowsPerVolley, sourcePoints);
}

function renderEvolutionChart(totals, maxVolley, successZone, targetCount) {
  const left = 4;
  const right = 96;
  const top = 4;
  const bottom = 40;
  const rangeY = bottom - top;
  const maxObserved = Math.max(...totals, successZone, maxVolley, 1);
  const toY = (value) => bottom - (Math.max(0, value) / maxObserved) * rangeY;

  const points = totals
    .map((value, index) => {
      const x = totals.length === 1 ? (left + right) / 2 : left + (index * (right - left)) / (totals.length - 1);
      return `${x.toFixed(2)},${toY(value).toFixed(2)}`;
    })
    .join(" ");

  const successY = toY(successZone).toFixed(2);
  els.statsEvolutionPath.setAttribute("points", points);
  els.statsEvolutionSuccessLine.setAttribute("y1", successY);
  els.statsEvolutionSuccessLine.setAttribute("y2", successY);
  els.statsEvolutionRange.textContent = `1 à ${targetCount}`;
  const n = totals.length;
  const axisLabels = [1, Math.round(n * 0.25), Math.round(n * 0.5), Math.round(n * 0.75), n]
    .filter((value) => value >= 1 && value <= n)
    .filter((value, index, arr) => arr.indexOf(value) === index)
    .sort((a, b) => a - b);
  els.statsEvolutionAxis.innerHTML = axisLabels.map((value) => `<small>${value}</small>`).join("");
}

const SCORE_RANK_COLORS = [
  "#2563eb", // bleu
  "#16a34a", // vert
  "#eab308", // jaune
  "#f97316", // orange
  "#dc2626", // rouge
  "#7c3aed", // violet
  "#ec4899", // rose
  "#92400e", // marron
];

function getScoreColorByRank(index) {
  return SCORE_RANK_COLORS[index] || "#6b7280";
}

function getBarColorByZoneRatio(value, successZone) {
  if (successZone <= 0) return "#8c929a";
  const pct = (value / successZone) * 100;
  if (pct >= 100) return "#16a34a";  // vert
  if (pct >= 80) return "#f97316";   // orange
  if (pct >= 60) return "#eab308";   // jaune
  if (pct >= 30) return "#f97316";   // orange
  return "#dc2626";                   // rouge
}

function getDistributionBarColor(count, totalArrows, isMiss) {
  if (totalArrows <= 0) return "#d1d5db";
  const pct = (count / totalArrows) * 100;
  if (isMiss) {
    if (pct >= 40) return "#9b2226";
    if (pct >= 30) return "#d68c45";
    if (pct >= 20) return "#eab308";
    return "#2d6a4f";
  }
  if (pct >= 40) return "#2d6a4f";
  if (pct >= 30) return "#d68c45";
  if (pct >= 20) return "#eab308";
  return "#9b2226";
}

function renderScoreDistribution(allowedPoints, volleys) {
  const counts = new Map();
  allowedPoints.forEach((score) => counts.set(score, 0));
  volleys.flatMap((volley) => volley.arrows || []).forEach((score) => {
    counts.set(score, (counts.get(score) || 0) + 1);
  });

  const orderedScores = [...allowedPoints].sort((a, b) => b - a);
  const totalArrows = orderedScores.reduce((sum, score) => sum + (counts.get(score) || 0), 0);

  els.statsScoreDist.innerHTML = orderedScores
    .map((score, index) => {
      const count = counts.get(score) || 0;
      const pct = totalArrows > 0 ? (count / totalArrows) * 100 : 0;
      const label = scoreLabel(score);
      const barColor = getDistributionBarColor(count, totalArrows, score === 0);
      return `
        <div class="stats-dist-row-item">
          <span class="stats-dist-label">${label}</span>
          <div class="stats-dist-track">
            <div class="stats-dist-fill" style="width: ${pct.toFixed(2)}%; background: ${barColor}"></div>
          </div>
          <strong class="stats-dist-value">${count}</strong>
        </div>
      `;
    })
    .join("");
}

function switchStatsTab(tabName) {
  if (!tabName) {
    tabName = "summary";
  }
  document.querySelectorAll(".stats-tab").forEach((btn) => {
    const isActive = btn.dataset.statsTab === tabName;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", String(isActive));
  });
  if (els.statsTabSummary) {
    els.statsTabSummary.classList.toggle("hidden", tabName !== "summary");
  }
  if (els.statsTabGroups) {
    els.statsTabGroups.classList.toggle("hidden", tabName !== "groups");
  }
  if (els.statsTabComments) {
    els.statsTabComments.classList.toggle("hidden", tabName !== "comments");
  }
}

function updateStatsCommentsCounter() {
  if (!els.statsCommentsInput || !els.statsCommentsCount) {
    return;
  }
  const length = els.statsCommentsInput.value.length;
  els.statsCommentsCount.textContent = String(length);
  const counterWrap = els.statsCommentsCount.closest(".char-count-progression");
  if (counterWrap) {
    counterWrap.classList.toggle("is-warning", length >= 80 && length < 90);
    counterWrap.classList.toggle("is-danger", length >= 90);
  }
}

function getPieColorsFromCounts(counts, orderedScores) {
  const colors = {};
  orderedScores.forEach((score, index) => {
    colors[score] = getScoreColorByRank(index);
  });
  return colors;
}

function buildPieSvg(counts, orderedScores, colors, size) {
  const total = orderedScores.reduce((sum, s) => sum + (counts.get(s) || 0), 0);
  if (total === 0) return '';
  const r = size / 2;
  const cx = r;
  const cy = r;
  const sliceR = r - 2;
  let startAngle = -Math.PI / 2;
  let paths = '';

  orderedScores.forEach((score) => {
    const count = counts.get(score) || 0;
    if (count === 0) return;
    const sliceAngle = (count / total) * 2 * Math.PI;
    const endAngle = startAngle + sliceAngle;
    const largeArc = sliceAngle > Math.PI ? 1 : 0;
    const x1 = cx + sliceR * Math.cos(startAngle);
    const y1 = cy + sliceR * Math.sin(startAngle);
    const x2 = cx + sliceR * Math.cos(endAngle);
    const y2 = cy + sliceR * Math.sin(endAngle);
    const color = colors[score] || '#8c929a';
    if (count === total) {
      paths += `<circle cx="${cx}" cy="${cy}" r="${sliceR}" fill="${color}"/>`;
    } else {
      paths += `<path d="M${cx},${cy} L${x1.toFixed(3)},${y1.toFixed(3)} A${sliceR},${sliceR} 0 ${largeArc} 1 ${x2.toFixed(3)},${y2.toFixed(3)} Z" fill="${color}"/>`;
    }
    startAngle = endAngle;
  });

  return `<svg viewBox="0 0 ${size} ${size}" class="stats-pie-svg" aria-hidden="true">${paths}</svg>`;
}

function renderGroupDistribution(payload) {
  const volleys = Array.isArray(payload?.volleys) ? payload.volleys : [];
  const useTargetGroups = typeof payload.useTargetGroups === "boolean" ? payload.useTargetGroups : (state.useTargetGroups ?? true);

  if (els.statsGroupDistCard) {
    els.statsGroupDistCard.classList.toggle("hidden", !useTargetGroups);
  }

  if (!useTargetGroups) {
    els.statsGroupDist.innerHTML = "";
    return;
  }

  const groups = getGroupsForRuleset(payload.ruleset || state.activeRuleset);
  if (groups.length === 0 || volleys.length === 0) {
    els.statsGroupDist.innerHTML = '<div style="text-align:center;color:#888;padding:12px;">Aucune donn\u00e9e de groupe.</div>';
    return;
  }

  const allowedPoints = Array.isArray(payload.allowedPoints) && payload.allowedPoints.length
    ? payload.allowedPoints
    : [...new Set(volleys.flatMap((v) => v.arrows || []))].sort((a, b) => b - a);
  const orderedScores = [...allowedPoints].sort((a, b) => b - a);

  const globalCounts = new Map();
  orderedScores.forEach((s) => globalCounts.set(s, 0));
  volleys.flatMap((v) => v.arrows || []).forEach((s) => {
    globalCounts.set(s, (globalCounts.get(s) || 0) + 1);
  });

  let piesHtml = '';
  groups.forEach((group) => {
    const groupVolleys = volleys.filter((v) => v.group === group);
    if (groupVolleys.length === 0) return;

    const counts = new Map();
    orderedScores.forEach((s) => counts.set(s, 0));
    groupVolleys.flatMap((v) => v.arrows || []).forEach((s) => {
      counts.set(s, (counts.get(s) || 0) + 1);
    });
    const groupTotal = groupVolleys.reduce((sum, v) => sum + (v.total ?? 0), 0);
    const groupAvg = (groupTotal / groupVolleys.length).toFixed(2);

    const colors = getPieColorsFromCounts(counts, orderedScores);
    const pie = buildPieSvg(counts, orderedScores, colors, 120);

    piesHtml += `<div class="stats-pie-cell">`;
    piesHtml += pie;
    piesHtml += `<strong class="stats-pie-cell-title">${getGroupLabel(group)}</strong>`;
    piesHtml += `<span class="stats-pie-cell-sub">${groupVolleys.length} cible${groupVolleys.length > 1 ? 's' : ''} \u2022 Moy. ${groupAvg}</span>`;
    piesHtml += `</div>`;
  });

  const legendColors = getPieColorsFromCounts(globalCounts, orderedScores);
  const legendItems = orderedScores.map((score) => {
    const label = scoreLabel(score);
    const color = legendColors[score] || '#b0b6c0';
    return `<div class="stats-pie-legend-item"><span class="stats-pie-swatch" style="background:${color}"></span><span>${label}</span></div>`;
  }).join('');

  let html = `<div class="stats-pie-grid">${piesHtml}</div>`;
  html += `<div class="stats-pie-legend-shared">${legendItems}</div>`;

  els.statsGroupDist.innerHTML = html;
}

function openStatsModalFromPayload(payload) {
  state.activeStatsPayload = payload || null;
  const volleys = Array.isArray(payload?.volleys) ? payload.volleys : [];
  if (volleys.length === 0) return;
  const totals = volleys.map((volley) => volley.total ?? roundTotal(volley.arrows || []));
  const totalPoints = totals.reduce((sum, value) => sum + value, 0);
  const avgVolley = totals.reduce((sum, value) => sum + value, 0) / totals.length;
  const best = Math.max(...totals);
  const worst = Math.min(...totals);
  const segmentCount = getSegmentCount(payload.targetCount || totals.length, payload.ruleset);
  const partAverages = getSegmentAverages(totals, segmentCount);
  const maxVolley = getMaxVolleyFromPayload(payload);
  const successZone = Number.isInteger(payload.successZone) ? payload.successZone : 0;
  const showScores = typeof payload.showScores === "boolean" ? payload.showScores : true;
  const ratioFor = (value) => {
    if (maxVolley <= 0) return 0;
    return Math.max(0, Math.min(100, (value / maxVolley) * 100));
  };
  const percentOfSuccessZone = (value) => {
    if (successZone <= 0) return 0;
    return Math.ceil((value / successZone) * 100);
  };

  els.statsSuccessZone.innerHTML = `${successZone}<span class="stats-unit">pts</span>`;
  const successZoneArticle = els.statsSuccessZone.closest("article");
  if (successZoneArticle) {
    successZoneArticle.classList.toggle("zone-achieved", avgVolley >= successZone);
  }
  els.statsTotalPoints.innerHTML = `${totalPoints}<span class="stats-unit">pts</span>`;
  els.statsBestVolley.innerHTML = `${best}<span class="stats-unit">pts</span>`;
  els.statsWorstVolley.innerHTML = `${worst}<span class="stats-unit">pts</span>`;
  const part1 = partAverages[0] ?? 0;
  const part2 = partAverages[1] ?? 0;
  const part3 = partAverages[2] ?? 0;
  els.statsBar1.style.height = `${ratioFor(part1)}%`;
  els.statsBar2.style.height = `${ratioFor(part2)}%`;
  els.statsBar3.style.height = `${ratioFor(part3)}%`;
  els.statsBar1.style.background = getBarColorByZoneRatio(part1, successZone);
  els.statsBar2.style.background = getBarColorByZoneRatio(part2, successZone);
  els.statsBar3.style.background = getBarColorByZoneRatio(part3, successZone);
  if (showScores) {
    els.statsBar1Value.innerHTML = `${part1.toFixed(1)}<span class="stats-unit">pts</span>`;
    els.statsBar2Value.innerHTML = `${part2.toFixed(1)}<span class="stats-unit">pts</span>`;
    els.statsBar3Value.innerHTML = `${part3.toFixed(1)}<span class="stats-unit">pts</span>`;
  } else {
    els.statsBar1Value.innerHTML = `${percentOfSuccessZone(part1)}<span class="stats-unit">%</span>`;
    els.statsBar2Value.innerHTML = `${percentOfSuccessZone(part2)}<span class="stats-unit">%</span>`;
    els.statsBar3Value.innerHTML = `${percentOfSuccessZone(part3)}<span class="stats-unit">%</span>`;
  }
  if (els.statsBar1Points) els.statsBar1Points.textContent = `${percentOfSuccessZone(part1)}%`;
  if (els.statsBar2Points) els.statsBar2Points.textContent = `${percentOfSuccessZone(part2)}%`;
  if (els.statsBar3Points) els.statsBar3Points.textContent = `${percentOfSuccessZone(part3)}%`;
  const bar1Col = els.statsBar1.closest(".stats-bar-col");
  const bar2Col = els.statsBar2.closest(".stats-bar-col");
  const bar3Col = els.statsBar3.closest(".stats-bar-col");
  const bar1Label = bar1Col ? bar1Col.querySelector("small") : null;
  const bar2Label = bar2Col ? bar2Col.querySelector("small") : null;
  const bar3Label = bar3Col ? bar3Col.querySelector("small") : null;
  if (segmentCount === 2) {
    if (bar1Label) bar1Label.textContent = "1ère moitié";
    if (bar2Label) bar2Label.textContent = "2e moitié";
    if (bar3Col) bar3Col.style.display = "none";
  } else {
    if (bar1Label) bar1Label.textContent = "1er tiers";
    if (bar2Label) bar2Label.textContent = "2e tiers";
    if (bar3Label) bar3Label.textContent = "3e tiers";
    if (bar3Col) bar3Col.style.display = "";
  }
  els.statsGlobalAvg.innerHTML = `${avgVolley.toFixed(1)}<span class="stats-unit">pts</span>`;
  if (els.statsGlobalPoints) els.statsGlobalPoints.textContent = `${percentOfSuccessZone(avgVolley)}%`;
  els.statsGlobalBar.style.height = `${ratioFor(avgVolley)}%`;
  els.statsGlobalBar.style.background = getBarColorByZoneRatio(avgVolley, successZone);
  renderEvolutionChart(totals, maxVolley, successZone, payload.targetCount || totals.length);
  const fullCount = totals.filter((total) => total === maxVolley).length;
  const missCount = volleys.reduce(
    (sum, volley) => sum + (volley.arrows || []).filter((score) => score === 0).length,
    0,
  );
  const doubleMissCount = volleys.filter((volley) => isDoubleZeroVolley(volley.arrows || [])).length;
  const totalArrows = volleys.length * (payload.arrowsPerVolley || state.arrowsPerVolley);
  els.statsFullCount.textContent = String(fullCount);
  if (els.statsMissCount) {
    els.statsMissCount.textContent = String(missCount);
  }
  els.statsDoubleMissCount.textContent = String(doubleMissCount);
  const fullCard = els.statsFullCount.closest("article");
  const missCard = els.statsDoubleMissCount.closest("article");
  const modeSuffix = (payload.scoringMode || state.scoringMode) === "individual" ? "individual" : "team";
  const cfgFull = appConfig[`fullTarget_${modeSuffix}`];
  const cfgMiss = appConfig[`missLimit_${modeSuffix}`];
  fullCard.classList.toggle("stats-highlight-green", cfgFull > 0 && fullCount >= cfgFull);
  missCard.classList.toggle("stats-highlight-red", cfgMiss > 0 && doubleMissCount >= cfgMiss);
  const allowedPoints =
    Array.isArray(payload.allowedPoints) && payload.allowedPoints.length
      ? payload.allowedPoints
      : [...new Set(volleys.flatMap((volley) => volley.arrows || []))].sort((a, b) => b - a);
  renderScoreDistribution(allowedPoints, volleys);
  renderGroupDistribution(payload);

  if (els.statsTabGroupsBtn) {
    els.statsTabGroupsBtn.style.display = "";
  }

  if (els.statsCommentsInput) {
    els.statsCommentsInput.value = payload.progressionAxis || "";
    updateStatsCommentsCounter();
  }

  switchStatsTab("summary");

  closeHelpModal();
  closeHistoryModal();
  closeGeneralStatsModal();
  closeMultiModal();
  closeDuelModal();
  els.statsModal.classList.remove("hidden");
}

function openStatsModal() {
  if (state.shoots.length !== state.targetCount || state.shoots.length === 0) {
    return;
  }
  const payload = state.resultsPayload || buildResultsPayload();
  if (!payload) return;
  state.statsOpenedFromHistory = false;
  openStatsModalFromPayload(payload);
}

function closeStatsModal() {
  els.statsModal.classList.add("hidden");
  state.activeStatsPayload = null;
  if (state.statsOpenedFromHistory) {
    state.statsOpenedFromHistory = false;
    openHistoryModal();
  }
}

let helpCurrentPage = 1;
const HELP_TOTAL_PAGES = 2;

function renderHelpPagination() {
  const pages = els.helpModal.querySelectorAll(".help-page");
  pages.forEach((page) => {
    const pageNum = Number(page.dataset.helpPage);
    page.classList.toggle("hidden", pageNum !== helpCurrentPage);
  });

  els.helpPagination.innerHTML = "";

  const prevBtn = document.createElement("button");
  prevBtn.className = "btn btn-light btn-icon pagination-btn";
  prevBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16"><path d="M15.4 16.6 10.8 12l4.6-4.6L14 6l-6 6 6 6 1.4-1.4Z" fill="currentColor"/></svg>`;
  prevBtn.disabled = helpCurrentPage <= 1;
  prevBtn.addEventListener("click", () => { helpCurrentPage--; renderHelpPagination(); });
  els.helpPagination.appendChild(prevBtn);

  const indicator = document.createElement("span");
  indicator.className = "pagination-indicator";
  indicator.textContent = `${helpCurrentPage} / ${HELP_TOTAL_PAGES}`;
  els.helpPagination.appendChild(indicator);

  const nextBtn = document.createElement("button");
  nextBtn.className = "btn btn-light btn-icon pagination-btn";
  nextBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16"><path d="M8.6 16.6l4.6-4.6-4.6-4.6L10 6l6 6-6 6-1.4-1.4Z" fill="currentColor"/></svg>`;
  nextBtn.disabled = helpCurrentPage >= HELP_TOTAL_PAGES;
  nextBtn.addEventListener("click", () => { helpCurrentPage++; renderHelpPagination(); });
  els.helpPagination.appendChild(nextBtn);
}

function openHelpModal() {
  closeStatsModal();
  closeGeneralStatsModal();
  closeTrainingModal();
  closeTrainingHoldModal();
  closeHistoryModal();
  closeMultiModal();
  closeDuelModal();
  helpCurrentPage = 1;
  renderHelpPagination();
  els.helpModal.classList.remove("hidden");
}

function closeHelpModal() {
  els.helpModal.classList.add("hidden");
}

function setLoginFeedback(message, tone = "error") {
  if (!els.loginFeedback) return;
  els.loginFeedback.classList.remove("is-success", "is-error");
  if (!message) {
    els.loginFeedback.textContent = "";
    els.loginFeedback.classList.add("hidden");
    return;
  }
  els.loginFeedback.textContent = message;
  els.loginFeedback.classList.add(tone === "success" ? "is-success" : "is-error");
  els.loginFeedback.classList.remove("hidden");
}

function hasStoredAuthToken() {
  try {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY) || "";
    return token.trim().length > 0;
  } catch {
    return false;
  }
}

function clearStoredAuth() {
  try {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    window.localStorage.removeItem(AUTH_USER_ID_KEY);
    window.localStorage.removeItem(AUTH_USER_EMAIL_KEY);
    window.localStorage.removeItem(AUTH_USER_FIRST_NAME_KEY);
    window.localStorage.removeItem(AUTH_USER_LAST_NAME_KEY);
  } catch {
    // Ignore storage errors.
  }
}

function updateHomeLoginTile() {
  if (!els.homeLoginBtn) return;
  const labelText = els.homeLoginBtn.querySelector(".home-tile-label span:last-child");
  const isLoggedIn = hasStoredAuthToken();
  els.homeLoginBtn.classList.toggle("is-logged-in", isLoggedIn);
  els.homeLoginBtn.setAttribute("aria-label", isLoggedIn ? "Déconnexion" : "Connexion");
  if (labelText) {
    labelText.textContent = isLoggedIn ? "Déconnexion" : "Connexion";
  }
  updateMultiContestModeAvailability();
}

function updateHomeHeader() {
  if (els.homeTitle) {
    els.homeTitle.textContent = "Capi Scoring";
  }
  if (!els.homeSubtitle) return;

  let firstName = "";
  let lastName = "";
  try {
    firstName = (window.localStorage.getItem(AUTH_USER_FIRST_NAME_KEY) || "").trim();
    lastName = (window.localStorage.getItem(AUTH_USER_LAST_NAME_KEY) || "").trim();
  } catch {
    firstName = "";
    lastName = "";
  }

  const fullName = [firstName, lastName.toUpperCase()].filter(Boolean).join(" ");
  els.homeSubtitle.textContent = fullName;
}

function updateMultiContestModeAvailability() {
  if (!els.multiModeOptionContest) return;
  const isLoggedIn = hasStoredAuthToken();
  els.multiModeOptionContest.hidden = false;
  els.multiModeOptionContest.disabled = !isLoggedIn;
  if (!isLoggedIn && els.multiModeSelect?.value === "contest") {
    els.multiModeSelect.value = "duel";
  }
}

function updateConfigActionButtons() {
  const isLoggedIn = hasStoredAuthToken();
  if (els.configExportHistoryBtn) els.configExportHistoryBtn.classList.toggle("hidden", isLoggedIn);
  if (els.configImportHistoryBtn) els.configImportHistoryBtn.classList.toggle("hidden", isLoggedIn);
  if (els.configSaveServerBtn) els.configSaveServerBtn.classList.toggle("hidden", !isLoggedIn);
  if (els.configRestoreServerBtn) els.configRestoreServerBtn.classList.toggle("hidden", !isLoggedIn);
}

async function saveConfigToServer() {
  const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) return;
  try {
    if (els.configSaveServerBtn) els.configSaveServerBtn.disabled = true;
    const entries = loadHistoryEntries();
    const [configRes, sessionsRes] = await Promise.all([
      fetch("/api/users/configuration", {
        method: "PUT",
        headers: { "content-type": "application/json", "authorization": `Bearer ${token}` },
        body: JSON.stringify({ configuration: appConfig }),
      }),
      fetch("/api/users/sessions", {
        method: "PUT",
        headers: { "content-type": "application/json", "authorization": `Bearer ${token}` },
        body: JSON.stringify({ entries }),
      }),
    ]);
    if (configRes.ok && sessionsRes.ok) {
      showFlashInfo(`Configuration et ${entries.length} parcours sauvegardé(s).`);
    } else if (configRes.ok) {
      const errData = await sessionsRes.json().catch(() => ({}));
      showFlashInfo(`Échec de la sauvegarde des parcours : ${errData.error || sessionsRes.status}.`);
    } else if (sessionsRes.ok) {
      showFlashInfo("Échec de la sauvegarde de la configuration.");
    } else {
      showFlashInfo("Échec de la sauvegarde.");
    }
  } catch {
    showFlashInfo("Erreur réseau lors de la sauvegarde.");
  } finally {
    if (els.configSaveServerBtn) els.configSaveServerBtn.disabled = false;
  }
}

async function restoreConfigFromServer() {
  const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) return;
    const confirmed = await confirmAction(
      "Restaurer la configuration et l'historique depuis le serveur ? Les données locales seront remplacées.",
      "Restaurer",
    );
    if (!confirmed) return;
  try {
    if (els.configRestoreServerBtn) els.configRestoreServerBtn.disabled = true;
    const [configRes, sessionsRes] = await Promise.all([
      fetch("/api/users/configuration", { headers: { "authorization": `Bearer ${token}` } }),
      fetch("/api/users/sessions", { headers: { "authorization": `Bearer ${token}` } }),
    ]);
    if (!configRes.ok && !sessionsRes.ok) {
      showFlashInfo("Échec de la restauration.");
      return;
    }
    let restoredConfig = false;
    let restoredSessions = 0;
    if (configRes.ok) {
      const data = await configRes.json();
      const saved = data?.configuration;
      if (saved && typeof saved === "object") {
        if (Number.isFinite(saved.fullTarget_team)) appConfig.fullTarget_team = saved.fullTarget_team;
        if (Number.isFinite(saved.fullTarget_individual)) appConfig.fullTarget_individual = saved.fullTarget_individual;
        if (Number.isFinite(saved.missLimit_team)) appConfig.missLimit_team = saved.missLimit_team;
        if (Number.isFinite(saved.missLimit_individual)) appConfig.missLimit_individual = saved.missLimit_individual;
        if (saved.successZoneByRuleset && typeof saved.successZoneByRuleset === "object") {
          Object.assign(appConfig.successZoneByRuleset, saved.successZoneByRuleset);
        }
        if (Array.isArray(saved.enabledRulesets)) {
          appConfig.enabledRulesets = saved.enabledRulesets;
        }
        saveConfig();
        syncConfigSliderMax();
        els.configFullTargetTeam.value = String(appConfig.fullTarget_team);
        els.configFullTargetTeamValue.textContent = String(appConfig.fullTarget_team);
        setRangeProgress(els.configFullTargetTeam);
        els.configFullTargetIndiv.value = String(appConfig.fullTarget_individual);
        els.configFullTargetIndivValue.textContent = String(appConfig.fullTarget_individual);
        setRangeProgress(els.configFullTargetIndiv);
        els.configMissLimitTeam.value = String(appConfig.missLimit_team);
        els.configMissLimitTeamValue.textContent = String(appConfig.missLimit_team);
        setRangeProgress(els.configMissLimitTeam);
        els.configMissLimitIndiv.value = String(appConfig.missLimit_individual);
        els.configMissLimitIndivValue.textContent = String(appConfig.missLimit_individual);
        setRangeProgress(els.configMissLimitIndiv);
        syncRulesetCheckboxes();
        updateRulesetSelectOptions();
        restoredConfig = true;
      }
    }
    if (sessionsRes.ok) {
      const sessData = await sessionsRes.json();
      const imported = sessData?.entries;
      if (Array.isArray(imported) && imported.length > 0) {
        const valid = imported.filter((e) => e && typeof e === "object" && e.generatedAt);
        const sorted = [...valid].sort((a, b) => getHistorySortDate(b) - getHistorySortDate(a));
        saveHistoryEntries(sorted);
        clearPersistedState();
        historyCurrentPage = 1;
        restoredSessions = sorted.length;
      }
    }
    const parts = [];
    if (restoredConfig) parts.push("configuration");
    if (restoredSessions > 0) parts.push(`${restoredSessions} parcours`);
    showFlashInfo(parts.length > 0 ? `${parts.join(" et ")} restauré(s).` : "Rien à restaurer sur le serveur.");
  } catch {
    showFlashInfo("Erreur réseau lors de la restauration.");
  } finally {
    if (els.configRestoreServerBtn) els.configRestoreServerBtn.disabled = false;
  }
}

function openLoginModal() {
  closeStatsModal();
  closeGeneralStatsModal();
  closeHelpModal();
  closeHistoryModal();
  closeConfigModal();
  closeMultiModal();
  closeDuelModal();
  setLoginFeedback("");
  if (els.loginForm) {
    els.loginForm.reset();
  }
  if (els.loginSubmitBtn) {
    els.loginSubmitBtn.disabled = false;
  }
  if (els.loginModal) {
    els.loginModal.classList.remove("hidden");
  }
  if (els.loginEmailInput) {
    els.loginEmailInput.focus();
  }
}

function closeLoginModal() {
  if (els.loginModal) {
    els.loginModal.classList.add("hidden");
  }
  setLoginFeedback("");
  if (els.loginPasswordInput) {
    els.loginPasswordInput.value = "";
  }
  if (els.loginSubmitBtn) {
    els.loginSubmitBtn.disabled = false;
  }
}

function openWelcomeModal(title, message) {
  if (!els.welcomeModal || !els.welcomeModalMessage) return;
  if (welcomeModalTimer) {
    window.clearTimeout(welcomeModalTimer);
    welcomeModalTimer = null;
  }
  els.welcomeModalMessage.textContent = message;
  els.welcomeModal.classList.remove("hidden");
  welcomeModalTimer = window.setTimeout(() => {
    closeWelcomeModal();
  }, WELCOME_MODAL_MS);
}

function closeWelcomeModal() {
  if (welcomeModalTimer) {
    window.clearTimeout(welcomeModalTimer);
    welcomeModalTimer = null;
  }
  els.welcomeModal?.classList.add("hidden");
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const email = (els.loginEmailInput?.value || "").trim().toLowerCase();
  const password = els.loginPasswordInput?.value || "";

  if (!email || !password) {
    setLoginFeedback("Login et password sont requis.");
    return;
  }

  if (els.loginSubmitBtn) {
    els.loginSubmitBtn.disabled = true;
  }
  setLoginFeedback("");

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const message = payload?.error || "Connexion impossible";
      setLoginFeedback(message);
      return;
    }

    const token = typeof payload?.token === "string" ? payload.token.trim() : "";
    if (!token) {
      setLoginFeedback("Réponse de connexion invalide.");
      return;
    }

    try {
      window.localStorage.setItem(AUTH_TOKEN_KEY, token);
      if (payload?.id !== undefined && payload?.id !== null) {
        window.localStorage.setItem(AUTH_USER_ID_KEY, String(payload.id));
      }
      if (typeof payload?.email === "string") {
        window.localStorage.setItem(AUTH_USER_EMAIL_KEY, payload.email);
      }
      if (typeof payload?.first_name === "string") {
        window.localStorage.setItem(AUTH_USER_FIRST_NAME_KEY, payload.first_name);
      }
      if (typeof payload?.last_name === "string") {
        window.localStorage.setItem(AUTH_USER_LAST_NAME_KEY, payload.last_name);
      }
    } catch {
      setLoginFeedback("Impossible de stocker le token localement.");
      return;
    }

    setLoginFeedback("Connexion réussie.", "success");
    const connectedAs = typeof payload?.email === "string" && payload.email ? payload.email : email;
    const firstName = typeof payload?.first_name === "string" && payload.first_name ? payload.first_name : "Archer";
    window.setTimeout(() => {
      closeLoginModal();
      updateHomeLoginTile();
      updateHomeHeader();
      updateConfigActionButtons();
      openWelcomeModal("Bienvenue", `Bienvenue à ${firstName}`);
      showFlashInfo(`Connecté : ${connectedAs}`);
    }, 700);
  } catch {
    setLoginFeedback("Erreur réseau lors de la connexion.");
  } finally {
    if (els.loginSubmitBtn) {
      els.loginSubmitBtn.disabled = false;
    }
  }
}

function downloadResultsJson() {
  if (state.shoots.length !== state.targetCount) {
    return;
  }
  if (!state.resultsPayload) {
    state.resultsPayload = buildResultsPayload();
  }
  downloadPayloadAsJson(state.resultsPayload, `score-team-${state.activeRuleset}`);
}

function downloadPayloadAsJson(payload, prefix = "score-team") {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  const link = document.createElement("a");
  link.href = url;
  link.download = `${prefix}-${stamp}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportHistory() {
  const entries = loadHistoryEntries();
  if (entries.length === 0) {
    showFlashInfo("Aucun parcours à exporter.");
    return;
  }
  const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `score-team-history-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showFlashInfo(`${entries.length} parcours exporté(s).`);
}

function importHistory(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!Array.isArray(imported)) {
        showFlashInfo("Format invalide : le fichier doit contenir un tableau.");
        return;
      }
      const valid = imported.filter((item) => item && typeof item === "object" && item.generatedAt);
      if (valid.length === 0) {
        showFlashInfo("Aucun parcours valide trouvé dans le fichier.");
        return;
      }
      const resetEntries = [...valid].sort((a, b) => {
        const dateA = getHistorySortDate(a);
        const dateB = getHistorySortDate(b);
        return dateB - dateA;
      });
      saveHistoryEntries(resetEntries);
      clearPersistedState();
      historyCurrentPage = 1;
      showFlashInfo(`${resetEntries.length} parcours importé(s) (historique réinitialisé).`);
    } catch {
      showFlashInfo("Erreur lors de la lecture du fichier.");
    }
  };
  reader.readAsText(file);
}

function getHistorySortDate(entry) {
  // Convertir sessionDate (yyyy-mm-dd) + sessionTime (HH:mm) en Date
  if (entry.sessionDate) {
    const rawTime = typeof entry.sessionTime === "string" ? entry.sessionTime : "";
    const safeTime = /^\d{2}:\d{2}$/.test(rawTime) ? rawTime : "23:59";
    const sessionTs = new Date(`${entry.sessionDate}T${safeTime}:59`).getTime();
    if (!Number.isNaN(sessionTs)) return sessionTs;
  }
  // Fallback sur archivedAt ou generatedAt
  return new Date(entry.archivedAt || entry.generatedAt).getTime();
}

function formatHistoryEntryDate(entry) {
  if (entry.sessionDate) {
    const [yyyy, mm, dd] = entry.sessionDate.split("-");
    if (yyyy && mm && dd) return `${dd}/${mm}/${yyyy}`;
  }
  const date = new Date(entry.generatedAt || entry.archivedAt);
  if (Number.isNaN(date.getTime())) return "Date inconnue";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatHistoryEntryDateShort(entry) {
  if (entry.sessionDate) {
    const [, mm, dd] = entry.sessionDate.split("-");
    if (mm && dd) return `${dd}/${mm}`;
  }
  const date = new Date(entry.generatedAt || entry.archivedAt);
  if (Number.isNaN(date.getTime())) return "--/--";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

function formatHistoryEntryTime(entry) {
  const rawTime = typeof entry?.sessionTime === "string" ? entry.sessionTime : "";
  if (/^\d{2}:\d{2}$/.test(rawTime)) {
    return rawTime.replace(":", "h");
  }
  const date = new Date(entry?.generatedAt || entry?.archivedAt);
  if (Number.isNaN(date.getTime())) return "--h--";
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).replace(":", "h");
}

function syncGeneralStatsWeaponFilter() {
  if (!els.generalStatsWeaponFilter || !els.generalStatsRulesetFilter) return;

  const selectedRuleset = els.generalStatsRulesetFilter.value || "all";
  const previous = els.generalStatsWeaponFilter.value || "all";
  const options = [{ value: "all", label: "Toutes les armes" }];

  if (selectedRuleset !== "all") {
    getWeaponsForRuleset(selectedRuleset).forEach((weaponCode) => {
      options.push({ value: weaponCode, label: `${weaponCode} - ${formatWeaponLabel(weaponCode)}` });
    });
  }

  els.generalStatsWeaponFilter.innerHTML = options
    .map((option) => `<option value="${option.value}">${option.label}</option>`)
    .join("");

  const optionValues = new Set(options.map((option) => option.value));
  els.generalStatsWeaponFilter.value = optionValues.has(previous) ? previous : "all";
}

function renderGeneralStatsEvolution(entries) {
  if (!els.generalStatsEvolutionPath || !els.generalStatsEvolutionAvgLine || !els.generalStatsEvolutionAxis || !els.generalStatsEvolutionChart) {
    return;
  }

  const ordered = [...entries].sort((a, b) => getHistorySortDate(a) - getHistorySortDate(b));
  const totals = ordered.map((entry) => Number(entry.total) || 0);

  const targetSessionTotals = ordered
    .map((entry) => {
      const zone = Number(entry.successZone) || 0;
      const volleyCount = Number.isInteger(entry.targetCount)
        ? entry.targetCount
        : (Array.isArray(entry.volleys) ? entry.volleys.length : 0);
      return zone > 0 && volleyCount > 0 ? zone * volleyCount : 0;
    })
    .filter((value) => value > 0);

  const avgTargetTotal = targetSessionTotals.length > 0
    ? targetSessionTotals.reduce((sum, value) => sum + value, 0) / targetSessionTotals.length
    : 0;

  const left = 4;
  const right = 96;
  const top = 4;
  const bottom = 40;
  const rangeY = bottom - top;
  const maxObserved = Math.max(...totals, avgTargetTotal, 1);
  const toY = (value) => bottom - (Math.max(0, value) / maxObserved) * rangeY;

  const points = totals
    .map((value, index) => {
      const x = totals.length === 1 ? (left + right) / 2 : left + (index * (right - left)) / (totals.length - 1);
      return `${x.toFixed(2)},${toY(value).toFixed(2)}`;
    })
    .join(" ");

  const xSpacingPx = 50;
  const chartWidth = Math.max(280, ((ordered.length - 1) * xSpacingPx) + 80);
  els.generalStatsEvolutionChart.style.width = `${chartWidth}px`;
  els.generalStatsEvolutionAxis.style.width = `${chartWidth}px`;
  els.generalStatsEvolutionAxis.style.gridTemplateColumns = `repeat(${ordered.length}, minmax(${xSpacingPx}px, 1fr))`;

  els.generalStatsEvolutionPath.setAttribute("points", points);
  const avgY = toY(avgTargetTotal).toFixed(2);
  els.generalStatsEvolutionAvgLine.setAttribute("y1", avgY);
  els.generalStatsEvolutionAvgLine.setAttribute("y2", avgY);

  els.generalStatsEvolutionAxis.innerHTML = ordered
    .map((entry) => `<small>${formatHistoryEntryDateShort(entry)}</small>`)
    .join("");
}

function renderGeneralStatsModal() {
  const selectedRuleset = els.generalStatsRulesetFilter?.value || "all";
  const selectedWeapon = els.generalStatsWeaponFilter?.value || "all";
  const hasEmptyFilter = !String(selectedRuleset).trim() || !String(selectedWeapon).trim();
  const isAllWeaponsSelected = selectedWeapon === "all";

  if (hasEmptyFilter) {
    els.generalStatsEvolutionRow?.classList.add("hidden");
    els.generalStatsEvolutionPath?.setAttribute("points", "");
    els.generalStatsEvolutionAvgLine?.setAttribute("y1", "40");
    els.generalStatsEvolutionAvgLine?.setAttribute("y2", "40");
    if (els.generalStatsEvolutionAxis) {
      els.generalStatsEvolutionAxis.style.width = "";
      els.generalStatsEvolutionAxis.style.gridTemplateColumns = "";
      els.generalStatsEvolutionAxis.innerHTML = "";
    }
    if (els.generalStatsEvolutionChart) {
      els.generalStatsEvolutionChart.style.width = "";
    }
  }

  const entries = loadHistoryEntries().filter((entry) => {
    if (selectedRuleset !== "all" && entry.ruleset !== selectedRuleset) return false;
    if (selectedWeapon !== "all" && entry.weapon !== selectedWeapon) return false;
    return true;
  });
  if (entries.length === 0) {
    els.generalStatsEvolutionRow?.classList.add("hidden");
    els.generalStatsSessionCount.textContent = "0";
    els.generalStatsAvgSession.innerHTML = `0.0<span class="stats-unit">pts</span>`;
    els.generalStatsAvgArrow.innerHTML = `0.0<span class="stats-unit">pts</span>`;
    els.generalStatsSuccessRate.innerHTML = `0<span class="stats-unit">%</span>`;
    els.generalStatsBestSession.innerHTML = `0<span class="stats-unit">pts</span>`;
    els.generalStatsBestSessionDate.textContent = "-";
    els.generalStatsBestVolley.innerHTML = `0<span class="stats-unit">pts</span>`;
    els.generalStatsEvolutionPath?.setAttribute("points", "");
    els.generalStatsEvolutionAvgLine?.setAttribute("y1", "40");
    els.generalStatsEvolutionAvgLine?.setAttribute("y2", "40");
    if (els.generalStatsEvolutionAxis) {
      els.generalStatsEvolutionAxis.style.width = "";
      els.generalStatsEvolutionAxis.style.gridTemplateColumns = "";
      els.generalStatsEvolutionAxis.innerHTML = "";
    }
    if (els.generalStatsEvolutionChart) {
      els.generalStatsEvolutionChart.style.width = "";
    }
    return false;
  }

  const sessions = entries.length;
  const totalPoints = entries.reduce((sum, entry) => sum + (Number(entry.total) || 0), 0);
  const avgSession = sessions > 0 ? totalPoints / sessions : 0;

  let totalArrows = 0;
  let volleyCount = 0;
  let successCount = 0;
  let bestVolley = 0;

  entries.forEach((entry) => {
    const volleys = Array.isArray(entry.volleys) ? entry.volleys : [];
    const perVolley = Number.isInteger(entry.arrowsPerVolley) ? entry.arrowsPerVolley : 0;
    volleyCount += volleys.length;
    totalArrows += perVolley > 0 ? perVolley * volleys.length : 0;

    volleys.forEach((volley) => {
      const volleyTotal = Number.isFinite(volley.total) ? volley.total : roundTotal(volley.arrows || []);
      if (volleyTotal > bestVolley) bestVolley = volleyTotal;

      if (typeof volley.success === "boolean") {
        if (volley.success) successCount += 1;
      } else {
        const zone = Number(entry.successZone) || 0;
        if (zone > 0 && volleyTotal >= zone) successCount += 1;
      }
    });
  });

  const avgArrow = totalArrows > 0 ? totalPoints / totalArrows : 0;
  const successRate = volleyCount > 0 ? Math.round((successCount / volleyCount) * 100) : 0;

  const bestSession = entries.reduce((best, entry) => {
    const bestTotal = Number(best?.total) || 0;
    const entryTotal = Number(entry.total) || 0;
    return entryTotal > bestTotal ? entry : best;
  }, entries[0]);

  els.generalStatsSessionCount.textContent = String(sessions);
  els.generalStatsAvgSession.innerHTML = `${avgSession.toFixed(1)}<span class="stats-unit">pts</span>`;
  els.generalStatsAvgArrow.innerHTML = `${avgArrow.toFixed(1)}<span class="stats-unit">pts</span>`;
  els.generalStatsSuccessRate.innerHTML = `${successRate}<span class="stats-unit">%</span>`;
  els.generalStatsBestSession.innerHTML = `${Number(bestSession?.total) || 0}<span class="stats-unit">pts</span>`;
  els.generalStatsBestSessionDate.textContent = formatHistoryEntryDate(bestSession);
  els.generalStatsBestVolley.innerHTML = `${bestVolley}<span class="stats-unit">pts</span>`;

  if (state.generalStatsGraphEnabled && !hasEmptyFilter && !isAllWeaponsSelected && entries.length >= 3) {
    els.generalStatsEvolutionRow?.classList.remove("hidden");
    renderGeneralStatsEvolution(entries);
  } else {
    els.generalStatsEvolutionRow?.classList.add("hidden");
    els.generalStatsEvolutionPath?.setAttribute("points", "");
    els.generalStatsEvolutionAvgLine?.setAttribute("y1", "40");
    els.generalStatsEvolutionAvgLine?.setAttribute("y2", "40");
    if (els.generalStatsEvolutionAxis) {
      els.generalStatsEvolutionAxis.style.width = "";
      els.generalStatsEvolutionAxis.style.gridTemplateColumns = "";
      els.generalStatsEvolutionAxis.innerHTML = "";
    }
    if (els.generalStatsEvolutionChart) {
      els.generalStatsEvolutionChart.style.width = "";
    }
  }

  return true;
}

function openGeneralStatsModal() {
  closeStatsModal();
  closeHelpModal();
  closeTrainingModal();
  closeTrainingHoldModal();
  closeHistoryModal();
  closeConfigModal();
  closeMultiModal();
  closeDuelModal();
  state.generalStatsGraphEnabled = false;
  if (els.generalStatsRulesetFilter) {
    els.generalStatsRulesetFilter.value = "all";
  }
  if (els.generalStatsWeaponFilter) {
    els.generalStatsWeaponFilter.value = "all";
  }
  syncGeneralStatsWeaponFilter();
  if (!renderGeneralStatsModal()) {
    showFlashInfo("Aucune statistique disponible. Enregistrez au moins une session dans l'historique.");
    return;
  }
  els.generalStatsModal.classList.remove("hidden");
}

function closeGeneralStatsModal() {
  els.generalStatsModal.classList.add("hidden");
}

function loadHistoryEntries() {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item === "object" && item.generatedAt);
  } catch {
    return [];
  }
}

function saveHistoryEntries(entries) {
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY_ITEMS)));
  } catch {
    // Ignore storage failures.
  }
}

function updateHistoryEntryProgressionAxis(payload, progressionAxis) {
  if (!payload) return false;
  const entries = loadHistoryEntries();
  if (entries.length === 0) return false;

  const archivedAt = typeof payload.archivedAt === "string" ? payload.archivedAt : "";
  const generatedAt = typeof payload.generatedAt === "string" ? payload.generatedAt : "";
  const entryIndex = entries.findIndex((entry) => {
    if (archivedAt) return entry.archivedAt === archivedAt;
    if (generatedAt) return entry.generatedAt === generatedAt;
    return false;
  });

  if (entryIndex < 0) return false;
  entries[entryIndex] = {
    ...entries[entryIndex],
    progressionAxis,
  };
  saveHistoryEntries(entries);
  return true;
}

function addHistoryEntry(payload) {
  const entries = loadHistoryEntries();
  const entry = { ...payload, archivedAt: new Date().toISOString() };
  saveHistoryEntries([entry, ...entries]);
  return entry;
}

async function removeHistoryEntry(archivedAt) {
  const confirmed = await confirmAction("Confirmer la suppression de ce parcours de l'historique ?", "Supprimer");
  if (!confirmed) {
    return;
  }
  const entries = loadHistoryEntries().filter((entry) => entry.archivedAt !== archivedAt);
  saveHistoryEntries(entries);
  renderHistoryList();
}

const HISTORY_PER_PAGE = 4;
let historyCurrentPage = 1;

function renderHistoryList() {
  const selectedMode = els.historyModeFilter.value;
  const selectedRuleset = els.historyRulesetFilter.value;
  let entries = loadHistoryEntries().filter((entry) => {
    if (selectedMode !== "all" && entry.scoringMode !== selectedMode) return false;
    if (selectedRuleset !== "all" && entry.ruleset !== selectedRuleset) return false;
    return true;
  });

  // Trier par date de session (décroissant)
  entries.sort((a, b) => {
    const dateA = getHistorySortDate(a);
    const dateB = getHistorySortDate(b);
    return dateB - dateA;
  });

  if (entries.length === 0) {
    els.historyList.innerHTML = '<div class="history-empty">Aucun parcours sauvegardé.</div>';
    els.historyPagination.classList.add("hidden");
    return;
  }

  const totalPages = Math.ceil(entries.length / HISTORY_PER_PAGE);
  if (historyCurrentPage > totalPages) historyCurrentPage = totalPages;
  if (historyCurrentPage < 1) historyCurrentPage = 1;
  const startIdx = (historyCurrentPage - 1) * HISTORY_PER_PAGE;
  const pageEntries = entries.slice(startIdx, startIdx + HISTORY_PER_PAGE);

  const formatParcoursLabel = formatRulesetLabel;
  const formatModeWithIcon = (value) => {
    if (value === "team") {
      return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" width="18" height="18" style="vertical-align: middle;"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3Zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3Zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13Zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.96 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5Z" fill="currentColor"/></svg>`;
    }
    if (value === "individual") {
      return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" width="16" height="16" style="vertical-align: middle;"><path d="M12 12c2.76 0 5-2.24 5-5S14.76 2 12 2 7 4.24 7 7s2.24 5 5 5Zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5Z" fill="currentColor"/></svg>`;
    }
    if (value === "mixed") {
      return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" width="18" height="18" style="vertical-align: middle;"><path d="M7.5 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm9 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM7.5 14C5 14 2 15.2 2 17.5V20h11v-2.5C13 15.2 10 14 7.5 14Zm9 0c-.58 0-1.21.08-1.86.24 1.01.72 1.86 1.87 2.26 3.26H22v-1c0-1.9-2.45-2.5-5.5-2.5Z" fill="currentColor"/></svg>`;
    }
    return "-";
  };

  els.historyList.innerHTML = "";
  pageEntries.forEach((entry) => {
    let dateLabel = "Date inconnue";
    let timeLabel = formatHistoryEntryTime(entry);
    
    // Utiliser sessionDate (format yyyy-mm-dd) s'il existe
    if (entry.sessionDate) {
      const [yyyy, mm, dd] = entry.sessionDate.split("-");
      dateLabel = `${dd}/${mm}/${yyyy}`;
    } else {
      // Fallback pour l'ancien format avec generatedAt/archivedAt
      const date = new Date(entry.generatedAt || entry.archivedAt);
      const isValidDate = !Number.isNaN(date.getTime());
      dateLabel = isValidDate
        ? date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
        : "Date inconnue";
      timeLabel = isValidDate
        ? `${date.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }).replace(":", "h")}`
        : "--h--";
    }
    
    const row = document.createElement("article");
    row.className = "history-item";
    const maxVolley = getMaxVolleyFromPayload(entry);
    const volleysHtml = (entry.volleys || []).map((v) => {
      const arrows = v.arrows || [];
      const total = v.total ?? 0;
      const pillClass = getVolleyPillClass(arrows, total, maxVolley);
      const successClass = total >= (entry.successZone || 0) ? "success" : "";
      return `<tr>
        <td><span class="volley-pill ${pillClass}">${v.index}</span></td>
        <td>${arrows.map((a) => formatScore(a)).join(" / ")}</td>
        <td>${v.group || "-"}</td>
        <td class="history-total ${successClass}">${total}</td>
      </tr>`;
    }).join("");
    row.innerHTML = `
      <div class="history-item-head">
        <span class="history-date">${dateLabel}${entry.lieu ? ` · <span class="city">${entry.lieu}</span> ` : ""}</span>
        <span class="history-time">${timeLabel}</span>
      </div>
      <div class="history-item-body">
        <div class="history-item-info">
          <strong class="history-total-score">${entry.total ?? 0}<span class="stats-unit">pts</span></strong>
          <span class="history-mode">${formatParcoursLabel(entry.ruleset)}<br>${formatModeWithIcon(entry.scoringMode)}${entry.weapon ? " • " + entry.weapon : ""}</span>
        </div>
        <div class="history-item-actions">
          <button class="btn btn-icon history-list-btn" aria-label="Détail des volées">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M3 4h2v2H3V4Zm4 0h14v2H7V4ZM3 10h2v2H3v-2Zm4 0h14v2H7v-2ZM3 16h2v2H3v-2Zm4 0h14v2H7v-2Z" fill="currentColor"/>
            </svg>
          </button>
          <button class="btn btn-primary btn-icon" aria-label="Visualiser">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M4 20h16v2H4v-2Zm1-2V9h3v9H5Zm5 0V5h3v13h-3Zm5 0v-7h3v7h-3Z" fill="currentColor"/>
            </svg>
          </button>
          <button class="btn btn-icon history-delete-btn" aria-label="Supprimer">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h2v9H7V9Zm4 0h2v9h-2V9Zm4 0h2v9h-2V9ZM6 7h12l-1 14H7L6 7Z" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="history-volley-detail hidden">
        <div class="table-wrap">
          <table class="history-table">
            <thead><tr><th>Volée</th><th>Flèches</th><th>Groupe</th><th>Total</th></tr></thead>
            <tbody>${volleysHtml}</tbody>
          </table>
        </div>
      </div>
    `;
    const listBtn = row.querySelector(".history-list-btn");
    const [, viewBtn, deleteBtn] = row.querySelectorAll("button");
    listBtn.addEventListener("click", () => {
      const detail = row.querySelector(".history-volley-detail");
      const isOpen = !detail.classList.contains("hidden");
      // Accordion: close all others
      els.historyList.querySelectorAll(".history-volley-detail").forEach((d) => {
        d.classList.add("hidden");
        d.closest(".history-item")?.querySelector(".history-list-btn")?.classList.remove("active");
      });
      if (!isOpen) {
        detail.classList.remove("hidden");
        listBtn.classList.add("active");
      }
    });
    viewBtn.addEventListener("click", () => {
      state.statsOpenedFromHistory = true;
      openStatsModalFromPayload(entry);
    });
    deleteBtn.addEventListener("click", () => {
      void removeHistoryEntry(entry.archivedAt);
    });
    els.historyList.appendChild(row);
  });

  renderHistoryPagination(totalPages);
}

function renderHistoryPagination(totalPages) {
  if (totalPages <= 1) {
    els.historyPagination.classList.add("hidden");
    return;
  }
  els.historyPagination.classList.remove("hidden");
  els.historyPagination.innerHTML = "";

  const showFirstLast = totalPages > 4;

  const makeBtn = (label, page, extraClass) => {
    const btn = document.createElement("button");
    btn.className = `btn btn-light btn-icon pagination-btn${extraClass ? " " + extraClass : ""}`;
    btn.innerHTML = label;
    btn.disabled = page === historyCurrentPage;
    if (page === historyCurrentPage) btn.classList.add("pagination-active");
    btn.addEventListener("click", () => {
      historyCurrentPage = page;
      renderHistoryList();
    });
    return btn;
  };

  /* « First */
  if (showFirstLast) {
    els.historyPagination.appendChild(
      makeBtn(`<svg viewBox="0 0 24 24" width="16" height="16"><path d="M18.4 16.6 13.8 12l4.6-4.6L17 6l-6 6 6 6 1.4-1.4ZM8 6h-2v12h2V6Z" fill="currentColor"/></svg>`, 1, "pagination-edge")
    );
  }

  /* ‹ Prev */
  const prevBtn = document.createElement("button");
  prevBtn.className = "btn btn-light btn-icon pagination-btn";
  prevBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16"><path d="M15.4 16.6 10.8 12l4.6-4.6L14 6l-6 6 6 6 1.4-1.4Z" fill="currentColor"/></svg>`;
  prevBtn.disabled = historyCurrentPage <= 1;
  prevBtn.addEventListener("click", () => { historyCurrentPage--; renderHistoryList(); });
  els.historyPagination.appendChild(prevBtn);

  /* Page indicator */
  const indicator = document.createElement("span");
  indicator.className = "pagination-indicator";
  indicator.textContent = `${historyCurrentPage} / ${totalPages}`;
  els.historyPagination.appendChild(indicator);

  /* › Next */
  const nextBtn = document.createElement("button");
  nextBtn.className = "btn btn-light btn-icon pagination-btn";
  nextBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16"><path d="M8.6 16.6l4.6-4.6-4.6-4.6L10 6l6 6-6 6-1.4-1.4Z" fill="currentColor"/></svg>`;
  nextBtn.disabled = historyCurrentPage >= totalPages;
  nextBtn.addEventListener("click", () => { historyCurrentPage++; renderHistoryList(); });
  els.historyPagination.appendChild(nextBtn);

  /* » Last */
  if (showFirstLast) {
    els.historyPagination.appendChild(
      makeBtn(`<svg viewBox="0 0 24 24" width="16" height="16"><path d="M5.6 7.4 10.2 12l-4.6 4.6L7 18l6-6-6-6-1.4 1.4ZM16 6h2v12h-2V6Z" fill="currentColor"/></svg>`, totalPages, "pagination-edge")
    );
  }
}

function openHistoryModal() {
  closeStatsModal();
  closeGeneralStatsModal();
  closeHelpModal();
  closeTrainingModal();
  closeTrainingHoldModal();
  closeMultiModal();
  closeDuelModal();
  historyCurrentPage = 1;
  renderHistoryList();
  els.historyModal.classList.remove("hidden");
}

function closeHistoryModal() {
  els.historyModal.classList.add("hidden");
}

async function openMultiModal() {
  updateMultiContestModeAvailability();
  closeStatsModal();
  closeGeneralStatsModal();
  closeHelpModal();
  closeTrainingModal();
  closeTrainingHoldModal();
  closeHistoryModal();
  closeConfigModal();
  closeDuelModal();
  
  // Masquer le message d'erreur peloton
  if (els.pelotonNamesError) {
    els.pelotonNamesError.classList.add("hidden");
  }
  
    // Masquer le message d'erreur duel
    if (els.duelNamesError) {
      els.duelNamesError.classList.add("hidden");
    }
  
  // Réinitialiser le slider du bot au démarrage
  duelBotMode = false;
  els.duelBotRow?.classList.remove("visible");
  
  if (els.multiRulesetSelect) {
    const currentValue = els.multiRulesetSelect.value;
    const hasCurrentEnabled = currentValue && appConfig.enabledRulesets.includes(currentValue);
    if (!hasCurrentEnabled) {
      const firstEnabledOption = Array.from(els.multiRulesetSelect.querySelectorAll("option")).find(
        (option) => option.value && appConfig.enabledRulesets.includes(option.value)
      );
      if (firstEnabledOption) {
        els.multiRulesetSelect.value = firstEnabledOption.value;
      }
    }
    syncMultiContestWeaponSelectOptions(getStoredContestWeapon());
  }
  if (els.multiModeSelect) {
    const firstAvailableModeOption = Array.from(els.multiModeSelect.options).find(
      (option) => option.value && !option.disabled && !option.hidden,
    );
    if (firstAvailableModeOption) {
      els.multiModeSelect.value = firstAvailableModeOption.value;
    }
  }
  // Initialiser l'affichage des éléments selon le mode
  const mode = els.multiModeSelect?.value || "duel";
  if (mode === "duel") {
    els.duelNamesContainer?.classList.remove("hidden");
    els.pelotonNamesContainer?.classList.add("hidden");
    els.targetCountFieldset?.classList.remove("hidden");
    els.contestCodeContainer?.classList.add("hidden");
    els.contestWeaponContainer?.classList.add("hidden");
  } else if (mode === "peloton") {
    els.duelNamesContainer?.classList.add("hidden");
    els.pelotonNamesContainer?.classList.remove("hidden");
    els.targetCountFieldset?.classList.add("hidden");
    els.contestCodeContainer?.classList.add("hidden");
    els.contestWeaponContainer?.classList.add("hidden");
  } else if (mode === "contest") {
    els.duelNamesContainer?.classList.add("hidden");
    els.pelotonNamesContainer?.classList.add("hidden");
    els.targetCountFieldset?.classList.add("hidden");
    const hasStoredUuid = Boolean(getStoredContestUuid());
    if (hasStoredUuid) {
      els.contestCodeContainer?.classList.add("hidden");
    } else {
      els.contestCodeContainer?.classList.remove("hidden");
    }
    syncMultiContestWeaponSelectOptions(getStoredContestWeapon());
    els.contestWeaponContainer?.classList.remove("hidden");
  }
  els.multiModal?.classList.remove("hidden");
}

function closeMultiModal() {
  els.multiModal?.classList.add("hidden");
}

function getTrainingRingColorByPhase(phase) {
  if (phase === "rest") return "#2d6a4f";
  if (phase === "series-break") return "#1558c0";
  return "#c62828";
}

function syncTrainingMetaBlocksColor(phase) {
  const bgColor = getTrainingRingColorByPhase(phase);
  [els.trainingHoldSeriesText, els.trainingHoldRepetitionsText].forEach((el) => {
    if (!el) return;
    el.style.backgroundColor = bgColor;
    el.style.color = "#fff";
  });
}

function setTrainingCycleRingSeconds(seconds) {
  if (!els.trainingCycleRingValue) return;
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.trunc(seconds)) : 0;
  els.trainingCycleRingValue.innerHTML = `<span class="training-time-value">${safeSeconds}</span><span class="training-time-unit">s</span>`;
}

function updateTrainingHoldSecondsDisplay() {
  if (!els.trainingHoldSecondsInput || !els.trainingHoldSecondsValue) return;
  const seconds = Number.parseInt(els.trainingHoldSecondsInput.value, 10);
  const safeSeconds = Number.isInteger(seconds) ? Math.min(12, Math.max(2, seconds)) : 2;
  els.trainingHoldSecondsInput.value = String(safeSeconds);
  els.trainingHoldSecondsValue.textContent = `${safeSeconds}s`;
  appConfig.trainingHold.holdSeconds = safeSeconds;
  saveConfig();
  if (!trainingCycleState && els.trainingCycleRingValue && els.trainingCycleRingLabel) {
    setTrainingCycleRingSeconds(safeSeconds);
    els.trainingCycleRingLabel.textContent = "Tenue";
    els.trainingCycleRing?.classList.remove("is-rest");
    els.trainingCycleRing?.classList.remove("is-series-break");
    els.trainingCycleRing?.classList.add("is-hold");
    syncTrainingMetaBlocksColor("hold");
  }
  setRangeProgress(els.trainingHoldSecondsInput);
}

function updateTrainingRestSecondsDisplay() {
  if (!els.trainingRestSecondsInput || !els.trainingRestSecondsValue) return;
  const seconds = Number.parseInt(els.trainingRestSecondsInput.value, 10);
  const safeSeconds = Number.isInteger(seconds) ? Math.min(30, Math.max(5, seconds)) : 5;
  els.trainingRestSecondsInput.value = String(safeSeconds);
  els.trainingRestSecondsValue.textContent = `${safeSeconds}s`;
  appConfig.trainingHold.restSeconds = safeSeconds;
  saveConfig();
  if (!trainingCycleState && els.trainingCycleRingValue && els.trainingCycleRingLabel) {
    setTrainingCycleRingSeconds(safeSeconds);
    els.trainingCycleRingLabel.textContent = "Repos";
    els.trainingCycleRing?.classList.remove("is-hold");
    els.trainingCycleRing?.classList.remove("is-series-break");
    els.trainingCycleRing?.classList.add("is-rest");
    syncTrainingMetaBlocksColor("rest");
  }
  setRangeProgress(els.trainingRestSecondsInput);
}

function stopTrainingCycle() {
  if (trainingCycleIntervalId) {
    window.clearInterval(trainingCycleIntervalId);
    trainingCycleIntervalId = null;
  }
  trainingCycleState = null;
  updateTrainingCycleToggleButton(true);
}

function updateTrainingCycleToggleButton(showStart) {
  if (!els.trainingCycleToggleBtn || !els.trainingCycleToggleText || !els.trainingCycleToggleIcon) return;
  els.trainingCycleToggleText.textContent = showStart ? "Démarrer" : "Pause";
  els.trainingCycleToggleBtn.setAttribute(
    "aria-label",
    showStart ? "Démarrer le timer" : "Mettre en pause le timer",
  );
  els.trainingCycleToggleIcon.innerHTML = showStart
    ? '<path d="M8 5v14l11-7L8 5Z" fill="currentColor" />'
    : '<path d="M7 5h3v14H7V5Zm7 0h3v14h-3V5Z" fill="currentColor" />';
}

function pauseTrainingCycle() {
  if (trainingCycleIntervalId) {
    window.clearInterval(trainingCycleIntervalId);
    trainingCycleIntervalId = null;
  }
  if (trainingCycleState) {
    trainingCycleState.isPaused = true;
  }
  updateTrainingCycleToggleButton(true);
}

function resumeTrainingCycle() {
  if (!trainingCycleState || trainingCycleIntervalId) return;
  trainingCycleState.isPaused = false;
  trainingCycleIntervalId = window.setInterval(tickTrainingCycle, 1000);
  updateTrainingCycleToggleButton(false);
}

function renderTrainingCycle() {
  if (!trainingCycleState) return;
  if (els.trainingHoldSeriesValue) {
    els.trainingHoldSeriesValue.textContent = String(trainingCycleState.seriesRemaining);
  }
  if (els.trainingHoldRepetitionsValue) {
    els.trainingHoldRepetitionsValue.textContent = String(trainingCycleState.repetitionsRemaining);
  }
  if (els.trainingCycleRingValue) {
    setTrainingCycleRingSeconds(trainingCycleState.secondsRemaining);
  }
  if (els.trainingCycleRingLabel) {
    if (trainingCycleState.phase === "rest") {
      els.trainingCycleRingLabel.textContent = "Repos";
    } else if (trainingCycleState.phase === "series-break") {
      els.trainingCycleRingLabel.textContent = "Fin de série";
    } else {
      els.trainingCycleRingLabel.textContent = "Tenue";
    }
  }
  if (els.trainingCycleRing) {
    const cycleTotal = trainingCycleState.phase === "series-break"
      ? Math.max(1, trainingCycleState.seriesBreakSeconds)
      : Math.max(1, trainingCycleState.restSeconds + trainingCycleState.holdSeconds);
    const remainingInCycle = trainingCycleState.phase === "series-break"
      ? trainingCycleState.secondsRemaining
      : trainingCycleState.secondsRemaining + (trainingCycleState.phase === "rest" ? trainingCycleState.holdSeconds : 0);
    const progressPct = Math.min(100, Math.max(0, (remainingInCycle / cycleTotal) * 100));
    els.trainingCycleRing.style.setProperty("--ring-progress", `${progressPct}`);
    els.trainingCycleRing.classList.toggle("is-rest", trainingCycleState.phase === "rest");
    els.trainingCycleRing.classList.toggle("is-series-break", trainingCycleState.phase === "series-break");
    els.trainingCycleRing.classList.toggle("is-hold", trainingCycleState.phase === "hold");
    syncTrainingMetaBlocksColor(trainingCycleState.phase);
    els.trainingCycleRing.setAttribute(
      "aria-label",
      trainingCycleState.phase === "rest"
        ? "Décompte du temps de repos"
        : trainingCycleState.phase === "series-break"
          ? "Décompte de la pause entre les séries"
          : "Décompte du temps de tenue",
    );
  }
}

function tickTrainingCycle() {
  if (!trainingCycleState || trainingCycleState.isPaused) return;

  if (trainingCycleState.secondsRemaining > 0) {
    trainingCycleState.secondsRemaining -= 1;
    renderTrainingCycle();
    return;
  }

  if (trainingCycleState.phase === "rest") {
    trainingCycleState.phase = "hold";
    trainingCycleState.secondsRemaining = trainingCycleState.holdSeconds;
    speakTrainingRestPrompt();
    renderTrainingCycle();
    return;
  }

  if (trainingCycleState.phase === "series-break") {
    trainingCycleState.phase = "rest";
    trainingCycleState.secondsRemaining = trainingCycleState.restSeconds;
    speakTrainingExercisePrompt();
    renderTrainingCycle();
    return;
  }

  trainingCycleState.repetitionsRemaining -= 1;
  if (trainingCycleState.repetitionsRemaining > 0) {
    trainingCycleState.phase = "rest";
    trainingCycleState.secondsRemaining = trainingCycleState.restSeconds;
    speakTrainingExercisePrompt();
    renderTrainingCycle();
    return;
  }

  trainingCycleState.seriesRemaining -= 1;
  if (trainingCycleState.seriesRemaining > 0) {
    const currentSeriesNumber = trainingCycleState.initialSeriesCount - trainingCycleState.seriesRemaining;
    trainingCycleState.repetitionsRemaining = trainingCycleState.repetitionsPerSeries;
    trainingCycleState.phase = "series-break";
    trainingCycleState.secondsRemaining = trainingCycleState.seriesBreakSeconds;
    speakTrainingSeriesBreak(currentSeriesNumber);
    renderTrainingCycle();
    return;
  }

  if (els.trainingCycleRingValue) {
    setTrainingCycleRingSeconds(0);
  }
  if (els.trainingCycleRingLabel) {
    els.trainingCycleRingLabel.textContent = "Terminé";
  }
  if (els.trainingHoldSeriesValue) {
    els.trainingHoldSeriesValue.textContent = "0";
  }
  if (els.trainingHoldRepetitionsValue) {
    els.trainingHoldRepetitionsValue.textContent = "0";
  }
  if (els.trainingCycleRing) {
    els.trainingCycleRing.style.setProperty("--ring-progress", "0");
  }
  speakTrainingExerciseEnd();
  stopTrainingCycle();
  showFlashInfo("Séance Temps de tenue terminée.");
}

function startTrainingCycle() {
  const series = Number.parseInt(els.trainingSeriesInput?.value || "3", 10);
  const repetitions = Number.parseInt(els.trainingRepetitionsInput?.value || "3", 10);
  const holdSeconds = Number.parseInt(els.trainingHoldSecondsInput?.value || "4", 10);
  const restSeconds = Number.parseInt(els.trainingRestSecondsInput?.value || "5", 10);

  const safeSeries = Number.isInteger(series) ? Math.min(6, Math.max(3, series)) : 3;
  const safeRepetitions = Number.isInteger(repetitions) ? Math.min(6, Math.max(3, repetitions)) : 3;
  const safeHold = Number.isInteger(holdSeconds) ? Math.min(12, Math.max(2, holdSeconds)) : 4;
  const safeRest = Number.isInteger(restSeconds) ? Math.min(30, Math.max(5, restSeconds)) : 5;

  stopTrainingCycle();
  trainingCycleState = {
    initialSeriesCount: safeSeries,
    seriesRemaining: safeSeries,
    repetitionsPerSeries: safeRepetitions,
    repetitionsRemaining: safeRepetitions,
    holdSeconds: safeHold,
    restSeconds: safeRest,
    seriesBreakSeconds: TRAINING_SERIES_BREAK_SECONDS,
    phase: "rest",
    secondsRemaining: safeRest,
    isPaused: false,
  };

  speakTrainingExerciseStart();
  renderTrainingCycle();
  trainingCycleIntervalId = window.setInterval(tickTrainingCycle, 1000);
  updateTrainingCycleToggleButton(false);
}

function updateTrainingSeriesDisplay() {
  if (!els.trainingSeriesInput || !els.trainingSeriesValue) return;
  const series = Number.parseInt(els.trainingSeriesInput.value, 10);
  const safeSeries = Number.isInteger(series) ? Math.min(6, Math.max(3, series)) : 3;
  els.trainingSeriesInput.value = String(safeSeries);
  els.trainingSeriesValue.textContent = String(safeSeries);
  appConfig.trainingHold.series = safeSeries;
  saveConfig();
  if (els.trainingHoldSeriesValue) {
    els.trainingHoldSeriesValue.textContent = String(safeSeries);
  }
  setRangeProgress(els.trainingSeriesInput);
}

function updateTrainingRepetitionsDisplay() {
  if (!els.trainingRepetitionsInput || !els.trainingRepetitionsValue) return;
  const repetitions = Number.parseInt(els.trainingRepetitionsInput.value, 10);
  const safeRepetitions = Number.isInteger(repetitions) ? Math.min(6, Math.max(3, repetitions)) : 3;
  els.trainingRepetitionsInput.value = String(safeRepetitions);
  els.trainingRepetitionsValue.textContent = String(safeRepetitions);
  appConfig.trainingHold.repetitions = safeRepetitions;
  saveConfig();
  if (els.trainingHoldRepetitionsValue) {
    els.trainingHoldRepetitionsValue.textContent = String(safeRepetitions);
  }
  setRangeProgress(els.trainingRepetitionsInput);
}

function syncTrainingOptionForm() {
  if (!els.trainingOptionSelect || !els.trainingHoldTimeForm) return;
  const isHoldTime = els.trainingOptionSelect.value === "hold-time";
  els.trainingHoldTimeForm.classList.toggle("hidden", !isHoldTime);
}

function openTrainingModal() {
  closeStatsModal();
  closeGeneralStatsModal();
  closeHelpModal();
  closeHistoryModal();
  closeConfigModal();
  closeMultiModal();
  closeDuelModal();
  closePelotonModal();
  closeTrainingHoldModal();
  if (els.trainingOptionSelect) {
    els.trainingOptionSelect.value = "hold-time";
  }
  syncTrainingOptionForm();
  updateTrainingSeriesDisplay();
  updateTrainingRepetitionsDisplay();
  updateTrainingHoldSecondsDisplay();
  updateTrainingRestSecondsDisplay();
  els.trainingModal?.classList.remove("hidden");
}

function closeTrainingModal() {
  els.trainingModal?.classList.add("hidden");
}

function openTrainingHoldModal() {
  updateTrainingSeriesDisplay();
  updateTrainingRepetitionsDisplay();
  updateTrainingHoldSecondsDisplay();
  updateTrainingRestSecondsDisplay();
  els.trainingHoldModal?.classList.remove("hidden");
  startTrainingCycle();
}

function closeTrainingHoldModal() {
  stopTrainingCycle();
  els.trainingHoldModal?.classList.add("hidden");
}

async function startContestFromStoredUuidIfAvailable() {
  const storedContestUuid = getStoredContestUuid();
  if (!storedContestUuid) {
    return false;
  }

  const ruleset = (els.multiRulesetSelect?.value || "").trim();
  if (!ruleset) {
    showFlashInfo("Sélectionnez un type de parcours.");
    return false;
  }

  if (els.multiStartBtn) {
    els.multiStartBtn.disabled = true;
  }

  const contest = await connectToContest(storedContestUuid, ruleset);

  if (els.multiStartBtn) {
    els.multiStartBtn.disabled = false;
  }

  if (!contest) {
    els.contestCodeContainer?.classList.remove("hidden");
    els.contestCodeInput?.focus();
    return false;
  }

  closeMultiModal();
  closeStatsModal();
  closeGeneralStatsModal();
  closeHelpModal();
  closeHistoryModal();
  closeConfigModal();
  startContestScoring(contest, els.multiContestWeaponSelect?.value || "");
  return true;
}

function getSelectedMultiTargetCount() {
  const checked = [...(els.multiTargetCountInputs || [])].find((input) => input.checked);
  const parsed = Number.parseInt(checked?.value || "4", 10);
  return parsed === 6 ? 6 : 4;
}

function resetDuelStateFromMultiConfig() {
  const ruleset = els.multiRulesetSelect?.value || "3d";
  const mode = els.multiModeSelect?.value || "duel";
  const targetCount = mode === "peloton"
    ? getTargetCountForRuleset(ruleset)
    : getSelectedMultiTargetCount();
  const arrowsPerTarget = getArrowsPerVolley(ruleset, "individual");
  const allowedPoints = [...new Set(presets[ruleset] || [0])].sort((a, b) => b - a);

  state.duel = {
    ruleset,
    mode,
    targetCount,
    arrowsPerTarget,
    allowedPoints,
    currentTargetIndex: 0,
    activePlayer: 1,
    currentArrowIndex: 0,
    scoresP1: Array(targetCount).fill(null).map(() => Array(arrowsPerTarget).fill(null)),
    scoresP2: Array(targetCount).fill(null).map(() => Array(arrowsPerTarget).fill(null)),
    nameP1: "",
    nameP2: "",
    previewLocked: false,
    completed: false,
  };
}

function getDuelTotal(scores) {
  let total = 0;
  for (const targetArrows of scores) {
    if (Array.isArray(targetArrows)) {
      for (const arrowScore of targetArrows) {
        total += scoreToValue(arrowScore);
      }
    } else {
      total += scoreToValue(targetArrows);
    }
  }
  return total;
}

function renderDuelPad() {
  if (!els.duelPointsPad) return;
  els.duelPointsPad.innerHTML = "";
  const isLocked = Boolean(state.duel.previewLocked) || state.duel.completed || (duelBotMode && state.duel.activePlayer === 2);
  const selectablePoints = getSelectablePointsForArrow(
    state.duel.ruleset,
    "individual",
    state.duel.currentArrowIndex,
    state.duel.allowedPoints,
  );

  selectablePoints.forEach((score) => {
    const button = document.createElement("button");
    button.className = "point-btn";
    if (score === 0) button.classList.add("zero");
    if (score === FIELD_X) button.classList.add("x-score");
    button.textContent = scoreLabel(score);
    if (isLocked) {
      button.disabled = true;
      button.classList.add("lock-disabled");
    } else {
      button.addEventListener("click", () => registerDuelScore(score));
    }
    els.duelPointsPad.appendChild(button);
  });

  updatePointsRuleHint(els.duelPointsRuleHint, state.duel.ruleset, state.duel.currentArrowIndex);
}

function renderPelotonPad() {
  if (!els.pelotonPointsPad) return;
  els.pelotonPointsPad.innerHTML = "";
  const isLocked = Boolean(state.peloton?.previewLocked) || state.peloton.completed;
  const selectablePoints = getSelectablePointsForArrow(
    state.peloton.ruleset,
    "individual",
    state.peloton.currentArrowIndex,
    state.peloton.allowedPoints,
  );

  selectablePoints.forEach((score) => {
    const button = document.createElement("button");
    button.className = "point-btn";
    if (score === 0) button.classList.add("zero");
    if (score === FIELD_X) button.classList.add("x-score");
    button.textContent = scoreLabel(score);
    if (isLocked) {
      button.disabled = true;
      button.classList.add("lock-disabled");
    } else {
      button.addEventListener("click", () => registerPelotonScore(score));
    }
    els.pelotonPointsPad.appendChild(button);
  });
}

function renderDuelVolleyHistory(container, scoresByTarget, opponentScoresByTarget, options = {}) {
  if (!container) return;

  const maxVolleyTotal = Number.isFinite(options.maxVolleyTotal) ? options.maxVolleyTotal : null;
  const highlightBestScore = options.highlightBestScore === true;

  const isCompletedVolley = (arrows) => (
    Array.isArray(arrows)
    && arrows.length > 0
    && arrows.every((value) => value !== null && value !== undefined)
  );

  const rows = [];
  scoresByTarget.forEach((targetArrows, index) => {
    if (!Array.isArray(targetArrows)) return;
    const hasAnyScore = targetArrows.some((value) => value !== null && value !== undefined);
    if (!hasAnyScore) return;

    const sortedArrows = [...targetArrows].sort((a, b) => {
      const scoreA = a === null || a === undefined ? -1 : scoreToValue(a);
      const scoreB = b === null || b === undefined ? -1 : scoreToValue(b);
      return scoreB - scoreA;
    });

    const arrowsText = sortedArrows
      .map((value) => (value === null || value === undefined ? "-" : scoreLabel(value)))
      .join(" / ");
    const targetTotal = targetArrows.reduce((sum, value) => sum + scoreToValue(value), 0);
    const completed = isCompletedVolley(targetArrows);
    const missCount = completed
      ? targetArrows.reduce((count, value) => count + (scoreToValue(value) === 0 ? 1 : 0), 0)
      : 0;
    const isFullVolley = (
      completed
      && maxVolleyTotal !== null
      && Math.abs(targetTotal - maxVolleyTotal) < 0.0001
    );

    const opponentArrows = Array.isArray(opponentScoresByTarget?.[index])
      ? opponentScoresByTarget[index]
      : null;
    const opponentCompleted = isCompletedVolley(opponentArrows);
    const opponentTotal = opponentCompleted
      ? opponentArrows.reduce((sum, value) => sum + scoreToValue(value), 0)
      : null;

    let pillClass = "is-gray";
    if (highlightBestScore) {
      if (completed && opponentCompleted && targetTotal > opponentTotal) {
        pillClass = "is-green";
      }
    } else if (completed) {
      if (missCount >= 2) {
        pillClass = "is-red";
      } else if (missCount === 1) {
        pillClass = "is-orange";
      } else if (isFullVolley) {
        pillClass = "is-green";
      }
    }

    rows.push(`
      <tr>
        <td><span class="volley-pill ${pillClass}">${index + 1}</span></td>
        <td>${arrowsText}</td>
        <td class="history-total">${targetTotal}</td>
      </tr>
    `);
  });

  if (rows.length === 0) {
    container.innerHTML = '<div class="duel-volley-empty">Aucune volée</div>';
    return;
  }

  container.innerHTML = `
    <div class="table-wrap duel-history-table-wrap">
      <table class="history-table duel-history-table">
        <tbody>
          ${rows.join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderPelotonHistorySwiper(container, options = {}) {
  if (!container) return;

  const roster = state.pelotonRoster || [];
  if (roster.length === 0) {
    container.innerHTML = '<div class="duel-volley-empty">Aucune volée</div>';
    return;
  }

  const maxVolleyTotal = Number.isFinite(options.maxVolleyTotal) ? options.maxVolleyTotal : null;
  const activeArcherIndex = Number(state.pelotonActiveArcherIndex);
  const groupedRoster = [];
  for (let i = 0; i < roster.length; i += 2) {
    groupedRoster.push(roster.slice(i, i + 2));
  }
  const activeArcherPosition = Math.max(0, roster.findIndex((archer) => archer.index === activeArcherIndex));
  const initialSlideIndex = Math.floor(activeArcherPosition / 2);

  const slideMarkup = groupedRoster.map((archerPair, pairIndex) => {
    const activeClass = pairIndex === initialSlideIndex ? " is-active" : "";
    const pairLabel = archerPair.map((archer) => archer.name).join(" / ");
    const pairContent = archerPair.map((archer) => {
      const archerState = state.pelotonByArcher?.[archer.index];
      const total = archerState ? getDuelTotal(archerState.scores || []) : 0;

      return `
        <article class="peloton-history-archer-card">
          <header class="peloton-history-slide-head">
            <strong class="peloton-history-slide-name">${archer.name}</strong>
            <span class="peloton-history-slide-total">${total}<span class="stats-unit">pts</span></span>
          </header>
          <div class="peloton-history-slide-body" data-archer-index="${archer.index}"></div>
        </article>
      `;
    }).join("");

    return `
      <section class="peloton-history-slide${activeClass}" data-slide-index="${pairIndex}" aria-label="Historique ${pairLabel}">
        ${pairContent}
      </section>
    `;
  }).join("");

  container.innerHTML = `
    <div class="peloton-history-swiper">
      <div class="peloton-history-track" aria-label="Historique par archer">
        ${slideMarkup}
      </div>
    </div>
  `;

  const track = container.querySelector(".peloton-history-track");
  const slides = [...container.querySelectorAll(".peloton-history-slide")];

  slides.forEach((slide) => {
    const historyBodies = [...slide.querySelectorAll(".peloton-history-slide-body")];
    historyBodies.forEach((historyBody) => {
      const archerIndex = Number(historyBody.dataset.archerIndex);
      const archerState = state.pelotonByArcher?.[archerIndex];
      renderDuelVolleyHistory(historyBody, archerState?.scores || [], [], { maxVolleyTotal });
    });
  });

  const historyCards = [...container.querySelectorAll(".peloton-history-archer-card")];
  let isSyncingHistoryScroll = false;
  historyCards.forEach((card) => {
    card.addEventListener("scroll", () => {
      if (isSyncingHistoryScroll) {
        return;
      }

      isSyncingHistoryScroll = true;
      const nextScrollTop = card.scrollTop;
      historyCards.forEach((otherCard) => {
        if (otherCard === card) {
          return;
        }
        if (Math.abs(otherCard.scrollTop - nextScrollTop) > 1) {
          otherCard.scrollTop = nextScrollTop;
        }
      });
      isSyncingHistoryScroll = false;
    }, { passive: true });
  });

  if (!track || slides.length === 0) {
    return;
  }

  const setActiveSlide = (index) => {
    slides.forEach((slide, slideIndex) => {
      slide.classList.toggle("is-active", slideIndex === index);
    });
  };

  const scrollToSlide = (index, behavior = "smooth") => {
    const boundedIndex = Math.max(0, Math.min(index, slides.length - 1));
    const width = track.clientWidth || 1;
    track.scrollTo({ left: boundedIndex * width, behavior });
    setActiveSlide(boundedIndex);
  };

  let rafId = 0;
  track.addEventListener("scroll", () => {
    if (rafId) return;
    rafId = window.requestAnimationFrame(() => {
      const width = track.clientWidth || 1;
      const index = Math.round(track.scrollLeft / width);
      setActiveSlide(Math.max(0, Math.min(index, slides.length - 1)));
      rafId = 0;
    });
  }, { passive: true });

  window.requestAnimationFrame(() => {
    scrollToSlide(initialSlideIndex, "auto");
  });
}

function renderDuelView() {
  const { currentTargetIndex, targetCount, activePlayer, scoresP1, scoresP2, completed, nameP1, nameP2, currentArrowIndex, arrowsPerTarget } = state.duel;
  const safeIndex = Math.max(0, Math.min(currentTargetIndex, targetCount - 1));
  const p1Total = getDuelTotal(scoresP1);
  const p2Total = getDuelTotal(scoresP2);

  // Update player labels with names
  const displayP1 = nameP1 ? nameP1 : "Joueur 1";
  const displayP2 = nameP2 ? nameP2 : "Joueur 2";
  
  if (els.duelP1Label) {
    els.duelP1Label.textContent = displayP1;
  }
  if (els.duelP2Label) {
    els.duelP2Label.textContent = displayP2;
  }
  if (els.duelP1CurrentLabel) {
    els.duelP1CurrentLabel.textContent = "";
  }
  if (els.duelP2CurrentLabel) {
    els.duelP2CurrentLabel.textContent = "";
  }

  if (els.duelVolleyNumber) {
    els.duelVolleyNumber.innerHTML = "";
  }

  if (els.duelTargetCounter) {
    const labelIndex = completed ? targetCount : safeIndex + 1;
    els.duelTargetCounter.textContent = `Cible ${labelIndex}/${targetCount}`;
  }
  const duelCurrentArrows = completed
    ? []
    : (activePlayer === 1 ? scoresP1[safeIndex] : scoresP2[safeIndex]);
  renderCurrentShootPills(els.duelCurrentShootDisplay, duelCurrentArrows, arrowsPerTarget);
  if (els.duelActivePlayer) {
    els.duelActivePlayer.textContent = completed ? "Saisie terminée" : `Tour: ${activePlayer === 1 ? displayP1 : displayP2}`;
  }
  if (els.duelSummaryCardP1 && els.duelSummaryCardP2) {
    const p1Active = !completed && activePlayer === 1;
    const p2Active = !completed && activePlayer === 2;
    els.duelSummaryCardP1.classList.toggle("is-active-archer", p1Active);
    els.duelSummaryCardP2.classList.toggle("is-active-archer", p2Active);

    const hasWinner = p1Total !== p2Total;
    els.duelSummaryCardP1.classList.toggle("is-winner-archer", hasWinner && p1Total > p2Total);
    els.duelSummaryCardP2.classList.toggle("is-winner-archer", hasWinner && p2Total > p1Total);
  }
  if (els.duelTotalP1) {
    els.duelTotalP1.innerHTML = `${p1Total}<span class="stats-unit">pts</span>`;
  }
  if (els.duelTotalP2) {
    els.duelTotalP2.innerHTML = `${p2Total}<span class="stats-unit">pts</span>`;
  }
  if (els.duelRestartBtn) {
    els.duelRestartBtn.classList.toggle("hidden", !completed);
  }

  const duelMaxVolleyTotal = getSessionVolleyMaxTotal(
    state.duel.ruleset,
    state.duel.arrowsPerTarget,
    state.duel.allowedPoints,
  );

  renderDuelVolleyHistory(els.duelHistoryP1, scoresP1, scoresP2, {
    maxVolleyTotal: duelMaxVolleyTotal,
    highlightBestScore: true,
  });
  renderDuelVolleyHistory(els.duelHistoryP2, scoresP2, scoresP1, {
    maxVolleyTotal: duelMaxVolleyTotal,
    highlightBestScore: true,
  });

  renderDuelPad();
  runDuelBotTurnIfNeeded();
}

function registerDuelScore(score) {
  if (state.duel.completed || state.duel.previewLocked) return;
  const { currentTargetIndex, targetCount, activePlayer, currentArrowIndex, arrowsPerTarget, scoresP1, scoresP2 } = state.duel;
  if (currentTargetIndex < 0 || currentTargetIndex >= targetCount) return;
  if (!getSelectablePointsForArrow(state.duel.ruleset, "individual", currentArrowIndex, state.duel.allowedPoints).includes(score)) {
    return;
  }

  // Record the arrow for the current player
  if (activePlayer === 1) {
    scoresP1[currentTargetIndex][currentArrowIndex] = score;
  } else {
    scoresP2[currentTargetIndex][currentArrowIndex] = score;
  }

  // Afficher la dernière flèche brièvement avant d'avancer.
  if (currentArrowIndex >= arrowsPerTarget - 1) {
    clearDuelBotShotTimer();
    state.duel.previewLocked = true;
    renderDuelView();

    window.setTimeout(() => {
      state.duel.previewLocked = false;
      state.duel.currentArrowIndex = 0;

      if (activePlayer === 1) {
        state.duel.activePlayer = 2;
      } else {
        state.duel.currentTargetIndex += 1;
        state.duel.activePlayer = 1;
        if (state.duel.currentTargetIndex >= targetCount) {
          state.duel.completed = true;
          state.duel.currentTargetIndex = targetCount;
          showFlashInfo("Saisie duel terminée.");
        }
      }

      renderDuelView();
    }, LAST_SCORE_PREVIEW_MS);

    return;
  }

  // Move to next arrow or next player
  if (currentArrowIndex < arrowsPerTarget - 1) {
    // More arrows for this player
    state.duel.currentArrowIndex += 1;
  } else {
    // All arrows done for this player, move to next player
    state.duel.currentArrowIndex = 0;
    if (activePlayer === 1) {
      state.duel.activePlayer = 2;
    } else {
      // P2 done, move to next target
      state.duel.currentTargetIndex += 1;
      state.duel.activePlayer = 1;
      if (state.duel.currentTargetIndex >= targetCount) {
        state.duel.completed = true;
        state.duel.currentTargetIndex = targetCount;
        showFlashInfo("Saisie duel terminée.");
      }
    }
  }

  renderDuelView();
}

function stepBackDuelScore() {
  const duel = state.duel;
  if (duel.targetCount <= 0) return;

  const clearScoreAt = (targetIndex, player, arrowIndex) => {
    const scores = player === 1 ? duel.scoresP1 : duel.scoresP2;
    if (!scores[targetIndex]) return;
    scores[targetIndex][arrowIndex] = null;
  };

  if (duel.completed) {
    duel.completed = false;
    duel.currentTargetIndex = duel.targetCount - 1;
    duel.activePlayer = 2;
    duel.currentArrowIndex = duel.arrowsPerTarget - 1;
    clearScoreAt(duel.currentTargetIndex, 2, duel.currentArrowIndex);
    renderDuelView();
    return;
  }

  let targetIndex = duel.currentTargetIndex;
  let player = duel.activePlayer;
  let arrowIndex = duel.currentArrowIndex;

  // Nothing to remove at very beginning.
  if (targetIndex === 0 && player === 1 && arrowIndex === 0) {
    renderDuelView();
    return;
  }

  // Reverse the forward input cursor to the last entered score.
  if (arrowIndex > 0) {
    arrowIndex -= 1;
  } else if (player === 2) {
    player = 1;
    arrowIndex = duel.arrowsPerTarget - 1;
  } else {
    targetIndex -= 1;
    player = 2;
    arrowIndex = duel.arrowsPerTarget - 1;
  }

  duel.currentTargetIndex = targetIndex;
  duel.activePlayer = player;
  duel.currentArrowIndex = arrowIndex;
  clearScoreAt(targetIndex, player, arrowIndex);

  renderDuelView();
}

function registerPelotonScore(score) {
  if (!state.peloton || state.peloton.completed || state.peloton.previewLocked) return;

  const currentArcherIndex = Number(state.pelotonActiveArcherIndex);
  const { targetCount, currentTargetIndex, currentArrowIndex, arrowsPerTarget } = state.peloton;
  const finishedTargetIndex = currentTargetIndex;
  if (currentTargetIndex >= targetCount) return;
  if (!getSelectablePointsForArrow(state.peloton.ruleset, "individual", currentArrowIndex, state.peloton.allowedPoints).includes(score)) return;

  const scores = state.peloton.scores;
  if (!scores[currentTargetIndex]) {
    scores[currentTargetIndex] = Array(arrowsPerTarget).fill(null);
  }

  scores[currentTargetIndex][currentArrowIndex] = score;

  // Déplacer à la flèche suivante
  let nextTargetIndex = currentTargetIndex;
  let nextArrowIndex = currentArrowIndex + 1;
  let volleyCompleted = false;

  if (nextArrowIndex >= arrowsPerTarget) {
    volleyCompleted = true;
    nextArrowIndex = 0;
    nextTargetIndex += 1;
  }

  // Afficher la dernière flèche brièvement avant rotation/changement.
  if (volleyCompleted) {
    state.peloton.previewLocked = true;
    renderPelotonView();
    scrollPelotonHistoryToBottom();

    window.setTimeout(() => {
      state.peloton.previewLocked = false;

      // Vérifier si terminé
      if (nextTargetIndex >= targetCount) {
        state.peloton.completed = true;
      } else {
        state.peloton.currentTargetIndex = nextTargetIndex;
        state.peloton.currentArrowIndex = nextArrowIndex;
      }

      const nextArcherId = getNextPelotonArcherId(currentArcherIndex, finishedTargetIndex);

      if (nextArcherId) {
        state.pelotonActiveArcherIndex = nextArcherId;
        updatePelotonArcher(nextArcherId);
        return;
      }

      showFlashInfo("Saisie peloton terminée.");
      renderPelotonView();
      scrollPelotonHistoryToBottom();
    }, LAST_SCORE_PREVIEW_MS);

    return;
  }

  // Vérifier si terminé
  if (nextTargetIndex >= targetCount) {
    state.peloton.completed = true;
  } else {
    state.peloton.currentTargetIndex = nextTargetIndex;
    state.peloton.currentArrowIndex = nextArrowIndex;
  }

  renderPelotonView();
  scrollPelotonHistoryToBottom();
}

function getPelotonTotalLeaderIndices() {
  const globalTargetIndex = getPelotonGlobalTargetIndex();
  const allCompleted = (state.pelotonRoster || []).every((a) => state.pelotonByArcher?.[a.index]?.completed);

  // N'afficher le meilleur total qu'une fois une cible terminée par tous.
  if (!(allCompleted || globalTargetIndex > 0)) {
    return new Set();
  }

  let bestTotal = -Infinity;
  const leaders = new Set();

  (state.pelotonRoster || []).forEach((archer) => {
    const archerState = state.pelotonByArcher?.[archer.index];
    if (!archerState) return;

    const total = getDuelTotal(archerState.scores || []);
    if (total > bestTotal) {
      bestTotal = total;
      leaders.clear();
      leaders.add(archer.index);
      return;
    }

    if (total === bestTotal) {
      leaders.add(archer.index);
    }
  });

  return leaders;
}

function renderPelotonArchersGrid() {
  if (!els.pelotonArchersGrid) return;

  els.pelotonArchersGrid.innerHTML = "";
  const activeIndex = Number(state.pelotonActiveArcherIndex);
  const leaderIndices = getPelotonTotalLeaderIndices();

  (state.pelotonRoster || []).forEach((archer) => {
    const archerState = state.pelotonByArcher?.[archer.index];
    const total = archerState ? getDuelTotal(archerState.scores || []) : 0;

    const card = document.createElement("div");
    card.className = "peloton-archer-card";
    if (archer.index === activeIndex) {
      card.classList.add("is-active");
    }
    if (archerState?.completed) {
      card.classList.add("is-completed");
    }
    if (leaderIndices.has(archer.index)) {
      card.classList.add("is-best-total");
    }
    card.setAttribute("role", "listitem");
    card.tabIndex = 0;
    card.setAttribute("aria-label", `Sélectionner ${archer.name} pour modifier le score`);
    card.innerHTML = `<span class="peloton-archer-card-name">${archer.name}</span><span class="peloton-archer-card-total">${total}<span class="stats-unit">pts</span></span>`;

    card.addEventListener("click", () => {
      updatePelotonArcher(archer.index, { manualSelection: true });
    });
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      updatePelotonArcher(archer.index, { manualSelection: true });
    });

    els.pelotonArchersGrid.appendChild(card);
  });
}

function getPelotonHeaderNames(activeArcherIndex, ruleset) {
  const roster = state.pelotonRoster || [];
  if (roster.length === 0) return "archers";

  const isGroupedRuleset = ruleset === "3d" || ruleset === "campagne" || ruleset === "ar";
  const globalTargetIndex = getPelotonGlobalTargetIndex();

  if (isGroupedRuleset) {
    const pairCount = Math.max(1, Math.ceil(roster.length / 2));
    const pairStart = (globalTargetIndex % pairCount) * 2;
    const first = roster[pairStart]?.name || "";
    const second = roster[pairStart + 1]?.name || "";
    return [first, second].filter(Boolean).join(" / ") || "archers";
  }

  const leadArcherIndex = globalTargetIndex % roster.length;
  return roster[leadArcherIndex]?.name || "archer";
}

function getPelotonGlobalTargetIndex() {
  const archerIds = (state.pelotonRoster || []).map((archer) => archer.index);
  let minTargetIndex = Infinity;

  archerIds.forEach((archerId) => {
    const archerState = state.pelotonByArcher?.[archerId];
    if (!archerState || archerState.completed) return;
    minTargetIndex = Math.min(minTargetIndex, archerState.currentTargetIndex || 0);
  });

  if (minTargetIndex === Infinity) {
    return state.peloton?.targetCount ? Math.max(0, state.peloton.targetCount - 1) : 0;
  }

  return minTargetIndex;
}

function getNextPelotonArcherId(currentArcherIndex, finishedTargetIndex) {
  const roster = state.pelotonRoster || [];
  const archerIds = roster.map((archer) => archer.index);
  const currentPosition = archerIds.indexOf(currentArcherIndex);
  if (currentPosition < 0 || archerIds.length === 0) return null;

  const getArcherState = (archerId) => state.pelotonByArcher?.[archerId] || null;
  const ruleset = state.peloton?.ruleset || state.duel?.ruleset;
  const isPairRuleset = ruleset === "3d" || ruleset === "campagne" || ruleset === "ar";

  // Nature et autres parcours tirés un par un: rotation simple entre archers.
  if (!isPairRuleset) {
    for (let offset = 1; offset <= archerIds.length; offset += 1) {
      const candidateId = archerIds[(currentPosition + offset) % archerIds.length];
      const candidate = getArcherState(candidateId);
      if (!candidate || candidate.completed) continue;
      return candidateId;
    }
    return null;
  }

  // 1) Tant que tout le monde n'a pas tiré la cible courante, on reste sur cette cible.
  for (let offset = 1; offset <= archerIds.length; offset += 1) {
    const candidateId = archerIds[(currentPosition + offset) % archerIds.length];
    const candidate = getArcherState(candidateId);
    if (!candidate || candidate.completed) continue;
    if (candidate.currentTargetIndex === finishedTargetIndex) {
      return candidateId;
    }
  }

  // 2) Une fois tout le monde passé, on commence la cible suivante.
  let minTargetIndex = Infinity;
  archerIds.forEach((archerId) => {
    const candidate = getArcherState(archerId);
    if (!candidate || candidate.completed) return;
    minTargetIndex = Math.min(minTargetIndex, candidate.currentTargetIndex);
  });

  if (minTargetIndex === Infinity) {
    return null;
  }

  for (const candidateId of archerIds) {
    const candidate = getArcherState(candidateId);
    if (!candidate || candidate.completed) continue;
    if (candidate.currentTargetIndex === minTargetIndex) {
      return candidateId;
    }
  }

  return null;
}

function restartDuelSession() {
  const previousNameP1 = state.duel.nameP1 || "";
  const previousNameP2 = state.duel.nameP2 || "";

  resetDuelStateFromMultiConfig();
  state.duel.nameP1 = previousNameP1;
  state.duel.nameP2 = previousNameP2;

  renderDuelView();
  showFlashInfo("Nouveau duel démarré.");
}

function openDuelModal() {
  resetDuelStateFromMultiConfig();
  const mode = els.multiModeSelect?.value || "duel";

  if (mode === "duel") {
    const duelNameP1 = els.duelNameP1 ? els.duelNameP1.value.trim() : "";
    const duelNameP2 = els.duelNameP2 ? els.duelNameP2.value.trim() : "";

    if (!duelNameP1 || !duelNameP2) {
      els.duelNamesError?.classList.remove("hidden");
      return;
    }

    els.duelNamesError?.classList.add("hidden");

    if (els.duelModalTitleText) {
      const botSuffix = duelBotMode ? ` <img src="icons/icon.png" alt="Bot" class="duel-bot-icon" style="width:18px;height:18px;vertical-align:middle;border-radius:3px;">` : "";
      els.duelModalTitleText.innerHTML = `Mode duel${botSuffix} - ${formatRulesetLabel(state.duel.ruleset)}`;
    }
    state.duel.nameP1 = duelNameP1.slice(0, 10);
    state.duel.nameP2 = duelBotMode ? "Paquito" : duelNameP2.slice(0, 10);

    closeMultiModal();
    closeStatsModal();
    closeGeneralStatsModal();
    closeHelpModal();
    closeHistoryModal();
    closeConfigModal();
    renderDuelView();
    els.duelModal?.classList.remove("hidden");
  }
}

function openPelotonModal() {
  resetDuelStateFromMultiConfig();
  
  // Récupérer les noms des 6 archers depuis les champs de saisie
  const pelotonNames = [];
  for (let i = 1; i <= 6; i++) {
    const input = document.getElementById(`peloton-name-p${i}`);
    const name = input ? input.value.trim().slice(0, 10) : "";
    if (name) {
      pelotonNames.push({ index: i, name });
    }
  }
  
  if (pelotonNames.length === 0) {
    if (els.pelotonNamesError) {
      els.pelotonNamesError.classList.remove("hidden");
    }
    return;
  }

  // Masquer le message d'erreur si les noms sont valides
  if (els.pelotonNamesError) {
    els.pelotonNamesError.classList.add("hidden");
  }
  
  state.pelotonRoster = pelotonNames;
  state.pelotonByArcher = {};
  pelotonNames.forEach((archer) => {
    state.pelotonByArcher[archer.index] = {
      ...state.duel,
      name: archer.name,
      scores: Array(state.duel.targetCount).fill(null).map(() => Array(state.duel.arrowsPerTarget).fill(null)),
      currentTargetIndex: 0,
      currentArrowIndex: 0,
      completed: false,
    };
  });
  state.pelotonActiveArcherIndex = pelotonNames[0].index;
  
  closeMultiModal();
  closeStatsModal();
  closeGeneralStatsModal();
  closeHelpModal();
  closeHistoryModal();
  closeConfigModal();
  
  // Initialiser avec le premier archer
  updatePelotonArcher(state.pelotonActiveArcherIndex);
  
  els.pelotonModal?.classList.remove("hidden");
}

function updatePelotonArcher(selectedArcherIndex = state.pelotonActiveArcherIndex, options = {}) {
  const archerIndex = Number(selectedArcherIndex);
  const manualSelection = Boolean(options?.manualSelection);
  if (!Number.isInteger(archerIndex)) {
    return;
  }
  
  // Récupérer le nom de l'archer sélectionné
  const input = document.getElementById(`peloton-name-p${archerIndex}`);
  const archerName = input ? input.value.trim().slice(0, 10) : "";
  
  if (!archerName) {
    return;
  }

  if (!state.pelotonByArcher) {
    state.pelotonByArcher = {};
  }

  if (!state.pelotonByArcher[archerIndex]) {
    state.pelotonByArcher[archerIndex] = {
      ...state.duel,
      name: archerName,
      scores: Array(state.duel.targetCount).fill(null).map(() => Array(state.duel.arrowsPerTarget).fill(null)),
      currentTargetIndex: 0,
      currentArrowIndex: 0,
      completed: false,
      editingMode: false,
    };
  }

  state.pelotonByArcher[archerIndex].name = archerName;
  state.pelotonByArcher[archerIndex].editingMode = Boolean(manualSelection);

  if (manualSelection && state.pelotonByArcher[archerIndex].completed) {
    // Allow manual correction of a finished archer by reopening their last arrow.
    state.pelotonByArcher[archerIndex].completed = false;
    state.pelotonByArcher[archerIndex].currentTargetIndex = Math.max(0, state.pelotonByArcher[archerIndex].targetCount - 1);
    state.pelotonByArcher[archerIndex].currentArrowIndex = Math.max(0, state.pelotonByArcher[archerIndex].arrowsPerTarget - 1);
  }

  state.peloton = state.pelotonByArcher[archerIndex];
  state.pelotonActiveArcherIndex = archerIndex;
  
  if (els.pelotonModalTitleText) {
    els.pelotonModalTitleText.textContent = `Mode peloton - ${formatRulesetLabel(state.peloton.ruleset)}`;
  }

  // Update the station header
  if (els.pelotonStationNumber) {
    els.pelotonStationNumber.textContent = String(getPelotonGlobalTargetIndex() + 1);
  }
  if (els.pelotonStationArcherName) {
    els.pelotonStationArcherName.textContent = getPelotonHeaderNames(archerIndex, state.peloton.ruleset);
  }

  if (manualSelection) {
    showFlashInfo(`Archer sélectionné : ${archerName}`);
  }
  
  renderPelotonView();
}

function closeDuelModal() {
  clearDuelBotShotTimer();
  duelBotMode = false;
  els.duelBotRow?.classList.remove("visible");
  els.duelModal?.classList.add("hidden");
}

function renderPelotonView() {
  if (!state.peloton) return;
  
  const { targetCount, scores, completed, name } = state.peloton;
  const total = getDuelTotal(scores);
  const activeArcherIndex = Number(state.pelotonActiveArcherIndex);
  const globalTargetIndex = getPelotonGlobalTargetIndex();

  if (els.pelotonStationNumber) {
    els.pelotonStationNumber.textContent = String(globalTargetIndex + 1);
  }
  if (els.pelotonStationArcherName) {
    els.pelotonStationArcherName.textContent = getPelotonHeaderNames(activeArcherIndex, state.peloton.ruleset);
  }
  const currentTargetScores = completed
    ? []
    : scores[Math.max(0, Math.min(state.peloton.currentTargetIndex, targetCount - 1))];
  renderCurrentShootPills(els.pelotonCurrentShootDisplay, currentTargetScores, state.peloton.arrowsPerTarget);
  
  if (els.pelotonArcherLabel) {
    els.pelotonArcherLabel.textContent = name || "Archer";
  }
  if (els.pelotonTotal) {
    els.pelotonTotal.innerHTML = `${total}<span class="stats-unit">pts</span>`;
  }
  if (els.pelotonSummaryCard) {
    els.pelotonSummaryCard.classList.toggle("is-active-archer", !completed);
    els.pelotonSummaryCard.classList.toggle("is-winner-archer", completed);
  }
  if (els.pelotonHistory) {
    els.pelotonHistory.innerHTML = "";
    const pelotonMaxVolleyTotal = getSessionVolleyMaxTotal(
      state.peloton.ruleset,
      state.peloton.arrowsPerTarget,
      state.peloton.allowedPoints,
    );
    if (completed) {
      renderPelotonHistorySwiper(els.pelotonHistory, { maxVolleyTotal: pelotonMaxVolleyTotal });
    } else {
      renderDuelVolleyHistory(els.pelotonHistory, scores, [], { maxVolleyTotal: pelotonMaxVolleyTotal });
    }
  }
  if (els.pelotonRestartBtn) {
    els.pelotonRestartBtn.classList.add("hidden");
  }

  renderPelotonArchersGrid();

  renderPelotonPad();
}

function stepBackPelotonScore() {
  const peloton = state.peloton;
  if (!peloton || peloton.targetCount <= 0) return;

  const clearScoreAt = (targetIndex, arrowIndex) => {
    if (!peloton.scores[targetIndex]) return;
    peloton.scores[targetIndex][arrowIndex] = null;
  };

  const findLastEnteredPosition = () => {
    const isEditingMode = peloton.editingMode === true;
    const currentTargetIndex = Math.max(0, Math.min(peloton.currentTargetIndex, peloton.targetCount - 1));
    const minTargetIndex = isEditingMode
      ? Math.max(0, currentTargetIndex - 1)
      : 0;
    const startingTargetIndex = peloton.completed
      ? currentTargetIndex
      : currentTargetIndex;

    for (let targetIndex = startingTargetIndex; targetIndex >= minTargetIndex; targetIndex--) {
      const targetScores = peloton.scores[targetIndex] || [];
      let startArrowIndex;
      if (targetIndex === currentTargetIndex) {
        const isCurrentCursorFilled = Boolean(
          targetScores[peloton.currentArrowIndex] !== null
          && targetScores[peloton.currentArrowIndex] !== undefined
          && peloton.currentArrowIndex < peloton.arrowsPerTarget,
        );
        startArrowIndex = isCurrentCursorFilled
          ? Math.max(0, Math.min(peloton.currentArrowIndex, peloton.arrowsPerTarget - 1))
          : Math.max(0, Math.min(peloton.currentArrowIndex - 1, peloton.arrowsPerTarget - 1));
      } else {
        startArrowIndex = peloton.arrowsPerTarget - 1;
      }

      for (let arrowIndex = startArrowIndex; arrowIndex >= 0; arrowIndex--) {
        if (targetScores[arrowIndex] !== null && targetScores[arrowIndex] !== undefined) {
          return { targetIndex, arrowIndex };
        }
      }
    }

    return null;
  };

  const position = findLastEnteredPosition();
  if (!position) {
    showFlashInfo("Début de volée atteint.");
    renderPelotonView();
    return;
  }

  peloton.completed = false;
  clearScoreAt(position.targetIndex, position.arrowIndex);
  peloton.currentTargetIndex = position.targetIndex;
  peloton.currentArrowIndex = position.arrowIndex;
  renderPelotonView();
  scrollPelotonHistoryToBottom();
}

function closePelotonModal() {
  els.pelotonModal?.classList.add("hidden");
}

function confirmAction(message, confirmLabel = "Supprimer") {
  return new Promise((resolve) => {
    if (!els.confirmModal || !els.confirmModalMessage || !els.confirmModalCancelBtn || !els.confirmModalConfirmBtn) {
      resolve(window.confirm(message));
      return;
    }

    els.confirmModalMessage.textContent = message;
    els.confirmModalConfirmBtn.textContent = confirmLabel;
    els.confirmModal.classList.remove("hidden");

    const cleanup = () => {
      els.confirmModal.classList.add("hidden");
      els.confirmModalConfirmBtn.removeEventListener("click", onConfirm);
      els.confirmModalCancelBtn.removeEventListener("click", onCancel);
    };

    const onConfirm = () => {
      cleanup();
      resolve(true);
    };

    const onCancel = () => {
      cleanup();
      resolve(false);
    };

    els.confirmModalConfirmBtn.addEventListener("click", onConfirm);
    els.confirmModalCancelBtn.addEventListener("click", onCancel);
  });
}

function restart() {
  state.shoots = [];
  state.shootGroups = [];
  state.resultsPayload = null;
  state.progressionAxis = "";
  state.editingVolleyIndex = null;
  state.lastEditedVolleyIndex = null;
  state.inputLocked = false;
  state.contestMode = false;
  state.contestInfo = null;
  resetRoundBuffer();
  closeStatsModal();
  closeGeneralStatsModal();
  closeHelpModal();
  closeHistoryModal();
  closeMultiModal();
  closeDuelModal();
  els.scoringCard.classList.add("hidden");
  els.setupCard.classList.add("hidden");
  document.body.classList.remove("home-underlay-active");
  els.homeScreen.classList.remove("hidden");
  clearPersistedState();
  persistAppState();
}

els.rulesetSelect.addEventListener("change", () => {
  // Save current zone for previous config before switching
  const prevWeapon = state._lastWeapon || "";
  const prevKey = `${state._lastRuleset}:${state._lastScoringMode}:${prevWeapon}`;
  const prevValue = Number.parseInt(els.successZoneInput.value, 10);
  if (Number.isInteger(prevValue) && prevValue >= 1) {
    appConfig.successZoneByRuleset[prevKey] = prevValue;
    saveConfig();
  }
  syncScoringModeFieldset();
  syncWeaponSelectOptions();
  updateWeaponSelectVisibility();
  syncTargetCountDisplay();
  // Update slider max BEFORE restoring value to prevent browser clamping
  const newMax = getMaxSuccessZoneForSetup();
  els.successZoneInput.max = String(newMax);
  const ruleset = els.rulesetSelect.value;
  const scoringMode = getSelectedScoringMode();
  const weapon = els.weaponSelect ? els.weaponSelect.value : "";
  const zoneKey = `${ruleset}:${scoringMode}:${weapon}`;
  const saved = appConfig.successZoneByRuleset[zoneKey];
  if (Number.isInteger(saved) && saved >= 1) {
    els.successZoneInput.value = String(saved);
  }
  updateSuccessZoneSlider();
  state._lastRuleset = ruleset;
  state._lastScoringMode = getSelectedScoringMode();
  state._lastWeapon = weapon;
});

els.scoringModeInputs.forEach((input) => input.addEventListener("change", () => {
  // Save current zone for previous mode before switching
  const prevWeapon = state._lastWeapon || "";
  const prevKey = `${state._lastRuleset}:${state._lastScoringMode}:${prevWeapon}`;
  const prevValue = Number.parseInt(els.successZoneInput.value, 10);
  if (Number.isInteger(prevValue) && prevValue >= 1) {
    appConfig.successZoneByRuleset[prevKey] = prevValue;
    saveConfig();
  }
  // Update slider max BEFORE restoring value to prevent browser clamping
  const newMax = getMaxSuccessZoneForSetup();
  els.successZoneInput.max = String(newMax);
  const ruleset = els.rulesetSelect.value;
  const scoringMode = getSelectedScoringMode();
  const weapon = els.weaponSelect ? els.weaponSelect.value : "";
  const zoneKey = `${ruleset}:${scoringMode}:${weapon}`;
  const saved = appConfig.successZoneByRuleset[zoneKey];
  if (Number.isInteger(saved) && saved >= 1) {
    els.successZoneInput.value = String(saved);
  }
  updateSuccessZoneSlider();
  updateWeaponSelectVisibility();
  state._lastRuleset = ruleset;
  state._lastScoringMode = scoringMode;
  state._lastWeapon = weapon;
}));
if (els.weaponSelect) {
  els.weaponSelect.addEventListener("change", () => {
    // Save current zone for previous weapon before switching
    const prevWeapon = state._lastWeapon || "";
    const prevKey = `${state._lastRuleset}:${state._lastScoringMode}:${prevWeapon}`;
    const prevValue = Number.parseInt(els.successZoneInput.value, 10);
    if (Number.isInteger(prevValue) && prevValue >= 1) {
      appConfig.successZoneByRuleset[prevKey] = prevValue;
      saveConfig();
    }
    const ruleset = els.rulesetSelect.value;
    const scoringMode = getSelectedScoringMode();
    const weapon = els.weaponSelect.value;
    const zoneKey = `${ruleset}:${scoringMode}:${weapon}`;
    const saved = appConfig.successZoneByRuleset[zoneKey];
    if (Number.isInteger(saved) && saved >= 1) {
      els.successZoneInput.value = String(saved);
    }
    updateSuccessZoneSlider();
    state._lastWeapon = weapon;
  });
}
els.successZoneInput.addEventListener("input", updateSuccessZoneSlider);
if (els.sessionDateInput) {
  els.sessionDateInput.addEventListener("change", persistAppState);
}
if (els.sessionTimeInput) {
  els.sessionTimeInput.addEventListener("change", persistAppState);
}
els.useTargetGroupsInputs.forEach((input) => input.addEventListener("change", persistAppState));
els.showScoresInputs.forEach((input) => input.addEventListener("change", persistAppState));
els.startBtn.addEventListener("click", startScoring);
if (els.backSetupBtn) {
  els.backSetupBtn.addEventListener("click", restart);
}
if (els.historyBtn) {
  els.historyBtn.addEventListener("click", openHistoryModal);
}

function showSetupFromHome() {
  document.body.classList.add("home-underlay-active");
  els.setupCard.classList.remove("hidden");
}

async function connectToContest(uuid, ruleset) {
  try {
    const response = await fetch("/api/contest/connect", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ uuid, ruleset }),
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      showFlashInfo(payload?.error || "Impossible de se connecter au concours.");
      return false;
    }

    if (!payload?.exists) {
      showFlashInfo("Concours introuvable pour ce code et ce parcours.");
      return null;
    }

    try {
      window.localStorage.setItem(CONTEST_UUID_KEY, uuid);
    } catch {
      // Ignore storage errors.
    }

    if (!payload?.contest || typeof payload.contest !== "object") {
      showFlashInfo("Réponse concours invalide.");
      return null;
    }

    showFlashInfo("Connexion au concours réussie.");
    return payload.contest;
  } catch {
    showFlashInfo("Erreur réseau lors de la connexion au concours.");
    return null;
  }
}

function getStoredContestUuid() {
  try {
    const uuid = window.localStorage.getItem(CONTEST_UUID_KEY) || "";
    return uuid.trim();
  } catch {
    return "";
  }
}

els.homeTrainingBtn.addEventListener("click", showSetupFromHome);
if (els.homeTrainingTileBtn) {
  els.homeTrainingTileBtn.addEventListener("click", openTrainingModal);
}
els.homePelotonBtn.addEventListener("click", () => { openMultiModal(); });
els.homeHistoryBtn.addEventListener("click", () => { openHistoryModal(); });
els.homeStatsBtn.addEventListener("click", () => { openGeneralStatsModal(); });
els.homeConfigBtn.addEventListener("click", () => { openConfigModal(); });
if (els.homeLoginBtn) {
  els.homeLoginBtn.addEventListener("click", async () => {
    if (hasStoredAuthToken()) {
      const confirmed = await confirmAction("Confirmer la déconnexion ?", "Déconnexion");
      if (!confirmed) return;
      const firstName = (window.localStorage.getItem(AUTH_USER_FIRST_NAME_KEY) || "").trim() || "Archer";
      clearStoredAuth();
      updateHomeLoginTile();
      updateHomeHeader();
      updateConfigActionButtons();
      closeLoginModal();
      openWelcomeModal("À bientôt", `À bientôt ${firstName}`);
      showFlashInfo("Déconnexion réussie.");
      return;
    }
    openLoginModal();
  });
}
els.homeHelpBtn.addEventListener("click", () => { openHelpModal(); });
if (els.multiStartBtn) {
  els.multiStartBtn.addEventListener("click", async () => {
    const mode = els.multiModeSelect?.value || "duel";
    if (mode === "duel") {
      openDuelModal();
    } else if (mode === "peloton") {
      openPelotonModal();
    } else if (mode === "contest") {
      const ruleset = (els.multiRulesetSelect?.value || "").trim();
      if (!ruleset) {
        showFlashInfo("Sélectionnez un type de parcours.");
        return;
      }

      const code = (els.contestCodeInput?.value || "").trim();
      if (!code) {
        const startedFromStoredUuid = await startContestFromStoredUuidIfAvailable();
        if (startedFromStoredUuid) {
          return;
        }
      }

      if (!code) {
        showFlashInfo("Saisissez un code concours.");
        els.contestCodeInput?.focus();
        return;
      }

      els.multiStartBtn.disabled = true;
      const contest = await connectToContest(code, ruleset);
      els.multiStartBtn.disabled = false;
      if (contest) {
        closeMultiModal();
        startContestScoring(contest, els.multiContestWeaponSelect?.value || "");
      }
    }
  });
}
if (els.multiRulesetSelect) {
  els.multiRulesetSelect.addEventListener("change", () => {
    syncMultiContestWeaponSelectOptions(getStoredContestWeapon());
  });
}
if (els.multiContestWeaponSelect) {
  els.multiContestWeaponSelect.addEventListener("change", () => {
    storeContestWeapon(els.multiContestWeaponSelect.value);
  });
}
if (els.multiModeSelect) {
  els.multiModeSelect.addEventListener("change", async (e) => {
    const mode = e.target.value;
    // Masquer le message d'erreur quand on change de mode
    if (els.pelotonNamesError) {
      els.pelotonNamesError.classList.add("hidden");
    }
      if (els.duelNamesError) {
        els.duelNamesError.classList.add("hidden");
      }
    if (mode === "duel") {
      els.duelNamesContainer?.classList.remove("hidden");
      els.pelotonNamesContainer?.classList.add("hidden");
      els.targetCountFieldset?.classList.remove("hidden");
      els.contestCodeContainer?.classList.add("hidden");
      els.contestWeaponContainer?.classList.add("hidden");
      // Vérifier si Paquito est déjà entré et afficher le slider si nécessaire
      const duelP2Value = els.duelNameP2?.value.trim().toLowerCase() || "";
      if (duelP2Value === "paquito") {
        duelBotMode = true;
        els.duelBotRow?.classList.add("visible");
      } else {
        duelBotMode = false;
        els.duelBotRow?.classList.remove("visible");
      }
    } else if (mode === "peloton") {
      els.duelNamesContainer?.classList.add("hidden");
      els.pelotonNamesContainer?.classList.remove("hidden");
      els.targetCountFieldset?.classList.add("hidden");
      els.contestCodeContainer?.classList.add("hidden");
      els.contestWeaponContainer?.classList.add("hidden");
      els.duelBotRow?.classList.remove("visible");
    } else if (mode === "contest") {
      els.duelNamesContainer?.classList.add("hidden");
      els.pelotonNamesContainer?.classList.add("hidden");
      els.targetCountFieldset?.classList.add("hidden");
      els.duelBotRow?.classList.remove("visible");
      const hasStoredUuid = Boolean(getStoredContestUuid());
      if (hasStoredUuid) {
        els.contestCodeContainer?.classList.add("hidden");
        await startContestFromStoredUuidIfAvailable();
      } else {
        els.contestCodeContainer?.classList.remove("hidden");
        els.contestCodeInput?.focus();
      }
      syncMultiContestWeaponSelectOptions(getStoredContestWeapon());
      els.contestWeaponContainer?.classList.remove("hidden");
    }
  });
}
if (els.setupCloseBtn) {
  els.setupCloseBtn.addEventListener("click", restart);
}
if (els.scoringCloseBtn) {
  els.scoringCloseBtn.addEventListener("click", restart);
}
els.stepBackBtn.addEventListener("click", stepBackOneArrow);
els.statsBtn.addEventListener("click", openStatsModal);
els.resultsCloseBtn.addEventListener("click", restart);
if (els.statsCommentsSaveBtn) {
  els.statsCommentsSaveBtn.addEventListener("click", () => {
    const progressionAxis = (els.statsCommentsInput?.value || "").trim();
    const activePayload = state.activeStatsPayload || state.resultsPayload;
    if (activePayload) {
      activePayload.progressionAxis = progressionAxis;

      const isCurrentSessionPayload = Boolean(
        state.resultsPayload
        && (
          (activePayload.archivedAt && state.resultsPayload.archivedAt && activePayload.archivedAt === state.resultsPayload.archivedAt)
          || (activePayload.generatedAt && state.resultsPayload.generatedAt && activePayload.generatedAt === state.resultsPayload.generatedAt)
        )
      );

      if (isCurrentSessionPayload && state.resultsPayload) {
        state.progressionAxis = progressionAxis;
        state.resultsPayload.progressionAxis = progressionAxis;
        persistAppState();
      }

      updateHistoryEntryProgressionAxis(activePayload, progressionAxis);
    }
    showFlashInfo("Axe de progression enregistré.");
    if (els.statsCommentsSaveFeedback) {
      els.statsCommentsSaveFeedback.classList.remove("hidden");
      if (statsCommentsSaveFeedbackTimeout) {
        window.clearTimeout(statsCommentsSaveFeedbackTimeout);
      }
      statsCommentsSaveFeedbackTimeout = window.setTimeout(() => {
        els.statsCommentsSaveFeedback?.classList.add("hidden");
      }, 1600);
    }
  });
}
if (els.statsCommentsInput) {
  els.statsCommentsInput.addEventListener("input", () => {
    updateStatsCommentsCounter();
  });
}

els.statsModalOverlay.addEventListener("click", (e) => e.stopPropagation());
els.statsCloseBtn.addEventListener("click", closeStatsModal);
els.generalStatsModalOverlay.addEventListener("click", (e) => e.stopPropagation());
els.generalStatsCloseBtn.addEventListener("click", closeGeneralStatsModal);
if (els.generalStatsRulesetFilter) {
  els.generalStatsRulesetFilter.addEventListener("change", () => {
    state.generalStatsGraphEnabled = true;
    syncGeneralStatsWeaponFilter();
    renderGeneralStatsModal();
  });
}
if (els.generalStatsWeaponFilter) {
  els.generalStatsWeaponFilter.addEventListener("change", () => {
    state.generalStatsGraphEnabled = true;
    renderGeneralStatsModal();
  });
}
document.querySelectorAll(".stats-tab").forEach((btn) => {
  btn.addEventListener("click", () => switchStatsTab(btn.dataset.statsTab || "summary"));
});
els.helpModalOverlay.addEventListener("click", (e) => e.stopPropagation());
els.helpCloseBtn.addEventListener("click", closeHelpModal);
if (els.loginModalOverlay) {
  els.loginModalOverlay.addEventListener("click", (e) => e.stopPropagation());
}
if (els.loginCloseBtn) {
  els.loginCloseBtn.addEventListener("click", closeLoginModal);
}
if (els.welcomeModalOverlay) {
  els.welcomeModalOverlay.addEventListener("click", (e) => e.stopPropagation());
}
if (els.loginForm) {
  els.loginForm.addEventListener("submit", handleLoginSubmit);
}
els.historyModalOverlay.addEventListener("click", (e) => e.stopPropagation());
els.historyCloseBtn.addEventListener("click", closeHistoryModal);
if (els.multiModalOverlay) {
  els.multiModalOverlay.addEventListener("click", (e) => e.stopPropagation());
}
if (els.multiCloseBtn) {
  els.multiCloseBtn.addEventListener("click", closeMultiModal);
}
if (els.trainingModalOverlay) {
  els.trainingModalOverlay.addEventListener("click", (e) => e.stopPropagation());
}
if (els.trainingCloseBtn) {
  els.trainingCloseBtn.addEventListener("click", closeTrainingModal);
}
if (els.trainingOptionSelect) {
  els.trainingOptionSelect.addEventListener("change", syncTrainingOptionForm);
}
if (els.trainingStartBtn) {
  els.trainingStartBtn.addEventListener("click", () => {
    if (els.trainingOptionSelect?.value !== "hold-time") {
      showFlashInfo("Sélectionnez d'abord l'option Temps de tenue.");
      return;
    }
    openTrainingHoldModal();
  });
}
if (els.trainingSeriesInput) {
  els.trainingSeriesInput.addEventListener("input", updateTrainingSeriesDisplay);
}
if (els.trainingRepetitionsInput) {
  els.trainingRepetitionsInput.addEventListener("input", updateTrainingRepetitionsDisplay);
}
if (els.trainingHoldSecondsInput) {
  els.trainingHoldSecondsInput.addEventListener("input", updateTrainingHoldSecondsDisplay);
}
if (els.trainingRestSecondsInput) {
  els.trainingRestSecondsInput.addEventListener("input", updateTrainingRestSecondsDisplay);
}
if (els.trainingHoldModalOverlay) {
  els.trainingHoldModalOverlay.addEventListener("click", (e) => e.stopPropagation());
}
if (els.trainingHoldCloseBtn) {
  els.trainingHoldCloseBtn.addEventListener("click", closeTrainingHoldModal);
}
if (els.trainingCycleToggleBtn) {
  els.trainingCycleToggleBtn.addEventListener("click", () => {
    if (!trainingCycleState) {
      startTrainingCycle();
      return;
    }
    if (trainingCycleIntervalId) {
      pauseTrainingCycle();
      return;
    }
    resumeTrainingCycle();
  });
}
if (els.duelNameP2) {
  els.duelNameP2.addEventListener("input", () => {
    const isPaquito = els.duelNameP2.value.trim().toLowerCase() === "paquito";
    if (isPaquito && !duelBotMode) {
      duelBotMode = true;
      els.duelBotRow?.classList.add("visible");
      updateDuelBotLevelUI();
      const card = els.multiModalCard;
      if (card) {
        card.classList.remove("paquito-shake");
        void card.offsetWidth; // reflow pour relancer l'animation
        card.classList.add("paquito-shake");
        setTimeout(() => card.classList.remove("paquito-shake"), 1000);
      }
    } else if (!isPaquito) {
      duelBotMode = false;
      clearDuelBotShotTimer();
      els.duelBotRow?.classList.remove("visible");
    }
  });
}

if (els.duelBotLevelSlider) {
  els.duelBotLevelSlider.addEventListener("input", updateDuelBotLevelUI);
  updateDuelBotLevelUI();
}

if (els.duelModalOverlay) {
  els.duelModalOverlay.addEventListener("click", (e) => e.stopPropagation());
}
if (els.duelCloseBtn) {
  els.duelCloseBtn.addEventListener("click", closeDuelModal);
}
if (els.duelStepBackBtn) {
  els.duelStepBackBtn.addEventListener("click", stepBackDuelScore);
}
if (els.duelRestartBtn) {
  els.duelRestartBtn.addEventListener("click", restartDuelSession);
}
if (els.pelotonModalOverlay) {
  els.pelotonModalOverlay.addEventListener("click", (e) => e.stopPropagation());
}
if (els.pelotonCloseBtn) {
  els.pelotonCloseBtn.addEventListener("click", closePelotonModal);
}
if (els.pelotonStepBackBtn) {
  els.pelotonStepBackBtn.addEventListener("click", () => {
    if (!state.peloton) return;
    stepBackPelotonScore();
  });
}
if (els.pelotonRestartBtn) {
  els.pelotonRestartBtn.addEventListener("click", () => {
    if (!state.peloton) return;
    const activeArcherIndex = Number(state.pelotonActiveArcherIndex);
    const previousName = state.peloton.name || "";
    resetDuelStateFromMultiConfig();
    const refreshed = {
      ...state.duel,
      name: previousName,
      scores: Array(state.duel.targetCount).fill(null).map(() => Array(state.duel.arrowsPerTarget).fill(null)),
    };
    state.peloton = refreshed;
    if (Number.isInteger(activeArcherIndex)) {
      state.pelotonByArcher[activeArcherIndex] = refreshed;
    }
    renderPelotonView();
    showFlashInfo("Nouvel enregistrement peloton démarré.");
  });
}
els.historyModeFilter.addEventListener("change", () => { historyCurrentPage = 1; renderHistoryList(); });
els.historyRulesetFilter.addEventListener("change", () => { historyCurrentPage = 1; renderHistoryList(); });
els.historyResetFiltersBtn.addEventListener("click", () => {
  els.historyModeFilter.value = "all";
  els.historyRulesetFilter.value = "all";
  historyCurrentPage = 1;
  renderHistoryList();
});
if (els.configBtn) {
  els.configBtn.addEventListener("click", () => {
    openConfigModal();
  });
}
els.configModalOverlay.addEventListener("click", (e) => e.stopPropagation());
els.configCloseBtn.addEventListener("click", closeConfigModal);
els.configExportHistoryBtn.addEventListener("click", exportHistory);
els.configImportHistoryBtn.addEventListener("click", () => {
  els.configImportHistoryInput.value = "";
  els.configImportHistoryInput.click();
});
els.configImportHistoryInput.addEventListener("change", (e) => {
  if (e.target.files.length > 0) importHistory(e.target.files[0]);
});
if (els.configSaveServerBtn) els.configSaveServerBtn.addEventListener("click", saveConfigToServer);
if (els.configRestoreServerBtn) els.configRestoreServerBtn.addEventListener("click", restoreConfigFromServer);

updateHomeLoginTile();
updateHomeHeader();
updateConfigActionButtons();

els.configFullTargetTeam.addEventListener("input", () => {
  appConfig.fullTarget_team = Number(els.configFullTargetTeam.value);
  els.configFullTargetTeamValue.textContent = String(appConfig.fullTarget_team);
  setRangeProgress(els.configFullTargetTeam);
  saveConfig();
});
els.configFullTargetIndiv.addEventListener("input", () => {
  appConfig.fullTarget_individual = Number(els.configFullTargetIndiv.value);
  els.configFullTargetIndivValue.textContent = String(appConfig.fullTarget_individual);
  setRangeProgress(els.configFullTargetIndiv);
  saveConfig();
});
els.configMissLimitTeam.addEventListener("input", () => {
  appConfig.missLimit_team = Number(els.configMissLimitTeam.value);
  els.configMissLimitTeamValue.textContent = String(appConfig.missLimit_team);
  setRangeProgress(els.configMissLimitTeam);
  saveConfig();
});
els.configMissLimitIndiv.addEventListener("input", () => {
  appConfig.missLimit_individual = Number(els.configMissLimitIndiv.value);
  els.configMissLimitIndivValue.textContent = String(appConfig.missLimit_individual);
  setRangeProgress(els.configMissLimitIndiv);
  saveConfig();
});

const configFedFFTA = document.getElementById("config-fed-ffta");
const configFedFFTL = document.getElementById("config-fed-fftl");

if (configFedFFTA) {
  configFedFFTA.addEventListener("change", (e) => {
    const checked = e.target.checked;
    const fftaCheckboxes = document.querySelectorAll('.config-ruleset-cb[data-federation="FFTA"]');
    fftaCheckboxes.forEach((cb) => {
      cb.checked = checked;
      if (checked && !appConfig.enabledRulesets.includes(cb.value)) {
        appConfig.enabledRulesets.push(cb.value);
      } else if (!checked) {
        appConfig.enabledRulesets = appConfig.enabledRulesets.filter((r) => r !== cb.value);
      }
    });
    saveConfig();
    syncFederationCheckboxes();
  });
}

if (configFedFFTL) {
  configFedFFTL.addEventListener("change", (e) => {
    const checked = e.target.checked;
    const fftlCheckboxes = document.querySelectorAll('.config-ruleset-cb[data-federation="FFTL"]');
    fftlCheckboxes.forEach((cb) => {
      cb.checked = checked;
      if (checked && !appConfig.enabledRulesets.includes(cb.value)) {
        appConfig.enabledRulesets.push(cb.value);
      } else if (!checked) {
        appConfig.enabledRulesets = appConfig.enabledRulesets.filter((r) => r !== cb.value);
      }
    });
    saveConfig();
    syncFederationCheckboxes();
  });
}

const rulesetCheckboxes = document.querySelectorAll(".config-ruleset-cb");
rulesetCheckboxes.forEach((cb) => {
  cb.addEventListener("change", (e) => {
    const value = e.target.value;
    if (e.target.checked) {
      if (!appConfig.enabledRulesets.includes(value)) {
        appConfig.enabledRulesets.push(value);
      }
    } else {
      appConfig.enabledRulesets = appConfig.enabledRulesets.filter((r) => r !== value);
    }
    saveConfig();
    syncFederationCheckboxes();
  });
});

els.rulesetSelect.addEventListener("change", () => syncConfigSliderMax());
loadConfig();
updateRulesetSelectOptions();
syncScoringModeFieldset();
syncWeaponSelectOptions();
updateWeaponSelectVisibility();
els.appVersion.textContent = APP_VERSION;
if (els.helpVersion) {
  els.helpVersion.textContent = APP_VERSION;
}
state._lastRuleset = els.rulesetSelect.value;
state._lastScoringMode = getSelectedScoringMode();
state._lastWeapon = els.weaponSelect ? els.weaponSelect.value : "";
if (!restorePersistedState()) {
  syncTargetCountDisplay();
  updateSuccessZoneSlider();
  persistAppState();
}
// Initialiser la date de la session avec la date du jour par défaut (format yyyy-mm-dd)
if (els.sessionDateInput && !els.sessionDateInput.value) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  els.sessionDateInput.value = `${yyyy}-${mm}-${dd}`;
}
// Initialiser l'heure de la session avec l'heure courante (format HH:mm)
if (els.sessionTimeInput && !els.sessionTimeInput.value) {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  els.sessionTimeInput.value = `${hh}:${mm}`;
}
setRangeProgress(els.successZoneInput, els.successZoneInput.style.getPropertyValue("--zone-color").trim());
setRangeProgress(els.configFullTargetTeam);
setRangeProgress(els.configFullTargetIndiv);
setRangeProgress(els.configMissLimitTeam);
setRangeProgress(els.configMissLimitIndiv);
if (els.trainingSeriesInput) {
  els.trainingSeriesInput.value = String(appConfig.trainingHold.series);
}
if (els.trainingRepetitionsInput) {
  els.trainingRepetitionsInput.value = String(appConfig.trainingHold.repetitions);
}
if (els.trainingHoldSecondsInput) {
  els.trainingHoldSecondsInput.value = String(appConfig.trainingHold.holdSeconds);
}
if (els.trainingRestSecondsInput) {
  els.trainingRestSecondsInput.value = String(appConfig.trainingHold.restSeconds);
}
updateTrainingSeriesDisplay();
updateTrainingRepetitionsDisplay();
updateTrainingHoldSecondsDisplay();
updateTrainingRestSecondsDisplay();
syncSoloScoringCardHeight();

window.addEventListener("resize", syncSoloScoringCardHeight);
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", syncSoloScoringCardHeight);
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`./service-worker.js?v=${encodeURIComponent(APP_VERSION)}`, { updateViaCache: "none" })
      .then((registration) => {
        registration.update();
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          window.location.reload();
        });
      })
      .catch(() => {
      // Ignore registration failure: app remains usable online.
    });
  });
}
