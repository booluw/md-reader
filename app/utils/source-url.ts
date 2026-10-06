export type SourceValidation = { href: string } | { error: string }

export const PROTOCOL_ERROR = 'Enter a full http:// or https:// URL.'
export const EXTENSION_ERROR = 'Only .md and .markdown files are supported.'

const MARKDOWN_EXTENSIONS = new Set(['md', 'markdown'])

export function pathnameExtension(pathname: string): string {
  const segment = pathname.split('/').filter(Boolean).at(-1) ?? ''
  const dot = segment.lastIndexOf('.')
  return dot === -1 ? '' : segment.slice(dot + 1).toLowerCase()
}

export function hasMarkdownExtension(pathname: string): boolean {
  return MARKDOWN_EXTENSIONS.has(pathnameExtension(pathname))
}

export function normalizeSourceUrl(url: URL): string {
  const host = url.hostname.toLowerCase()

  if (host === 'github.com' || host === 'www.github.com') {
    const match = url.pathname.match(/^\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/)
    if (match) {
      const [, owner, repo, ref, path] = match
      return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`
    }
  }

  if (host === 'gist.github.com') {
    const match = url.pathname.match(/^\/([^/]+)\/([^/]+)\/?$/)
    if (match) {
      const [, user, id] = match
      return `https://gist.githubusercontent.com/${user}/${id}/raw`
    }
  }

  if (host === 'gitlab.com' || host === 'www.gitlab.com') {
    const marker = '/-/blob/'
    const index = url.pathname.indexOf(marker)
    if (index !== -1) {
      const project = url.pathname.slice(0, index)
      const rest = url.pathname.slice(index + marker.length)
      return `https://gitlab.com${project}/-/raw/${rest}`
    }
  }

  return url.href
}

export function validateSourceInput(value: string): SourceValidation {
  const trimmed = value.trim()
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return { error: PROTOCOL_ERROR }
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { error: PROTOCOL_ERROR }
  }
  const extension = pathnameExtension(url.pathname)
  if (extension !== '' && !MARKDOWN_EXTENSIONS.has(extension)) {
    return { error: EXTENSION_ERROR }
  }
  return { href: normalizeSourceUrl(url) }
}
