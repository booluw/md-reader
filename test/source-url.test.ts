import { describe, expect, it } from 'vitest'
import {
  EXTENSION_ERROR,
  PROTOCOL_ERROR,
  validateSourceInput
} from '../app/utils/source-url'

describe('validateSourceInput', () => {
  it.each([
    ['not a url'],
    ['/relative/path.md'],
    ['example.com/README.md'],
    ['ftp://example.com/file.md'],
    ['data:text/markdown,# hi'],
    ['']
  ])('rejects %j with the protocol error', (value) => {
    const result = validateSourceInput(value)
    expect(result).toEqual({ error: PROTOCOL_ERROR })
  })

  it('accepts https URLs ending in .md', () => {
    expect(validateSourceInput('https://example.com/docs/readme.md')).toEqual({
      href: 'https://example.com/docs/readme.md'
    })
  })

  it('accepts .markdown case-insensitively, ignoring query and fragment', () => {
    expect(validateSourceInput('https://example.com/notes.MARKDOWN?plain=1#L5')).toEqual({
      href: 'https://example.com/notes.MARKDOWN?plain=1#L5'
    })
  })

  it('rejects .mdx with the extension error', () => {
    expect(validateSourceInput('https://example.com/doc.mdx')).toEqual({
      error: EXTENSION_ERROR
    })
  })

  it('rejects other extensions with the extension error', () => {
    expect(validateSourceInput('https://example.com/notes.txt')).toEqual({
      error: EXTENSION_ERROR
    })
  })

  it('allows extensionless URLs for the later content-type check', () => {
    expect(validateSourceInput('https://example.com/docs/latest')).toEqual({
      href: 'https://example.com/docs/latest'
    })
  })

  it('allows extensionless URLs with dots in parent segments', () => {
    expect(validateSourceInput('https://example.com/v1.2/file')).toEqual({
      href: 'https://example.com/v1.2/file'
    })
  })
})

describe('GitHub normalization', () => {
  it('rewrites blob URLs to raw.githubusercontent.com', () => {
    expect(validateSourceInput('https://github.com/owner/repo/blob/main/docs/guide.md')).toEqual({
      href: 'https://raw.githubusercontent.com/owner/repo/main/docs/guide.md'
    })
  })

  it('drops the query string from blob URLs', () => {
    expect(validateSourceInput('https://github.com/owner/repo/blob/main/README.md?plain=1')).toEqual(
      { href: 'https://raw.githubusercontent.com/owner/repo/main/README.md' }
    )
  })

  it('handles www.github.com and encoded path segments', () => {
    expect(validateSourceInput('https://www.github.com/o/r/blob/dev/a%20b.md')).toEqual({
      href: 'https://raw.githubusercontent.com/o/r/dev/a%20b.md'
    })
  })

  it('leaves raw.githubusercontent.com URLs unchanged', () => {
    const href = 'https://raw.githubusercontent.com/o/r/main/README.md'
    expect(validateSourceInput(href)).toEqual({ href })
  })
})

describe('GitLab normalization', () => {
  it('rewrites /-/blob/ to /-/raw/', () => {
    expect(validateSourceInput('https://gitlab.com/group/project/-/blob/main/README.md')).toEqual({
      href: 'https://gitlab.com/group/project/-/raw/main/README.md'
    })
  })

  it('rewrites nested subgroup blob URLs', () => {
    expect(
      validateSourceInput('https://gitlab.com/group/sub/project/-/blob/main/docs/a.md')
    ).toEqual({ href: 'https://gitlab.com/group/sub/project/-/raw/main/docs/a.md' })
  })

  it('leaves /-/raw/ URLs unchanged', () => {
    const href = 'https://gitlab.com/group/project/-/raw/main/README.md'
    expect(validateSourceInput(href)).toEqual({ href })
  })
})

describe('Gist normalization', () => {
  it('rewrites gist page URLs to gist.githubusercontent.com raw', () => {
    expect(validateSourceInput('https://gist.github.com/someone/1234567')).toEqual({
      href: 'https://gist.githubusercontent.com/someone/1234567/raw'
    })
  })

  it('drops trailing slashes and file fragments', () => {
    expect(validateSourceInput('https://gist.github.com/someone/1234567/#file-notes-md')).toEqual({
      href: 'https://gist.githubusercontent.com/someone/1234567/raw'
    })
  })
})

describe('other URLs', () => {
  it('leaves ordinary URLs unchanged', () => {
    expect(validateSourceInput('https://example.com/raw/notes.md')).toEqual({
      href: 'https://example.com/raw/notes.md'
    })
  })
})
