import type { Bundle, BundleSkips } from './bundle'

export interface BundleMeta {
  id: string
  name: string
  createdAt: number
  entry: string
  fileCount: number
  totalBytes: number
}

export type StorageMode = 'indexeddb' | 'memory'
export type PersistenceVerdict = 'granted' | 'denied' | 'pending'

const DB_NAME = 'md-reader'
const DB_VERSION = 1
const BUNDLES_STORE = 'bundles'
const METAS_STORE = 'metas'
const PERSIST_TIMEOUT_MS = 500

interface StoredFile {
  data: ArrayBuffer
  type: string
}

interface StoredBundle {
  id: string
  name: string
  createdAt: number
  files: Record<string, StoredFile>
  skipped?: BundleSkips
}

const memory = new Map<string, Bundle>()

let db: IDBDatabase | null = null
let dbChecked = false
let persistRequested = false
let persistResult: PersistenceVerdict = 'pending'

function warnStoreError(operation: string, error: unknown): void {
  console.warn(`md-reader: ${operation}`, error)
}

function requestValue<T>(request: IDBRequest<T>): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = () => reject(transaction.error)
    transaction.onerror = () => reject(transaction.error)
  })
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (dbChecked) return Promise.resolve(db)
  dbChecked = true
  return new Promise((resolve) => {
    let request: IDBOpenDBRequest
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION)
    } catch {
      resolve(null)
      return
    }
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(BUNDLES_STORE)) {
        database.createObjectStore(BUNDLES_STORE, { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains(METAS_STORE)) {
        database.createObjectStore(METAS_STORE, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }
    request.onerror = () => {
      warnStoreError('failed to open IndexedDB', request.error)
      resolve(null)
    }
    request.onblocked = () => {
      warnStoreError('IndexedDB open blocked', null)
      resolve(null)
    }
  })
}

async function toStoredBundle(bundle: Bundle): Promise<StoredBundle> {
  const entries = await Promise.all(
    Object.entries(bundle.files).map(
      async ([path, file]): Promise<[string, StoredFile]> => [
        path,
        { data: await file.arrayBuffer(), type: file.type }
      ]
    )
  )
  return {
    id: bundle.id,
    name: bundle.name,
    createdAt: bundle.createdAt,
    files: Object.fromEntries(entries),
    skipped: bundle.skipped
  }
}

function isStoredFile(value: unknown): value is StoredFile {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as StoredFile).data instanceof ArrayBuffer &&
    typeof (value as StoredFile).type === 'string'
  )
}

function fromStoredBundle(stored: StoredBundle): Bundle {
  const files: Record<string, Blob> = {}
  for (const [path, file] of Object.entries(stored.files)) {
    if (isStoredFile(file)) {
      files[path] = new Blob([file.data], { type: file.type })
    }
  }
  return {
    id: stored.id,
    name: stored.name,
    createdAt: stored.createdAt,
    files,
    skipped: stored.skipped ?? { count: 0, tooLarge: [], bundleLimit: [] }
  }
}

export function bundleMetaFor(bundle: Bundle, entry: string): BundleMeta {
  const paths = Object.keys(bundle.files)
  return {
    id: bundle.id,
    name: bundle.name,
    createdAt: bundle.createdAt,
    entry,
    fileCount: paths.length,
    totalBytes: paths.reduce((sum, path) => sum + (bundle.files[path]?.size ?? 0), 0)
  }
}

export async function saveBundle(bundle: Bundle, entry: string): Promise<void> {
  memory.set(bundle.id, bundle)
  const database = await openDatabase()
  if (!database) return
  try {
    const stored = await toStoredBundle(bundle)
    const transaction = database.transaction([BUNDLES_STORE, METAS_STORE], 'readwrite')
    transaction.objectStore(BUNDLES_STORE).put(stored)
    transaction.objectStore(METAS_STORE).put(bundleMetaFor(bundle, entry))
    await transactionComplete(transaction)
  } catch (error) {
    db = null
    warnStoreError('failed to persist bundle', error)
  }
}

export async function loadBundle(id: string): Promise<Bundle | undefined> {
  const cached = memory.get(id)
  if (cached) return cached
  const database = await openDatabase()
  if (!database) return undefined
  try {
    const store = database.transaction(BUNDLES_STORE, 'readonly').objectStore(BUNDLES_STORE)
    const value = await requestValue<StoredBundle | undefined>(store.get(id))
    if (value && typeof value.id === 'string' && value.files && typeof value.files === 'object') {
      const bundle = fromStoredBundle(value)
      memory.set(id, bundle)
      return bundle
    }
    return undefined
  } catch (error) {
    warnStoreError('failed to load bundle', error)
    return undefined
  }
}

export function clearMemoryCache(): void {
  memory.clear()
}

export async function listBundles(): Promise<BundleMeta[]> {
  const database = await openDatabase()
  if (!database) return []
  try {
    const store = database.transaction(METAS_STORE, 'readonly').objectStore(METAS_STORE)
    const metas = await requestValue<BundleMeta[]>(store.getAll())
    return Array.isArray(metas) ? sortNewestFirst(metas) : []
  } catch (error) {
    warnStoreError('failed to list saved uploads', error)
    return []
  }
}

function sortNewestFirst(metas: BundleMeta[]): BundleMeta[] {
  return [...metas].sort((a, b) => b.createdAt - a.createdAt)
}

export async function deleteBundle(id: string): Promise<void> {
  memory.delete(id)
  const database = await openDatabase()
  if (!database) return
  try {
    const transaction = database.transaction([BUNDLES_STORE, METAS_STORE], 'readwrite')
    transaction.objectStore(BUNDLES_STORE).delete(id)
    transaction.objectStore(METAS_STORE).delete(id)
    await transactionComplete(transaction)
  } catch (error) {
    db = null
    warnStoreError('failed to delete bundle', error)
  }
}

export async function deleteAllBundles(): Promise<void> {
  memory.clear()
  const database = await openDatabase()
  if (!database) return
  try {
    const transaction = database.transaction([BUNDLES_STORE, METAS_STORE], 'readwrite')
    transaction.objectStore(BUNDLES_STORE).clear()
    transaction.objectStore(METAS_STORE).clear()
    await transactionComplete(transaction)
  } catch (error) {
    db = null
    warnStoreError('failed to delete all bundles', error)
  }
}

export async function storageMode(): Promise<StorageMode> {
  const database = await openDatabase()
  return database ? 'indexeddb' : 'memory'
}

function settleWithin(promise: Promise<boolean>, ms: number): Promise<boolean | 'timeout'> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve('timeout'), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      () => {
        clearTimeout(timer)
        resolve(false)
      }
    )
  })
}

export async function ensurePersistentStorage(): Promise<PersistenceVerdict> {
  if (persistRequested) return persistResult
  persistRequested = true
  try {
    const storage = navigator.storage
    if (!storage || typeof storage.persist !== 'function') {
      persistResult = 'denied'
      return persistResult
    }
    const outcome = await settleWithin(storage.persist(), PERSIST_TIMEOUT_MS)
    persistResult = outcome === 'timeout' ? 'pending' : outcome ? 'granted' : 'denied'
  } catch {
    persistResult = 'denied'
  }
  return persistResult
}

export async function resetBundleStore(): Promise<void> {
  memory.clear()
  db?.close()
  db = null
  dbChecked = false
  persistRequested = false
  persistResult = 'pending'
  if (typeof indexedDB === 'undefined') return
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => resolve()
    request.onblocked = () => resolve()
  })
}