import { describe, expect, it } from 'vitest'
import { selectActiveId } from '../app/composables/useActiveHeading'

describe('selectActiveId', () => {
  it('picks the topmost visible heading', () => {
    expect(
      selectActiveId([
        { id: 'a', top: 300 },
        { id: 'b', top: 40 },
        { id: 'c', top: 120 }
      ])
    ).toBe('b')
  })

  it('returns an empty id when nothing is visible', () => {
    expect(selectActiveId([])).toBe('')
  })

  it('keeps the first heading when positions tie', () => {
    expect(
      selectActiveId([
        { id: 'a', top: 10 },
        { id: 'b', top: 10 }
      ])
    ).toBe('a')
  })
})
