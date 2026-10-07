// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render } from '../app/utils/markdown'
import type { Source } from '../app/utils/source'

const urlSource: Source = { kind: 'url', href: 'https://example.com/docs/README.md' }

describe('GFM support', () => {
  it('renders tables', () => {
    const { html } = render('| a | b |\n| --- | --- |\n| 1 | 2 |', urlSource)
    expect(html).toContain('<table>')
    expect(html).toContain('<td>1</td>')
  })

  it('renders task lists with checkboxes', () => {
    const { html } = render('- [x] done\n- [ ] todo', urlSource)
    expect(html).toContain('type="checkbox"')
    expect(html).toMatch(/checked/)
    expect(html).toContain('todo')
  })

  it('renders strikethrough', () => {
    expect(render('~~gone~~', urlSource).html).toMatch(/<s>gone<\/s>/)
  })

  it('linkifies bare URLs as external links', () => {
    const { html } = render('see https://example.com/a', urlSource)
    expect(html).toContain('href="https://example.com/a"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
  })

  it('renders fenced code with a language class', () => {
    const { html } = render('```js\nconst a = 1\n```', urlSource)
    expect(html).toContain('language-js')
    expect(html).toContain('const a = 1')
  })
})

describe('sanitization', () => {
  it('removes script tags', () => {
    expect(render('before <script>alert(1)</script> after', urlSource).html).not.toContain(
      '<script'
    )
  })

  it('removes inline event handlers', () => {
    const { html } = render('<img src="x" onerror="alert(1)">', urlSource)
    expect(html).not.toContain('onerror')
  })

  it('never links javascript: markdown links', () => {
    const { html } = render('[click](javascript:alert(1))', urlSource)
    expect(html).not.toMatch(/href="javascript:/i)
  })

  it('never links vbscript: markdown links', () => {
    const { html } = render('[click](vbscript:msgbox)', urlSource)
    expect(html).not.toMatch(/href="vbscript:/i)
  })

  it('never links non-image data: markdown URLs', () => {
    const { html } = render('[x](data:text/html;base64,PHNjcmlwdD4=)', urlSource)
    expect(html).not.toMatch(/href="data:(?!image)/i)
  })

  it('removes javascript: URLs from raw HTML', () => {
    const { html } = render('<a href="javascript:alert(1)">x</a>', urlSource)
    expect(html).not.toContain('javascript:')
  })

  it('removes vbscript: URLs from raw HTML', () => {
    const { html } = render('<a href="vbscript:evil">x</a>', urlSource)
    expect(html).not.toContain('vbscript:')
  })

  it('keeps data: URLs on images', () => {
    const { html } = render('![x](data:image/png;base64,iVBORw0KGgo=)', urlSource)
    expect(html).toContain('data:image/png')
  })
})

describe('link resolution', () => {
  const localSource: Source = { kind: 'local', bundleId: 'b1', path: 'sub/c.md' }

  it('rewrites markdown links to in-app URL routes', () => {
    const { html } = render('[next](./a.md)', urlSource)
    expect(html).toContain('href="/read?src=https%3A%2F%2Fexample.com%2Fdocs%2Fa.md"')
    expect(html).toContain('data-md-kind="url"')
  })

  it('keeps the fragment in the route', () => {
    const { html } = render('[next](./a.md#section)', urlSource)
    expect(html).toContain('href="/read?src=https%3A%2F%2Fexample.com%2Fdocs%2Fa.md#section"')
  })

  it('opens external links in a new tab with rel and an indicator class', () => {
    const { html } = render('[x](./image.png)', urlSource)
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
    expect(html).toContain('md-external')
  })

  it('rewrites local markdown links to the local route', () => {
    const { html } = render('[next](../b.md#frag)', localSource)
    expect(html).toContain('href="/read?local=b1&amp;path=b.md#frag"')
    expect(html).toContain('data-md-kind="local"')
    expect(html).toContain('data-md-path="b.md"')
  })

  it('flags local links missing from the upload', () => {
    const { html } = render('[gone](../nope.md)', localSource, new Set(['sub/c.md']))
    expect(html).toContain('md-missing')
    expect(html).toContain('data-md-missing="nope.md"')
    expect(html).toContain('title="Not in this upload"')
  })

  it('does not flag present local links', () => {
    const { html } = render('[ok](../b.md)', localSource, new Set(['sub/c.md', 'b.md']))
    expect(html).not.toContain('md-missing')
  })

  it('resolves local images to data attributes with no-referrer', () => {
    const { html } = render('![pic](../img/pic.png)', localSource)
    expect(html).toContain('data-md-local-src="img/pic.png"')
    expect(html).not.toContain(' src="')
    expect(html).toContain('referrerpolicy="no-referrer"')
  })

  it('keeps remote images as src with no-referrer', () => {
    const { html } = render('![pic](https://cdn.example.net/x.png)', localSource)
    expect(html).toContain('src="https://cdn.example.net/x.png"')
    expect(html).toContain('referrerpolicy="no-referrer"')
  })
})

describe('headings', () => {
  it('assigns stable slug ids', () => {
    const { headings } = render('## Getting Started\n\n## Getting Started', urlSource)
    expect(headings.map((h) => h.id)).toEqual(['getting-started', 'getting-started-1'])
  })

  it('puts the same id on the rendered element', () => {
    const { html } = render('## Getting Started', urlSource)
    expect(html).toContain('<h2 id="getting-started"')
  })

  it('extracts plain text, not markup', () => {
    const { headings } = render('## Using `render` with **bold**', urlSource)
    expect(headings).toEqual([
      { level: 2, text: 'Using render with bold', id: 'using-render-with-bold' }
    ])
  })

  it('is deterministic across calls', () => {
    const md = '# A\n\n## B\n'
    expect(render(md, urlSource)).toEqual(render(md, urlSource))
  })
})

describe('title', () => {
  it('uses the first H1', () => {
    expect(render('# My Document\n\ntext', urlSource).title).toBe('My Document')
  })

  it('falls back to the URL filename when there is no H1', () => {
    expect(render('## Sub', urlSource).title).toBe('README.md')
  })

  it('strips query strings from the filename', () => {
    const source: Source = { kind: 'url', href: 'https://example.com/a/post.md?raw=1' }
    expect(render('## Sub', source).title).toBe('post.md')
  })

  it('decodes the local path filename', () => {
    const source: Source = { kind: 'local', bundleId: 'b1', path: '/notes/My%20Notes.md' }
    expect(render('## Sub', source).title).toBe('My Notes.md')
  })
})

describe('empty input', () => {
  it('returns empty html and keeps the filename title', () => {
    expect(render('   \n\n', urlSource)).toEqual({
      html: '',
      title: 'README.md',
      headings: []
    })
  })
})
