// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  RECENT_LIMIT,
  addRecent,
  clearRecent,
  loadRecent,
  saveRecent
} from '../app/utils/recent-urls'

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe('addRecent', () => {
  it('puts the newest URL first', () => {
    expect(addRecent(['https://a.com/1.md'], 'https://b.com/2.md')).toEqual([
      'https://b.com/2.md',
      'https://a.com/1.md'
    ])
  })

  it('moves an existing URL to the front instead of duplicating it', () => {
    expect(addRecent(['https://a.com/1.md', 'https://b.com/2.md'], 'https://b.com/2.md')).toEqual([
      'https://b.com/2.md',
      'https://a.com/1.md'
    ])
  })

  it(`caps the list at ${RECENT_LIMIT} entries`, () => {
    let list: string[] = []
    for (let i = 0; i < 15; i += 1) {
      list = addRecent(list, `https://example.com/${i}.md`)
    }
    expect(list).toHaveLength(RECENT_LIMIT)
    expect(list[0]).toBe('https://example.com/14.md')
    expect(list).not.toContain('https://example.com/0.md')
  })
})

describe('storage persistence', () => {
  it('round-trips through localStorage', () => {
    const list = ['https://example.com/a.md', 'https://example.com/b.md']
    saveRecent(list)
    expect(loadRecent()).toEqual(list)
  })

  it('returns an empty list when nothing is stored', () => {
    expect(loadRecent()).toEqual([])
  })

  it('returns an empty list for corrupted JSON', () => {
    window.localStorage.setItem('md-reader:recent-urls', '{not json')
    expect(loadRecent()).toEqual([])
  })

  it('returns an empty list for non-array JSON', () => {
    window.localStorage.setItem('md-reader:recent-urls', '{"a":1}')
    expect(loadRecent()).toEqual([])
  })

  it('drops non-string entries', () => {
    window.localStorage.setItem(
      'md-reader:recent-urls',
      JSON.stringify(['https://example.com/a.md', 42, null])
    )
    expect(loadRecent()).toEqual(['https://example.com/a.md'])
  })

  it('does not throw when localStorage writes fail', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    })
    expect(() => saveRecent(['https://example.com/a.md'])).not.toThrow()
  })

  it('does not throw when localStorage reads fail', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    expect(loadRecent()).toEqual([])
  })

  it('clearRecent removes the stored list', () => {
    saveRecent(['https://example.com/a.md'])
    clearRecent()
    expect(loadRecent()).toEqual([])
  })

  it('does not throw when clear fails', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('denied')
    })
    expect(() => clearRecent()).not.toThrow()
  })
})
