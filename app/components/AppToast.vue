<script setup lang="ts">
import { useToast } from '../composables/useToast'

const { message } = useToast()
</script>

<template>
  <div class="app-toast" role="status" aria-live="polite">
    <template v-if="message">{{ message }}</template>
  </div>
</template>
