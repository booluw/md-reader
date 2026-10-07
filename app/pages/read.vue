<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { loadBundle } from '../utils/bundle-store'
import { fetchDocument, isAbortError } from '../utils/fetch-document'
import {
  recordScrollPosition,
  restoreScrollPosition,
  scrollToHash
} from '../utils/scroll-restoration'
import { validateSourceInput } from '../utils/source-url'
import { sourceBreadcrumb, sourceFilename } from '../utils/source'
import { buildShareUrl } from '../utils/share'
import { useActiveHeading } from '../composables/useActiveHeading'
import {
  LOCAL_UPLOAD_MISSING_MESSAGE,
  describeSkips,
  isMarkdownFile,
  missingBundleFile
} from '../utils/upload'
import type { Heading, RenderResult } from '../utils/markdown'
import type { Source } from '../utils/source'

const route = useRoute()
const router = useRouter()

const documentTitle = ref('md-reader')
const markdown = ref('')
const source = ref<Source | null>(null)
const error = ref('')
const validationError = ref('')
const linkError = ref('')
const loading = ref(false)

const localId = ref('')
const localName = ref('')
const skippedLines = ref<string[]>([])
const fileList = ref<string[]>([])
const fileMap = ref<Record<string, Blob>>({})
const headings = ref<Heading[]>([])

const breadcrumb = computed(() => (source.value ? sourceBreadcrumb(source.value) : []))
const activePath = computed(() => (source.value?.kind === 'local' ? source.value.path : ''))
const isLocal = computed(() => source.value?.kind === 'local')
const sourceLabel = computed(() => (source.value ? sourceFilename(source.value) : ''))
const headingsEnabled = computed(() => source.value !== null && headings.value.length > 0)
const { activeId } = useActiveHeading(headings, headingsEnabled)

const origin = typeof window === 'undefined' ? '' : window.location.origin
const shareUrl = computed(() =>
  source.value ? buildShareUrl(origin, source.value, activeId.value) : ''
)

let controller: AbortController | null = null
let generation = 0
let ready = false

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
  fileMap.value = {}
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

  const bundle = await loadBundle(bundleId)
  if (!bundle) {
    resetView(LOCAL_UPLOAD_MISSING_MESSAGE)
    return
  }
  localId.value = bundleId
  localName.value = bundle.name
  skippedLines.value = describeSkips(bundle.skipped)
  fileList.value = Object.keys(bundle.files).filter(isMarkdownFile).sort()
  fileMap.value = bundle.files

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

function beginNavigation(): number {
  generation += 1
  ready = false
  linkError.value = ''
  headings.value = []
  window.scrollTo(0, 0)
  return generation
}

async function settleScroll(gen: number): Promise<void> {
  const hash = route.hash
  await nextTick()
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  if (gen !== generation) return
  if (hash === '') {
    restoreScrollPosition(route.fullPath)
  } else {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (gen !== generation || scrollToHash(hash)) break
      await nextTick()
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    }
  }
  if (gen !== generation) return
  ready = true
}

function onScroll(): void {
  if (ready) recordScrollPosition(route.fullPath, window.scrollY)
}

function onMissingLink(path: string): void {
  linkError.value = missingBundleFile(path)
}

function onNavigate(href: string): void {
  void router.push(href)
}

async function startFromQuery(): Promise<void> {
  const gen = beginNavigation()
  const local = route.query.local
  if (typeof local === 'string' && local !== '') {
    const path = typeof route.query.path === 'string' ? route.query.path : ''
    await openLocal(local, path)
    await settleScroll(gen)
    return
  }
  const raw = route.query.src
  const value = typeof raw === 'string' ? raw : ''
  if (value === '') {
    resetView('This link is missing a Markdown file URL.')
    await settleScroll(gen)
    return
  }
  const validation = validateSourceInput(value)
  if ('error' in validation) {
    resetView(validation.error)
    await settleScroll(gen)
    return
  }
  await load(validation.href)
  await settleScroll(gen)
}

function onRendered(result: RenderResult): void {
  documentTitle.value = result.title || 'md-reader'
  headings.value = result.headings
}

watch(
  () => [route.query.local, route.query.src, route.query.path],
  () => {
    void startFromQuery()
  },
  { immediate: true }
)

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  abortInFlight()
})
</script>

<template>
  <main>
    <template v-if="validationError">
      <h1>Could not open this file</h1>
      <p role="alert">{{ validationError }}</p>
      <NuxtLink to="/">Back to start</NuxtLink>
    </template>

    <template v-else-if="loading">
      <p role="status" class="state">
        <span class="spinner" aria-hidden="true" /> Loading…
      </p>
    </template>

    <template v-else-if="error">
      <h1>Could not open this file</h1>
      <p role="alert">{{ error }}</p>
      <button type="button" @click="startFromQuery">Retry</button>
      <NuxtLink to="/">Upload instead</NuxtLink>
    </template>

    <template v-else-if="localId && !source">
      <h1>{{ localName }}</h1>
      <p v-if="skippedLines.length > 0" role="status">
        <template v-for="line in skippedLines" :key="line">
          <span>{{ line }}</span><br>
        </template>
      </p>
      <template v-if="fileList.length > 0">
        <nav aria-label="Breadcrumb">
          <ol class="breadcrumb">
            <li>{{ localName }}</li>
          </ol>
        </nav>
        <FileTree :paths="fileList" :bundle-id="localId" />
      </template>
      <p v-else class="state">This folder has no Markdown files.</p>
    </template>

    <template v-else-if="source">
      <p v-if="skippedLines.length > 0" role="status">
        <template v-for="line in skippedLines" :key="line">
          <span>{{ line }}</span><br>
        </template>
      </p>
      <p v-if="linkError" role="alert">{{ linkError }}</p>
      <div class="reader-toolbar">
        <p class="reader-source" data-testid="reader-source">{{ sourceLabel }}</p>
        <ShareButton :url="shareUrl" />
        <NuxtLink to="/" class="btn">Open another</NuxtLink>
      </div>
      <nav v-if="breadcrumb.length > 0" aria-label="Breadcrumb">
        <ol class="breadcrumb">
          <li v-for="(segment, index) in breadcrumb" :key="index">{{ segment }}</li>
        </ol>
      </nav>
      <div class="reader-layout">
        <aside v-if="isLocal && fileList.length > 0" class="reader-sidebar">
          <FileTree :paths="fileList" :bundle-id="localId" :active-path="activePath" />
        </aside>
        <div class="reader-content">
          <MarkdownView
            :markdown="markdown"
            :source="source"
            :files="isLocal ? fileMap : undefined"
            @rendered="onRendered"
            @missing="onMissingLink"
            @navigate="onNavigate"
          />
        </div>
        <aside v-if="headings.length > 0" class="reader-toc">
          <details open>
            <summary>Contents</summary>
            <TableOfContents :headings="headings" :active-id="activeId" />
          </details>
        </aside>
      </div>
    </template>
  </main>
</template>
