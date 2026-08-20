<script setup lang="ts">
const { isAuthenticated } = useAuth();
const { showFlash } = useFlash();
const contest = useContest();

type ContestTab = "info" | "scores" | "ranking" | "stats";
const tab = ref<ContestTab>("info");

onMounted(async () => {
  if (!isAuthenticated.value) {
    showFlash("Connectez-vous pour accéder aux concours.");
    await navigateTo("/");
    return;
  }
  await contest.fetchCurrent();
});

function formatContestDateTime(value: string | undefined) {
  const raw = (value || "").trim();
  if (!raw) return { date: "--/--/----", time: "--:--" };
  const isoMatch = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/,
  );
  if (isoMatch) {
    const [, yyyy, mm, dd, hh = "--", mi = "--"] = isoMatch;
    return { date: `${dd}/${mm}/${yyyy}`, time: `${hh}:${mi}` };
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return { date: raw, time: "--:--" };
  return {
    date: parsed.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    time: parsed.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

const startDateTime = computed(() =>
  formatContestDateTime(contest.detail.value?.startDate),
);
const endDateTime = computed(() =>
  formatContestDateTime(contest.detail.value?.endDate),
);
const qrCodeSrc = computed(() => {
  const uuid = contest.detail.value?.uuid;
  return uuid
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(uuid)}`
    : "";
});

function archerLabel(participant: {
  first_name: string;
  last_name: string;
  weapon: string;
}) {
  const firstName = (participant.first_name || "").trim();
  const lastName = (participant.last_name || "").trim();
  const weapon = (participant.weapon || "").trim();
  const initials = firstName
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
  const name = [lastName.toUpperCase() || "-", initials]
    .filter(Boolean)
    .join(" ");
  return weapon && weapon !== "-" ? `${weapon} - ${name}` : name;
}
</script>

<template>
  <main class="app">
    <section class="card">
      <div class="setup-head">
        <h2 class="modal-title-with-icon">
          <span
            >Concours{{
              contest.detail.value ? ` — ${contest.detail.value.name}` : ""
            }}</span
          >
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

      <p v-if="contest.loading.value">Chargement du concours...</p>
      <p v-else-if="contest.error.value && !contest.detail.value">
        {{ contest.error.value }}
      </p>

      <template v-else-if="contest.detail.value">
        <div class="contest-info-panel">
          <div class="contest-info-card">
            <div class="contest-info-list">
              <div class="contest-info-row">
                <span>{{ contest.detail.value.name }}</span>
              </div>
              <div class="contest-info-row">
                <span>{{ startDateTime.date }} - {{ startDateTime.time }}</span>
              </div>
              <div class="contest-info-row">
                <span>{{ endDateTime.date }} - {{ endDateTime.time }}</span>
              </div>
              <div class="contest-info-row">
                <span
                  >{{ contest.detail.value.totalUsers }}/{{
                    contest.detail.value.maxUsers
                  }}</span
                >
              </div>
            </div>
            <div v-if="qrCodeSrc" class="contest-qr-block">
              <img
                class="contest-qr-image"
                :src="qrCodeSrc"
                alt="QR code du concours"
                loading="lazy"
              />
              <div class="contest-qr-caption">
                {{ contest.detail.value.uuid }}
              </div>
            </div>
          </div>
          <div class="contest-info-actions">
            <button
              class="btn btn-light contest-scores-btn"
              type="button"
              @click="tab = 'scores'"
            >
              <span>Scores</span>
            </button>
            <button
              class="btn btn-light contest-scores-btn"
              type="button"
              @click="tab = 'ranking'"
            >
              <span>Classement</span>
            </button>
            <button
              class="btn btn-light contest-scores-btn"
              type="button"
              @click="tab = 'stats'"
            >
              <span>Statistiques</span>
            </button>
          </div>
        </div>

        <!-- Scores (participants) -->
        <div v-if="tab === 'scores'" class="contest-participants-block">
          <h4 class="contest-participants-title">Participants</h4>
          <div
            class="contest-participants-grid"
            role="table"
            aria-label="Liste des participants au concours"
          >
            <div
              class="contest-participant-row contest-participant-row-head"
              role="row"
            >
              <div class="contest-participant-cell" role="columnheader">
                Archer
              </div>
              <div
                class="contest-participant-cell contest-participant-cell-number"
                role="columnheader"
              >
                Cible
              </div>
              <div
                class="contest-participant-cell contest-participant-cell-number"
                role="columnheader"
              >
                Score
              </div>
            </div>
            <div
              v-for="participant in contest.detail.value.participants"
              :key="`${participant.user_id}`"
              class="contest-participant-row"
              role="row"
            >
              <div class="contest-participant-cell" role="cell">
                {{ archerLabel(participant) }}
              </div>
              <div
                class="contest-participant-cell contest-participant-cell-number"
                role="cell"
              >
                {{ participant.target_number }}
              </div>
              <div
                class="contest-participant-cell contest-participant-cell-number"
                role="cell"
              >
                {{ participant.total_score }}
              </div>
            </div>
            <div
              v-if="!contest.detail.value.participants.length"
              class="contest-participant-empty"
            >
              Aucun participant pour le moment.
            </div>
          </div>
        </div>

        <!-- Classement -->
        <div v-if="tab === 'ranking'" class="contest-participants-block">
          <h4 class="contest-participants-title">Classement</h4>
          <div
            class="contest-participants-grid"
            role="table"
            aria-label="Classement du concours"
          >
            <div
              class="contest-participant-row contest-participant-row-head contest-ranking-row"
              role="row"
            >
              <div
                class="contest-participant-cell contest-participant-cell-number"
                role="columnheader"
              >
                #
              </div>
              <div class="contest-participant-cell" role="columnheader">
                Archer
              </div>
              <div
                class="contest-participant-cell contest-participant-cell-number"
                role="columnheader"
              >
                Cible
              </div>
              <div
                class="contest-participant-cell contest-participant-cell-number"
                role="columnheader"
              >
                Score
              </div>
            </div>
            <div
              v-for="(participant, index) in contest.ranking.value"
              :key="`${index}-${participant.archerLabel}`"
              class="contest-participant-row contest-ranking-row"
              role="row"
            >
              <div
                class="contest-participant-cell contest-participant-cell-number"
                role="cell"
              >
                {{ index + 1 }}
              </div>
              <div class="contest-participant-cell" role="cell">
                {{ participant.archerLabel }}
              </div>
              <div
                class="contest-participant-cell contest-participant-cell-number"
                role="cell"
              >
                {{ participant.targetNumber }}
              </div>
              <div
                class="contest-participant-cell contest-participant-cell-number"
                role="cell"
              >
                {{ participant.totalScore }}
              </div>
            </div>
            <div
              v-if="!contest.ranking.value.length"
              class="contest-participant-empty"
            >
              Aucun classement disponible pour le moment.
            </div>
          </div>
        </div>

        <!-- Statistiques -->
        <div v-if="tab === 'stats'">
          <div class="stats-grid-2 contest-stats-grid">
            <article>
              <span>Archers</span>
              <strong>{{ contest.stats.value.participantCount }}</strong>
            </article>
            <article>
              <span>Score moyen</span>
              <strong
                >{{ contest.stats.value.averageScore.toFixed(1)
                }}<span class="stats-unit">pts</span></strong
              >
            </article>
          </div>
          <div class="stats-grid-2 stats-extra-row contest-stats-grid">
            <article>
              <span>Score cumulé</span>
              <strong
                >{{ contest.stats.value.cumulativeScore
                }}<span class="stats-unit">pts</span></strong
              >
            </article>
            <article>
              <span>Cible moyenne</span>
              <strong>{{
                contest.stats.value.averageTarget.toFixed(1)
              }}</strong>
            </article>
          </div>
          <div class="stats-grid-2 stats-extra-row contest-stats-grid">
            <article>
              <span>Meilleur score</span>
              <strong
                >{{ contest.stats.value.bestScore
                }}<span class="stats-unit">pts</span></strong
              >
              <small class="general-stats-meta">{{
                contest.stats.value.bestParticipantLabel
              }}</small>
            </article>
            <article>
              <span>Quota rempli</span>
              <strong
                >{{ contest.stats.value.totalUsers }}/{{
                  contest.stats.value.maxUsers
                }}</strong
              >
            </article>
          </div>
        </div>
      </template>

      <p v-else>
        Aucun concours actif pour le moment. Rejoignez-en un depuis « Mode Multi
        ».
      </p>
    </section>
  </main>
</template>
