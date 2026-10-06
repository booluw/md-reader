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
})
