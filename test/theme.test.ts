// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetTheme, useTheme } from '../app/composables/useTheme'

type Listener = (event: { matches: boolean }) => void

function stubMatchMedia(matches: boolean): { emit: (value: boolean) => void } {
  let listener: Listener | undefined
  const mql = {
    matches,
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_type: string, callback: Listener) => {
      listener = callback
    },
    removeEventListener: () => {}
  }
  const factory = vi.fn(() => mql)
  vi.stubGlobal('matchMedia', factory)
  Object.defineProperty(window, 'matchMedia', { value: factory, configurable: true })
  return { emit: (value: boolean) => listener?.({ matches: value }) }
}

beforeEach(() => {
  localStorage.clear()
  resetTheme()
  document.documentElement.removeAttribute('data-theme')
})

describe('useTheme', () => {
  it('defaults to the system preference', () => {
    stubMatchMedia(true)
    const { preference, resolvedTheme } = useTheme()
    expect(preference.value).toBe('system')
    expect(resolvedTheme.value).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('persists an explicit choice and applies it', () => {
    stubMatchMedia(false)
    const { resolvedTheme, setTheme } = useTheme()
    setTheme('dark')
    expect(resolvedTheme.value).toBe('dark')
    expect(localStorage.getItem('md-reader:theme')).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('toggles between light and dark', () => {
    stubMatchMedia(false)
    const { resolvedTheme, toggleTheme } = useTheme()
    expect(resolvedTheme.value).toBe('light')
    toggleTheme()
    expect(resolvedTheme.value).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    toggleTheme()
    expect(resolvedTheme.value).toBe('light')
  })

  it('follows system changes while in system mode', () => {
    const media = stubMatchMedia(false)
    const { resolvedTheme } = useTheme()
    expect(resolvedTheme.value).toBe('light')
    media.emit(true)
    expect(resolvedTheme.value).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('ignores system changes once a manual choice is made', () => {
    const media = stubMatchMedia(false)
    const { resolvedTheme, setTheme } = useTheme()
    setTheme('light')
    media.emit(true)
    expect(resolvedTheme.value).toBe('light')
  })
})
