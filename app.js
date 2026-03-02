const ARROWS_PER_shoot = 6;
const APP_VERSION = "v1.4.1";
const LAST_SCORE_PREVIEW_MS = 300;
const AUTO_SAVE_KEY = "score-team-autosave-v1";
const HISTORY_KEY = "score-team-history-v1";
const CONFIG_KEY = "score-team-config-v1";
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
  useTargetGroups: true,
  editingVolleyIndex: null,
  lastEditedVolleyIndex: null,
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
  statsGroupDistCard: document.getElementById("stats-group-dist-card"),
  statsGroupDist: document.getElementById("stats-group-dist"),
  finalTotal: document.getElementById("final-total"),
  avgshoot: document.getElementById("avg-volley"),
  avgArrow: document.getElementById("avg-arrow"),
  statsList: document.getElementById("stats-list"),
  shootHistoryBody: document.getElementById("volley-history-body"),
  restartBtn: document.getElementById("restart-btn"),
  appVersion: document.getElementById("app-version"),
  flashInfo: document.getElementById("flash-info"),
  configBtn: document.getElementById("config-btn"),
  configModal: document.getElementById("config-modal"),
  configModalOverlay: document.getElementById("config-modal-overlay"),
  configCloseBtn: document.getElementById("config-close-btn"),
  configExportHistoryBtn: document.getElementById("config-export-history-btn"),
  configImportHistoryBtn: document.getElementById("config-import-history-btn"),
  configImportHistoryInput: document.getElementById("config-import-history-input"),
  weaponSelect: document.getElementById("weapon-select"),
  volleyTitleText: document.getElementById("volley-title-text"),
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
  useTargetGroupsCheckbox: document.getElementById("use-target-groups"),
  groupColumnHeader: document.getElementById("group-column-header"),
  statsTabGroupsBtn: document.getElementById("stats-tab-groups-btn"),
};

const presets = {
  nature: [20, 15, 10, 0],
  "3d": [11, 10, 8, 5, 0],
  "3d2": [10, 8, 5, 0],
  "3dh": [20, 16, 10, 0],
  ar: [20, 18, 16, 14, 12, 10, 0],
};

const defaultTargetsByRuleset = {
  nature: 21,
  "3d": 24,
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
  closeHelpModal();
  closeHistoryModal();
  syncConfigSliderMax();
  els.configFullTargetTeam.value = String(appConfig.fullTarget_team);
  els.configFullTargetTeamValue.textContent = String(appConfig.fullTarget_team);
  els.configFullTargetIndiv.value = String(appConfig.fullTarget_individual);
  els.configFullTargetIndivValue.textContent = String(appConfig.fullTarget_individual);
  els.configMissLimitTeam.value = String(appConfig.missLimit_team);
  els.configMissLimitTeamValue.textContent = String(appConfig.missLimit_team);
  els.configMissLimitIndiv.value = String(appConfig.missLimit_individual);
  els.configMissLimitIndivValue.textContent = String(appConfig.missLimit_individual);
  els.configModal.classList.remove("hidden");
}

function closeConfigModal() {
  els.configModal.classList.add("hidden");
}

const maxShootTotalByRuleset = {
  nature: 105,
  "3d": 66,
  "3d2": 60,
  "3dh": 20,
  ar: 48,
};

const targetGroupsByRuleset = {
  nature: ["PA", "PG", "MG", "GG"],
  "3d": ["G1", "G2", "G3", "G4"],
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
    useTargetGroups: els.useTargetGroupsCheckbox ? els.useTargetGroupsCheckbox.checked : true,
  };
}

function getGroupsForRuleset(ruleset) {
  return targetGroupsByRuleset[ruleset] || [];
}

function formatWeaponLabel(code) {
  if (code === "AC") return "Arc de Chasse";
  if (code === "AD") return "Arc Droit";
  if (code === "BB") return "Barebow";
  if (code === "CO") return "Compound";
  if (code === "TL") return "Tir Libre";
  return code || "";
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
  const checked = els.targetGroupSelect.querySelector('input[name="target-group"]:checked');
  return checked ? checked.value : "";
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
            scoringMode: state.scoringMode,
            weapon: state.weapon || "",
            useTargetGroups: state.useTargetGroups,
            arrowsPerVolley: state.arrowsPerVolley,
            currentArrowIndex: state.currentArrowIndex,
            shoots: state.shoots.map((shoot) => [...shoot]),
            currentshoot: [...state.currentshoot],
            activeRuleset: state.activeRuleset,
            allowedPoints: [...state.allowedPoints],
            shootGroups: [...state.shootGroups],
            currentGroup: getSelectedTargetGroup(),
            editingVolleyIndex: state.editingVolleyIndex,
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
  if (typeof setup.useTargetGroups === "boolean" && els.useTargetGroupsCheckbox) {
    els.useTargetGroupsCheckbox.checked = setup.useTargetGroups;
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
  state.weapon = saved.weapon || "";
  state.useTargetGroups = typeof saved.useTargetGroups === "boolean" ? saved.useTargetGroups : true;
  state.arrowsPerVolley = getArrowsPerVolley(saved.activeRuleset, state.scoringMode);
  state.activeRuleset = saved.activeRuleset;
  state.allowedPoints = Array.isArray(saved.allowedPoints) && saved.allowedPoints.length ? [...saved.allowedPoints] : [...presets[saved.activeRuleset]];
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
  els.volleyTitleText.textContent = `Volée ${Math.min(shootNumber, state.targetCount)} sur ${state.targetCount}`;
  els.volleyWeaponLabel.textContent = state.weapon ? formatWeaponLabel(state.weapon) : "";
  if (Number.isInteger(state.editingVolleyIndex) && state.editingVolleyIndex >= 0) {
    els.progressText.textContent = `Modification de la volée ${state.editingVolleyIndex + 1}`;
  } else {
    els.progressText.textContent = "";
  }
  els.teamTotal.textContent = `${globalTotal()} pts`;
  els.successZoneDisplay.textContent = `${state.successZone} pts`;
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
          : "is-hit";
      return `<span class="current-shoot-pill ${scoreClass}">${label}</span>`;
    })
    .join("");
  if (Number.isInteger(state.editingVolleyIndex) && state.editingVolleyIndex >= 0) {
    els.currentShootDisplay.innerHTML = `<span style="white-space: nowrap; margin-right: 4px;">${state.editingVolleyIndex + 1} :</span>${pills}`;
  } else {
    els.currentShootDisplay.innerHTML = `${pills}`;
  }
}

function refreshScoringView(options = {}) {
  const { scrollHistory = true } = options;
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
}

function updateTargetGroupsVisibility() {
  const show = state.useTargetGroups;
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

function renderLiveVolleyHistory() {
  els.liveVolleyHistoryBody.innerHTML = "";
  const maxVolley = getMaxVolleyForCurrentConfig();
  const sessionCompleted = state.shoots.length === state.targetCount;
  state.shoots.forEach((shoot, idx) => {
    const isEditingRow = idx === state.editingVolleyIndex;
    const total = roundTotal(shoot);
    const successful = isSuccessfulVolley(total);
    const pillClass = getVolleyPillClass(shoot, total, maxVolley);
    const row = document.createElement("tr");
    row.classList.toggle("is-edited-row", idx === state.lastEditedVolleyIndex);
    const editButtonHtml = sessionCompleted
      ? ""
      : `
        <button class=\"btn btn-light btn-icon row-edit-btn\" aria-label=\"Modifier la volée ${idx + 1}\">
          <svg viewBox=\"0 0 24 24\" aria-hidden=\"true\" focusable=\"false\">
            <path d=\"m3 17.25 9.81-9.81 3.75 3.75L6.75 21H3v-3.75Zm14.71-9.04a1 1 0 0 0 0-1.42l-2.5-2.5a1 1 0 0 0-1.42 0L12.56 5.5l3.75 3.75 1.4-1.04Z\" fill=\"currentColor\" />
          </svg>
        </button>
      `;
    const arrowsText = isEditingRow
      ? Array(state.arrowsPerVolley).fill("-").join(" / ")
      : shoot.map((value) => formatScore(value)).join(" / ");
    const totalText = isEditingRow ? "-" : String(total);
    const groupCell = state.useTargetGroups ? `<td>${state.shootGroups[idx] || "-"}</td>` : "";
    row.innerHTML = `
      <td><span class="volley-pill ${pillClass}">${idx + 1}</span></td>
      <td>${arrowsText}</td>
      ${groupCell}
      <td class="history-total ${successful && !isEditingRow ? "success" : ""}">${totalText}</td>
      <td>
        ${editButtonHtml}
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
      row.querySelector(".row-edit-btn").addEventListener("click", () => editVolleyAt(idx));
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
    const previewGroupCell = state.useTargetGroups ? `<td>${getSelectedTargetGroup() || "-"}</td>` : "";
    previewRow.innerHTML = `
      <td><span class="volley-pill is-blue">${idx + 1}</span></td>
      <td>${Array(state.arrowsPerVolley).fill("-").join(" / ")}</td>
      ${previewGroupCell}
      <td class="history-total">-</td>
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
  if (state.activeRuleset === "ar") {
    const arrowScores = [[20, 18, 0], [16, 14, 0], [12, 10, 0]];
    const candidates = arrowScores[state.currentArrowIndex] || [0];
    return candidates.filter((score) => state.allowedPoints.includes(score));
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

function hasSingleMiss(shoot) {
  return shoot.some((v) => v === 0);
}

function getVolleyPillClass(shoot, total, maxVolley) {
  if (isDoubleZeroVolley(shoot)) return "is-red";
  if (total === maxVolley) return "is-green";
  if (hasSingleMiss(shoot)) return "is-orange";
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
    refreshScoringView();
    const editingIndexSnapshot = isEditing ? state.editingVolleyIndex : null;
    const delay = isEditing ? 0 : LAST_SCORE_PREVIEW_MS;
    window.setTimeout(() => {
      const newShoot = [...state.currentshoot];
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
    }, delay);
    return;
  }

  refreshScoringView({ scrollHistory: true });
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
  return checked ? checked.value : "team";
}

function getCurrentConfigForSetup() {
  const ruleset = els.rulesetSelect.value;
  const scoringMode = getSelectedScoringMode();
  const arrowsPerVolley = getArrowsPerVolley(ruleset, scoringMode);

  const points = presets[ruleset];

  const maxPoint = Math.max(...points.filter((p) => Number.isFinite(p)), 0);
  return { arrowsPerVolley, maxPoint };
}

function getTargetCountForRuleset(ruleset) {
  return defaultTargetsByRuleset[ruleset] ?? 21;
}

function isFFTLRuleset(ruleset) {
  return ruleset === "3d2" || ruleset === "3dh" || ruleset === "ar";
}

function getArrowsPerVolley(ruleset, scoringMode) {
  if (ruleset === "3dh") return 1;
  if (ruleset === "ar") return 3;
  return scoringMode === "individual" ? 2 : ARROWS_PER_shoot;
}

function syncScoringModeFieldset() {
  const fftl = isFFTLRuleset(els.rulesetSelect.value);
  els.scoringModeInputs.forEach((input) => {
    if (input.value === "team") {
      input.disabled = fftl;
      input.closest("label").classList.toggle("disabled", fftl);
      if (fftl && input.checked) {
        input.checked = false;
        const indivInput = [...els.scoringModeInputs].find((i) => i.value === "individual");
        if (indivInput) indivInput.checked = true;
      }
    }
  });
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
    if (isFFTLRuleset(ruleset)) return teamMax;
    return scoringMode === "individual" ? Math.floor(teamMax / 3) : teamMax;
  }

  const { arrowsPerVolley, maxPoint } = getCurrentConfigForSetup();
  return Math.max(0, arrowsPerVolley * maxPoint);
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
  state.weapon = els.weaponSelect ? els.weaponSelect.value : "";
  state.useTargetGroups = els.useTargetGroupsCheckbox ? els.useTargetGroupsCheckbox.checked : true;
  state.arrowsPerVolley = getArrowsPerVolley(els.rulesetSelect.value, state.scoringMode);
  state.allowedPoints = [...new Set(points)].sort((a, b) => b - a);
  state.shoots = [];
  state.shootGroups = [];
  state.resultsPayload = null;
  state.completionArchived = false;
  state.editingVolleyIndex = null;
  state.lastEditedVolleyIndex = null;
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
    weapon: state.weapon || "",
    useTargetGroups: state.useTargetGroups,
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
}

function getSegmentCount(targetCount) {
  if (targetCount >= 18) return 3;
  if (targetCount >= 10) return 2;
  return 1;
}

function getSegmentTotals(shoots, targetCount) {
  const segmentCount = getSegmentCount(targetCount);
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
  const segmentCount = getSegmentCount(state.targetCount);
  const segTotals = getSegmentTotals(state.shoots, state.targetCount);
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
    strong.textContent = `${segTotals[i]} pts`;

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
      const label = score === 0 ? "M" : String(score);
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
  document.querySelectorAll(".stats-tab").forEach((btn) => {
    const isActive = btn.dataset.statsTab === tabName;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", String(isActive));
  });
  els.statsTabSummary.classList.toggle("hidden", tabName !== "summary");
  els.statsTabGroups.classList.toggle("hidden", tabName !== "groups");
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
    const label = score === 0 ? 'M' : String(score);
    const color = legendColors[score] || '#b0b6c0';
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

  els.statsSuccessZone.textContent = `${successZone} pts`;
  const successZoneArticle = els.statsSuccessZone.closest("article");
  if (successZoneArticle) {
    successZoneArticle.classList.toggle("zone-achieved", avgVolley >= successZone);
  }
  els.statsTotalPoints.textContent = `${totalPoints} pts`;
  els.statsBestVolley.textContent = `${best} pts`;
  els.statsWorstVolley.textContent = `${worst} pts`;
  els.statsBar1.style.height = `${ratioFor(partAverages[0])}%`;
  els.statsBar2.style.height = `${ratioFor(partAverages[1])}%`;
  els.statsBar3.style.height = `${ratioFor(partAverages[2])}%`;
  els.statsBar1.style.background = getBarColorByZoneRatio(partAverages[0], successZone);
  els.statsBar2.style.background = getBarColorByZoneRatio(partAverages[1], successZone);
  els.statsBar3.style.background = getBarColorByZoneRatio(partAverages[2], successZone);
  els.statsBar1Value.textContent = partAverages[0].toFixed(2);
  els.statsBar2Value.textContent = partAverages[1].toFixed(2);
  els.statsBar3Value.textContent = partAverages[2].toFixed(2);
  els.statsGlobalAvg.textContent = avgVolley.toFixed(2);
  els.statsGlobalBar.style.height = `${ratioFor(avgVolley)}%`;
  els.statsGlobalBar.style.background = getBarColorByZoneRatio(avgVolley, successZone);
  renderEvolutionChart(totals, maxVolley, successZone, payload.targetCount || totals.length);
  const fullCount = totals.filter((total) => total === maxVolley).length;
  const doubleMissCount = volleys.filter((volley) => isDoubleZeroVolley(volley.arrows || [])).length;
  const totalArrows = volleys.length * (payload.arrowsPerVolley || state.arrowsPerVolley);
  els.statsFullCount.textContent = String(fullCount);
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
  closeHistoryModal();
  helpCurrentPage = 1;
  renderHelpPagination();
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
      const existing = loadHistoryEntries();
      const existingKeys = new Set(existing.map((e) => e.archivedAt || e.generatedAt));
      const newEntries = valid.filter((e) => !existingKeys.has(e.archivedAt || e.generatedAt));
      if (newEntries.length === 0) {
        showFlashInfo("Tous les parcours existent déjà.");
        return;
      }
      const merged = [...newEntries, ...existing].sort((a, b) =>
        new Date(b.archivedAt || b.generatedAt) - new Date(a.archivedAt || a.generatedAt)
      );
      saveHistoryEntries(merged);
      showFlashInfo(`${newEntries.length} parcours importé(s).`);
    } catch {
      showFlashInfo("Erreur lors de la lecture du fichier.");
    }
  };
  reader.readAsText(file);
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
  const entries = loadHistoryEntries().filter((entry) => {
    if (selectedMode !== "all" && entry.scoringMode !== selectedMode) return false;
    if (selectedRuleset !== "all" && entry.ruleset !== selectedRuleset) return false;
    return true;
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
  pageEntries.forEach((entry) => {
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
        <span class="history-date">${dateLabel}</span>
        <span class="history-time">${timeLabel}</span>
      </div>
      <div class="history-item-body">
        <div class="history-item-info">
          <strong class="history-total-score">${entry.total ?? 0} pts</strong>
          <span class="history-mode">${formatParcoursLabel(entry.ruleset)} en ${formatModeLabel(entry.scoringMode)}${entry.weapon ? " • " + formatWeaponLabel(entry.weapon) : ""}</span>
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
  closeHelpModal();
  historyCurrentPage = 1;
  renderHistoryList();
  els.historyModal.classList.remove("hidden");
}

function closeHistoryModal() {
  els.historyModal.classList.add("hidden");
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
      if (els.confirmModalOverlay) {
        els.confirmModalOverlay.removeEventListener("click", onCancel);
      }
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
    if (els.confirmModalOverlay) {
      els.confirmModalOverlay.addEventListener("click", onCancel);
    }
  });
}

function restart() {
  state.shoots = [];
  state.shootGroups = [];
  state.resultsPayload = null;
  state.editingVolleyIndex = null;
  state.lastEditedVolleyIndex = null;
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
  // Save current zone for previous config before switching
  const prevWeapon = state._lastWeapon || "";
  const prevKey = `${state._lastRuleset}:${state._lastScoringMode}:${prevWeapon}`;
  const prevValue = Number.parseInt(els.successZoneInput.value, 10);
  if (Number.isInteger(prevValue) && prevValue >= 1) {
    appConfig.successZoneByRuleset[prevKey] = prevValue;
    saveConfig();
  }
  syncScoringModeFieldset();
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
if (els.useTargetGroupsCheckbox) {
  els.useTargetGroupsCheckbox.addEventListener("change", persistAppState);
}
els.startBtn.addEventListener("click", startScoring);
els.backSetupBtn.addEventListener("click", restart);
els.historyBtn.addEventListener("click", openHistoryModal);
els.setupHelpBtn.addEventListener("click", openHelpModal);
els.helpBtn.addEventListener("click", openHelpModal);
els.stepBackBtn.addEventListener("click", stepBackOneArrow);
els.statsBtn.addEventListener("click", openStatsModal);
els.resultsCloseBtn.addEventListener("click", restart);
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
els.historyModeFilter.addEventListener("change", () => { historyCurrentPage = 1; renderHistoryList(); });
els.historyRulesetFilter.addEventListener("change", () => { historyCurrentPage = 1; renderHistoryList(); });
els.historyResetFiltersBtn.addEventListener("click", () => {
  els.historyModeFilter.value = "all";
  els.historyRulesetFilter.value = "all";
  historyCurrentPage = 1;
  renderHistoryList();
});
els.configBtn.addEventListener("click", openConfigModal);
els.configModalOverlay.addEventListener("click", closeConfigModal);
els.configCloseBtn.addEventListener("click", closeConfigModal);
els.configExportHistoryBtn.addEventListener("click", exportHistory);
els.configImportHistoryBtn.addEventListener("click", () => {
  els.configImportHistoryInput.value = "";
  els.configImportHistoryInput.click();
});
els.configImportHistoryInput.addEventListener("change", (e) => {
  if (e.target.files.length > 0) importHistory(e.target.files[0]);
});
els.configFullTargetTeam.addEventListener("input", () => {
  appConfig.fullTarget_team = Number(els.configFullTargetTeam.value);
  els.configFullTargetTeamValue.textContent = String(appConfig.fullTarget_team);
  saveConfig();
});
els.configFullTargetIndiv.addEventListener("input", () => {
  appConfig.fullTarget_individual = Number(els.configFullTargetIndiv.value);
  els.configFullTargetIndivValue.textContent = String(appConfig.fullTarget_individual);
  saveConfig();
});
els.configMissLimitTeam.addEventListener("input", () => {
  appConfig.missLimit_team = Number(els.configMissLimitTeam.value);
  els.configMissLimitTeamValue.textContent = String(appConfig.missLimit_team);
  saveConfig();
});
els.configMissLimitIndiv.addEventListener("input", () => {
  appConfig.missLimit_individual = Number(els.configMissLimitIndiv.value);
  els.configMissLimitIndivValue.textContent = String(appConfig.missLimit_individual);
  saveConfig();
});
els.rulesetSelect.addEventListener("change", () => syncConfigSliderMax());
loadConfig();
els.appVersion.textContent = APP_VERSION;
state._lastRuleset = els.rulesetSelect.value;
state._lastScoringMode = getSelectedScoringMode();
state._lastWeapon = els.weaponSelect ? els.weaponSelect.value : "";
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
