import type { RouterConfig } from '@nuxt/schema'

export default <RouterConfig>{
  scrollBehavior(to) {
    // The reader owns scrolling so it can restore after async content renders.
    if (to.path === '/read') return false
    return { top: 0 }
  }
}
