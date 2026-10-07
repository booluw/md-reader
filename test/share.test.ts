import { describe, expect, it } from 'vitest'
import { LOCAL_SHARE_MESSAGE, buildShareUrl } from '../app/utils/share'
import type { Source } from '../app/utils/source'

const url: Source = { kind: 'url', href: 'https://example.com/docs/README.md' }
const local: Source = { kind: 'local', bundleId: 'abc', path: 'docs/README.md' }

describe('buildShareUrl', () => {
  it('encodes the source into a reader link', () => {
    expect(buildShareUrl('https://md.example', url)).toBe(
      'https://md.example/read?src=https%3A%2F%2Fexample.com%2Fdocs%2FREADME.md'
    )
  })

  it('appends the active heading fragment', () => {
    expect(buildShareUrl('https://md.example', url, 'getting-started')).toBe(
      'https://md.example/read?src=https%3A%2F%2Fexample.com%2Fdocs%2FREADME.md#getting-started'
    )
  })

  it('returns no link for local uploads', () => {
    expect(buildShareUrl('https://md.example', local)).toBe('')
  })

  it('documents the local-share explanation', () => {
    expect(LOCAL_SHARE_MESSAGE).toBe(
      "Uploaded files stay on your device, so they can't be shared. Share a web link to the file instead."
    )
  })
})
