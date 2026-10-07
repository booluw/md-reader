import type { Source } from './source'
import { hasMarkdownExtension, normalizeSourceUrl } from './source-url'

export type ResolvedLink =
  | { kind: 'markdown-url'; href: string; hash: string }
  | { kind: 'markdown-local'; path: string; hash: string }
  | { kind: 'external'; href: string }

export type ResolvedImage = { kind: 'remote'; src: string } | { kind: 'local'; path: string }

export interface HrefParts {
  path: string
  query: string
  hash: string
}

const SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i

function hasScheme(value: string): boolean {
  return SCHEME_PATTERN.test(value)
}

export function splitHref(href: string): HrefParts {
  let rest = href
  let hash = ''
  const hashIndex = rest.indexOf('#')
  if (hashIndex !== -1) {
    hash = rest.slice(hashIndex + 1)
    rest = rest.slice(0, hashIndex)
  }
  let query = ''
  const queryIndex = rest.indexOf('?')
  if (queryIndex !== -1) {
    query = rest.slice(queryIndex + 1)
    rest = rest.slice(0, queryIndex)
  }
  return { path: rest, query, hash }
}

function decodePath(path: string): string {
  try {
    return decodeURIComponent(path)
  } catch {
    return path
  }
}

function dirname(path: string): string {
  const index = path.lastIndexOf('/')
  return index === -1 ? '' : path.slice(0, index)
}

export function normalizePosix(path: string): string {
  const absolute = path.startsWith('/')
  const segments: string[] = []
  for (const part of path.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') {
      if (segments.length > 0 && segments[segments.length - 1] !== '..') segments.pop()
      else if (!absolute) segments.push('..')
      continue
    }
    segments.push(part)
  }
  return (absolute ? '/' : '') + segments.join('/')
}

export function bundlePathFor(currentPath: string, relative: string): string {
  const target = relative.startsWith('/') ? relative : `${dirname(currentPath)}/${relative}`
  return normalizePosix(target).replace(/^\//, '')
}

function withoutHash(url: URL): URL {
  const clean = new URL(url.href)
  clean.hash = ''
  return clean
}

function absoluteLink(href: string): ResolvedLink {
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return { kind: 'external', href }
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { kind: 'external', href }
  }
  if (!hasMarkdownExtension(url.pathname)) {
    return { kind: 'external', href: url.href }
  }
  return { kind: 'markdown-url', href: normalizeSourceUrl(withoutHash(url)), hash: url.hash.slice(1) }
}

function resolveUrlLink(href: string, source: { kind: 'url'; href: string }): ResolvedLink {
  if (hasScheme(href) || href.startsWith('//')) return absoluteLink(href)
  let target: URL
  try {
    target = new URL(href, source.href)
  } catch {
    return { kind: 'external', href }
  }
  if (!hasMarkdownExtension(target.pathname)) {
    return { kind: 'external', href: target.href }
  }
  return {
    kind: 'markdown-url',
    href: normalizeSourceUrl(withoutHash(target)),
    hash: target.hash.slice(1)
  }
}

function resolveLocalLink(
  href: string,
  source: { kind: 'local'; bundleId: string; path: string }
): ResolvedLink {
  if (hasScheme(href) || href.startsWith('//')) return absoluteLink(href)
  const { path, query, hash } = splitHref(href)
  if (path === '' && query === '') {
    return { kind: 'markdown-local', path: source.path, hash }
  }
  const candidate = decodePath(path)
  if (!hasMarkdownExtension(candidate)) {
    return { kind: 'external', href }
  }
  return { kind: 'markdown-local', path: bundlePathFor(source.path, candidate), hash }
}

export function resolveLink(href: string, source: Source): ResolvedLink {
  const trimmed = href.trim()
  if (trimmed === '') return { kind: 'external', href }
  if (source.kind === 'url') return resolveUrlLink(trimmed, source)
  return resolveLocalLink(trimmed, source)
}

export function resolveImage(src: string, source: Source): ResolvedImage {
  const trimmed = src.trim()
  if (source.kind === 'url') {
    try {
      return { kind: 'remote', src: new URL(trimmed, source.href).href }
    } catch {
      return { kind: 'remote', src: trimmed }
    }
  }
  if (hasScheme(trimmed) || trimmed.startsWith('//')) {
    return { kind: 'remote', src: trimmed }
  }
  const { path } = splitHref(trimmed)
  return { kind: 'local', path: bundlePathFor(source.path, decodePath(path)) }
}
