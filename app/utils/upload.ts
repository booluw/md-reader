import { createBundleId } from './bundle'
import type { Bundle, BundleSkips } from './bundle'
import { MAX_FILE_BYTES } from './fetch-document'
import { EXTENSION_ERROR } from './source-url'

export const MAX_BUNDLE_BYTES = 50 * 1024 * 1024

export const MULTI_FILE_ERROR = 'Drop a single Markdown file or a whole folder.'
export const NO_MARKDOWN_ERROR = 'No Markdown files found in this folder.'
export const LOCAL_UPLOAD_MISSING_MESSAGE =
  'This file was uploaded on another device or has been cleared. Ask for a web link, or upload it again.'

const MARKDOWN_EXTENSIONS = new Set(['md', 'markdown'])
const IMAGE_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'svg',
  'webp',
  'avif',
  'bmp',
  'ico'
])

function extension(path: string): string {
  const last = path.split('/').filter(Boolean).at(-1) ?? ''
  const dot = last.lastIndexOf('.')
  return dot === -1 ? '' : last.slice(dot + 1).toLowerCase()
}

export function isMarkdownFile(path: string): boolean {
  return MARKDOWN_EXTENSIONS.has(extension(path))
}

export function isImageFile(path: string): boolean {
  return IMAGE_EXTENSIONS.has(extension(path))
}

function singleFileTooLarge(name: string): string {
  return `${name} is larger than 5 MB. Pick a smaller file.`
}

export function missingBundleFile(path: string): string {
  return `Can't find ${path} in this upload.`
}

export type UploadResult =
  | { ok: true; bundle: Bundle; entry: string }
  | { ok: false; message: string }

interface FileEntry {
  path: string
  file: File
}

function folderRoot(files: File[]): string {
  const first =
    files.find((file) => (file.webkitRelativePath ?? '') !== '')?.webkitRelativePath ?? ''
  return first.split('/')[0] ?? ''
}

function stripRoot(path: string, root: string): string {
  const relative = path ?? ''
  if (root && relative.startsWith(`${root}/`)) {
    return relative.slice(root.length + 1)
  }
  return relative
}

function buildBundle(
  name: string,
  entries: FileEntry[],
  skipped: BundleSkips
): Bundle {
  const files: Record<string, Blob> = {}
  for (const entry of entries) {
    files[entry.path] = entry.file
  }
  return { id: createBundleId(), name, createdAt: Date.now(), files, skipped }
}

export function resolveEntry(bundle: Bundle): string {
  const paths = Object.keys(bundle.files)
  if (paths.length === 1) return paths[0] ?? ''
  const root = paths.filter((path) => !path.includes('/'))
  for (const candidate of ['readme.md', 'index.md']) {
    const match = root.find((path) => path.toLowerCase() === candidate)
    if (match) return match
  }
  return ''
}

export function describeSkips(skipped: BundleSkips): string[] {
  const lines: string[] = []
  if (skipped.count > 0) {
    lines.push(`${skipped.count} file${skipped.count === 1 ? '' : 's'} skipped`)
  }
  if (skipped.tooLarge.length > 0) {
    lines.push(`Skipped, larger than 5 MB: ${skipped.tooLarge.join(', ')}`)
  }
  if (skipped.bundleLimit.length > 0) {
    lines.push(`Skipped to stay under the 50 MB limit: ${skipped.bundleLimit.join(', ')}`)
  }
  return lines
}

export function scanUploadedFiles(files: File[]): UploadResult {
  if (files.length === 0) return { ok: false, message: NO_MARKDOWN_ERROR }
  const isFolder = files.some((file) => (file.webkitRelativePath ?? '') !== '')

  if (!isFolder) {
    if (files.length > 1) return { ok: false, message: MULTI_FILE_ERROR }
    const file = files[0]
    if (!file) return { ok: false, message: NO_MARKDOWN_ERROR }
    if (!isMarkdownFile(file.name)) return { ok: false, message: EXTENSION_ERROR }
    if (file.size > MAX_FILE_BYTES) {
      return { ok: false, message: singleFileTooLarge(file.name) }
    }
    const emptySkips: BundleSkips = { count: 0, tooLarge: [], bundleLimit: [] }
    const bundle = buildBundle(file.name, [{ path: file.name, file }], emptySkips)
    return { ok: true, bundle, entry: file.name }
  }

  const root = folderRoot(files)
  const records = files
    .map((file) => ({ file, path: stripRoot(file.webkitRelativePath, root) }))
    .sort((a, b) => a.path.localeCompare(b.path))

  const kept: FileEntry[] = []
  const tooLarge: string[] = []
  const bundleLimit: string[] = []
  let unreadable = 0
  let total = 0

  for (const { file, path } of records) {
    if (!isMarkdownFile(path) && !isImageFile(path)) {
      unreadable += 1
      continue
    }
    if (file.size > MAX_FILE_BYTES) {
      tooLarge.push(path)
      continue
    }
    if (total + file.size > MAX_BUNDLE_BYTES) {
      bundleLimit.push(path)
      continue
    }
    total += file.size
    kept.push({ path, file })
  }

  if (!kept.some((entry) => isMarkdownFile(entry.path))) {
    return { ok: false, message: NO_MARKDOWN_ERROR }
  }

  const bundle = buildBundle(root, kept, {
    count: unreadable,
    tooLarge,
    bundleLimit
  })
  return { ok: true, bundle, entry: resolveEntry(bundle) }
}