import { describe, expect, it } from 'vitest'
import {
  bundlePathFor,
  normalizePosix,
  resolveImage,
  resolveLink,
  splitHref
} from '../app/utils/markdown-links'
import type { Source } from '../app/utils/source'

const urlSource: Source = { kind: 'url', href: 'https://example.com/docs/README.md' }
const localSource: Source = { kind: 'local', bundleId: 'b1', path: 'sub/c.md' }

describe('splitHref', () => {
  it('separates path, query and hash', () => {
    expect(splitHref('a.md?x=1#s')).toEqual({ path: 'a.md', query: 'x=1', hash: 's' })
  })

  it('handles missing parts', () => {
    expect(splitHref('a.md')).toEqual({ path: 'a.md', query: '', hash: '' })
  })
})

describe('normalizePosix / bundlePathFor', () => {
  it('collapses . and .. segments', () => {
    expect(normalizePosix('sub/./a/../b.md')).toBe('sub/b.md')
    expect(normalizePosix('/root.md')).toBe('/root.md')
    expect(normalizePosix('../a.md')).toBe('../a.md')
  })

  it('joins against the current directory', () => {
    expect(bundlePathFor('sub/c.md', './a.md')).toBe('sub/a.md')
    expect(bundlePathFor('sub/c.md', '../b.md')).toBe('b.md')
    expect(bundlePathFor('sub/c.md', 'sub/d.md')).toBe('sub/sub/d.md')
    expect(bundlePathFor('sub/c.md', '/root.md')).toBe('root.md')
  })
})

describe('resolveLink — URL mode', () => {
  it('resolves sibling, parent, nested and root links', () => {
    expect(resolveLink('./a.md', urlSource)).toEqual({
      kind: 'markdown-url',
      href: 'https://example.com/docs/a.md',
      hash: ''
    })
    expect(resolveLink('../b.md', urlSource)).toEqual({
      kind: 'markdown-url',
      href: 'https://example.com/b.md',
      hash: ''
    })
    expect(resolveLink('sub/c.md', urlSource)).toEqual({
      kind: 'markdown-url',
      href: 'https://example.com/docs/sub/c.md',
      hash: ''
    })
    expect(resolveLink('/root.md', urlSource)).toEqual({
      kind: 'markdown-url',
      href: 'https://example.com/root.md',
      hash: ''
    })
  })

  it('keeps the fragment and the query', () => {
    expect(resolveLink('a.md#section', urlSource)).toEqual({
      kind: 'markdown-url',
      href: 'https://example.com/docs/a.md',
      hash: 'section'
    })
    expect(resolveLink('a.md?x=1', urlSource)).toEqual({
      kind: 'markdown-url',
      href: 'https://example.com/docs/a.md?x=1',
      hash: ''
    })
  })

  it('keeps encoded spaces', () => {
    expect(resolveLink('a%20b.md', urlSource)).toEqual({
      kind: 'markdown-url',
      href: 'https://example.com/docs/a%20b.md',
      hash: ''
    })
  })

  it('treats a bare fragment as the current document', () => {
    expect(resolveLink('#top', urlSource)).toEqual({
      kind: 'markdown-url',
      href: 'https://example.com/docs/README.md',
      hash: 'top'
    })
  })

  it('treats .mdx and non-markdown links as external', () => {
    expect(resolveLink('other.mdx', urlSource)).toEqual({
      kind: 'external',
      href: 'https://example.com/docs/other.mdx'
    })
    expect(resolveLink('image.png', urlSource)).toEqual({
      kind: 'external',
      href: 'https://example.com/docs/image.png'
    })
    expect(resolveLink('mailto:x@y.z', urlSource)).toEqual({ kind: 'external', href: 'mailto:x@y.z' })
  })

  it('normalizes a GitHub page URL to raw', () => {
    expect(resolveLink('https://github.com/o/r/blob/main/a.md', urlSource)).toEqual({
      kind: 'markdown-url',
      href: 'https://raw.githubusercontent.com/o/r/main/a.md',
      hash: ''
    })
  })
})

describe('resolveLink — local mode', () => {
  it('resolves sibling, parent, nested and root links', () => {
    expect(resolveLink('./a.md', localSource)).toEqual({
      kind: 'markdown-local',
      path: 'sub/a.md',
      hash: ''
    })
    expect(resolveLink('../b.md', localSource)).toEqual({
      kind: 'markdown-local',
      path: 'b.md',
      hash: ''
    })
    expect(resolveLink('sub/d.md', localSource)).toEqual({
      kind: 'markdown-local',
      path: 'sub/sub/d.md',
      hash: ''
    })
    expect(resolveLink('/root.md', localSource)).toEqual({
      kind: 'markdown-local',
      path: 'root.md',
      hash: ''
    })
  })

  it('keeps the fragment, drops the query, decodes spaces', () => {
    expect(resolveLink('a.md#section', localSource)).toEqual({
      kind: 'markdown-local',
      path: 'sub/a.md',
      hash: 'section'
    })
    expect(resolveLink('a.md?x=1', localSource)).toEqual({
      kind: 'markdown-local',
      path: 'sub/a.md',
      hash: ''
    })
    expect(resolveLink('a%20b.md', localSource)).toEqual({
      kind: 'markdown-local',
      path: 'sub/a b.md',
      hash: ''
    })
  })

  it('treats a bare fragment as the current document', () => {
    expect(resolveLink('#top', localSource)).toEqual({
      kind: 'markdown-local',
      path: 'sub/c.md',
      hash: 'top'
    })
  })

  it('treats .mdx, non-markdown and absolute URLs as external', () => {
    expect(resolveLink('other.mdx', localSource)).toEqual({ kind: 'external', href: 'other.mdx' })
    expect(resolveLink('https://example.com/x.md', localSource)).toEqual({
      kind: 'markdown-url',
      href: 'https://example.com/x.md',
      hash: ''
    })
  })
})

describe('resolveImage', () => {
  it('resolves remote images against a URL source', () => {
    expect(resolveImage('img/pic.png', urlSource)).toEqual({
      kind: 'remote',
      src: 'https://example.com/docs/img/pic.png'
    })
    expect(resolveImage('https://cdn.example.net/x.png', urlSource)).toEqual({
      kind: 'remote',
      src: 'https://cdn.example.net/x.png'
    })
  })

  it('resolves local images to bundle paths', () => {
    expect(resolveImage('../img/pic.png', localSource)).toEqual({
      kind: 'local',
      path: 'img/pic.png'
    })
    expect(resolveImage('pic.png', localSource)).toEqual({ kind: 'local', path: 'sub/pic.png' })
    expect(resolveImage('img%20x.png', localSource)).toEqual({
      kind: 'local',
      path: 'sub/img x.png'
    })
  })

  it('keeps remote images remote in local mode', () => {
    expect(resolveImage('https://cdn.example.net/x.png', localSource)).toEqual({
      kind: 'remote',
      src: 'https://cdn.example.net/x.png'
    })
  })
})
