<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { addRecent, clearRecent, loadRecent, saveRecent } from '../utils/recent-urls'
import { validateSourceInput } from '../utils/source-url'

useHead({ title: 'md-reader' })

const url = ref('')
const error = ref('')
const input = ref<HTMLInputElement | null>(null)
const recent = ref<string[]>([])

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

    <section v-if="recent.length > 0" aria-labelledby="recent-heading">
      <h2 id="recent-heading">Recently opened</h2>
      <ul>
        <li v-for="href in recent" :key="href">
          <NuxtLink :to="{ path: '/read', query: { src: href } }">{{ href }}</NuxtLink>
        </li>
      </ul>
      <button type="button" @click="onClear">Clear</button>
    </section>

    <p>Opening a local file arrives in the next task.</p>
  </main>
</template>
