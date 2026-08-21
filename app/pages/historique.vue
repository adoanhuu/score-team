<script setup lang="ts">
import type { HistoryEntryRecord } from "~/composables/useDb";
import {
  RULESETS,
  formatHistoryEntryDate,
  formatHistoryEntryTime,
  formatRulesetLabel,
  formatScore,
  normalizeSoloSessionType,
} from "~/utils/scoring-format";

const { list, remove, restoreFromServer } = useHistory();
const { confirmAction } = useConfirm();
const { showFlash } = useFlash();
const { isAuthenticated } = useAuth();
const { isOnline } = useOnline();

const entries = ref<HistoryEntryRecord[]>([]);
const loading = ref(true);
const restoring = ref(false);

const modeFilter = ref("all");
const rulesetFilter = ref("all");
const sessionTypeFilter = ref("all");

const PER_PAGE = 4;
const currentPage = ref(1);

const expandedKey = ref<string | null>(null);

async function refresh() {
  loading.value = true;
  try {
    entries.value = await list();
  } finally {
    loading.value = false;
  }
}

onMounted(refresh);

const filteredEntries = computed(() => {
  return entries.value.filter((entry) => {
    if (modeFilter.value !== "all" && entry.scoringMode !== modeFilter.value)
      return false;
    if (rulesetFilter.value !== "all" && entry.ruleset !== rulesetFilter.value)
      return false;
    if (
      sessionTypeFilter.value !== "all" &&
      normalizeSoloSessionType(entry.soloSessionType) !==
        sessionTypeFilter.value
    ) {
      return false;
    }
    return true;
  });
});

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredEntries.value.length / PER_PAGE)),
);

watch([modeFilter, rulesetFilter, sessionTypeFilter], () => {
  currentPage.value = 1;
});

watch(totalPages, (pages) => {
  if (currentPage.value > pages) currentPage.value = pages;
});

const pageEntries = computed(() => {
  const start = (currentPage.value - 1) * PER_PAGE;
  return filteredEntries.value.slice(start, start + PER_PAGE);
});

function entryKey(entry: HistoryEntryRecord) {
  return entry.archivedAt || entry.generatedAt;
}

function toggleExpanded(entry: HistoryEntryRecord) {
  const key = entryKey(entry);
  expandedKey.value = expandedKey.value === key ? null : key;
}

function modeLabel(value: unknown) {
  if (value === "team") return "Équipe";
  if (value === "individual") return "Individuel";
  if (value === "mixed") return "Mixte";
  return "-";
}

async function onDelete(entry: HistoryEntryRecord) {
  const confirmed = await confirmAction(
    "Confirmer la suppression de ce parcours de l'historique ?",
    "Supprimer",
  );
  if (!confirmed) return;
  await remove(entry.archivedAt || "");
  showFlash("Parcours supprimé.");
  await refresh();
}

async function onRestoreFromServer() {
  if (!isAuthenticated.value) {
    showFlash("Connectez-vous pour synchroniser l'historique avec le serveur.");
    return;
  }
  if (!isOnline.value) {
    showFlash("Connexion Internet requise pour synchroniser avec le serveur.");
    return;
  }
  restoring.value = true;
  try {
    const count = await restoreFromServer();
    if (count === null) {
      showFlash("Échec de la synchronisation.");
      return;
    }
    showFlash(`Historique synchronisé (${count} parcours).`);
    currentPage.value = 1;
    await refresh();
  } finally {
    restoring.value = false;
  }
}
</script>

<template>
  <main class="app">
    <div class="card">
      <div class="setup-head">
        <h2 class="modal-title-with-icon">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M9 2h6v2H9V2Zm3 4a8 8 0 1 0 8 8 8 8 0 0 0-8-8Zm0 14.2A6.2 6.2 0 1 1 18.2 14 6.21 6.21 0 0 1 12 20.2Zm.9-9.8v4l3 1.8-.9 1.5-3.9-2.3V10.4h1.8Z"
              fill="currentColor"
            />
          </svg>
          <span>Historique</span>
        </h2>
        <NuxtLink
          to="/"
          class="btn btn-light btn-icon home-btn"
          aria-label="Retour à l'accueil"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5Z"
              fill="currentColor"
            />
          </svg>
        </NuxtLink>
      </div>

      <div class="history-filters">
        <label>
          Mode
          <select v-model="modeFilter">
            <option value="all">Tous</option>
            <option value="team">Équipe</option>
            <option value="individual">Individuel</option>
            <option value="mixed">Mixte</option>
          </select>
        </label>
        <label>
          Parcours
          <select v-model="rulesetFilter">
            <option value="all">Tous</option>
            <option v-for="ruleset in RULESETS" :key="ruleset" :value="ruleset">
              {{ formatRulesetLabel(ruleset) }}
            </option>
          </select>
        </label>
        <label>
          Type
          <select v-model="sessionTypeFilter">
            <option value="all">Tous</option>
            <option value="training">Entraînement</option>
            <option value="contest">Concours</option>
          </select>
        </label>
      </div>

      <div class="modal-actions" style="margin: 8px 0 12px">
        <button
          class="btn btn-light start-btn"
          :disabled="restoring"
          @click="onRestoreFromServer"
        >
          {{ restoring ? "Synchronisation…" : "Synchroniser avec le serveur" }}
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M12 4V1L8 5l4 4V6a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>

      <p v-if="loading">Chargement…</p>

      <div v-else id="history-list" class="history-list">
        <div v-if="filteredEntries.length === 0" class="history-empty">
          Aucun parcours sauvegardé.
        </div>

        <article
          v-for="entry in pageEntries"
          :key="entryKey(entry)"
          class="history-item"
        >
          <div class="history-item-head">
            <span class="history-date">
              {{ formatHistoryEntryDate(entry) }}
              <template v-if="entry.lieu">
                · <span class="city">{{ entry.lieu }}</span></template
              >
            </span>
            <span class="history-time">{{
              formatHistoryEntryTime(entry)
            }}</span>
          </div>
          <div class="history-item-body">
            <div class="history-item-info">
              <strong class="history-total-score"
                >{{ entry.total ?? 0
                }}<span class="stats-unit">pts</span></strong
              >
              <span class="history-mode">
                {{ formatRulesetLabel(entry.ruleset) }}<br />
                {{ modeLabel(entry.scoringMode)
                }}<template v-if="entry.weapon"> • {{ entry.weapon }}</template>
              </span>
            </div>
            <div class="history-item-actions">
              <button
                class="btn btn-icon history-list-btn"
                aria-label="Détail des volées"
                @click="toggleExpanded(entry)"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    d="M3 4h2v2H3V4Zm4 0h14v2H7V4ZM3 10h2v2H3v-2Zm4 0h14v2H7v-2ZM3 16h2v2H3v-2Zm4 0h14v2H7v-2Z"
                    fill="currentColor"
                  />
                </svg>
              </button>
              <button
                class="btn btn-icon history-delete-btn"
                aria-label="Supprimer"
                @click="onDelete(entry)"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h2v9H7V9Zm4 0h2v9h-2V9Zm4 0h2v9h-2V9ZM6 7h12l-1 14H7L6 7Z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            </div>
          </div>
          <div
            v-if="expandedKey === entryKey(entry)"
            class="history-volley-detail"
          >
            <div class="table-wrap">
              <table class="history-table">
                <thead>
                  <tr>
                    <th>Volée</th>
                    <th>Flèches</th>
                    <th>Groupe</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="volley in entry.volleys || []" :key="volley.index">
                    <td>
                      <span class="volley-pill is-gray">{{
                        volley.index
                      }}</span>
                    </td>
                    <td>
                      {{
                        (volley.arrows || [])
                          .map((a: unknown) => formatScore(a))
                          .join(" / ")
                      }}
                    </td>
                    <td>{{ volley.group || "-" }}</td>
                    <td
                      class="history-total"
                      :class="{
                        success:
                          (volley.total ?? 0) >= (entry.successZone || 0),
                      }"
                    >
                      {{ volley.total ?? 0 }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </article>
      </div>

      <div v-if="!loading && totalPages > 1" class="history-pagination">
        <button
          class="btn btn-light btn-icon pagination-btn"
          :disabled="currentPage <= 1"
          @click="currentPage--"
        >
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path
              d="M15.4 16.6 10.8 12l4.6-4.6L14 6l-6 6 6 6 1.4-1.4Z"
              fill="currentColor"
            />
          </svg>
        </button>
        <span class="pagination-indicator"
          >{{ currentPage }} / {{ totalPages }}</span
        >
        <button
          class="btn btn-light btn-icon pagination-btn"
          :disabled="currentPage >= totalPages"
          @click="currentPage++"
        >
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path
              d="M8.6 16.6l4.6-4.6-4.6-4.6L10 6l6 6-6 6-1.4-1.4Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>
    </div>
  </main>
</template>
