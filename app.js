const ARROWS_PER_shoot = 6;
const APP_VERSION = "v1.2.1";
const LAST_SCORE_PREVIEW_MS = 300;
const AUTO_SAVE_KEY = "score-team-autosave-v1";
const HISTORY_KEY = "score-team-history-v1";
const MAX_HISTORY_ITEMS = 50;
const FLASH_INFO_MS = 2600;

const state = {
  targetCount: 21,
  successZone: 0,
  scoringMode: "team",
  arrowsPerVolley: ARROWS_PER_shoot,
  currentshoot: Array(ARROWS_PER_shoot).fill(null),
  currentArrowIndex: 0,
  shoots: [],
  activeRuleset: "nature",
  allowedPoints: [20, 15, 10, 0],
  shootGroups: [],
  resultsPayload: null,
  inputLocked: false,
  completionArchived: false,
  statsOpenedFromHistory: false,
};

const els = {
  setupCard: document.getElementById("setup-card"),
  scoringCard: document.getElementById("scoring-card"),
  summaryCard: document.getElementById("summary-card"),
  targetsCountText: document.getElementById("targets-count-text"),
  successZoneInput: document.getElementById("success-zone-input"),
  successZoneValue: document.getElementById("success-zone-value"),
  rulesetSelect: document.getElementById("ruleset-select"),
  scoringModeInputs: document.querySelectorAll('input[name="scoring-mode"]'),
  setupHelpBtn: document.getElementById("setup-help-btn"),
  startBtn: document.getElementById("start-btn"),
  backSetupBtn: document.getElementById("back-setup-btn"),
  helpBtn: document.getElementById("help-btn"),
  stepBackBtn: document.getElementById("step-back-btn"),
  shootTitle: document.getElementById("volley-title"),
  progressText: document.getElementById("progress-text"),
  teamTotalLabel: document.getElementById("team-total-label"),
  teamTotal: document.getElementById("team-total"),
  successZoneDisplay: document.getElementById("success-zone-display"),
  scoreEntryPanel: document.getElementById("score-entry-panel"),
  targetGroupSelect: document.getElementById("target-group-select"),
  pointsPad: document.getElementById("points-pad"),
  liveVolleyHistoryWrap: document.getElementById("live-volley-history-wrap"),
  liveVolleyHistoryBody: document.getElementById("live-volley-history-body"),
  resultsActions: document.getElementById("results-actions"),
  historyBtn: document.getElementById("history-btn"),
  statsBtn: document.getElementById("stats-btn"),
  downloadDataBtn: document.getElementById("download-data-btn"),
  statsModal: document.getElementById("stats-modal"),
  statsModalOverlay: document.getElementById("stats-modal-overlay"),
  statsCloseBtn: document.getElementById("stats-close-btn"),
  statsTotalPoints: document.getElementById("stats-total-points"),
  helpModal: document.getElementById("help-modal"),
  helpModalOverlay: document.getElementById("help-modal-overlay"),
  helpCloseBtn: document.getElementById("help-close-btn"),
  historyModal: document.getElementById("history-modal"),
  historyModalOverlay: document.getElementById("history-modal-overlay"),
  historyCloseBtn: document.getElementById("history-close-btn"),
  historyModeFilter: document.getElementById("history-mode-filter"),
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
  statsGlobalAvg: document.getElementById("stats-global-avg"),
  statsGlobalBar: document.getElementById("stats-global-bar"),
  statsEvolutionPath: document.getElementById("stats-evolution-path"),
  statsEvolutionSuccessLine: document.getElementById("stats-evolution-success-line"),
  statsEvolutionRange: document.getElementById("stats-evolution-range"),
  statsEvolutionAxis: document.getElementById("stats-evolution-axis"),
  statsFullCount: document.getElementById("stats-full-count"),
  statsDoubleMissCount: document.getElementById("stats-double-miss-count"),
  statsScoreDist: document.getElementById("stats-score-dist"),
  statsTabSummary: document.getElementById("stats-tab-summary"),
  statsTabGroups: document.getElementById("stats-tab-groups"),
  statsGroupDist: document.getElementById("stats-group-dist"),
  finalTotal: document.getElementById("final-total"),
  avgshoot: document.getElementById("avg-volley"),
  avgArrow: document.getElementById("avg-arrow"),
  statsList: document.getElementById("stats-list"),
  shootHistoryBody: document.getElementById("volley-history-body"),
  restartBtn: document.getElementById("restart-btn"),
  appVersion: document.getElementById("app-version"),
  flashInfo: document.getElementById("flash-info"),
};

const presets = {
  nature: [20, 15, 10, 0],
  "3d": [11, 10, 8, 5, 0],
};

const defaultTargetsByRuleset = {
  nature: 21,
  "3d": 24,
};

const maxShootTotalByRuleset = {
  nature: 105,
  "3d": 66,
};

const targetGroupsByRuleset = {
  nature: ["PA", "PG", "MG", "GG"],
  "3d": ["GI", "GII", "GIII", "GIV"],
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
    successZone: Number.parseInt(els.successZoneInput.value, 10) || 1,
  };
}

function getGroupsForRuleset(ruleset) {
  return targetGroupsByRuleset[ruleset] || [];
}

function getGroupLabel(group) {
  if (group === "PA") return "Petit animal";
  if (group === "PG") return "Petit gibier";
  if (group === "MG") return "Moyen gibier";
  if (group === "GG") return "Grand gibier";
  if (group === "GI") return "Groupe I";
  if (group === "GII") return "Groupe II";
  if (group === "GIII") return "Groupe III";
  if (group === "GIV") return "Groupe IV";
  return group;
}

function syncTargetGroupSelect(selectedValue = null) {
  const groups = getGroupsForRuleset(state.activeRuleset || els.rulesetSelect.value);
  els.targetGroupSelect.innerHTML = groups.map((group) => `<option value="${group}">${getGroupLabel(group)}</option>`).join("");
  if (selectedValue && groups.includes(selectedValue)) {
    els.targetGroupSelect.value = selectedValue;
  } else if (groups.length > 0) {
    els.targetGroupSelect.value = groups[0];
  }
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
            scoringMode: state.scoringMode,
            arrowsPerVolley: state.arrowsPerVolley,
            currentArrowIndex: state.currentArrowIndex,
            shoots: state.shoots.map((shoot) => [...shoot]),
            currentshoot: [...state.currentshoot],
            activeRuleset: state.activeRuleset,
            allowedPoints: [...state.allowedPoints],
            shootGroups: [...state.shootGroups],
            currentGroup: els.targetGroupSelect.value || "",
          }
        : null,
    };
    window.localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage failures (private mode / quota).
  }
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
  if (setup.scoringMode === "team" || setup.scoringMode === "individual") {
    els.scoringModeInputs.forEach((input) => {
      input.checked = input.value === setup.scoringMode;
    });
  }
  if (Number.isInteger(setup.successZone)) {
    els.successZoneInput.value = String(setup.successZone);
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
  state.scoringMode = saved.scoringMode === "individual" ? "individual" : "team";
  state.arrowsPerVolley = state.scoringMode === "individual" ? 2 : ARROWS_PER_shoot;
  state.activeRuleset = saved.activeRuleset;
  state.allowedPoints = Array.isArray(saved.allowedPoints) && saved.allowedPoints.length ? [...saved.allowedPoints] : [...presets[saved.activeRuleset]];
  state.shootGroups = Array.isArray(saved.shootGroups) ? [...saved.shootGroups] : [];
  state.shoots = Array.isArray(saved.shoots) ? saved.shoots.map((shoot) => (Array.isArray(shoot) ? [...shoot] : [])).filter((shoot) => shoot.length === state.arrowsPerVolley) : [];
  state.currentshoot = Array.isArray(saved.currentshoot) ? [...saved.currentshoot].slice(0, state.arrowsPerVolley) : Array(state.arrowsPerVolley).fill(null);
  while (state.currentshoot.length < state.arrowsPerVolley) state.currentshoot.push(null);
  state.currentArrowIndex = Number.isInteger(saved.currentArrowIndex) ? Math.max(0, Math.min(saved.currentArrowIndex, state.arrowsPerVolley)) : state.currentshoot.findIndex((value) => value === null);
  if (state.currentArrowIndex < 0) state.currentArrowIndex = state.arrowsPerVolley;
  state.inputLocked = false;
  state.completionArchived = state.shoots.length === state.targetCount;
  state.resultsPayload = state.shoots.length === state.targetCount ? buildResultsPayload() : null;
  syncTargetGroupSelect(saved.currentGroup);

  els.setupCard.classList.add("hidden");
  els.summaryCard.classList.add("hidden");
  els.scoringCard.classList.remove("hidden");
  closeStatsModal();
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
  return round.reduce((sum, value) => sum + value, 0);
}

function formatScore(value) {
  if (value === null) {
    return "-";
  }
  return value === 0 ? "M" : value;
}

function globalTotal() {
  return state.shoots.reduce((sum, shoot) => sum + roundTotal(shoot), 0);
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
    button.textContent = score === 0 ? "M" : score;
    if (!locked && isValidForSequence) {
      button.addEventListener("click", () => registerScore(score));
    }
    els.pointsPad.appendChild(button);
  });
}

function updateScoringHeader() {
  const shootNumber = state.shoots.length + 1;
  els.shootTitle.textContent = `Volée ${Math.min(shootNumber, state.targetCount)} sur ${state.targetCount}`;
  els.progressText.textContent = "";
  els.teamTotalLabel.textContent = state.scoringMode === "individual" ? "Total individuel" : "Total équipe";
  els.teamTotal.textContent = globalTotal();
  els.successZoneDisplay.textContent = String(state.successZone);
}

function refreshScoringView(options = {}) {
  const { scrollHistory = false } = options;
  renderPad();
  updateScoringHeader();
  renderLiveVolleyHistory();
  updateResultsAvailability();
  persistAppState();
  if (scrollHistory) {
    scrollLiveVolleyHistoryToBottom();
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

function renderLiveVolleyHistory() {
  els.liveVolleyHistoryBody.innerHTML = "";
  const maxVolley = getMaxVolleyForCurrentConfig();
  state.shoots.forEach((shoot, idx) => {
    const total = roundTotal(shoot);
    const successful = isSuccessfulVolley(total);
    const pillClass = getVolleyPillClass(shoot, total, maxVolley);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><span class="volley-pill ${pillClass}">${idx + 1}</span></td>
      <td>${shoot.map((value) => formatScore(value)).join(" / ")}</td>
      <td>${state.shootGroups[idx] || "-"}</td>
      <td class="history-total ${successful ? "success" : ""}">${total}</td>
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
    row.querySelector(".row-delete-btn").addEventListener("click", () => deleteVolleyAt(idx));
    els.liveVolleyHistoryBody.appendChild(row);
  });

  const partial = state.currentshoot.some((value) => value !== null);
  if (partial && state.shoots.length < state.targetCount) {
    const idx = state.shoots.length;
    const partialTotal = state.currentshoot.reduce((sum, value) => sum + (value ?? 0), 0);
    const previewRow = document.createElement("tr");
    previewRow.innerHTML = `
      <td><span class="volley-pill is-blue">${idx + 1}</span></td>
      <td>${state.currentshoot.map((value) => formatScore(value)).join(" / ")}</td>
      <td>${els.targetGroupSelect.value || "-"}</td>
      <td class="history-total">${partialTotal}</td>
      <td>-</td>
    `;
    els.liveVolleyHistoryBody.appendChild(previewRow);
  }
}

function getSelectablePointsForCurrentArrow() {
  if (state.activeRuleset === "nature" && state.scoringMode === "individual") {
    const isFirstArrowOfPair = state.currentArrowIndex % 2 === 0;
    const candidateScores = isFirstArrowOfPair ? [20, 15, 0] : [15, 10, 0];
    return candidateScores.filter((score) => state.allowedPoints.includes(score));
  }
  return state.allowedPoints;
}

function getCurrentShootPartialTotal() {
  return state.currentshoot.reduce((sum, value) => sum + (value ?? 0), 0);
}

function getMaxShootTotalForRuleset() {
  return maxShootTotalByRuleset[state.activeRuleset] ?? null;
}

function getMaxVolleyForCurrentConfig() {
  const byRuleset = getMaxShootTotalForRuleset();
  if (byRuleset !== null) {
    return state.scoringMode === "individual" ? Math.floor(byRuleset / 3) : byRuleset;
  }
  return state.arrowsPerVolley * Math.max(...state.allowedPoints, 0);
}

function isDoubleZeroVolley(shoot) {
  return shoot.length >= 2 && shoot[0] === 0 && shoot[1] === 0;
}

function getVolleyPillClass(shoot, total, maxVolley) {
  if (isDoubleZeroVolley(shoot)) return "is-red";
  if (total === maxVolley) return "is-green";
  return "is-blue";
}

function isScoreAllowedForCurrentArrow(score) {
  if (state.currentArrowIndex === 0) {
    const maxShootTotal = getMaxShootTotalForRuleset();
    return maxShootTotal === null || score <= maxShootTotal;
  }
  if (state.activeRuleset === "nature" && state.scoringMode === "team") {
    const previousScore = state.currentshoot[state.currentArrowIndex - 1];
    if (previousScore !== null && previousScore !== 0 && score > previousScore) {
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

  if (state.shoots.length >= state.targetCount) {
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
    refreshScoringView();
    window.setTimeout(() => {
      state.shoots.push([...state.currentshoot]);
      state.shootGroups.push(els.targetGroupSelect.value || "");
      state.inputLocked = false;
      if (state.shoots.length === state.targetCount) {
        state.resultsPayload = buildResultsPayload();
        if (state.resultsPayload && !state.completionArchived) {
          addHistoryEntry(state.resultsPayload);
          state.completionArchived = true;
          showFlashInfo("Parcours enregistré dans l'historique.");
        }
        refreshScoringView({ scrollHistory: true });
        return;
      }
      resetRoundBuffer();
      refreshScoringView({ scrollHistory: true });
    }, LAST_SCORE_PREVIEW_MS);
    return;
  }

  refreshScoringView({ scrollHistory: true });
}

function deleteVolleyAt(index) {
  if (state.inputLocked) {
    return;
  }

  if (!Number.isInteger(index) || index < 0 || index >= state.shoots.length) {
    return;
  }
  state.shoots.splice(index, 1);
  state.shootGroups.splice(index, 1);
  state.resultsPayload = null;
  state.completionArchived = false;
  refreshScoringView();
}

function stepBackOneArrow() {
  if (state.inputLocked) {
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
  return checked ? checked.value : "team";
}

function getCurrentConfigForSetup() {
  const ruleset = els.rulesetSelect.value;
  const scoringMode = getSelectedScoringMode();
  const arrowsPerVolley = scoringMode === "individual" ? 2 : ARROWS_PER_shoot;

  const points = presets[ruleset];

  const maxPoint = Math.max(...points.filter((p) => Number.isFinite(p)), 0);
  return { arrowsPerVolley, maxPoint };
}

function getTargetCountForRuleset(ruleset) {
  return defaultTargetsByRuleset[ruleset] ?? 21;
}

function syncTargetCountDisplay() {
  const targets = getTargetCountForRuleset(els.rulesetSelect.value);
  els.targetsCountText.textContent = `${targets} cibles`;
}

function getMaxSuccessZoneForSetup() {
  const ruleset = els.rulesetSelect.value;
  const scoringMode = getSelectedScoringMode();

  if (maxShootTotalByRuleset[ruleset]) {
    const teamMax = maxShootTotalByRuleset[ruleset];
    return scoringMode === "individual" ? Math.floor(teamMax / 3) : teamMax;
  }

  const { arrowsPerVolley, maxPoint } = getCurrentConfigForSetup();
  return Math.max(0, arrowsPerVolley * maxPoint);
}

function getSuccessZoneColor(value, ruleset, scoringMode) {
  const multiplier = scoringMode === "team" ? 3 : 1;
  const thresholdsByRuleset = {
    nature: { orange: 25, redOver: 30 },
    "3d": { orange: 13, redOver: 20 },
  };
  const thresholds = thresholdsByRuleset[ruleset];
  if (!thresholds) return "#2d6a4f";

  const orangeAt = thresholds.orange * multiplier;
  const redOver = thresholds.redOver * multiplier;

  if (value > redOver) return "#9b2226";
  if (value >= orangeAt) return "#d68c45";
  return "#2d6a4f";
}

function updateSuccessZoneSlider() {
  const ruleset = els.rulesetSelect.value;
  const scoringMode = getSelectedScoringMode();
  const max = getMaxSuccessZoneForSetup();
  els.successZoneInput.min = "1";
  els.successZoneInput.max = String(max);
  let value = Number.parseInt(els.successZoneInput.value, 10);
  if (!Number.isInteger(value) || value < 1) value = 1;
  if (value > max) value = max;
  els.successZoneInput.value = String(value);
  els.successZoneValue.textContent = String(value);
  const zoneColor = getSuccessZoneColor(value, ruleset, scoringMode);
  els.successZoneInput.style.setProperty("--zone-color", zoneColor);
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
  state.activeRuleset = els.rulesetSelect.value;
  state.scoringMode = getSelectedScoringMode();
  state.arrowsPerVolley = state.scoringMode === "individual" ? 2 : ARROWS_PER_shoot;
  state.allowedPoints = [...new Set(points)].sort((a, b) => b - a);
  state.shoots = [];
  state.shootGroups = [];
  state.resultsPayload = null;
  state.completionArchived = false;
  resetRoundBuffer();
  syncTargetGroupSelect();

  els.setupCard.classList.add("hidden");
  els.summaryCard.classList.add("hidden");
  els.scoringCard.classList.remove("hidden");
  closeStatsModal();
  closeHelpModal();

  refreshScoringView();
}

function buildResultsPayload() {
  if (state.shoots.length === 0) {
    return null;
  }

  const totals = state.shoots.map((shoot) => roundTotal(shoot));
  const total = totals.reduce((sum, value) => sum + value, 0);
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
    volleys: state.shoots.map((shoot, idx) => ({
      index: idx + 1,
      arrows: shoot,
      group: state.shootGroups[idx] || null,
      total: roundTotal(shoot),
      success: isSuccessfulVolley(roundTotal(shoot)),
    })),
  };
}

function updateResultsAvailability() {
  const done = state.shoots.length === state.targetCount && state.targetCount > 0;
  els.scoreEntryPanel.classList.toggle("hidden", done);
  els.resultsActions.classList.toggle("hidden", !done);
  els.statsBtn.disabled = !done;
  els.downloadDataBtn.disabled = !done;
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
  const byRuleset = maxShootTotalByRuleset[payload.ruleset];
  if (byRuleset !== undefined) {
    return payload.scoringMode === "individual" ? Math.floor(byRuleset / 3) : byRuleset;
  }
  const sourcePoints = Array.isArray(payload.allowedPoints) && payload.allowedPoints.length ? payload.allowedPoints : [0];
  const maxPoint = Math.max(...sourcePoints);
  return (payload.arrowsPerVolley || 0) * Math.max(0, maxPoint);
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

function renderScoreDistribution(allowedPoints, volleys) {
  const counts = new Map();
  allowedPoints.forEach((score) => counts.set(score, 0));
  volleys.flatMap((volley) => volley.arrows || []).forEach((score) => {
    counts.set(score, (counts.get(score) || 0) + 1);
  });

  const orderedScores = [...allowedPoints].sort((a, b) => b - a);
  const maxCount = Math.max(1, ...orderedScores.map((score) => counts.get(score) || 0));

  els.statsScoreDist.innerHTML = orderedScores
    .map((score) => {
      const count = counts.get(score) || 0;
      const width = (count / maxCount) * 100;
      const label = score === 0 ? "M" : String(score);
      return `
        <div class="stats-dist-row-item">
          <span class="stats-dist-label">${label}</span>
          <div class="stats-dist-track">
            <div class="stats-dist-fill" style="width: ${width.toFixed(2)}%"></div>
          </div>
          <strong class="stats-dist-value">${count}</strong>
        </div>
      `;
    })
    .join("");
}

function switchStatsTab(tabName) {
  document.querySelectorAll(".stats-tab").forEach((btn) => {
    const isActive = btn.dataset.statsTab === tabName;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", String(isActive));
  });
  els.statsTabSummary.classList.toggle("hidden", tabName !== "summary");
  els.statsTabGroups.classList.toggle("hidden", tabName !== "groups");
}

function getPieColors(ruleset) {
  if (ruleset === '3d') {
    return { 11: '#2563eb', 10: '#10b981', 8: '#eab308', 5: '#f97316', 0: '#ef4444' };
  }
  return { 20: '#2563eb', 15: '#10b981', 10: '#eab308', 0: '#ef4444' };
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
  const groups = getGroupsForRuleset(payload.ruleset || state.activeRuleset);
  if (groups.length === 0 || volleys.length === 0) {
    els.statsGroupDist.innerHTML = '<div style="text-align:center;color:#888;padding:12px;">Aucune donn\u00e9e de groupe.</div>';
    return;
  }

  const allowedPoints = Array.isArray(payload.allowedPoints) && payload.allowedPoints.length
    ? payload.allowedPoints
    : [...new Set(volleys.flatMap((v) => v.arrows || []))].sort((a, b) => b - a);
  const orderedScores = [...allowedPoints].sort((a, b) => b - a);
  const colors = getPieColors(payload.ruleset || state.activeRuleset);

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

    const pie = buildPieSvg(counts, orderedScores, colors, 120);

    piesHtml += `<div class="stats-pie-cell">`;
    piesHtml += pie;
    piesHtml += `<strong class="stats-pie-cell-title">${getGroupLabel(group)}</strong>`;
    piesHtml += `<span class="stats-pie-cell-sub">${groupVolleys.length} cible${groupVolleys.length > 1 ? 's' : ''} \u2022 Moy. ${groupAvg}</span>`;
    piesHtml += `</div>`;
  });

  const legendItems = orderedScores.map((score) => {
    const label = score === 0 ? 'M' : String(score);
    const color = colors[score] || '#8c929a';
    return `<div class="stats-pie-legend-item"><span class="stats-pie-swatch" style="background:${color}"></span><span>${label}</span></div>`;
  }).join('');

  let html = `<div class="stats-pie-grid">${piesHtml}</div>`;
  html += `<div class="stats-pie-legend-shared">${legendItems}</div>`;

  els.statsGroupDist.innerHTML = html;
}

function openStatsModalFromPayload(payload) {
  const volleys = Array.isArray(payload?.volleys) ? payload.volleys : [];
  if (volleys.length === 0) return;
  const totals = volleys.map((volley) => volley.total ?? roundTotal(volley.arrows || []));
  const totalPoints = totals.reduce((sum, value) => sum + value, 0);
  const avgVolley = totals.reduce((sum, value) => sum + value, 0) / totals.length;
  const best = Math.max(...totals);
  const worst = Math.min(...totals);
  const partAverages = getSegmentAverages(totals, 3);
  const maxVolley = getMaxVolleyFromPayload(payload);
  const successZone = Number.isInteger(payload.successZone) ? payload.successZone : 0;
  const ratioFor = (value) => {
    if (maxVolley <= 0) return 0;
    return Math.max(0, Math.min(100, (value / maxVolley) * 100));
  };

  els.statsSuccessZone.textContent = String(successZone);
  els.statsTotalPoints.textContent = `${totalPoints} pts`;
  els.statsBestVolley.textContent = best;
  els.statsWorstVolley.textContent = worst;
  els.statsBar1.style.height = `${ratioFor(partAverages[0])}%`;
  els.statsBar2.style.height = `${ratioFor(partAverages[1])}%`;
  els.statsBar3.style.height = `${ratioFor(partAverages[2])}%`;
  els.statsBar1.classList.toggle("success", partAverages[0] >= successZone);
  els.statsBar2.classList.toggle("success", partAverages[1] >= successZone);
  els.statsBar3.classList.toggle("success", partAverages[2] >= successZone);
  els.statsBar1Value.textContent = partAverages[0].toFixed(2);
  els.statsBar2Value.textContent = partAverages[1].toFixed(2);
  els.statsBar3Value.textContent = partAverages[2].toFixed(2);
  els.statsGlobalAvg.textContent = avgVolley.toFixed(2);
  els.statsGlobalBar.style.height = `${ratioFor(avgVolley)}%`;
  els.statsGlobalBar.classList.toggle("success", avgVolley >= successZone);
  renderEvolutionChart(totals, maxVolley, successZone, payload.targetCount || totals.length);
  const fullCount = totals.filter((total) => total === maxVolley).length;
  const doubleMissCount = volleys.filter((volley) => isDoubleZeroVolley(volley.arrows || [])).length;
  const totalArrows = volleys.length * (payload.arrowsPerVolley || state.arrowsPerVolley);
  els.statsFullCount.textContent = String(fullCount);
  els.statsDoubleMissCount.textContent = String(doubleMissCount);
  const fullCard = els.statsFullCount.closest("article");
  const missCard = els.statsDoubleMissCount.closest("article");
  fullCard.classList.toggle("stats-highlight-green", totalArrows > 0 && fullCount / totalArrows > 0.33);
  missCard.classList.toggle("stats-highlight-red", totalArrows > 0 && doubleMissCount / volleys.length > 0.25);
  const allowedPoints =
    Array.isArray(payload.allowedPoints) && payload.allowedPoints.length
      ? payload.allowedPoints
      : [...new Set(volleys.flatMap((volley) => volley.arrows || []))].sort((a, b) => b - a);
  renderScoreDistribution(allowedPoints, volleys);
  renderGroupDistribution(payload);
  switchStatsTab("summary");

  closeHelpModal();
  closeHistoryModal();
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
  if (state.statsOpenedFromHistory) {
    state.statsOpenedFromHistory = false;
    openHistoryModal();
  }
}

function openHelpModal() {
  closeStatsModal();
  closeHistoryModal();
  els.helpModal.classList.remove("hidden");
}

function closeHelpModal() {
  els.helpModal.classList.add("hidden");
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

function addHistoryEntry(payload) {
  const entries = loadHistoryEntries();
  const entry = { ...payload, archivedAt: new Date().toISOString() };
  saveHistoryEntries([entry, ...entries]);
}

function removeHistoryEntry(archivedAt) {
  const entries = loadHistoryEntries().filter((entry) => entry.archivedAt !== archivedAt);
  saveHistoryEntries(entries);
  renderHistoryList();
}

function renderHistoryList() {
  const selectedMode = els.historyModeFilter.value;
  const entries = loadHistoryEntries().filter((entry) => selectedMode === "all" || entry.scoringMode === selectedMode);
  if (entries.length === 0) {
    els.historyList.innerHTML = '<div class="history-empty">Aucun parcours sauvegardé.</div>';
    return;
  }

  const formatParcoursLabel = (value) => {
    if (value === "nature") return "Nature";
    if (value === "3d") return "3D";
    return "-";
  };
  const formatModeLabel = (value) => {
    if (value === "team") return "Équipe";
    if (value === "individual") return "Individuel";
    return "-";
  };

  els.historyList.innerHTML = "";
  entries.forEach((entry) => {
    const date = new Date(entry.generatedAt || entry.archivedAt);
    const isValidDate = !Number.isNaN(date.getTime());
    const dateLabel = isValidDate
      ? date
          .toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })
          .replace(/^\p{L}/u, (letter) => letter.toUpperCase())
      : "Date inconnue";
    const timeLabel = isValidDate
      ? `${date.toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).replace(":", "h")}`
      : "--h--";
    const row = document.createElement("article");
    row.className = "history-item";
    row.innerHTML = `
      <div class="history-item-head">
        <span class="history-date">${dateLabel}</span>
        <span class="history-time">${timeLabel}</span>
      </div>
      <div class="history-mode">${formatParcoursLabel(entry.ruleset)} ${formatModeLabel(entry.scoringMode)}</div>
      <div class="history-bottom-row">
        <strong class="history-total-score">${entry.total ?? 0} pts</strong>
        <div class="history-item-actions">
          <button class="btn btn-primary btn-icon" aria-label="Visualiser">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M12 5c5.8 0 9.8 5.8 9.9 6-.1.2-4.1 6-9.9 6S2.2 11.2 2.1 11c.1-.2 4.1-6 9.9-6Zm0 2c-3.9 0-6.9 3.3-7.8 4 .9.7 3.9 4 7.8 4s6.9-3.3 7.8-4c-.9-.7-3.9-4-7.8-4Zm0 1.7A2.3 2.3 0 1 1 9.7 11 2.3 2.3 0 0 1 12 8.7Z" fill="currentColor"/>
            </svg>
          </button>
          <button class="btn btn-light btn-icon history-delete-btn" aria-label="Supprimer">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h2v9H7V9Zm4 0h2v9h-2V9Zm4 0h2v9h-2V9ZM6 7h12l-1 14H7L6 7Z" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>
    `;
    const [viewBtn, deleteBtn] = row.querySelectorAll("button");
    viewBtn.addEventListener("click", () => {
      state.statsOpenedFromHistory = true;
      openStatsModalFromPayload(entry);
    });
    deleteBtn.addEventListener("click", () => removeHistoryEntry(entry.archivedAt));
    els.historyList.appendChild(row);
  });
}

function openHistoryModal() {
  closeStatsModal();
  closeHelpModal();
  renderHistoryList();
  els.historyModal.classList.remove("hidden");
}

function closeHistoryModal() {
  els.historyModal.classList.add("hidden");
}

function restart() {
  state.shoots = [];
  state.shootGroups = [];
  state.resultsPayload = null;
  state.inputLocked = false;
  resetRoundBuffer();
  closeStatsModal();
  closeHelpModal();
  closeHistoryModal();
  els.scoringCard.classList.add("hidden");
  els.summaryCard.classList.add("hidden");
  els.setupCard.classList.remove("hidden");
  clearPersistedState();
  persistAppState();
}

els.rulesetSelect.addEventListener("change", () => {
  const ruleset = els.rulesetSelect.value;
  syncTargetCountDisplay();
  updateSuccessZoneSlider();
});

els.scoringModeInputs.forEach((input) => input.addEventListener("change", updateSuccessZoneSlider));
els.successZoneInput.addEventListener("input", updateSuccessZoneSlider);
els.startBtn.addEventListener("click", startScoring);
els.backSetupBtn.addEventListener("click", restart);
els.historyBtn.addEventListener("click", openHistoryModal);
els.setupHelpBtn.addEventListener("click", openHelpModal);
els.helpBtn.addEventListener("click", openHelpModal);
els.stepBackBtn.addEventListener("click", stepBackOneArrow);
els.statsBtn.addEventListener("click", openStatsModal);
els.downloadDataBtn.addEventListener("click", downloadResultsJson);
els.restartBtn.addEventListener("click", restart);
els.statsModalOverlay.addEventListener("click", closeStatsModal);
els.statsCloseBtn.addEventListener("click", closeStatsModal);
document.querySelectorAll(".stats-tab").forEach((btn) => {
  btn.addEventListener("click", () => switchStatsTab(btn.dataset.statsTab));
});
els.helpModalOverlay.addEventListener("click", closeHelpModal);
els.helpCloseBtn.addEventListener("click", closeHelpModal);
els.historyModalOverlay.addEventListener("click", closeHistoryModal);
els.historyCloseBtn.addEventListener("click", closeHistoryModal);
els.historyModeFilter.addEventListener("change", renderHistoryList);
els.appVersion.textContent = APP_VERSION;
if (!restorePersistedState()) {
  syncTargetCountDisplay();
  updateSuccessZoneSlider();
  persistAppState();
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
