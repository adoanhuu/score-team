const ARROWS_PER_shoot = 6;
const APP_VERSION = "v1.1.0";

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
  resultsPayload: null,
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
  startBtn: document.getElementById("start-btn"),
  backSetupBtn: document.getElementById("back-setup-btn"),
  stepBackBtn: document.getElementById("step-back-btn"),
  shootTitle: document.getElementById("volley-title"),
  progressText: document.getElementById("progress-text"),
  teamTotalLabel: document.getElementById("team-total-label"),
  teamTotal: document.getElementById("team-total"),
  shootTotal: document.getElementById("volley-total"),
  arrowStep: document.getElementById("arrow-step"),
  arrowGrid: document.getElementById("arrow-grid"),
  pointsPad: document.getElementById("points-pad"),
  liveVolleyHistoryWrap: document.getElementById("live-volley-history-wrap"),
  liveVolleyHistoryBody: document.getElementById("live-volley-history-body"),
  statsBtn: document.getElementById("stats-btn"),
  downloadDataBtn: document.getElementById("download-data-btn"),
  statsModal: document.getElementById("stats-modal"),
  statsModalOverlay: document.getElementById("stats-modal-overlay"),
  statsCloseBtn: document.getElementById("stats-close-btn"),
  statsAvgVolley: document.getElementById("stats-avg-volley"),
  statsBestVolley: document.getElementById("stats-best-volley"),
  statsWorstVolley: document.getElementById("stats-worst-volley"),
  statsSeg1Label: document.getElementById("stats-seg-1-label"),
  statsSeg2Label: document.getElementById("stats-seg-2-label"),
  statsSeg3Label: document.getElementById("stats-seg-3-label"),
  statsSeg1Value: document.getElementById("stats-seg-1-value"),
  statsSeg2Value: document.getElementById("stats-seg-2-value"),
  statsSeg3Value: document.getElementById("stats-seg-3-value"),
  finalTotal: document.getElementById("final-total"),
  avgshoot: document.getElementById("avg-volley"),
  avgArrow: document.getElementById("avg-arrow"),
  statsList: document.getElementById("stats-list"),
  shootHistoryBody: document.getElementById("volley-history-body"),
  restartBtn: document.getElementById("restart-btn"),
  appVersion: document.getElementById("app-version"),
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

function renderArrowGrid() {
  els.arrowGrid.innerHTML = "";
  els.arrowGrid.style.gridTemplateColumns = `repeat(${state.arrowsPerVolley}, minmax(42px, 1fr))`;
  state.currentshoot.forEach((value, index) => {
    const item = document.createElement("article");
    item.className = "arrow-cell";
    if (value !== null) {
      item.classList.add(value === 0 ? "score-miss" : "score-hit");
    }
    if (index === state.currentArrowIndex) {
      item.classList.add("current");
    }

    item.innerHTML = `<strong>${formatScore(value)}</strong>`;

    els.arrowGrid.appendChild(item);
  });
}

function renderPad() {
  els.pointsPad.innerHTML = "";
  getSelectablePointsForCurrentArrow().forEach((score) => {
    const button = document.createElement("button");
    button.className = "point-btn";
    if (score === 0) {
      button.classList.add("zero");
    }
    const isValidForSequence = isScoreAllowedForCurrentArrow(score);
    if (!isValidForSequence) {
      button.classList.add("disabled-score");
      button.disabled = true;
    }
    button.textContent = score === 0 ? "M" : score;
    if (isValidForSequence) {
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

  const partial = state.currentshoot.filter((v) => v !== null);
  els.shootTotal.textContent = partial.reduce((sum, value) => sum + value, 0);
  els.arrowStep.textContent = `${Math.min(state.currentArrowIndex + 1, state.arrowsPerVolley)} / ${state.arrowsPerVolley}`;
}

function refreshScoringView(options = {}) {
  const { scrollHistory = false } = options;
  renderPad();
  renderArrowGrid();
  updateScoringHeader();
  renderLiveVolleyHistory();
  updateResultsAvailability();
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
}

function getSelectablePointsForCurrentArrow() {
  if (state.activeRuleset === "nature" && state.scoringMode === "individual") {
    const miss = state.allowedPoints.includes(0) ? [0] : [];
    if (state.currentArrowIndex === 0) {
      return [20, 15, ...miss].filter((score) => state.allowedPoints.includes(score));
    }
    if (state.currentArrowIndex === 1) {
      return [15, 10, ...miss].filter((score) => state.allowedPoints.includes(score));
    }
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
  const previousScore = state.currentshoot[state.currentArrowIndex - 1];
  if (previousScore !== null && previousScore !== 0 && score > previousScore) {
    return false;
  }

  const maxShootTotal = getMaxShootTotalForRuleset();
  if (maxShootTotal === null) {
    return true;
  }

  return getCurrentShootPartialTotal() + score <= maxShootTotal;
}

function registerScore(score) {
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

  if (state.currentArrowIndex === state.arrowsPerVolley) {
    state.shoots.push([...state.currentshoot]);
    if (state.shoots.length === state.targetCount) {
      state.resultsPayload = buildResultsPayload();
      refreshScoringView({ scrollHistory: true });
      return;
    }
    resetRoundBuffer();
  }

  refreshScoringView({ scrollHistory: true });
}

function deleteVolleyAt(index) {
  if (!Number.isInteger(index) || index < 0 || index >= state.shoots.length) {
    return;
  }
  state.shoots.splice(index, 1);
  state.resultsPayload = null;
  refreshScoringView();
}

function stepBackOneArrow() {
  if (state.currentArrowIndex > 0) {
    state.currentArrowIndex -= 1;
    state.currentshoot[state.currentArrowIndex] = null;
    state.resultsPayload = null;
    refreshScoringView();
    return;
  }

  if (state.shoots.length === 0) {
    return;
  }

  const previous = state.shoots.pop();
  state.currentshoot = [...previous];
  state.currentArrowIndex = state.arrowsPerVolley - 1;
  state.currentshoot[state.currentArrowIndex] = null;
  state.resultsPayload = null;
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
    nature: { orange: 25, yellow: 30, redOver: 30 },
    "3d": { orange: 13, yellow: 20, redOver: 20 },
  };
  const thresholds = thresholdsByRuleset[ruleset];
  if (!thresholds) return "#2d6a4f";

  const orangeAt = thresholds.orange * multiplier;
  const yellowAt = thresholds.yellow * multiplier;
  const redOver = thresholds.redOver * multiplier;

  if (value > redOver) return "#9b2226";
  if (value >= yellowAt) return "#f2c94c";
  if (value >= orangeAt) return "#d68c45";
  return "#2d6a4f";
}

function updateSuccessZoneSlider() {
  const ruleset = els.rulesetSelect.value;
  const scoringMode = getSelectedScoringMode();
  const max = getMaxSuccessZoneForSetup();
  els.successZoneInput.max = String(max);
  let value = Number.parseInt(els.successZoneInput.value, 10);
  if (!Number.isInteger(value) || value < 0) value = 0;
  if (value > max) value = max;
  els.successZoneInput.value = String(value);
  els.successZoneValue.textContent = String(value);
  const zoneColor = getSuccessZoneColor(value, ruleset, scoringMode);
  els.successZoneInput.style.setProperty("--zone-color", zoneColor);
  els.successZoneValue.style.color = zoneColor;
}

function startScoring() {
  const parsedSuccessZone = Number.parseInt(els.successZoneInput.value, 10);
  if (!Number.isInteger(parsedSuccessZone) || parsedSuccessZone < 0) {
    window.alert("Entrez une zone de réussite valide (minimum 0).");
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
  state.resultsPayload = null;
  resetRoundBuffer();

  els.setupCard.classList.add("hidden");
  els.summaryCard.classList.add("hidden");
  els.scoringCard.classList.remove("hidden");
  closeStatsModal();

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
      total: roundTotal(shoot),
      success: isSuccessfulVolley(roundTotal(shoot)),
    })),
  };
}

function updateResultsAvailability() {
  const done = state.shoots.length === state.targetCount && state.targetCount > 0;
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

function openStatsModal() {
  if (state.shoots.length !== state.targetCount || state.shoots.length === 0) {
    return;
  }

  const totals = state.shoots.map((shoot) => roundTotal(shoot));
  const avgVolley = totals.reduce((sum, value) => sum + value, 0) / totals.length;
  const best = Math.max(...totals);
  const worst = Math.min(...totals);

  els.statsAvgVolley.textContent = avgVolley.toFixed(2);
  els.statsBestVolley.textContent = best;
  els.statsWorstVolley.textContent = worst;

  if (state.activeRuleset === "nature") {
    const segments = getSegmentAverages(totals, 3);
    els.statsSeg1Label.textContent = "Tiers 1";
    els.statsSeg2Label.textContent = "Tiers 2";
    els.statsSeg3Label.textContent = "Tiers 3";
    els.statsSeg1Value.textContent = segments[0].toFixed(2);
    els.statsSeg2Value.textContent = segments[1].toFixed(2);
    els.statsSeg3Value.textContent = segments[2].toFixed(2);
  } else {
    const halves = getSegmentAverages(totals, 2);
    els.statsSeg1Label.textContent = "Moitié 1";
    els.statsSeg2Label.textContent = "Moitié 2";
    els.statsSeg3Label.textContent = "-";
    els.statsSeg1Value.textContent = halves[0].toFixed(2);
    els.statsSeg2Value.textContent = halves[1].toFixed(2);
    els.statsSeg3Value.textContent = "-";
  }

  els.statsModal.classList.remove("hidden");
}

function closeStatsModal() {
  els.statsModal.classList.add("hidden");
}

function downloadResultsJson() {
  if (state.shoots.length !== state.targetCount) {
    return;
  }
  if (!state.resultsPayload) {
    state.resultsPayload = buildResultsPayload();
  }
  const json = JSON.stringify(state.resultsPayload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  const link = document.createElement("a");
  link.href = url;
  link.download = `score-team-${state.activeRuleset}-${stamp}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function restart() {
  state.shoots = [];
  state.resultsPayload = null;
  resetRoundBuffer();
  closeStatsModal();
  els.scoringCard.classList.add("hidden");
  els.summaryCard.classList.add("hidden");
  els.setupCard.classList.remove("hidden");
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
els.stepBackBtn.addEventListener("click", stepBackOneArrow);
els.statsBtn.addEventListener("click", openStatsModal);
els.downloadDataBtn.addEventListener("click", downloadResultsJson);
els.restartBtn.addEventListener("click", restart);
els.statsModalOverlay.addEventListener("click", closeStatsModal);
els.statsCloseBtn.addEventListener("click", closeStatsModal);
els.appVersion.textContent = APP_VERSION;
syncTargetCountDisplay();
updateSuccessZoneSlider();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      // Ignore registration failure: app remains usable online.
    });
  });
}
