<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { registerBundle } from '../utils/bundle'
import { scanUploadedFiles } from '../utils/upload'
import { addRecent, clearRecent, loadRecent, saveRecent } from '../utils/recent-urls'
import { validateSourceInput } from '../utils/source-url'

useHead({ title: 'md-reader' })

const url = ref('')
const error = ref('')
const input = ref<HTMLInputElement | null>(null)
const recent = ref<string[]>([])

const fileInput = ref<HTMLInputElement | null>(null)
const folderInput = ref<HTMLInputElement | null>(null)
const uploadError = ref('')
const dragover = ref(false)
let dragDepth = 0

onMounted(() => {
  recent.value = loadRecent()
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

async function handleUpload(files: File[]): Promise<void> {
  const result = scanUploadedFiles(files)
  if (!result.ok) {
    uploadError.value = result.message
    return
  }
  uploadError.value = ''
  registerBundle(result.bundle)
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
      <button type="submit">Open</button>
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
      <button type="button" @click="fileInput?.click()">Choose a Markdown file</button>
      <button type="button" @click="folderInput?.click()">Choose a folder</button>
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
    <p v-if="uploadError" role="alert">{{ uploadError }}</p>

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

<style scoped>
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

.drop-zone {
  padding: 24px;
  text-align: center;
  border: 2px dashed #888;
  border-radius: 8px;
}

.drop-zone.is-dragging {
  border-color: #1a5fb4;
  background: #f2f7ff;
}
</style>