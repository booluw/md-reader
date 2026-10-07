// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import MarkdownView from '../app/components/MarkdownView.vue'
import type { Source } from '../app/utils/source'

const source: Source = { kind: 'url', href: 'https://example.com/README.md' }

describe('MarkdownView', () => {
  it('shows the empty state for a blank file', () => {
    const wrapper = mount(MarkdownView, { props: { markdown: ' \n\n', source } })
    expect(wrapper.text()).toBe('This file is empty')
  })

  it('renders sanitized markdown', () => {
    const wrapper = mount(MarkdownView, {
      props: { markdown: '# Hello <script>alert(1)</script>', source }
    })
    const heading = wrapper.find('h1')
    expect(heading.text()).toContain('Hello')
    expect(wrapper.html()).not.toContain('<script')
  })

  it('emits the render result with the document title', async () => {
    const wrapper = mount(MarkdownView, {
      props: { markdown: '# Readme Title', source }
    })
    const emitted = wrapper.emitted('rendered')
    expect(emitted).toBeTruthy()
    expect(emitted?.[0]?.[0]).toMatchObject({
      title: 'Readme Title',
      headings: [{ level: 1, text: 'Readme Title' }]
    })
  })

  it('renders code blocks unhighlighted first, then highlights lazily', async () => {
    const wrapper = mount(MarkdownView, {
      props: { markdown: '```js\nconst a = 1\n```', source }
    })
    const code = wrapper.find('code')
    expect(code.exists()).toBe(true)
    expect(code.html()).not.toContain('hljs-')

    await vi.waitFor(() => {
      expect(wrapper.find('code').html()).toContain('hljs-')
    })
  })

  it('emits navigate when an internal link is clicked', async () => {
    const wrapper = mount(MarkdownView, {
      props: { markdown: '[next](./a.md)', source }
    })
    await wrapper.find('a.md-internal').trigger('click')
    expect(wrapper.emitted('navigate')?.[0]?.[0]).toBe(
      '/read?src=https%3A%2F%2Fexample.com%2Fa.md'
    )
  })

  it('emits missing and does not navigate for a missing local link', async () => {
    const localSource: Source = { kind: 'local', bundleId: 'b1', path: 'sub/c.md' }
    const wrapper = mount(MarkdownView, {
      props: { markdown: '[gone](../nope.md)', source: localSource, files: {} }
    })
    await wrapper.find('a.md-missing').trigger('click')
    expect(wrapper.emitted('missing')?.[0]?.[0]).toBe('nope.md')
    expect(wrapper.emitted('navigate')).toBeUndefined()
  })

  it('does not intercept external links', async () => {
    const wrapper = mount(MarkdownView, {
      props: { markdown: '[x](./image.png)', source }
    })
    await wrapper.find('a.md-external').trigger('click')
    expect(wrapper.emitted('navigate')).toBeUndefined()
    expect(wrapper.emitted('missing')).toBeUndefined()
  })
})
