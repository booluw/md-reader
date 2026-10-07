export type Source =
  | { kind: 'url'; href: string }
  | { kind: 'local'; bundleId: string; path: string }

function urlPathname(href: string): { pathname: string; host: string } {
  try {
    const url = new URL(href)
    return { pathname: url.pathname, host: url.host }
  } catch {
    const withoutHash = href.split('#')[0] ?? ''
    const pathname = withoutHash.split('?')[0] ?? ''
    return { pathname, host: '' }
  }
}

function decode(segment: string): string {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

export function sourceFilename(source: Source): string {
  if (source.kind === 'local') {
    const segment = source.path.split('/').filter(Boolean).at(-1) ?? ''
    return decode(segment) || 'untitled'
  }
  const { pathname, host } = urlPathname(source.href)
  const segment = pathname.split('/').filter(Boolean).at(-1) ?? ''
  return decode(segment) || host || 'untitled'
}

export function sourceBreadcrumb(source: Source): string[] {
  if (source.kind === 'local') {
    return source.path.split('/').filter(Boolean).map(decode)
  }
  return urlPathname(source.href)
    .pathname.split('/')
    .filter(Boolean)
    .map(decode)
}
