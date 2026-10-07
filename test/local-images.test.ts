// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hydrateLocalImages, revokeLocalImages } from '../app/utils/local-images'

const createObjectURL = vi.fn(() => 'blob:mock')
const revokeObjectURL = vi.fn()

beforeEach(() => {
  createObjectURL.mockClear()
  revokeObjectURL.mockClear()
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }))
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

function image(path: string): HTMLImageElement {
  const img = document.createElement('img')
  img.setAttribute('data-md-local-src', path)
  document.body.append(img)
  return img
}

describe('hydrateLocalImages', () => {
  it('sets a blob URL for files present in the bundle', () => {
    const img = image('img/pic.png')
    const urls = hydrateLocalImages(document.body, { 'img/pic.png': new Blob(['x']) })
    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(img.src).toContain('blob:mock')
    expect(urls).toEqual(['blob:mock'])
  })

  it('marks images missing from the bundle', () => {
    const img = image('img/gone.png')
    const urls = hydrateLocalImages(document.body, {})
    expect(createObjectURL).not.toHaveBeenCalled()
    expect(img.dataset.mdMissing).toBe('img/gone.png')
    expect(urls).toEqual([])
  })
})

describe('revokeLocalImages', () => {
  it('revokes every given URL', () => {
    revokeLocalImages(['blob:a', 'blob:b'])
    expect(revokeObjectURL).toHaveBeenCalledTimes(2)
  })

  it('balances create and revoke across 20 navigations (no leak)', () => {
    image('img/pic.png')
    const files = { 'img/pic.png': new Blob(['x']) }
    for (let index = 0; index < 20; index += 1) {
      revokeLocalImages(hydrateLocalImages(document.body, files))
    }
    expect(createObjectURL).toHaveBeenCalledTimes(20)
    expect(revokeObjectURL).toHaveBeenCalledTimes(20)
  })
})
