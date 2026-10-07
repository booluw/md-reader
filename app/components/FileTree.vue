<script setup lang="ts">
import { computed } from 'vue'
import type { FileTreeEntry } from '../utils/file-tree'
import { buildFileTree } from '../utils/file-tree'

const props = defineProps<{
  paths?: string[]
  entries?: FileTreeEntry[]
  bundleId: string
  activePath?: string
}>()

const tree = computed<FileTreeEntry[]>(() => props.entries ?? buildFileTree(props.paths ?? []))
</script>

<template>
  <ul class="file-tree">
    <li v-for="entry in tree" :key="entry.type === 'file' ? entry.path : entry.name">
      <details v-if="entry.type === 'folder'" open>
        <summary>{{ entry.name }}</summary>
        <FileTree
          :entries="entry.children"
          :bundle-id="bundleId"
          :active-path="activePath"
        />
      </details>
      <NuxtLink
        v-else
        :to="{ path: '/read', query: { local: bundleId, path: entry.path } }"
        :aria-label="entry.path"
        :aria-current="entry.path === activePath ? 'page' : undefined"
      >
        {{ entry.name }}
      </NuxtLink>
    </li>
  </ul>
</template>
