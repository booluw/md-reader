<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { BundleMeta } from '../utils/bundle-store'
import {
  deleteAllBundles,
  deleteBundle,
  ensurePersistentStorage,
  listBundles,
  saveBundle,
  storageMode
} from '../utils/bundle-store'
import { scanUploadedFiles } from '../utils/upload'
import { addRecent, clearRecent, loadRecent, saveRecent } from '../utils/recent-urls'
import { validateSourceInput } from '../utils/source-url'

useHead({ title: 'md-reader' })

const PERSIST_DENIED_MESSAGE =
  'Your browser may clear locally uploaded files. Keep a backup on your device.'
const PRIVATE_MODE_MESSAGE = 'Private browsing: uploads last only for this session.'
const NOTICE_STORAGE_KEY = 'md-reader:notice'

function storeNotice(message: string): void {
  try {
    if (message) sessionStorage.setItem(NOTICE_STORAGE_KEY, message)
    else sessionStorage.removeItem(NOTICE_STORAGE_KEY)
  } catch {
    // Best-effort: a blocked sessionStorage only loses the advisory notice.
  }
}

function readStoredNotice(): string {
  try {
    const message = sessionStorage.getItem(NOTICE_STORAGE_KEY)
    if (message !== null) sessionStorage.removeItem(NOTICE_STORAGE_KEY)
    return message ?? ''
  } catch {
    return ''
  }
}

const url = ref('')
const error = ref('')
const input = ref<HTMLInputElement | null>(null)
const recent = ref<string[]>([])

const fileInput = ref<HTMLInputElement | null>(null)
const folderInput = ref<HTMLInputElement | null>(null)
const uploadError = ref('')
const notice = ref('')
const saved = ref<BundleMeta[]>([])
const confirmClear = ref(false)
const dragover = ref(false)
let dragDepth = 0

onMounted(async () => {
  recent.value = loadRecent()
  notice.value = readStoredNotice()
  saved.value = await listBundles()
})

async function onSubmit(): Promise<void> {
  const validation = validateSourceInput(url.value)
  if ('error' in validation) {
    error.value = validation.error
    input.value?.focus()
    return
  }
  error.value = ''
  recent.value = addRecent(recent.value, validation.href)
  saveRecent(recent.value)
  await navigateTo({ path: '/read', query: { src: validation.href } })
}

function onClear(): void {
  recent.value = []
  clearRecent()
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function formatDate(createdAt: number): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    createdAt
  )
}

async function refreshSaved(): Promise<void> {
  saved.value = await listBundles()
}

async function handleUpload(files: File[]): Promise<void> {
  const result = scanUploadedFiles(files)
  if (!result.ok) {
    uploadError.value = result.message
    return
  }
  uploadError.value = ''
  await saveBundle(result.bundle, result.entry)
  const verdict = await ensurePersistentStorage()
  const mode = await storageMode()
  let message = ''
  if (mode === 'memory') {
    message = PRIVATE_MODE_MESSAGE
  } else if (verdict === 'denied') {
    message = PERSIST_DENIED_MESSAGE
  }
  notice.value = message
  storeNotice(message)
  await refreshSaved()
  const query: Record<string, string> = { local: result.bundle.id }
  if (result.entry) query.path = result.entry
  await navigateTo({ path: '/read', query })
}

function onFileChange(event: Event): void {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files ?? [])
  target.value = ''
  void handleUpload(files)
}

function onDragEnter(): void {
  dragDepth += 1
  dragover.value = true
}

function onDragOver(): void {
  dragover.value = true
}

function onDragLeave(): void {
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) dragover.value = false
}

function onDrop(event: DragEvent): void {
  dragDepth = 0
  dragover.value = false
  const files = Array.from(event.dataTransfer?.files ?? [])
  void handleUpload(files)
}

async function onDelete(id: string): Promise<void> {
  await deleteBundle(id)
  await refreshSaved()
}

function onDeleteAll(): void {
  confirmClear.value = true
}

async function onConfirmDeleteAll(): Promise<void> {
  confirmClear.value = false
  await deleteAllBundles()
  await refreshSaved()
}

function onCancelDeleteAll(): void {
  confirmClear.value = false
}
</script>

<template>
  <main>
    <h1>md-reader</h1>

    <form novalidate @submit.prevent="onSubmit">
      <label for="source-url">Markdown file URL</label>
      <input
        id="source-url"
        ref="input"
        v-model="url"
        type="url"
        name="url"
        inputmode="url"
        autocomplete="url"
        placeholder="https://github.com/user/repo/blob/main/README.md"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="error ? 'source-url-error' : undefined"
      >
      <p v-if="error" id="source-url-error" role="alert">{{ error }}</p>
      <button type="submit" class="btn">Open</button>
    </form>

    <section
      class="drop-zone"
      :class="{ 'is-dragging': dragover }"
      aria-label="Drop zone"
      data-testid="drop-zone"
      @dragenter.prevent="onDragEnter"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
    >
      <p>Drag and drop a Markdown file or folder here</p>
      <p>or</p>
      <button type="button" class="btn" @click="fileInput?.click()">Choose a Markdown file</button>
      <button type="button" class="btn" @click="folderInput?.click()">Choose a folder</button>
    </section>
    <input
      ref="fileInput"
      class="visually-hidden"
      type="file"
      accept=".md,.markdown,text/markdown"
      aria-label="Choose a Markdown file"
      @change="onFileChange"
    >
    <input
      ref="folderInput"
      class="visually-hidden"
      type="file"
      webkitdirectory
      aria-label="Choose a folder"
      @change="onFileChange"
    >
    <p v-if="uploadError" class="state state-error" role="alert">{{ uploadError }}</p>
    <p v-if="notice" class="state" role="status">{{ notice }}</p>

    <section v-if="saved.length > 0" aria-labelledby="saved-heading">
      <h2 id="saved-heading">Saved uploads</h2>
      <ul>
        <li v-for="item in saved" :key="item.id">
          <NuxtLink :to="{ path: '/read', query: { local: item.id, path: item.entry } }">
            {{ item.name }}
          </NuxtLink>
          <p>
            {{ item.fileCount }} file{{ item.fileCount === 1 ? '' : 's' }} ·
            {{ formatBytes(item.totalBytes) }} ·
            {{ formatDate(item.createdAt) }}
          </p>
          <button type="button" @click="onDelete(item.id)">Delete</button>
        </li>
      </ul>
      <div v-if="!confirmClear">
        <button type="button" @click="onDeleteAll">Delete all</button>
      </div>
      <div v-else role="group" aria-label="Delete all saved uploads confirmation">
        <p role="alert">Delete all saved uploads?</p>
        <button type="button" @click="onConfirmDeleteAll">Delete</button>
        <button type="button" @click="onCancelDeleteAll">Cancel</button>
      </div>
    </section>

    <section v-if="recent.length > 0" aria-labelledby="recent-heading">
      <h2 id="recent-heading">Recently opened</h2>
      <ul>
        <li v-for="href in recent" :key="href">
          <NuxtLink :to="{ path: '/read', query: { src: href } }">{{ href }}</NuxtLink>
        </li>
      </ul>
      <button type="button" @click="onClear">Clear</button>
    </section>
  </main>
</template>
