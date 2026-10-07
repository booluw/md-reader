import { computed, ref } from 'vue'

export type ThemePreference = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'md-reader:theme'

const preference = ref<ThemePreference>('system')
const systemDark = ref(false)
let initialized = false

function readStored(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value === 'light' || value === 'dark') return value
  } catch {
    // Best-effort: storage may be blocked.
  }
  return 'system'
}

const resolvedTheme = computed<'light' | 'dark'>(() => {
  if (preference.value === 'system') return systemDark.value ? 'dark' : 'light'
  return preference.value
})

function apply(): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = resolvedTheme.value
  }
}

function init(): void {
  if (initialized || typeof window === 'undefined') return
  initialized = true
  preference.value = readStored()
  if (typeof window.matchMedia === 'function') {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    systemDark.value = query.matches
    query.addEventListener('change', (event) => {
      systemDark.value = event.matches
      if (preference.value === 'system') apply()
    })
  }
  apply()
}

export function useTheme(): {
  preference: typeof preference
  resolvedTheme: typeof resolvedTheme
  setTheme: (next: ThemePreference) => void
  toggleTheme: () => void
} {
  init()

  function setTheme(next: ThemePreference): void {
    preference.value = next
    try {
      if (next === 'system') localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Best-effort: a blocked storage only loses the preference.
    }
    apply()
  }

  function toggleTheme(): void {
    setTheme(resolvedTheme.value === 'dark' ? 'light' : 'dark')
  }

  return { preference, resolvedTheme, setTheme, toggleTheme }
}

export function resetTheme(): void {
  preference.value = 'system'
  systemDark.value = false
  initialized = false
  if (typeof document !== 'undefined') delete document.documentElement.dataset.theme
}
