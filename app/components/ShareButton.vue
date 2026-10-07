<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useToast } from '../composables/useToast'
import { LOCAL_SHARE_MESSAGE } from '../utils/share'

type ShareCapableNavigator = Navigator & { share?: (data?: ShareData) => Promise<void> }

const props = defineProps<{ url: string }>()

const { showToast } = useToast()
const manualUrl = ref('')
const manualInput = ref<HTMLInputElement | null>(null)
const available = computed(() => props.url !== '')

function onDisabled(): void {
  showToast(LOCAL_SHARE_MESSAGE)
}

async function onShare(): Promise<void> {
  if (!available.value) return
  const url = props.url
  manualUrl.value = ''
  const share = (navigator as ShareCapableNavigator).share
  if (typeof share === 'function') {
    try {
      await share.call(navigator, { url })
      return
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    showToast('Link copied')
  } catch {
    manualUrl.value = url
    await nextTick()
    manualInput.value?.focus()
    manualInput.value?.select()
  }
}
</script>

<template>
  <div class="share">
    <button
      v-if="available"
      type="button"
      class="btn"
      @click="onShare"
    >
      Share
    </button>
    <button
      v-else
      type="button"
      class="btn"
      aria-disabled="true"
      :title="LOCAL_SHARE_MESSAGE"
      aria-describedby="share-local-note"
      @click="onDisabled"
    >
      Share
    </button>
    <span id="share-local-note" class="visually-hidden">{{ LOCAL_SHARE_MESSAGE }}</span>
    <p v-if="manualUrl" class="share-fallback">
      <label for="share-url">Copy this link</label>
      <input id="share-url" ref="manualInput" :value="manualUrl" readonly>
    </p>
  </div>
</template>
