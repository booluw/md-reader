// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearScrollPositions,
  recordScrollPosition,
  restoreScrollPosition,
  scrollToHash,
  storedScrollPosition
} from '../app/utils/scroll-restoration'

beforeEach(() => {
  clearScrollPositions()
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('scroll positions', () => {
  it('records and reads a position per key', () => {
    recordScrollPosition('/read?src=a', 120)
    recordScrollPosition('/read?src=b', 300)
    expect(storedScrollPosition('/read?src=a')).toBe(120)
    expect(storedScrollPosition('/read?src=b')).toBe(300)
  })

  it('restores a stored position, defaulting to the top', () => {
    const scrollTo = vi.fn()
    vi.stubGlobal('scrollTo', scrollTo)
    scrollTo.mockClear()
    Object.defineProperty(window, 'scrollTo', { value: scrollTo, configurable: true })

    recordScrollPosition('/read?src=a', 240)
    restoreScrollPosition('/read?src=a')
    expect(scrollTo).toHaveBeenCalledWith(0, 240)

    restoreScrollPosition('/read?src=missing')
    expect(scrollTo).toHaveBeenLastCalledWith(0, 0)
  })
})

describe('scrollToHash', () => {
  it('scrolls to a matching element and reports success', () => {
    const element = document.createElement('h2')
    element.id = 'getting-started'
    const scrollIntoView = vi.fn()
    element.scrollIntoView = scrollIntoView
    document.body.append(element)

    expect(scrollToHash('#getting-started')).toBe(true)
    expect(scrollIntoView).toHaveBeenCalled()
  })

  it('decodes the fragment and reports failure when missing', () => {
    expect(scrollToHash('#nope')).toBe(false)
    expect(scrollToHash('#')).toBe(false)
  })
})
