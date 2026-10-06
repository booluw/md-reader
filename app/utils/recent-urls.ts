const STORAGE_KEY = 'md-reader:recent-urls'
export const RECENT_LIMIT = 10

export function addRecent(list: string[], href: string): string[] {
  return [href, ...list.filter((item) => item !== href)].slice(0, RECENT_LIMIT)
}

export function loadRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item): item is string => typeof item === 'string')
      .slice(0, RECENT_LIMIT)
  } catch {
    return []
  }
}

export function saveRecent(list: string[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
  }
}

export function clearRecent(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
  }
}
