// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getBundle, registerBundle, resetBundles } from '../app/utils/bundle'
import { MAX_FILE_BYTES } from '../app/utils/fetch-document'
import { EXTENSION_ERROR } from '../app/utils/source-url'
import {
  MULTI_FILE_ERROR,
  NO_MARKDOWN_ERROR,
  describeSkips,
  isImageFile,
  isMarkdownFile,
  resolveEntry,
  scanUploadedFiles
} from '../app/utils/upload'
import type { Bundle } from '../app/utils/bundle'

function makeFile(name: string, size: number, relativePath = ''): File {
  return { name, size, webkitRelativePath: relativePath } as unknown as File
}

function folderFiles(): File[] {
  return [
    makeFile('README.md', 20, 'docs/README.md'),
    makeFile('guide.md', 10, 'docs/guide.md'),
    makeFile('deep.md', 10, 'docs/sub/deep.md'),
    makeFile('img.png', 8, 'docs/img.png'),
    makeFile('notes.txt', 5, 'docs/notes.txt'),
    makeFile('a.mdx', 5, 'docs/a.mdx'),
    makeFile('styles.xml', 5, 'docs/theme/styles.xml'),
    makeFile('over5.md', MAX_FILE_BYTES + 1, 'docs/over5.md')
  ]
}

beforeEach(() => {
  resetBundles()
})

afterEach(() => {
  resetBundles()
})

describe('extension classification', () => {
  it('recognizes markdown and image files', () => {
    expect(isMarkdownFile('a.md')).toBe(true)
    expect(isMarkdownFile('a.MARKDOWN')).toBe(true)
    expect(isMarkdownFile('sub/b.md')).toBe(true)
    expect(isMarkdownFile('a.mdx')).toBe(false)
    expect(isMarkdownFile('a.txt')).toBe(false)
    expect(isMarkdownFile('png')).toBe(false)
    expect(isImageFile('img.png')).toBe(true)
    expect(isImageFile('IMG.JPEG')).toBe(true)
    expect(isImageFile('img.svg')).toBe(true)
    expect(isImageFile('img.md')).toBe(false)
  })
})

describe('single-file upload', () => {
  it('builds a bundle from a single markdown file', () => {
    const result = scanUploadedFiles([makeFile('readme.md', 5)])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.entry).toBe('readme.md')
    expect(result.bundle.name).toBe('readme.md')
    expect(Object.keys(result.bundle.files)).toEqual(['readme.md'])
    expect(result.bundle.id).toBeTruthy()
    expect(typeof result.bundle.createdAt).toBe('number')
    expect(result.bundle.skipped).toEqual({ count: 0, tooLarge: [], bundleLimit: [] })
  })

  it('rejects non-markdown files with the exact message', () => {
    expect(scanUploadedFiles([makeFile('doc.mdx', 5)])).toEqual({
      ok: false,
      message: EXTENSION_ERROR
    })
    expect(scanUploadedFiles([makeFile('doc.txt', 5)])).toEqual({
      ok: false,
      message: EXTENSION_ERROR
    })
  })

  it('rejects a file over 5 MB naming the file', () => {
    const result = scanUploadedFiles([makeFile('huge.md', MAX_FILE_BYTES + 1)])
    expect(result).toEqual({
      ok: false,
      message: 'huge.md is larger than 5 MB. Pick a smaller file.'
    })
  })

  it('rejects multiple loose files', () => {
    const result = scanUploadedFiles([makeFile('a.md', 1), makeFile('b.md', 1)])
    expect(result).toEqual({ ok: false, message: MULTI_FILE_ERROR })
  })

  it('rejects an empty selection', () => {
    expect(scanUploadedFiles([])).toEqual({ ok: false, message: NO_MARKDOWN_ERROR })
  })
})

describe('folder upload', () => {
  it('keeps markdown and images, skips everything else with a count', () => {
    const result = scanUploadedFiles(folderFiles())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.bundle.name).toBe('docs')
    expect(result.entry).toBe('README.md')
    expect(Object.keys(result.bundle.files).sort()).toEqual([
      'README.md',
      'guide.md',
      'img.png',
      'sub/deep.md'
    ])
    expect(result.bundle.skipped.count).toBe(3)
    expect(result.bundle.skipped.tooLarge).toEqual(['over5.md'])
    expect(result.bundle.skipped.bundleLimit).toEqual([])
  })

  it('uses index.md when README.md is absent', () => {
    const files = [makeFile('index.md', 5, 'pod/Index.md'), makeFile('b.md', 5, 'pod/b.md')]
    const result = scanUploadedFiles(files)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.entry).toBe('Index.md')
  })

  it('returns an empty entry when there is no root README or index', () => {
    const files = [makeFile('a.md', 5, 'pod/a.md'), makeFile('b.md', 5, 'pod/sub/b.md')]
    const result = scanUploadedFiles(files)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.entry).toBe('')
  })

  it('fails the upload when the folder has no markdown files', () => {
    const files = [makeFile('img.png', 5, 'pod/img.png'), makeFile('n.txt', 5, 'pod/n.txt')]
    expect(scanUploadedFiles(files)).toEqual({ ok: false, message: NO_MARKDOWN_ERROR })
  })

  it('stops at the 50 MB bundle limit and names the skipped files', () => {
    const files = Array.from({ length: 12 }, (_, i) => {
      const name = `f${String(i + 1).padStart(2, '0')}.md`
      return makeFile(name, MAX_FILE_BYTES, `pod/${name}`)
    })
    const result = scanUploadedFiles(files)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.bundle.skipped.tooLarge).toEqual([])
    expect(result.bundle.skipped.bundleLimit).toEqual(['f11.md', 'f12.md'])
    expect(Object.keys(result.bundle.files)).toEqual(
      Array.from({ length: 10 }, (_, i) => `f${String(i + 1).padStart(2, '0')}.md`)
    )
  })
})

describe('resolveEntry', () => {
  function bundleWith(paths: string[]): Bundle {
    const files: Record<string, Blob> = {}
    for (const path of paths) files[path] = new Blob(['# x'])
    return {
      id: 'id',
      name: 'n',
      createdAt: 0,
      files,
      skipped: { count: 0, tooLarge: [], bundleLimit: [] }
    }
  }

  it('returns the only path for single-file bundles', () => {
    expect(resolveEntry(bundleWith(['notes.md']))).toBe('notes.md')
  })

  it('picks README.md over index.md and lower-casing', () => {
    expect(resolveEntry(bundleWith(['readme.MD', 'index.md']))).toBe('readme.MD')
    expect(resolveEntry(bundleWith(['index.md', 'a.md']))).toBe('index.md')
    expect(resolveEntry(bundleWith(['nested/readme.md', 'a.md']))).toBe('')
  })
})

describe('describeSkips', () => {
  it('returns no lines when nothing was skipped', () => {
    expect(describeSkips({ count: 0, tooLarge: [], bundleLimit: [] })).toEqual([])
  })

  it('pluralizes the unreadable count', () => {
    expect(describeSkips({ count: 1, tooLarge: [], bundleLimit: [] })).toEqual(['1 file skipped'])
    expect(describeSkips({ count: 12, tooLarge: [], bundleLimit: [] })).toEqual([
      '12 files skipped'
    ])
  })

  it('names size and bundle-limit skips', () => {
    expect(describeSkips({ count: 2, tooLarge: ['a.md'], bundleLimit: ['b.md'] })).toEqual([
      '2 files skipped',
      'Skipped, larger than 5 MB: a.md',
      'Skipped to stay under the 50 MB limit: b.md'
    ])
  })
})

describe('bundle registry', () => {
  it('stores and retrieves bundles by id', () => {
    const bundle: Bundle = {
      id: 'abc',
      name: 'x',
      createdAt: 1,
      files: {},
      skipped: { count: 0, tooLarge: [], bundleLimit: [] }
    }
    registerBundle(bundle)
    expect(getBundle('abc')).toBe(bundle)
    expect(getBundle('missing')).toBeUndefined()
    expect(MAX_FILE_BYTES).toBe(5 * 1024 * 1024)
  })
})