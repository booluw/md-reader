// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TableOfContents from '../app/components/TableOfContents.vue'
import type { Heading } from '../app/utils/markdown'

const headings: Heading[] = [
  { level: 1, text: 'Intro', id: 'intro' },
  { level: 2, text: 'Setup', id: 'setup' },
  { level: 3, text: 'Details', id: 'details' }
]

describe('TableOfContents', () => {
  it('lists a link per heading anchored to its id', () => {
    const wrapper = mount(TableOfContents, { props: { headings } })
    const links = wrapper.findAll('a')
    expect(links).toHaveLength(3)
    expect(links[1]?.attributes('href')).toBe('#setup')
    expect(links[1]?.text()).toBe('Setup')
  })

  it('marks the active heading', () => {
    const wrapper = mount(TableOfContents, { props: { headings, activeId: 'setup' } })
    const active = wrapper.findAll('a').filter((link) => link.attributes('aria-current') === 'true')
    expect(active).toHaveLength(1)
    expect(active[0]?.text()).toBe('Setup')
  })

  it('indents headings by depth', () => {
    const wrapper = mount(TableOfContents, { props: { headings } })
    const items = wrapper.findAll('li')
    expect(items[0]?.attributes('data-depth')).toBe('0')
    expect(items[1]?.attributes('data-depth')).toBe('1')
    expect(items[2]?.attributes('data-depth')).toBe('2')
    expect(items[0]?.attributes('style')).toBeUndefined()
  })
})
