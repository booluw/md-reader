import { describe, expect, it } from 'vitest'
import { sourceBreadcrumb, sourceFilename } from '../app/utils/source'

describe('sourceBreadcrumb', () => {
  it('splits and decodes a local path', () => {
    expect(
      sourceBreadcrumb({ kind: 'local', bundleId: 'b1', path: 'notes/My%20Notes.md' })
    ).toEqual(['notes', 'My Notes.md'])
  })

  it('splits a URL pathname', () => {
    expect(
      sourceBreadcrumb({ kind: 'url', href: 'https://example.com/docs/guide.md?x=1#s' })
    ).toEqual(['docs', 'guide.md'])
  })

  it('drops empty segments', () => {
    expect(sourceBreadcrumb({ kind: 'local', bundleId: 'b1', path: '' })).toEqual([])
  })
})

describe('sourceFilename', () => {
  it('falls back to the host when the URL has no path', () => {
    expect(sourceFilename({ kind: 'url', href: 'https://example.com' })).toBe('example.com')
  })
})
