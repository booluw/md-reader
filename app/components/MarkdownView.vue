<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { highlightCodeBlocks } from '../utils/highlight'
import { hydrateLocalImages, revokeLocalImages } from '../utils/local-images'
import { render } from '../utils/markdown'
import type { Source } from '../utils/source'
import type { RenderResult } from '../utils/markdown'

const props = defineProps<{
  markdown: string
  source: Source
  files?: Record<string, Blob>
}>()
const emit = defineEmits<{
  rendered: [result: RenderResult]
  missing: [path: string]
  navigate: [href: string]
}>()

const root = ref<HTMLElement | null>(null)
let objectUrls: string[] = []

const isEmpty = computed(() => props.markdown.trim() === '')
const fileSet = computed(() => (props.files ? new Set(Object.keys(props.files)) : undefined))
const result = computed(() => render(props.markdown, props.source, fileSet.value))

watch(result, (value) => emit('rendered', value), { immediate: true })

function refresh(): void {
  const element = root.value
  if (!element) return
  void highlightCodeBlocks(element)
  revokeLocalImages(objectUrls)
  objectUrls = props.files ? hydrateLocalImages(element, props.files) : []
}

function onClick(event: MouseEvent): void {
  const target = event.target as Element | null
  const anchor = target?.closest('a.md-internal')
  if (!(anchor instanceof HTMLAnchorElement)) return
  event.preventDefault()
  const missing = anchor.dataset.mdMissing
  if (missing) {
    emit('missing', missing)
    return
  }
  const href = anchor.getAttribute('href') ?? ''
  if (href !== '') emit('navigate', href)
}

watch(
  () => result.value.html,
  () => {
    void nextTick(refresh)
  }
)

onMounted(() => {
  void nextTick(refresh)
})

onBeforeUnmount(() => revokeLocalImages(objectUrls))
</script>

<template>
  <p v-if="isEmpty">This file is empty</p>
  <article v-else ref="root" class="markdown-body" @click="onClick" v-html="result.html" />
</template>
