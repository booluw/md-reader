<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { highlightCodeBlocks } from '../utils/highlight'
import { render } from '../utils/markdown'
import type { Source } from '../utils/source'
import type { RenderResult } from '../utils/markdown'

const props = defineProps<{ markdown: string; source: Source }>()
const emit = defineEmits<{ rendered: [result: RenderResult] }>()

const root = ref<HTMLElement | null>(null)
const isEmpty = computed(() => props.markdown.trim() === '')
const result = computed(() => render(props.markdown, props.source))

watch(result, (value) => emit('rendered', value), { immediate: true })

onMounted(() => {
  if (root.value) void highlightCodeBlocks(root.value)
})
</script>

<template>
  <p v-if="isEmpty">This file is empty</p>
  <article v-else ref="root" class="markdown-body" v-html="result.html" />
</template>
