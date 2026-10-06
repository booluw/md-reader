import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { loadNuxtConfig } from '@nuxt/kit'
import { describe, expect, it } from 'vitest'

const projectRoot = fileURLToPath(new URL('..', import.meta.url))

describe('project scaffold', () => {
  it('disables server-side rendering (D1)', async () => {
    const options = await loadNuxtConfig({ cwd: projectRoot })
    expect(options.ssr).toBe(false)
  })

  it('has no server/ directory — no Nitro runtime, no API routes (D1)', () => {
    expect(existsSync(`${projectRoot}server`)).toBe(false)
  })
})
