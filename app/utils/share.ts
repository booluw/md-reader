import type { Source } from './source'

export const LOCAL_SHARE_MESSAGE =
  "Uploaded files stay on your device, so they can't be shared. Share a web link to the file instead."

export function buildShareUrl(origin: string, source: Source, activeId = ''): string {
  if (source.kind === 'local') return ''
  const base = `${origin}/read?src=${encodeURIComponent(source.href)}`
  return activeId === '' ? base : `${base}#${activeId}`
}
