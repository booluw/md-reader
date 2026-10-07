import { describe, expect, it } from 'vitest'
import { buildFileTree } from '../app/utils/file-tree'

describe('buildFileTree', () => {
  it('lists flat files alphabetically', () => {
    expect(buildFileTree(['b.md', 'a.md'])).toEqual([
      { type: 'file', name: 'a.md', path: 'a.md' },
      { type: 'file', name: 'b.md', path: 'b.md' }
    ])
  })

  it('groups nested files under folders with folders first', () => {
    const tree = buildFileTree(['README.md', 'docs/guide.md', 'docs/api/ref.md', 'z.md'])
    expect(tree.map((entry) => entry.name)).toEqual(['docs', 'README.md', 'z.md'])
    const docs = tree[0]
    expect(docs?.type).toBe('folder')
    if (docs?.type === 'folder') {
      expect(docs.children.map((entry) => entry.name)).toEqual(['api', 'guide.md'])
    }
  })

  it('drops empty segments', () => {
    expect(buildFileTree(['/a.md', '', 'a.md'])).toEqual([
      { type: 'file', name: 'a.md', path: '/a.md' },
      { type: 'file', name: 'a.md', path: 'a.md' }
    ])
  })
})
