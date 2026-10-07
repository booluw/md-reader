const positions = new Map<string, number>()

export function recordScrollPosition(key: string, y: number): void {
  positions.set(key, y)
}

export function storedScrollPosition(key: string): number | undefined {
  return positions.get(key)
}

export function restoreScrollPosition(key: string): void {
  window.scrollTo(0, positions.get(key) ?? 0)
}

export function scrollToHash(hash: string): boolean {
  const id = decodeURIComponent(hash.replace(/^#/, ''))
  if (id === '') return false
  const element = document.getElementById(id)
  if (!element) return false
  element.scrollIntoView()
  return true
}

export function clearScrollPositions(): void {
  positions.clear()
}
