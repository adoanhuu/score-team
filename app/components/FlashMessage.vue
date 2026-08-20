<script setup lang="ts">
const { message } = useFlash();
</script>

<template>
  <div
    v-if="message"
    id="flash-info"
    class="flash-info"
    role="status"
    aria-live="polite"
  >
    {{ message }}
  </div>
</template>
