import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useToast } from '../app/composables/useToast'

const { message, showToast, clearToast } = useToast()

beforeEach(() => {
  vi.useFakeTimers()
  clearToast()
})

afterEach(() => {
  clearToast()
  vi.useRealTimers()
})

describe('useToast', () => {
  it('shows a message and auto-clears it', () => {
    showToast('Link copied')
    expect(message.value).toBe('Link copied')
    vi.advanceTimersByTime(3000)
    expect(message.value).toBe('')
  })

  it('resets the timer when shown again', () => {
    showToast('first')
    vi.advanceTimersByTime(2000)
    showToast('second')
    vi.advanceTimersByTime(2000)
    expect(message.value).toBe('second')
    vi.advanceTimersByTime(1000)
    expect(message.value).toBe('')
  })

  it('keeps a message when the duration is zero', () => {
    showToast('sticky', 0)
    vi.advanceTimersByTime(10000)
    expect(message.value).toBe('sticky')
  })

  it('clears immediately on demand', () => {
    showToast('gone')
    clearToast()
    expect(message.value).toBe('')
  })
})
