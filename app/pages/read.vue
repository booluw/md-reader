<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { getBundle } from '../utils/bundle'
import { fetchDocument, isAbortError } from '../utils/fetch-document'
import { validateSourceInput } from '../utils/source-url'
import {
  LOCAL_UPLOAD_MISSING_MESSAGE,
  describeSkips,
  isMarkdownFile,
  missingBundleFile
} from '../utils/upload'
import type { RenderResult } from '../utils/markdown'
import type { Source } from '../utils/source'

const route = useRoute()

const documentTitle = ref('md-reader')
const markdown = ref('')
const source = ref<Source | null>(null)
const error = ref('')
const validationError = ref('')
const loading = ref(false)

const localId = ref('')
const localName = ref('')
const skippedLines = ref<string[]>([])
const fileList = ref<string[]>([])

let controller: AbortController | null = null

useHead(() => ({ title: documentTitle.value }))

function abortInFlight(): void {
  controller?.abort()
  controller = null
}

function resetLocal(): void {
  localId.value = ''
  localName.value = ''
  skippedLines.value = []
  fileList.value = []
}

function resetView(message: string): void {
  abortInFlight()
  loading.value = false
  error.value = ''
  markdown.value = ''
  source.value = null
  documentTitle.value = 'md-reader'
  validationError.value = message
  resetLocal()
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

async function openLocal(bundleId: string, path: string): Promise<void> {
  abortInFlight()
  resetLocal()
  validationError.value = ''
  error.value = ''
  markdown.value = ''
  loading.value = false

  const bundle = getBundle(bundleId)
  if (!bundle) {
    resetView(LOCAL_UPLOAD_MISSING_MESSAGE)
    return
  }
  localId.value = bundleId
  localName.value = bundle.name
  skippedLines.value = describeSkips(bundle.skipped)
  fileList.value = Object.keys(bundle.files).filter(isMarkdownFile).sort()

  if (path === '') {
    documentTitle.value = bundle.name
    return
  }

  const blob = bundle.files[path]
  if (!blob) {
    resetView(missingBundleFile(path))
    return
  }
  loading.value = true
  try {
    markdown.value = await blob.text()
    source.value = { kind: 'local', bundleId, path }
  } catch {
    resetView('Something went wrong while reading this file.')
  } finally {
    loading.value = false
  }
}

function startFromQuery(): void {
  const local = route.query.local
  if (typeof local === 'string' && local !== '') {
    const path = typeof route.query.path === 'string' ? route.query.path : ''
    void openLocal(local, path)
    return
  }
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
  () => [route.query.local, route.query.src, route.query.path],
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

    <template v-else-if="localId && !source">
      <template v-if="fileList.length > 0">
        <h1>{{ localName }}</h1>
        <p v-if="skippedLines.length > 0" role="status">
          <template v-for="line in skippedLines" :key="line">
            <span>{{ line }}</span><br>
          </template>
        </p>
        <ul>
          <li v-for="path in fileList" :key="path">
            <NuxtLink :to="{ path: '/read', query: { local: localId, path } }">{{ path }}</NuxtLink>
          </li>
        </ul>
      </template>
      <p v-else>This folder has no Markdown files.</p>
    </template>

    <template v-else-if="source">
      <p v-if="skippedLines.length > 0" role="status">
        <template v-for="line in skippedLines" :key="line">
          <span>{{ line }}</span><br>
        </template>
      </p>
      <MarkdownView
        :markdown="markdown"
        :source="source"
        @rendered="onRendered"
      />
    </template>
  </main>
</template>