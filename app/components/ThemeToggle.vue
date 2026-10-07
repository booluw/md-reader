<script setup lang="ts">
import { useTheme } from '../composables/useTheme'

const { resolvedTheme, toggleTheme } = useTheme()
</script>

<template>
  <button
    type="button"
    class="icon-button"
    :aria-label="resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
    @click="toggleTheme"
  >
    <span aria-hidden="true">{{ resolvedTheme === 'dark' ? '☀' : '☾' }}</span>
  </button>
</template>
