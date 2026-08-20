<script setup lang="ts">
// The home screen stays mounted at all times: it acts as a dimmed
// background layer behind whichever page (mode-solo, mode-multi,
// historique, etc.) is currently open, so those pages behave like a
// popin over the home screen instead of fully replacing it.
const route = useRoute();
const isHomeRoute = computed(() => route.path === "/");

watch(
  isHomeRoute,
  (isHome) => {
    if (!import.meta.client) return;
    document.body.classList.toggle("home-underlay-active", !isHome);
  },
  { immediate: true },
);
</script>

<template>
  <div :inert="!isHomeRoute" :aria-hidden="!isHomeRoute">
    <HomeScreen />
  </div>
  <NuxtPage />
  <ConfirmModal />
  <FlashMessage />
</template>
