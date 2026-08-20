<script setup lang="ts">
const { confirmState, resolveConfirm } = useConfirm();
</script>

<template>
  <section
    v-if="confirmState.visible"
    id="confirm-modal"
    class="modal"
    role="dialog"
    aria-modal="true"
    aria-labelledby="confirm-modal-title"
  >
    <div class="modal-overlay" @click="resolveConfirm(false)"></div>
    <div class="modal-card confirm-modal-card">
      <div class="modal-head">
        <h3 id="confirm-modal-title">Confirmation</h3>
      </div>
      <p class="confirm-modal-message">{{ confirmState.message }}</p>
      <div class="confirm-modal-actions">
        <button class="btn btn-light" @click="resolveConfirm(false)">
          Annuler
        </button>
        <button class="btn btn-danger" @click="resolveConfirm(true)">
          {{ confirmState.confirmLabel }}
        </button>
      </div>
    </div>
  </section>
</template>
