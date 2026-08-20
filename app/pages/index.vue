<script setup lang="ts">
const { user, isAuthenticated, restore, login, logout } = useAuth();
const { isOnline } = useOnline();
const { syncing, lastSyncedAt } = useSync();
const { message: flashMessage, showFlash } = useFlash();

await restore();

const showLoginModal = ref(false);
const loginEmail = ref("");
const loginPassword = ref("");
const loginError = ref("");
const loginLoading = ref(false);

const subtitle = computed(() => {
  if (!isAuthenticated.value || !user.value) return "Non connecté";
  return `Connecté : ${user.value.firstName} ${user.value.lastName}`;
});

function openLogin() {
  loginError.value = "";
  loginEmail.value = "";
  loginPassword.value = "";
  showLoginModal.value = true;
}

function closeLogin() {
  showLoginModal.value = false;
}

async function onLoginSubmit() {
  loginError.value = "";
  loginLoading.value = true;
  try {
    await login(loginEmail.value.trim(), loginPassword.value);
    showLoginModal.value = false;
    showFlash("Connexion réussie.");
  } catch (error: any) {
    loginError.value = error?.message || "Connexion impossible.";
  } finally {
    loginLoading.value = false;
  }
}

async function onLoginTileClick() {
  if (isAuthenticated.value) {
    await logout();
    showFlash("Déconnecté.");
    return;
  }
  openLogin();
}

function onComingSoonTile(label: string) {
  showFlash(
    `« ${label} » sera migré ici prochainement. Utilisez l'application actuelle en attendant.`,
  );
}
</script>

<template>
  <section class="home-screen" role="main" aria-label="Accueil">
    <header class="home-header">
      <span class="home-header-version" aria-label="Statut de connexion">
        {{ isOnline ? "En ligne" : "Hors ligne" }}
        <template v-if="syncing"> · synchronisation…</template>
      </span>
      <div class="home-header-wrapper">
        <img src="/icons/icon.png" alt="Capi Scoring" class="home-logo" />
        <div class="home-header-text">
          <h1 class="home-title">Capi Scoring</h1>
          <div class="home-subtitle-row">
            <p class="home-subtitle">{{ subtitle }}</p>
          </div>
        </div>
      </div>
    </header>

    <nav class="home-nav" aria-label="Menu principal">
      <NuxtLink
        id="home-training-btn"
        class="home-tile"
        to="/mode-solo"
        aria-label="Mode solo structuré"
      >
        <span class="home-tile-label">
          <svg
            class="home-tile-label-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M12 12c2.76 0 5-2.24 5-5S14.76 2 12 2 7 4.24 7 7s2.24 5 5 5Zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5Z"
              fill="currentColor"
            />
          </svg>
          <span>Mode solo</span>
        </span>
      </NuxtLink>

      <button
        id="home-peloton-btn"
        class="home-tile"
        aria-label="Mode Multi"
        @click="onComingSoonTile('Mode Multi')"
      >
        <span class="home-tile-label">
          <svg
            class="home-tile-label-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 1c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5ZM8 13c-2.67 0-8 1.34-8 4v2h7v-2.5c0-.95.37-1.81 1.05-2.56-.02-.3-.03-.6-.05-.94Z"
              fill="currentColor"
            />
          </svg>
          <span>Mode Multi</span>
        </span>
      </button>

      <button
        id="home-contest-btn"
        class="home-tile"
        aria-label="Concours"
        @click="onComingSoonTile('Concours')"
      >
        <span class="home-tile-label">
          <svg
            class="home-tile-label-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <path
              fill="currentColor"
              fill-rule="evenodd"
              d="M5.166 2.621v.858c-1.035.148-2.059.33-3.071.543a.75.75 0 0 0-.584.859 6.753 6.753 0 0 0 6.138 5.6 6.73 6.73 0 0 0 2.743 1.346A6.707 6.707 0 0 1 9.279 15H8.54c-1.036 0-1.875.84-1.875 1.875V19.5h-.75a2.25 2.25 0 0 0-2.25 2.25c0 .414.336.75.75.75h15a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-2.25-2.25h-.75v-2.625c0-1.036-.84-1.875-1.875-1.875h-.739a6.706 6.706 0 0 1-1.112-3.173 6.73 6.73 0 0 0 2.743-1.347 6.753 6.753 0 0 0 6.139-5.6.75.75 0 0 0-.585-.858 47.077 47.077 0 0 0-3.07-.543V2.62a.75.75 0 0 0-.658-.744 49.22 49.22 0 0 0-6.093-.377c-2.063 0-4.096.128-6.093.377a.75.75 0 0 0-.657.744Zm0 2.629c0 1.196.312 2.32.857 3.294A5.266 5.266 0 0 1 3.16 5.337a45.6 45.6 0 0 1 2.006-.343v.256Zm13.5 0v-.256c.674.1 1.343.214 2.006.343a5.265 5.265 0 0 1-2.863 3.207 6.72 6.72 0 0 0 .857-3.294Z"
              clip-rule="evenodd"
            />
          </svg>
          <span>Concours</span>
        </span>
      </button>

      <button
        id="home-training-tile-btn"
        class="home-tile"
        aria-label="Entraînement"
        @click="onComingSoonTile('Entraînement')"
      >
        <span class="home-tile-label">
          <svg
            class="home-tile-label-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M2 8h2v8H2V8Zm3-2h3v12H5V6Zm3 4h8v4H8v-4Zm8-4h3v12h-3V6Zm4 2h2v8h-2V8Z"
              fill="currentColor"
            />
          </svg>
          <span>Entraînement</span>
        </span>
      </button>

      <NuxtLink
        id="home-history-btn"
        class="home-tile"
        to="/historique"
        aria-label="Historique"
      >
        <span class="home-tile-label">
          <svg
            class="home-tile-label-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M9 2h6v2H9V2Zm3 4a8 8 0 1 0 8 8 8 8 0 0 0-8-8Zm0 14.2A6.2 6.2 0 1 1 18.2 14 6.21 6.21 0 0 1 12 20.2Zm.9-9.8v4l3 1.8-.9 1.5-3.9-2.3V10.4h1.8Z"
              fill="currentColor"
            />
          </svg>
          <span>Historique</span>
        </span>
      </NuxtLink>

      <button
        id="home-stats-btn"
        class="home-tile"
        aria-label="Statistiques"
        @click="onComingSoonTile('Statistiques')"
      >
        <span class="home-tile-label">
          <svg
            class="home-tile-label-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M4 19h16v2H4v-2Zm1-2V9h3v8H5Zm5 0V5h3v12h-3Zm5 0v-6h3v6h-3Z"
              fill="currentColor"
            />
          </svg>
          <span>Statistiques</span>
        </span>
      </button>

      <NuxtLink
        id="home-config-btn"
        class="home-tile"
        to="/configuration"
        aria-label="Configuration"
      >
        <span class="home-tile-label">
          <svg
            class="home-tile-label-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.03 7.03 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.58.23-1.13.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.68 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.8 14.52a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.31.6.22l2.39-.96c.5.4 1.05.72 1.63.94l.36 2.54c.04.24.25.42.5.42h3.84c.25 0 .46-.18.5-.42l.36-2.54c.58-.23 1.13-.54 1.63-.94l2.39.96c.22.09.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z"
              fill="currentColor"
            />
          </svg>
          <span>Configuration</span>
        </span>
      </NuxtLink>

      <button
        id="home-login-btn"
        class="home-tile"
        :class="{ 'is-logged-in': isAuthenticated }"
        :aria-label="isAuthenticated ? 'Déconnexion' : 'Connexion'"
        @click="onLoginTileClick"
      >
        <span class="home-tile-label">
          <svg
            class="home-tile-label-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M17 9h-1V6.5a4 4 0 1 0-8 0V9H7a2 2 0 0 0-2 2v8a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-8a2 2 0 0 0-2-2ZM10 9V6.5a2 2 0 1 1 4 0V9h-4Zm2 9a1.8 1.8 0 0 1-.9-3.35V14a.9.9 0 0 1 1.8 0v.65A1.8 1.8 0 0 1 12 18Z"
              fill="currentColor"
            />
          </svg>
          <span>{{ isAuthenticated ? "Déconnexion" : "Connexion" }}</span>
        </span>
      </button>
    </nav>
  </section>

  <section
    v-if="showLoginModal"
    id="login-modal"
    class="modal"
    role="dialog"
    aria-modal="true"
    aria-labelledby="login-modal-title"
  >
    <div class="modal-overlay" @click="closeLogin"></div>
    <div class="modal-card login-modal-card">
      <div class="modal-head">
        <h3 id="login-modal-title" class="modal-title-with-icon">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M17 9h-1V6.5a4 4 0 1 0-8 0V9H7a2 2 0 0 0-2 2v8a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-8a2 2 0 0 0-2-2ZM10 9V6.5a2 2 0 1 1 4 0V9h-4Zm2 9a1.8 1.8 0 0 1-.9-3.35V14a.9.9 0 0 1 1.8 0v.65A1.8 1.8 0 0 1 12 18Z"
              fill="currentColor"
            />
          </svg>
          <span>Connexion</span>
        </h3>
        <button
          class="btn btn-light btn-icon"
          aria-label="Fermer connexion"
          @click="closeLogin"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>
      <form class="login-form" novalidate @submit.prevent="onLoginSubmit">
        <label>
          Identifiant
          <input
            v-model="loginEmail"
            type="email"
            inputmode="email"
            autocomplete="username"
            placeholder="email@exemple.com"
            required
          />
        </label>
        <label>
          Mot de passe
          <input
            v-model="loginPassword"
            type="password"
            autocomplete="current-password"
            placeholder="Votre mot de passe"
            required
          />
        </label>
        <div v-if="loginError" class="login-feedback" role="alert">
          {{ loginError }}
        </div>
        <button
          type="submit"
          class="btn btn-primary btn-icon login-submit-btn"
          :disabled="loginLoading"
          aria-label="Se connecter"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M17 9h-1V6.5a4 4 0 1 0-8 0V9H7a2 2 0 0 0-2 2v8a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-8a2 2 0 0 0-2-2ZM10 9V6.5a2 2 0 1 1 4 0V9h-4Zm2 9a1.8 1.8 0 0 1-.9-3.35V14a.9.9 0 0 1 1.8 0v.65A1.8 1.8 0 0 1 12 18Z"
              fill="currentColor"
            />
          </svg>
          <span>{{ loginLoading ? "Connexion…" : "Se connecter" }}</span>
        </button>
      </form>
    </div>
  </section>
</template>
