<script setup lang="ts">
import { computed } from 'vue'
import type { Heading } from '../utils/markdown'

const props = defineProps<{
  headings: Heading[]
  activeId?: string
}>()

const minLevel = computed(() =>
  props.headings.reduce((min, heading) => Math.min(min, heading.level), 6)
)

function indent(level: number): string {
  return `${(level - minLevel.value) * 0.75}rem`
}
</script>

<template>
  <nav class="toc" aria-label="Table of contents">
    <ul class="toc-list">
      <li
        v-for="heading in headings"
        :key="heading.id"
        :style="{ paddingLeft: indent(heading.level) }"
      >
        <a
          :href="`#${heading.id}`"
          :aria-current="heading.id === activeId ? 'true' : undefined"
        >{{ heading.text }}</a>
      </li>
    </ul>
  </nav>
</template>
