import { tasklist } from '@mdit/plugin-tasklist'
import DOMPurify from 'dompurify'
import GitHubSlugger from 'github-slugger'
import MarkdownIt from 'markdown-it'
import type { Token } from 'markdown-it'
import anchor from 'markdown-it-anchor'
import { resolveImage, resolveLink } from './markdown-links'
import type { Source } from './source'
import { sourceFilename } from './source'

export interface Heading {
  level: number
  text: string
  id: string
}

export interface RenderResult {
  html: string
  title: string
  headings: Heading[]
}

const PLAIN_TEXT_TYPES = new Set(['text', 'code_inline', 'text_special'])

function inlineText(token: Token | undefined): string {
  if (!token?.children) return token?.content ?? ''
  let text = ''
  for (const child of token.children) {
    if (PLAIN_TEXT_TYPES.has(child.type)) text += child.content
  }
  return text
}

function routeForUrl(href: string, hash: string): string {
  const query = `/read?src=${encodeURIComponent(href)}`
  return hash === '' ? query : `${query}#${hash}`
}

function routeForLocal(bundleId: string, path: string, hash: string): string {
  const query = `/read?local=${encodeURIComponent(bundleId)}&path=${encodeURIComponent(path)}`
  return hash === '' ? query : `${query}#${hash}`
}

function rewriteLink(token: Token, source: Source, files: ReadonlySet<string> | undefined): void {
  const resolved = resolveLink(String(token.attrGet('href') ?? ''), source)
  if (resolved.kind === 'external') {
    token.attrSet('href', resolved.href)
    token.attrSet('target', '_blank')
    token.attrSet('rel', 'noopener noreferrer')
    token.attrSet('class', 'md-link md-external')
    return
  }
  if (resolved.kind === 'markdown-url') {
    token.attrSet('href', routeForUrl(resolved.href, resolved.hash))
    token.attrSet('class', 'md-link md-internal')
    token.attrSet('data-md-kind', 'url')
    return
  }
  if (source.kind !== 'local') return
  token.attrSet('href', routeForLocal(source.bundleId, resolved.path, resolved.hash))
  token.attrSet('class', 'md-link md-internal')
  token.attrSet('data-md-kind', 'local')
  token.attrSet('data-md-path', resolved.path)
  if (files && !files.has(resolved.path)) {
    token.attrSet('class', 'md-link md-internal md-missing')
    token.attrSet('title', 'Not in this upload')
    token.attrSet('data-md-missing', resolved.path)
  }
}

function rewriteImage(token: Token, source: Source, files: ReadonlySet<string> | undefined): void {
  token.attrSet('referrerpolicy', 'no-referrer')
  const resolved = resolveImage(String(token.attrGet('src') ?? ''), source)
  if (resolved.kind === 'remote') {
    token.attrSet('src', resolved.src)
    token.attrSet('class', 'md-image')
    return
  }
  if (token.attrs) token.attrs = token.attrs.filter(([name]) => name !== 'src')
  token.attrSet('data-md-local-src', resolved.path)
  token.attrSet('class', 'md-image md-image-local')
  if (files && !files.has(resolved.path)) {
    token.attrSet('data-md-missing', resolved.path)
  }
}

function rewriteInline(children: Token[], source: Source, files?: ReadonlySet<string>): void {
  for (const child of children) {
    if (child.type === 'link_open') rewriteLink(child, source, files)
    else if (child.type === 'image') rewriteImage(child, source, files)
  }
}

export function render(
  markdown: string,
  source: Source,
  files?: ReadonlySet<string>
): RenderResult {
  const title = sourceFilename(source)
  if (!markdown.trim()) return { html: '', title, headings: [] }

  const slugger = new GitHubSlugger()
  const md = new MarkdownIt({ html: true, linkify: true })
  md.use(anchor, { slugify: (value: string) => slugger.slug(value) })
  md.use(tasklist)

  const tokens = md.parse(markdown, {})
  const headings: Heading[] = []
  for (const [index, token] of tokens.entries()) {
    if (token.type !== 'heading_open') continue
    headings.push({
      level: Number(token.tag.slice(1)),
      text: inlineText(tokens[index + 1]),
      id: String(token.attrGet('id') ?? '')
    })
  }

  for (const token of tokens) {
    if (token.type === 'inline' && token.children) rewriteInline(token.children, source, files)
  }

  const raw = md.renderer.render(tokens, md.options, {})
  const html = DOMPurify.sanitize(raw, {
    ADD_TAGS: ['input'],
    ADD_ATTR: ['checked', 'referrerpolicy', 'target'],
    FORBID_TAGS: ['style', 'template'],
    FORBID_ATTR: ['style'],
    KEEP_CONTENT: false
  })

  return { html, title: headings.find((h) => h.level === 1)?.text || title, headings }
}
