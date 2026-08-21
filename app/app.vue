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

// Clicking the dimmed overlay behind a page-popin (the padding area of the
// fixed `.app` container, outside its card content) closes it and returns
// to the home screen, same behavior as clicking the login popin's overlay.
function onDocumentClick(event: MouseEvent) {
  if (isHomeRoute.value) return;
  const target = event.target as HTMLElement | null;
  if (target?.classList.contains("app")) {
    navigateTo("/");
  }
}

onMounted(() => {
  document.addEventListener("click", onDocumentClick);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", onDocumentClick);
});
</script>

<template>
  <div :inert="!isHomeRoute" :aria-hidden="!isHomeRoute">
    <HomeScreen />
  </div>
  <NuxtPage />
  <ConfirmModal />
  <FlashMessage />
</template>
