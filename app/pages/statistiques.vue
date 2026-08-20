<script setup lang="ts">
// "Statistiques générales" — ported from app.js's openGeneralStatsModal()/
// renderGeneralStatsModal()/renderGeneralStatsEvolution(). Aggregates across
// the WHOLE local history (not a single session, unlike SoloStatsModal.vue).
// Purely a client-side recompute over already-loaded history entries: no
// dedicated API call, filters just narrow the in-memory array.
import type { HistoryEntryRecord } from "~/composables/useDb";
import {
  formatRulesetLabel,
  formatHistoryEntryDate,
  getHistorySortDate,
  normalizeSoloSessionType,
} from "~/utils/scoring-format";
import {
  getWeaponsForRuleset,
  formatWeaponLabel,
  scoreToValue,
} from "~/utils/scoring-engine";

const FFTA_RULESETS = ["nature", "campagne", "3d"];
const FFTL_RULESETS = ["3d2", "3dh", "ar", "field"];

const { list } = useHistory();

const loading = ref(true);
const allEntries = ref<HistoryEntryRecord[]>([]);

const rulesetFilter = ref("all");
const weaponFilter = ref("all");
const sessionTypeFilter = ref<"all" | "training" | "contest">("all");
// Mirrors app.js's `state.generalStatsGraphEnabled`: the evolution graph is
// only ever shown after the user has explicitly touched a filter (never on
// the initial default view), and even then only once a specific weapon is
// selected (see `showEvolutionGraph` below).
const graphEnabled = ref(false);

onMounted(async () => {
  allEntries.value = await list();
  loading.value = false;
});

const weaponOptions = computed(() => {
  if (rulesetFilter.value === "all") return [];
  return getWeaponsForRuleset(rulesetFilter.value);
});

watch(rulesetFilter, () => {
  graphEnabled.value = true;
  if (!weaponOptions.value.includes(weaponFilter.value)) {
    weaponFilter.value = "all";
  }
});
watch(weaponFilter, () => {
  graphEnabled.value = true;
});
watch(sessionTypeFilter, () => {
  graphEnabled.value = true;
});

const filteredEntries = computed(() => {
  return allEntries.value.filter((entry) => {
    if (entry.completed === false) return false;
    if (rulesetFilter.value !== "all" && entry.ruleset !== rulesetFilter.value)
      return false;
    if (weaponFilter.value !== "all" && entry.weapon !== weaponFilter.value)
      return false;
    if (
      sessionTypeFilter.value !== "all" &&
      normalizeSoloSessionType(entry.soloSessionType) !==
        sessionTypeFilter.value
    )
      return false;
    return true;
  });
});

const stats = computed(() => {
  const entries = filteredEntries.value;
  if (entries.length === 0) return null;

  const sessions = entries.length;
  const totalPoints = entries.reduce(
    (sum, entry) => sum + (Number(entry.total) || 0),
    0,
  );
  const avgSession = totalPoints / sessions;

  let totalArrows = 0;
  let volleyCount = 0;
  let successCount = 0;
  let bestVolley = 0;

  entries.forEach((entry) => {
    const volleys = Array.isArray(entry.volleys)
      ? (entry.volleys as any[])
      : [];
    const perVolley = Number.isInteger(entry.arrowsPerVolley)
      ? (entry.arrowsPerVolley as number)
      : 0;
    volleyCount += volleys.length;
    totalArrows += perVolley > 0 ? perVolley * volleys.length : 0;

    volleys.forEach((volley) => {
      const volleyTotal = Number.isFinite(volley.total)
        ? volley.total
        : (volley.arrows ?? []).reduce(
            (s: number, v: number | null) => s + scoreToValue(v),
            0,
          );
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
  const successRate =
    volleyCount > 0 ? Math.round((successCount / volleyCount) * 100) : 0;

  const bestSession = entries.reduce((best, entry) => {
    const bestTotal = Number(best?.total) || 0;
    const entryTotal = Number(entry.total) || 0;
    return entryTotal > bestTotal ? entry : best;
  }, entries[0]);

  return {
    sessions,
    avgSession,
    avgArrow,
    successRate,
    bestSession,
    bestVolley,
  };
});

const showEvolutionGraph = computed(
  () =>
    graphEnabled.value &&
    weaponFilter.value !== "all" &&
    filteredEntries.value.length >= 3,
);

const orderedEntries = computed(() =>
  [...filteredEntries.value].sort(
    (a, b) => getHistorySortDate(a) - getHistorySortDate(b),
  ),
);

const evolution = computed(() => {
  const ordered = orderedEntries.value;
  const totals = ordered.map((entry) => Number(entry.total) || 0);

  const targetSessionTotals = ordered
    .map((entry) => {
      const zone = Number(entry.successZone) || 0;
      const volleyCount = Number.isInteger(entry.targetCount)
        ? (entry.targetCount as number)
        : Array.isArray(entry.volleys)
          ? (entry.volleys as any[]).length
          : 0;
      return zone > 0 && volleyCount > 0 ? zone * volleyCount : 0;
    })
    .filter((value) => value > 0);
  const avgTargetTotal =
    targetSessionTotals.length > 0
      ? targetSessionTotals.reduce((sum, value) => sum + value, 0) /
        targetSessionTotals.length
      : 0;

  const left = 4;
  const right = 96;
  const top = 4;
  const bottom = 40;
  const rangeY = bottom - top;
  const maxObserved = Math.max(...totals, avgTargetTotal, 1);
  const toY = (value: number) =>
    bottom - (Math.max(0, value) / maxObserved) * rangeY;

  const points = totals
    .map((value, index) => {
      const x =
        totals.length === 1
          ? (left + right) / 2
          : left + (index * (right - left)) / (totals.length - 1);
      return `${x.toFixed(2)},${toY(value).toFixed(2)}`;
    })
    .join(" ");

  const xSpacingPx = 24;
  const chartWidth = Math.max(280, (ordered.length - 1) * xSpacingPx + 80);

  return {
    points,
    avgY: toY(avgTargetTotal).toFixed(2),
    chartWidth,
    gridTemplateColumns: `repeat(${ordered.length}, minmax(${xSpacingPx}px, 1fr))`,
  };
});

function formatEntryDateShort(entry: HistoryEntryRecord): string {
  const sessionDate = entry.sessionDate as string | undefined;
  if (sessionDate) {
    const [, mm, dd] = sessionDate.split("-");
    if (mm && dd) return `${dd}/${mm}`;
  }
  const date = new Date((entry.generatedAt || entry.archivedAt) as string);
  if (Number.isNaN(date.getTime())) return "--/--";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}
</script>

<template>
  <main class="app">
    <section class="card general-stats-modal-card">
      <div class="setup-head modal-head">
        <h2 class="modal-title-with-icon">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M4 20h16v2H4v-2Zm1-2V9h3v9H5Zm5 0V5h3v13h-3Zm5 0v-7h3v7h-3Z"
              fill="currentColor"
            />
          </svg>
          <span>Statistiques générales</span>
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

      <div v-if="!loading && allEntries.length === 0" class="duel-volley-empty">
        Aucune statistique disponible. Enregistrez au moins une session dans
        l'historique.
      </div>

      <template v-else-if="!loading">
        <div class="general-stats-filter-row">
          <label>
            <span class="label-inline">Type de parcours</span>
            <select v-model="rulesetFilter">
              <option value="all">Tous les parcours</option>
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
            <span class="label-inline">Type d'arme</span>
            <select v-model="weaponFilter">
              <option value="all">Toutes les armes</option>
              <option v-for="w in weaponOptions" :key="w" :value="w">
                {{ w }} - {{ formatWeaponLabel(w) }}
              </option>
            </select>
          </label>
          <div
            class="general-stats-session-type-fieldset yes-no-fieldset"
            role="group"
            aria-label="Type de session"
          >
            <span class="label-inline">Type de session</span>
            <div
              class="yes-no-switch general-stats-session-type-switch"
              role="radiogroup"
              aria-label="Type de session"
            >
              <label class="switch-option">
                <input v-model="sessionTypeFilter" type="radio" value="all" />
                <span>Toutes</span>
              </label>
              <label class="switch-option">
                <input
                  v-model="sessionTypeFilter"
                  type="radio"
                  value="training"
                />
                <span>Entraînement</span>
              </label>
              <label class="switch-option">
                <input
                  v-model="sessionTypeFilter"
                  type="radio"
                  value="contest"
                />
                <span>Concours</span>
              </label>
            </div>
          </div>
        </div>

        <div v-if="!stats" class="duel-volley-empty">
          Aucune session ne correspond à ces filtres.
        </div>

        <template v-else>
          <div
            v-if="showEvolutionGraph"
            class="stats-grid-3 stats-evolution-row general-stats-evolution-row"
          >
            <article class="stats-evolution-card">
              <span>Évolution des scores dans le temps</span>
              <div
                id="general-stats-evolution-wrap"
                class="stats-evolution-wrap"
              >
                <svg
                  id="general-stats-evolution-chart"
                  viewBox="0 0 100 44"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                  :style="{ width: `${evolution.chartWidth}px` }"
                >
                  <line
                    id="general-stats-evolution-avg-line"
                    x1="4"
                    :y1="evolution.avgY"
                    x2="96"
                    :y2="evolution.avgY"
                  ></line>
                  <polyline
                    id="general-stats-evolution-path"
                    :points="evolution.points"
                  ></polyline>
                </svg>
                <div
                  id="general-stats-evolution-axis"
                  :style="{
                    width: `${evolution.chartWidth}px`,
                    gridTemplateColumns: evolution.gridTemplateColumns,
                  }"
                >
                  <small
                    v-for="entry in orderedEntries"
                    :key="String(entry.archivedAt || entry.generatedAt)"
                    >{{ formatEntryDateShort(entry) }}</small
                  >
                </div>
              </div>
            </article>
          </div>

          <div class="stats-grid-2 general-stats-top-row">
            <article>
              <span>Sessions</span>
              <strong>{{ stats.sessions }}</strong>
            </article>
            <article>
              <span>Moyenne / session</span>
              <strong
                >{{ stats.avgSession.toFixed(1)
                }}<span class="stats-unit">pts</span></strong
              >
            </article>
          </div>

          <div class="stats-grid-2 stats-extra-row general-stats-row">
            <article>
              <span>Moyenne / flèche</span>
              <strong
                >{{ stats.avgArrow.toFixed(1)
                }}<span class="stats-unit">pts</span></strong
              >
            </article>
            <article>
              <span>Taux de réussite</span>
              <strong
                >{{ stats.successRate
                }}<span class="stats-unit">%</span></strong
              >
            </article>
          </div>

          <div class="stats-grid-2 stats-extra-row general-stats-row">
            <article>
              <span>Meilleure session</span>
              <strong
                >{{ Number(stats.bestSession?.total) || 0
                }}<span class="stats-unit">pts</span></strong
              >
              <small class="general-stats-meta">{{
                formatHistoryEntryDate(stats.bestSession)
              }}</small>
            </article>
            <article>
              <span>Meilleure volée</span>
              <strong
                >{{ stats.bestVolley
                }}<span class="stats-unit">pts</span></strong
              >
            </article>
          </div>
        </template>
      </template>
    </section>
  </main>
</template>
