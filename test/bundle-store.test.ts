import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import 'fake-indexeddb/auto'
import type { Bundle } from '../app/utils/bundle'
import {
  bundleMetaFor,
  clearMemoryCache,
  deleteAllBundles,
  deleteBundle,
  ensurePersistentStorage,
  listBundles,
  loadBundle,
  resetBundleStore,
  storageMode,
  saveBundle
} from '../app/utils/bundle-store'

function makeBundle(id: string, name: string, createdAt: number, blobs: Record<string, Blob>): Bundle {
  return {
    id,
    name,
    createdAt,
    files: blobs,
    skipped: { count: 0, tooLarge: [], bundleLimit: [] }
  }
}

const README = new Blob(['# Hello'], { type: 'text/markdown' })
const GUIDE = new Blob(['# Guide'], { type: 'text/markdown' })

beforeEach(async () => {
  await resetBundleStore()
})

afterEach(async () => {
  await resetBundleStore()
})

describe('save and load', () => {
  it('round-trips a bundle with blobs through IndexedDB', async () => {
    await saveBundle(makeBundle('b1', 'docs', 1, { 'README.md': README, 'guide.md': GUIDE }), 'README.md')

    const loaded = await loadBundle('b1')
    expect(loaded?.name).toBe('docs')
    expect(loaded?.createdAt).toBe(1)
    expect(loaded?.files['README.md']).toBeTruthy()
    expect(loaded?.files['README.md']?.type).toBe('text/markdown')
    expect(await loaded?.files['README.md']?.text()).toBe('# Hello')
    expect(await loaded?.files['guide.md']?.text()).toBe('# Guide')
  })

  it('loads from IndexedDB after the memory cache is cleared', async () => {
    await saveBundle(makeBundle('b1', 'docs', 1, { 'README.md': README }), 'README.md')
    clearMemoryCache()

    const loaded = await loadBundle('b1')
    expect(loaded?.name).toBe('docs')
  })

  it('returns undefined for a missing id', async () => {
    expect(await loadBundle('missing')).toBeUndefined()
  })

  it('falls back to session memory when IndexedDB is unavailable', async () => {
    const original = globalThis.indexedDB
    ;(globalThis as { indexedDB?: unknown }).indexedDB = undefined
    try {
      expect(await storageMode()).toBe('memory')
      await saveBundle(makeBundle('b1', 'docs', 1, { 'README.md': README }), 'README.md')
      expect(await loadBundle('b1')).toMatchObject({ id: 'b1', name: 'docs' })
      expect(await listBundles()).toEqual([])
    } finally {
      ;(globalThis as { indexedDB?: unknown }).indexedDB = original
    }
  })
})

describe('listing', () => {
  it('returns metadata with file count, total size, entry, and date', async () => {
    await saveBundle(makeBundle('b1', 'docs', 10, { 'README.md': README, 'guide.md': GUIDE }), 'README.md')

    const metas = await listBundles()
    expect(metas).toEqual([
      expect.objectContaining({
        id: 'b1',
        name: 'docs',
        createdAt: 10,
        entry: 'README.md',
        fileCount: 2,
        totalBytes: README.size + GUIDE.size
      })
    ])
  })

  it('sorts newest first', async () => {
    await saveBundle(makeBundle('old', 'old bundle', 10, { 'README.md': README }), 'README.md')
    await saveBundle(makeBundle('new', 'new bundle', 20, { 'README.md': README }), 'README.md')

    const ids = (await listBundles()).map((meta) => meta.id)
    expect(ids).toEqual(['new', 'old'])
  })

  it('returns an empty list when IndexedDB is unavailable', async () => {
    const original = globalThis.indexedDB
    ;(globalThis as { indexedDB?: unknown }).indexedDB = undefined
    try {
      await saveBundle(makeBundle('b1', 'docs', 1, { 'README.md': README }), 'README.md')
      expect(await listBundles()).toEqual([])
    } finally {
      ;(globalThis as { indexedDB?: unknown }).indexedDB = original
    }
  })

  it('computes the meta directly from a bundle', () => {
    const meta = bundleMetaFor(
      makeBundle('b1', 'docs', 5, { 'README.md': README, 'guide.md': GUIDE }),
      'README.md'
    )
    expect(meta).toMatchObject({ id: 'b1', entry: 'README.md', fileCount: 2 })
    expect(meta.totalBytes).toBe(README.size + GUIDE.size)
  })
})

describe('delete', () => {
  it('removes a single bundle from the store and listings', async () => {
    await saveBundle(makeBundle('b1', 'one', 1, { 'README.md': README }), 'README.md')
    await saveBundle(makeBundle('b2', 'two', 2, { 'README.md': README }), 'README.md')

    await deleteBundle('b1')

    expect(await loadBundle('b1')).toBeUndefined()
    expect((await listBundles()).map((meta) => meta.id)).toEqual(['b2'])
  })

  it('removes everything with delete all', async () => {
    await saveBundle(makeBundle('b1', 'one', 1, { 'README.md': README }), 'README.md')
    await saveBundle(makeBundle('b2', 'two', 2, { 'README.md': README }), 'README.md')

    await deleteAllBundles()

    expect(await listBundles()).toEqual([])
    expect(await loadBundle('b1')).toBeUndefined()
    expect(await loadBundle('b2')).toBeUndefined()
  })
})

describe('persistent storage request', () => {
  it('reports granted when the browser persists', async () => {
    const original = globalThis.navigator
    Object.defineProperty(globalThis, 'navigator', {
      value: { storage: { persist: async () => true } },
      configurable: true
    })
    try {
      expect(await ensurePersistentStorage()).toBe('granted')
    } finally {
      Object.defineProperty(globalThis, 'navigator', { value: original, configurable: true })
    }
  })

  it('reports denied when the browser refuses', async () => {
    const original = globalThis.navigator
    Object.defineProperty(globalThis, 'navigator', {
      value: { storage: { persist: async () => false } },
      configurable: true
    })
    try {
      expect(await ensurePersistentStorage()).toBe('denied')
    } finally {
      Object.defineProperty(globalThis, 'navigator', { value: original, configurable: true })
    }
  })

  it('reports denied when persist is unavailable', async () => {
    expect(await ensurePersistentStorage()).toBe('denied')
  })

  it('reports pending when persist never settles', async () => {
    vi.useFakeTimers()
    const original = globalThis.navigator
    Object.defineProperty(globalThis, 'navigator', {
      value: { storage: { persist: () => new Promise<boolean>(() => {}) } },
      configurable: true
    })
    try {
      const pending = ensurePersistentStorage()
      await vi.advanceTimersByTimeAsync(600)
      expect(await pending).toBe('pending')
    } finally {
      vi.useRealTimers()
      Object.defineProperty(globalThis, 'navigator', { value: original, configurable: true })
    }
  })
})