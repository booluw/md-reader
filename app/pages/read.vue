<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { fetchDocument, isAbortError } from '../utils/fetch-document'
import { validateSourceInput } from '../utils/source-url'
import type { RenderResult } from '../utils/markdown'
import type { Source } from '../utils/source'

const route = useRoute()

const documentTitle = ref('md-reader')
const markdown = ref('')
const source = ref<Source | null>(null)
const error = ref('')
const validationError = ref('')
const loading = ref(false)

let controller: AbortController | null = null

useHead(() => ({ title: documentTitle.value }))

function abortInFlight(): void {
  controller?.abort()
  controller = null
}

function resetView(message: string): void {
  abortInFlight()
  loading.value = false
  error.value = ''
  markdown.value = ''
  source.value = null
  documentTitle.value = 'md-reader'
  validationError.value = message
}

async function load(href: string): Promise<void> {
  abortInFlight()
  const active = new AbortController()
  controller = active
  validationError.value = ''
  error.value = ''
  markdown.value = ''
  documentTitle.value = 'md-reader'
  source.value = { kind: 'url', href }
  loading.value = true
  try {
    const result = await fetchDocument(href, active.signal)
    if (active.signal.aborted) return
    if (result.ok) {
      markdown.value = result.text
    } else {
      error.value = result.message
      source.value = null
    }
  } catch (err) {
    if (isAbortError(err)) return
    error.value = 'Something went wrong while reading this file. Try again.'
    source.value = null
  } finally {
    if (controller === active) {
      loading.value = false
    }
  }
}

function startFromQuery(): void {
  const raw = route.query.src
  const value = typeof raw === 'string' ? raw : ''
  if (value === '') {
    resetView('This link is missing a Markdown file URL.')
    return
  }
  const validation = validateSourceInput(value)
  if ('error' in validation) {
    resetView(validation.error)
    return
  }
  void load(validation.href)
}

function onRendered(result: RenderResult): void {
  documentTitle.value = result.title || 'md-reader'
}

watch(
  () => route.query.src,
  () => startFromQuery(),
  { immediate: true }
)

onBeforeUnmount(abortInFlight)
</script>

<template>
  <main>
    <template v-if="validationError">
      <h1>Could not open this file</h1>
      <p role="alert">{{ validationError }}</p>
      <NuxtLink to="/">Back to start</NuxtLink>
    </template>

    <template v-else-if="loading">
      <p role="status">Loading…</p>
    </template>

    <template v-else-if="error">
      <h1>Could not open this file</h1>
      <p role="alert">{{ error }}</p>
      <button type="button" @click="startFromQuery">Retry</button>
      <NuxtLink to="/">Upload instead</NuxtLink>
    </template>

    <MarkdownView
      v-else-if="source"
      :markdown="markdown"
      :source="source"
      @rendered="onRendered"
    />
  </main>
</template>
