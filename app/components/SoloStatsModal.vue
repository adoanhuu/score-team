<script setup lang="ts">
import { scoreLabel } from "~/utils/scoring-format";
import {
  getSegmentCount,
  getSegmentAverages,
  getBarColorByZoneRatio,
  getMaxShootTotalForConfig,
  getGroupsForRuleset,
  getGroupLabel,
  isDoubleZeroVolley,
  type ScoringMode,
} from "~/utils/scoring-engine";
import type { HistoryEntryRecord } from "../composables/useDb";

const props = defineProps<{
  payload: HistoryEntryRecord;
}>();

const emit = defineEmits<{
  close: [];
  "save-comments": [text: string];
}>();

type TabName = "summary" | "groups" | "comments";
const activeTab = ref<TabName>("summary");

const volleys = computed(() =>
  Array.isArray(props.payload.volleys) ? (props.payload.volleys as any[]) : [],
);
const totals = computed(() => volleys.value.map((v) => v.total ?? 0));
const ruleset = computed(() => String(props.payload.ruleset ?? "nature"));
const scoringMode = computed(
  () => (props.payload.scoringMode as ScoringMode) ?? "team",
);
const arrowsPerVolley = computed(
  () => Number(props.payload.arrowsPerVolley) || 0,
);
const allowedPoints = computed<number[]>(() =>
  Array.isArray(props.payload.allowedPoints) &&
  (props.payload.allowedPoints as number[]).length
    ? (props.payload.allowedPoints as number[])
    : [...new Set(volleys.value.flatMap((v) => v.arrows ?? []))].sort(
        (a, b) => b - a,
      ),
);
const successZone = computed(() => Number(props.payload.successZone) || 0);
const showScores = computed(() => props.payload.showScores !== false);
const useTargetGroups = computed(() => Boolean(props.payload.useTargetGroups));

const totalPoints = computed(() => totals.value.reduce((sum, v) => sum + v, 0));
const avgVolley = computed(() =>
  totals.value.length ? totalPoints.value / totals.value.length : 0,
);
const best = computed(() =>
  totals.value.length ? Math.max(...totals.value) : 0,
);
const worst = computed(() =>
  totals.value.length ? Math.min(...totals.value) : 0,
);

const targetCount = computed(
  () => Number(props.payload.targetCount) || totals.value.length,
);
const segmentCount = computed(() =>
  getSegmentCount(targetCount.value, ruleset.value),
);
const segmentAverages = computed(() =>
  getSegmentAverages(totals.value, segmentCount.value),
);
const maxVolley = computed(() => {
  const single = getMaxShootTotalForConfig(
    ruleset.value,
    "individual",
    arrowsPerVolley.value,
    allowedPoints.value,
  );
  return single;
});

function ratioFor(value: number): number {
  if (maxVolley.value <= 0) return 0;
  return Math.max(0, Math.min(100, (value / maxVolley.value) * 100));
}
function percentOfSuccessZone(value: number): number {
  if (successZone.value <= 0) return 0;
  return Math.ceil((value / successZone.value) * 100);
}
function barColor(value: number): string {
  return getBarColorByZoneRatio(value, successZone.value);
}

const segmentLabels = computed(() => {
  if (segmentCount.value === 2) return ["1ère moitié", "2e moitié"];
  return ["1er tiers", "2e tiers", "3e tiers"];
});

const fullCount = computed(
  () => totals.value.filter((t) => t === maxVolley.value).length,
);
const missCount = computed(() =>
  volleys.value.reduce(
    (sum, v) =>
      sum + (v.arrows ?? []).filter((s: number | null) => s === 0).length,
    0,
  ),
);
const doubleMissCount = computed(
  () => volleys.value.filter((v) => isDoubleZeroVolley(v.arrows ?? [])).length,
);

// Evolution chart (SVG polyline)
const evolutionPoints = computed(() => {
  const left = 4;
  const right = 96;
  const top = 4;
  const bottom = 40;
  const rangeY = bottom - top;
  const maxObserved = Math.max(
    ...totals.value,
    successZone.value,
    maxVolley.value,
    1,
  );
  const toY = (value: number) =>
    bottom - (Math.max(0, value) / maxObserved) * rangeY;
  if (totals.value.length === 0) return { points: "", successY: bottom };
  const points = totals.value
    .map((value, index) => {
      const x =
        totals.value.length === 1
          ? (left + right) / 2
          : left + (index * (right - left)) / (totals.value.length - 1);
      return `${x.toFixed(2)},${toY(value).toFixed(2)}`;
    })
    .join(" ");
  return { points, successY: toY(successZone.value) };
});
const evolutionAxisLabels = computed(() => {
  const n = totals.value.length;
  if (n === 0) return [];
  return [1, Math.round(n * 0.25), Math.round(n * 0.5), Math.round(n * 0.75), n]
    .filter((v) => v >= 1 && v <= n)
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .sort((a, b) => a - b);
});

// Per-arrow distribution (Répartition tab)
function distributionRows(scores: number[]) {
  const counts = new Map<number, number>();
  allowedPoints.value.forEach((s) => counts.set(s, 0));
  scores.forEach((s) => counts.set(s, (counts.get(s) ?? 0) + 1));
  const ordered = [...allowedPoints.value].sort((a, b) => b - a);
  const totalArrows = ordered.reduce((sum, s) => sum + (counts.get(s) ?? 0), 0);
  return ordered.map((score) => {
    const count = counts.get(score) ?? 0;
    const pct = totalArrows > 0 ? (count / totalArrows) * 100 : 0;
    return { score, label: scoreLabel(score), count, pct };
  });
}

const arrowDistributions = computed(() => {
  if (arrowsPerVolley.value <= 0 || volleys.value.length === 0) return [];
  return Array.from({ length: arrowsPerVolley.value }, (_, arrowIndex) => {
    const scores = volleys.value
      .map((v) => v.arrows?.[arrowIndex])
      .filter((s) => s !== null && s !== undefined);
    return { arrowIndex, rows: distributionRows(scores), count: scores.length };
  });
});

const SCORE_RANK_COLORS = [
  "#2563eb",
  "#16a34a",
  "#eab308",
  "#f97316",
  "#dc2626",
  "#7c3aed",
  "#ec4899",
  "#92400e",
];
function colorForRank(index: number): string {
  return SCORE_RANK_COLORS[index] || "#6b7280";
}

const orderedScores = computed(() =>
  [...allowedPoints.value].sort((a, b) => b - a),
);

function buildPieSlices(scores: number[]) {
  const counts = new Map<number, number>();
  orderedScores.value.forEach((s) => counts.set(s, 0));
  scores.forEach((s) => counts.set(s, (counts.get(s) ?? 0) + 1));
  const total = orderedScores.value.reduce(
    (sum, s) => sum + (counts.get(s) ?? 0),
    0,
  );
  if (total === 0) return [];
  const r = 60;
  const cx = r;
  const cy = r;
  const sliceR = r - 2;
  let startAngle = -Math.PI / 2;
  const slices: { path: string; color: string }[] = [];
  orderedScores.value.forEach((score, index) => {
    const count = counts.get(score) ?? 0;
    if (count === 0) return;
    const sliceAngle = (count / total) * 2 * Math.PI;
    const endAngle = startAngle + sliceAngle;
    const largeArc = sliceAngle > Math.PI ? 1 : 0;
    const x1 = cx + sliceR * Math.cos(startAngle);
    const y1 = cy + sliceR * Math.sin(startAngle);
    const x2 = cx + sliceR * Math.cos(endAngle);
    const y2 = cy + sliceR * Math.sin(endAngle);
    const color = colorForRank(index);
    if (count === total) {
      slices.push({
        path: `M${cx - sliceR},${cy} a${sliceR},${sliceR} 0 1,0 ${sliceR * 2},0 a${sliceR},${sliceR} 0 1,0 -${sliceR * 2},0`,
        color,
      });
    } else {
      slices.push({
        path: `M${cx},${cy} L${x1.toFixed(3)},${y1.toFixed(3)} A${sliceR},${sliceR} 0 ${largeArc} 1 ${x2.toFixed(3)},${y2.toFixed(3)} Z`,
        color,
      });
    }
    startAngle = endAngle;
  });
  return slices;
}

const groupDistributions = computed(() => {
  if (!useTargetGroups.value) return [];
  const groups = getGroupsForRuleset(ruleset.value);
  return groups
    .map((group) => {
      const groupVolleys = volleys.value.filter((v) => v.group === group);
      if (groupVolleys.length === 0) return null;
      const scores = groupVolleys.flatMap((v) => v.arrows ?? []);
      const groupTotal = groupVolleys.reduce(
        (sum, v) => sum + (v.total ?? 0),
        0,
      );
      return {
        group,
        label: getGroupLabel(group),
        count: groupVolleys.length,
        avg: (groupTotal / groupVolleys.length).toFixed(2),
        slices: buildPieSlices(scores),
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);
});

const legendItems = computed(() =>
  orderedScores.value.map((score, index) => ({
    score,
    label: scoreLabel(score),
    color: colorForRank(index),
  })),
);

const commentsText = ref(String(props.payload.progressionAxis ?? ""));
watch(
  () => props.payload.progressionAxis,
  (v) => {
    commentsText.value = String(v ?? "");
  },
);

function saveComments() {
  emit("save-comments", commentsText.value);
}
</script>

<template>
  <section
    id="stats-modal"
    class="modal"
    role="dialog"
    aria-modal="true"
    aria-labelledby="stats-modal-title"
  >
    <div class="modal-overlay" @click="emit('close')"></div>
    <div class="modal-card stats-modal-card">
      <div class="modal-head">
        <div class="stats-head-title">
          <h3 id="stats-modal-title">Statistiques</h3>
          <strong>{{ totalPoints }}<span class="stats-unit">pts</span></strong>
        </div>
        <button
          class="btn btn-light btn-icon"
          aria-label="Fermer statistiques"
          @click="emit('close')"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>

      <nav class="stats-tabs" role="tablist">
        <button
          class="stats-tab"
          :class="{ active: activeTab === 'summary' }"
          role="tab"
          @click="activeTab = 'summary'"
        >
          Résumé
        </button>
        <button
          class="stats-tab"
          :class="{ active: activeTab === 'groups' }"
          role="tab"
          @click="activeTab = 'groups'"
        >
          Répartition
        </button>
        <button
          class="stats-tab"
          :class="{ active: activeTab === 'comments' }"
          role="tab"
          @click="activeTab = 'comments'"
        >
          Commentaires
        </button>
      </nav>

      <div v-if="activeTab === 'summary'" class="stats-tab-panel">
        <div class="stats-grid-3">
          <article :class="{ 'zone-achieved': avgVolley >= successZone }">
            <span>Z. de réussite</span>
            <strong
              >{{ successZone }}<span class="stats-unit">pts</span></strong
            >
          </article>
          <article>
            <span>Meilleure volée</span
            ><strong>{{ best }}<span class="stats-unit">pts</span></strong>
          </article>
          <article>
            <span>Pire volée</span
            ><strong>{{ worst }}<span class="stats-unit">pts</span></strong>
          </article>
        </div>

        <div class="stats-grid-3 stats-dashboard">
          <article class="stats-histogram-card">
            <span>Moyennes par partie</span>
            <div class="stats-histogram">
              <div
                v-for="(avg, i) in segmentAverages"
                :key="i"
                class="stats-bar-col"
              >
                <div class="stats-bar-track">
                  <div
                    class="stats-bar"
                    :style="{
                      height: ratioFor(avg) + '%',
                      background: barColor(avg),
                    }"
                  ></div>
                </div>
                <strong>
                  <template v-if="showScores"
                    >{{ avg.toFixed(1)
                    }}<span class="stats-unit">pts</span></template
                  >
                  <template v-else
                    >{{ percentOfSuccessZone(avg)
                    }}<span class="stats-unit">%</span></template
                  >
                </strong>
                <small>{{ segmentLabels[i] }}</small>
              </div>
            </div>
          </article>
          <article>
            <span>Moyenne globale</span>
            <div class="stats-histogram stats-histogram-single">
              <div class="stats-bar-col">
                <div class="stats-bar-track">
                  <div
                    class="stats-bar"
                    :style="{
                      height: ratioFor(avgVolley) + '%',
                      background: barColor(avgVolley),
                    }"
                  ></div>
                </div>
                <strong
                  >{{ avgVolley.toFixed(1)
                  }}<span class="stats-unit">pts</span></strong
                >
                <small>Globale</small>
              </div>
            </div>
          </article>
        </div>

        <div class="stats-grid-3 stats-evolution-row">
          <article class="stats-evolution-card">
            <span>Évolution des scores (cibles 1 à {{ targetCount }})</span>
            <div class="stats-evolution-wrap">
              <svg
                viewBox="0 0 100 44"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <line
                  x1="4"
                  :y1="evolutionPoints.successY"
                  x2="96"
                  :y2="evolutionPoints.successY"
                ></line>
                <polyline :points="evolutionPoints.points"></polyline>
              </svg>
              <div class="stats-evolution-axis">
                <small v-for="label in evolutionAxisLabels" :key="label">{{
                  label
                }}</small>
              </div>
            </div>
          </article>
        </div>

        <div class="stats-grid-3 stats-extra-row">
          <article>
            <span>Pleins</span><strong>{{ fullCount }}</strong>
          </article>
          <article>
            <span>Pailles</span><strong>{{ missCount }}</strong>
          </article>
          <article>
            <span>Double pailles</span><strong>{{ doubleMissCount }}</strong>
          </article>
        </div>
      </div>

      <div v-else-if="activeTab === 'groups'" class="stats-tab-panel">
        <div class="stats-grid-1">
          <article class="stats-dist-card">
            <span>Répartition par flèche</span>
            <div class="stats-arrow-dist">
              <div
                v-if="arrowDistributions.length === 0"
                class="stats-arrow-dist-empty"
              >
                Aucune donnée de flèche.
              </div>
              <div v-else class="stats-arrow-dist-grid">
                <article
                  v-for="dist in arrowDistributions"
                  :key="dist.arrowIndex"
                  class="stats-arrow-dist-card"
                >
                  <strong class="stats-arrow-dist-title"
                    >Flèche {{ dist.arrowIndex + 1 }}</strong
                  >
                  <div class="stats-score-dist">
                    <div
                      v-for="row in dist.rows"
                      :key="row.score"
                      class="stats-dist-row-item"
                    >
                      <span class="stats-dist-label">{{ row.label }}</span>
                      <div class="stats-dist-track">
                        <div
                          class="stats-dist-fill"
                          :style="{
                            width: row.pct.toFixed(2) + '%',
                            background: row.count > 0 ? '#2d6a4f' : '#d1d5db',
                          }"
                        ></div>
                      </div>
                      <strong class="stats-dist-value">{{ row.count }}</strong>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          </article>
        </div>
        <div v-if="useTargetGroups" class="stats-grid-1">
          <article class="stats-dist-card">
            <span>Répartition par catégorie</span>
            <div class="stats-group-dist">
              <div
                v-if="groupDistributions.length === 0"
                style="text-align: center; color: #888; padding: 12px"
              >
                Aucune donnée de groupe.
              </div>
              <template v-else>
                <div class="stats-pie-grid">
                  <div
                    v-for="gd in groupDistributions"
                    :key="gd.group"
                    class="stats-pie-cell"
                  >
                    <svg
                      viewBox="0 0 120 120"
                      class="stats-pie-svg"
                      aria-hidden="true"
                    >
                      <path
                        v-for="(slice, i) in gd.slices"
                        :key="i"
                        :d="slice.path"
                        :fill="slice.color"
                      />
                    </svg>
                    <strong class="stats-pie-cell-title">{{ gd.label }}</strong>
                    <span class="stats-pie-cell-sub"
                      >{{ gd.count }} cible{{ gd.count > 1 ? "s" : "" }} • Moy.
                      {{ gd.avg }}</span
                    >
                  </div>
                </div>
                <div class="stats-pie-legend-shared">
                  <div
                    v-for="item in legendItems"
                    :key="item.score"
                    class="stats-pie-legend-item"
                  >
                    <span
                      class="stats-pie-swatch"
                      :style="{ background: item.color }"
                    ></span>
                    <span>{{ item.label }}</span>
                  </div>
                </div>
              </template>
            </div>
          </article>
        </div>
      </div>

      <div v-else class="stats-tab-panel">
        <div class="stats-grid-1">
          <article class="stats-dist-card">
            <span>Axe de progression</span>
            <textarea
              v-model="commentsText"
              class="progression-textarea"
              placeholder="Saisir un axe de progression (max 100 caractères)"
              maxlength="100"
              rows="6"
            ></textarea>
            <small class="char-count-progression"
              ><span>{{ commentsText.length }}</span
              >/100</small
            >
            <div class="modal-actions" style="margin-top: 12px">
              <button class="btn btn-primary" @click="saveComments">
                Valider
              </button>
            </div>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>
