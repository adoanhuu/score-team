<script setup lang="ts">
import { formatRulesetLabel } from "~/utils/scoring-format";

const { config, load, save, pushToServer, pullFromServer, syncing } =
  useConfig();
const { list: listHistory } = useHistory();
const { confirmAction } = useConfirm();
const { showFlash } = useFlash();
const { isAuthenticated } = useAuth();
const { isOnline } = useOnline();

const loading = ref(true);
const saving = ref(false);
const restoring = ref(false);
const importInput = ref<HTMLInputElement | null>(null);

onMounted(async () => {
  await load();
  loading.value = false;
});

const SLIDER_MAX = 21;

const FFTA_RULESETS = ["nature", "campagne", "3d"];
const FFTL_RULESETS = ["3d2", "3dh", "ar", "field"];

function rangeProgress(value: number, min = 0, max = SLIDER_MAX) {
  const span = max - min;
  const pct = span > 0 ? ((value - min) / span) * 100 : 0;
  return `${Math.min(100, Math.max(0, pct))}%`;
}

const fftaAllChecked = computed(() =>
  FFTA_RULESETS.every((r) => config.value.enabledRulesets.includes(r)),
);
const fftaSomeChecked = computed(() =>
  FFTA_RULESETS.some((r) => config.value.enabledRulesets.includes(r)),
);
const fftlAllChecked = computed(() =>
  FFTL_RULESETS.every((r) => config.value.enabledRulesets.includes(r)),
);
const fftlSomeChecked = computed(() =>
  FFTL_RULESETS.some((r) => config.value.enabledRulesets.includes(r)),
);

function isRulesetChecked(ruleset: string) {
  return config.value.enabledRulesets.includes(ruleset);
}

async function toggleRuleset(ruleset: string, checked: boolean) {
  const next = new Set(config.value.enabledRulesets);
  if (checked) next.add(ruleset);
  else next.delete(ruleset);
  config.value = { ...config.value, enabledRulesets: [...next] };
  await save();
}

async function toggleFederation(rulesets: string[], checked: boolean) {
  const next = new Set(config.value.enabledRulesets);
  rulesets.forEach((r) => (checked ? next.add(r) : next.delete(r)));
  config.value = { ...config.value, enabledRulesets: [...next] };
  await save();
}

async function updateSlider(field: keyof typeof config.value, value: number) {
  config.value = { ...config.value, [field]: value };
  await save();
}

function exportHistory() {
  listHistory().then((entries) => {
    if (entries.length === 0) {
      showFlash("Aucun parcours à exporter.");
      return;
    }
    const blob = new Blob([JSON.stringify(entries, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `score-team-history-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showFlash(`${entries.length} parcours exporté(s).`);
  });
}

function triggerImport() {
  importInput.value?.click();
}

async function onImportFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const imported = JSON.parse(text);
    if (!Array.isArray(imported)) {
      showFlash("Format invalide : le fichier doit contenir un tableau.");
      return;
    }
    const valid = imported.filter(
      (item) => item && typeof item === "object" && item.generatedAt,
    );
    if (valid.length === 0) {
      showFlash("Aucun parcours valide trouvé dans le fichier.");
      return;
    }
    await useDb().historyEntries.bulkAdd(
      valid.map((entry) => ({ ...entry, dirty: 1 as const })),
    );
    showFlash(`${valid.length} parcours importé(s).`);
  } catch {
    showFlash("Erreur lors de la lecture du fichier.");
  } finally {
    if (importInput.value) importInput.value.value = "";
  }
}

async function onSaveToServer() {
  saving.value = true;
  try {
    const ok = await pushToServer();
    showFlash(
      ok
        ? "Configuration sauvegardée."
        : "Échec de la sauvegarde de la configuration.",
    );
  } finally {
    saving.value = false;
  }
}

async function onRestoreFromServer() {
  const confirmed = await confirmAction(
    "Restaurer la configuration depuis le serveur ? Les données locales seront remplacées.",
    "Restaurer",
  );
  if (!confirmed) return;
  restoring.value = true;
  try {
    const ok = await pullFromServer();
    showFlash(
      ok
        ? "Configuration restaurée."
        : "Échec de la restauration de la configuration.",
    );
  } finally {
    restoring.value = false;
  }
}
</script>

<template>
  <main class="app">
    <div class="card">
      <div class="modal-head">
        <h2 class="modal-title-with-icon">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M19.14 12.94a7.07 7.07 0 0 0 .06-.94 7.07 7.07 0 0 0-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.04 7.04 0 0 0-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.48.41l-.36 2.54a7.04 7.04 0 0 0-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87a.48.48 0 0 0 .12.61l2.03 1.58a7.07 7.07 0 0 0-.06.94c0 .32.02.64.06.94L2.86 14.5a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.04.7 1.62.94l.36 2.54c.05.24.26.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54a7.04 7.04 0 0 0 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.03-1.56ZM12 15.6A3.6 3.6 0 1 1 15.6 12 3.6 3.6 0 0 1 12 15.6Z"
              fill="currentColor"
            />
          </svg>
          <span>Configuration</span>
        </h2>
        <NuxtLink
          to="/"
          class="btn btn-light btn-icon"
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

      <p v-if="loading">Chargement…</p>

      <template v-else>
        <div class="config-form">
          <h4 class="config-history-title">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8Zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6Zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4Zm0-6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"
                fill="currentColor"
              />
            </svg>
            Mes objectifs
          </h4>
          <fieldset class="config-section">
            <legend class="config-section-legend">Équipe</legend>
            <div class="config-field">
              <label for="config-full-target-team">
                Nombre de pleins <strong>{{ config.fullTarget_team }}</strong>
              </label>
              <div class="config-input-row">
                <input
                  id="config-full-target-team"
                  type="range"
                  min="0"
                  :max="SLIDER_MAX"
                  step="1"
                  :value="config.fullTarget_team"
                  :style="{
                    '--range-progress': rangeProgress(config.fullTarget_team),
                  }"
                  @input="
                    updateSlider(
                      'fullTarget_team',
                      Number(($event.target as HTMLInputElement).value),
                    )
                  "
                />
              </div>
            </div>
            <div class="config-field">
              <label for="config-miss-limit-team">
                Nombre de pailles <strong>{{ config.missLimit_team }}</strong>
              </label>
              <div class="config-input-row">
                <input
                  id="config-miss-limit-team"
                  type="range"
                  min="0"
                  :max="SLIDER_MAX"
                  step="1"
                  :value="config.missLimit_team"
                  :style="{
                    '--range-progress': rangeProgress(config.missLimit_team),
                  }"
                  @input="
                    updateSlider(
                      'missLimit_team',
                      Number(($event.target as HTMLInputElement).value),
                    )
                  "
                />
              </div>
            </div>
          </fieldset>
          <fieldset class="config-section">
            <legend class="config-section-legend">Mode solo</legend>
            <div class="config-field">
              <label for="config-full-target-indiv">
                Nombre de pleins
                <strong>{{ config.fullTarget_individual }}</strong>
              </label>
              <div class="config-input-row">
                <input
                  id="config-full-target-indiv"
                  type="range"
                  min="0"
                  :max="SLIDER_MAX"
                  step="1"
                  :value="config.fullTarget_individual"
                  :style="{
                    '--range-progress': rangeProgress(
                      config.fullTarget_individual,
                    ),
                  }"
                  @input="
                    updateSlider(
                      'fullTarget_individual',
                      Number(($event.target as HTMLInputElement).value),
                    )
                  "
                />
              </div>
            </div>
            <div class="config-field">
              <label for="config-miss-limit-indiv">
                Nombre de pailles
                <strong>{{ config.missLimit_individual }}</strong>
              </label>
              <div class="config-input-row">
                <input
                  id="config-miss-limit-indiv"
                  type="range"
                  min="0"
                  :max="SLIDER_MAX"
                  step="1"
                  :value="config.missLimit_individual"
                  :style="{
                    '--range-progress': rangeProgress(
                      config.missLimit_individual,
                    ),
                  }"
                  @input="
                    updateSlider(
                      'missLimit_individual',
                      Number(($event.target as HTMLInputElement).value),
                    )
                  "
                />
              </div>
            </div>
          </fieldset>
        </div>

        <div class="config-form config-form-rulesets">
          <h4 class="config-history-title">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm2 14h-3v3h-2v-3H8v-2h3v-3h2v3h3v2Zm-2-7V3.5L18.5 8H14Z"
                fill="currentColor"
              />
            </svg>
            Parcours à afficher
          </h4>
          <div class="config-rulesets-row">
            <fieldset class="config-section">
              <legend class="config-section-legend">
                <label class="config-fed-label">
                  <input
                    type="checkbox"
                    :checked="fftaAllChecked"
                    :indeterminate="fftaSomeChecked && !fftaAllChecked"
                    @change="
                      toggleFederation(
                        FFTA_RULESETS,
                        ($event.target as HTMLInputElement).checked,
                      )
                    "
                  />
                  FFTA
                </label>
              </legend>
              <div class="config-ruleset-group">
                <label
                  v-for="ruleset in FFTA_RULESETS"
                  :key="ruleset"
                  class="config-ruleset-label"
                >
                  <input
                    type="checkbox"
                    class="config-ruleset-cb"
                    :checked="isRulesetChecked(ruleset)"
                    @change="
                      toggleRuleset(
                        ruleset,
                        ($event.target as HTMLInputElement).checked,
                      )
                    "
                  />
                  {{ formatRulesetLabel(ruleset) }}
                </label>
              </div>
            </fieldset>
            <fieldset class="config-section">
              <legend class="config-section-legend">
                <label class="config-fed-label">
                  <input
                    type="checkbox"
                    :checked="fftlAllChecked"
                    :indeterminate="fftlSomeChecked && !fftlAllChecked"
                    @change="
                      toggleFederation(
                        FFTL_RULESETS,
                        ($event.target as HTMLInputElement).checked,
                      )
                    "
                  />
                  FFTL
                </label>
              </legend>
              <div class="config-ruleset-group">
                <label
                  v-for="ruleset in FFTL_RULESETS"
                  :key="ruleset"
                  class="config-ruleset-label"
                >
                  <input
                    type="checkbox"
                    class="config-ruleset-cb"
                    :checked="isRulesetChecked(ruleset)"
                    @change="
                      toggleRuleset(
                        ruleset,
                        ($event.target as HTMLInputElement).checked,
                      )
                    "
                  />
                  {{ formatRulesetLabel(ruleset) }}
                </label>
              </div>
            </fieldset>
          </div>
        </div>

        <div class="config-history-actions">
          <h4 class="config-history-title">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-4-4Zm-5 16a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm3-10H5V5h10v4Z"
                fill="currentColor"
              />
            </svg>
            Sauvegarde de l'historique
          </h4>
          <button
            v-if="!isAuthenticated"
            class="btn btn-light btn-icon config-action-btn"
            aria-label="Exporter l'historique"
            @click="exportHistory"
          >
            <span>Exporter</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M11 3h2v9l3-3 1.4 1.4L12 16l-5.4-5.6L8 9l3 3V3ZM4 18h16v3H4v-3Z"
                fill="currentColor"
              />
            </svg>
          </button>
          <button
            v-if="!isAuthenticated"
            class="btn btn-light btn-icon config-action-btn"
            aria-label="Importer l'historique"
            @click="triggerImport"
          >
            <span>Importer</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M11 16h2V7l3 3 1.4-1.4L12 3 6.6 8.6 8 10l3-3v9ZM4 18h16v3H4v-3Z"
                fill="currentColor"
              />
            </svg>
          </button>
          <button
            v-if="isAuthenticated"
            class="btn btn-light btn-icon config-action-btn"
            aria-label="Sauvegarder la configuration sur le serveur"
            :disabled="saving || !isOnline"
            @click="onSaveToServer"
          >
            <span>{{ saving ? "Sauvegarde…" : "Sauvegarder" }}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-4-4Zm-5 16a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm3-10H5V5h10v4Z"
                fill="currentColor"
              />
            </svg>
          </button>
          <button
            v-if="isAuthenticated"
            class="btn btn-light btn-icon config-action-btn"
            aria-label="Restaurer la configuration depuis le serveur"
            :disabled="restoring || !isOnline"
            @click="onRestoreFromServer"
          >
            <span>{{ restoring ? "Restauration…" : "Restaurer" }}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6a7 7 0 1 1 2.05 4.95L6.64 18.36A9 9 0 1 0 13 3Z"
                fill="currentColor"
              />
            </svg>
          </button>
          <input
            ref="importInput"
            type="file"
            accept=".json"
            class="hidden"
            @change="onImportFileChange"
          />
        </div>
      </template>
    </div>
  </main>
</template>
