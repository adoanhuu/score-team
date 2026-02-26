const ARROWS_PER_shoot = 6;

const state = {
  targetCount: 21,
  successZone: 0,
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
  targetsInput: document.getElementById("targets-input"),
  successZoneInput: document.getElementById("success-zone-input"),
  rulesetSelect: document.getElementById("ruleset-select"),
  customPointsWrap: document.getElementById("custom-points-wrap"),
  customPointsInput: document.getElementById("custom-points-input"),
  startBtn: document.getElementById("start-btn"),
  backSetupBtn: document.getElementById("back-setup-btn"),
  stepBackBtn: document.getElementById("step-back-btn"),
  shootTitle: document.getElementById("volley-title"),
  progressText: document.getElementById("progress-text"),
  teamTotal: document.getElementById("team-total"),
  shootTotal: document.getElementById("volley-total"),
  arrowStep: document.getElementById("arrow-step"),
  arrowGrid: document.getElementById("arrow-grid"),
  pointsPad: document.getElementById("points-pad"),
  liveVolleyHistoryWrap: document.getElementById("live-volley-history-wrap"),
  liveVolleyHistoryBody: document.getElementById("live-volley-history-body"),
  downloadDataBtn: document.getElementById("download-data-btn"),
  finalTotal: document.getElementById("final-total"),
  avgshoot: document.getElementById("avg-volley"),
  avgArrow: document.getElementById("avg-arrow"),
  statsList: document.getElementById("stats-list"),
  shootHistoryBody: document.getElementById("volley-history-body"),
  restartBtn: document.getElementById("restart-btn"),
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
  state.currentshoot = Array(ARROWS_PER_shoot).fill(null);
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
  els.shootTitle.textContent = `Volée ${shootNumber}`;
  els.progressText.textContent = `Cible ${Math.min(shootNumber, state.targetCount)} / ${state.targetCount}`;
  els.teamTotal.textContent = globalTotal();

  const partial = state.currentshoot.filter((v) => v !== null);
  els.shootTotal.textContent = partial.reduce((sum, value) => sum + value, 0);
  els.arrowStep.textContent = `${Math.min(state.currentArrowIndex + 1, ARROWS_PER_shoot)} / ${ARROWS_PER_shoot}`;
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
  state.shoots.forEach((shoot, idx) => {
    const total = roundTotal(shoot);
    const successful = isSuccessfulVolley(total);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${idx + 1}</td>
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
  return state.allowedPoints;
}

function getCurrentShootPartialTotal() {
  return state.currentshoot.reduce((sum, value) => sum + (value ?? 0), 0);
}

function getMaxShootTotalForRuleset() {
  return maxShootTotalByRuleset[state.activeRuleset] ?? null;
}

function isScoreAllowedForCurrentArrow(score) {
  if (state.currentArrowIndex === 0) {
    const maxShootTotal = getMaxShootTotalForRuleset();
    return maxShootTotal === null || score <= maxShootTotal;
  }
  const previousScore = state.currentshoot[state.currentArrowIndex - 1];
  if (previousScore !== null && score > previousScore) {
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

  if (state.currentArrowIndex >= ARROWS_PER_shoot) {
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

  if (state.currentArrowIndex === ARROWS_PER_shoot) {
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
  state.currentArrowIndex = ARROWS_PER_shoot - 1;
  state.currentshoot[state.currentArrowIndex] = null;
  state.resultsPayload = null;
  refreshScoringView();
}

function parseCustomPoints() {
  return els.customPointsInput.value
    .split(",")
    .map((v) => Number.parseInt(v.trim(), 10))
    .filter((v) => Number.isInteger(v) && v >= 0)
    .sort((a, b) => b - a);
}

function startScoring() {
  const parsedTargets = Number.parseInt(els.targetsInput.value, 10);
  if (!Number.isInteger(parsedTargets) || parsedTargets < 1) {
    window.alert("Entrez un nombre de cibles valide (minimum 1).");
    return;
  }
  const parsedSuccessZone = Number.parseInt(els.successZoneInput.value, 10);
  if (!Number.isInteger(parsedSuccessZone) || parsedSuccessZone < 0) {
    window.alert("Entrez une zone de réussite valide (minimum 0).");
    return;
  }

  let points;
  if (els.rulesetSelect.value === "custom") {
    points = parseCustomPoints();
    if (points.length === 0) {
      window.alert("Entrez au moins une valeur de points pour le barème personnalisé.");
      return;
    }
    if (!points.includes(0)) {
      points.push(0);
    }
  } else {
    points = presets[els.rulesetSelect.value];
  }

  state.targetCount = parsedTargets;
  state.successZone = parsedSuccessZone;
  state.activeRuleset = els.rulesetSelect.value;
  state.allowedPoints = [...new Set(points)].sort((a, b) => b - a);
  state.shoots = [];
  state.resultsPayload = null;
  resetRoundBuffer();

  els.setupCard.classList.add("hidden");
  els.summaryCard.classList.add("hidden");
  els.scoringCard.classList.remove("hidden");

  refreshScoringView();
}

function buildResultsPayload() {
  if (state.shoots.length === 0) {
    return null;
  }

  const totals = state.shoots.map((shoot) => roundTotal(shoot));
  const total = totals.reduce((sum, value) => sum + value, 0);
  const avgshoot = total / state.shoots.length;
  const avgArrow = total / (state.shoots.length * ARROWS_PER_shoot);

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
    targetCount: state.targetCount,
    arrowsPerVolley: ARROWS_PER_shoot,
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
  els.downloadDataBtn.disabled = !done;
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
  els.scoringCard.classList.add("hidden");
  els.summaryCard.classList.add("hidden");
  els.setupCard.classList.remove("hidden");
}

els.rulesetSelect.addEventListener("change", () => {
  const ruleset = els.rulesetSelect.value;
  const isCustom = ruleset === "custom";
  els.customPointsWrap.classList.toggle("hidden", !isCustom);

  if (defaultTargetsByRuleset[ruleset]) {
    els.targetsInput.value = defaultTargetsByRuleset[ruleset];
  }
});

els.startBtn.addEventListener("click", startScoring);
els.backSetupBtn.addEventListener("click", restart);
els.stepBackBtn.addEventListener("click", stepBackOneArrow);
els.downloadDataBtn.addEventListener("click", downloadResultsJson);
els.restartBtn.addEventListener("click", restart);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      // Ignore registration failure: app remains usable online.
    });
  });
}
