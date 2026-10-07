import { onBeforeUnmount, ref, watch, type Ref } from 'vue'
import type { Heading } from '../utils/markdown'

export interface VisibleHeading {
  id: string
  top: number
}

export function selectActiveId(visible: readonly VisibleHeading[]): string {
  let active = ''
  let activeTop = Number.POSITIVE_INFINITY
  for (const entry of visible) {
    if (entry.top < activeTop) {
      activeTop = entry.top
      active = entry.id
    }
  }
  return active
}

export function useActiveHeading(
  headings: Ref<Heading[]>,
  enabled: Ref<boolean>
): { activeId: Ref<string> } {
  const activeId = ref('')
  const visible = new Map<string, number>()
  let observer: IntersectionObserver | null = null
  let frame: number | null = null

  function measure(): void {
    const entries: VisibleHeading[] = []
    for (const id of visible.keys()) {
      const element = document.getElementById(id)
      if (element) entries.push({ id, top: element.getBoundingClientRect().top })
    }
    activeId.value = selectActiveId(entries)
  }

  function scheduleMeasure(): void {
    if (frame !== null) return
    frame = requestAnimationFrame(() => {
      frame = null
      measure()
    })
  }

  function stop(): void {
    observer?.disconnect()
    observer = null
    visible.clear()
    if (frame !== null) {
      cancelAnimationFrame(frame)
      frame = null
    }
  }

  function start(): void {
    stop()
    activeId.value = ''
    if (!enabled.value || typeof IntersectionObserver === 'undefined') return
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).id
          if (entry.isIntersecting) visible.set(id, entry.boundingClientRect.top)
          else visible.delete(id)
        }
        scheduleMeasure()
      },
      { rootMargin: '0px 0px -70% 0px', threshold: 0 }
    )
    for (const heading of headings.value) {
      const element = document.getElementById(heading.id)
      if (element) observer.observe(element)
    }
  }

  watch([headings, enabled], () => start(), { flush: 'post' })
  onBeforeUnmount(stop)

  return { activeId }
}
