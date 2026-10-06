import { tasklist } from '@mdit/plugin-tasklist'
import DOMPurify from 'dompurify'
import GitHubSlugger from 'github-slugger'
import MarkdownIt from 'markdown-it'
import type { Token } from 'markdown-it'
import anchor from 'markdown-it-anchor'
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

export function render(markdown: string, source: Source): RenderResult {
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

  const raw = md.renderer.render(tokens, md.options, {})
  const html = DOMPurify.sanitize(raw, {
    ADD_TAGS: ['input'],
    ADD_ATTR: ['checked']
  })

  return { html, title: headings.find((h) => h.level === 1)?.text || title, headings }
}
