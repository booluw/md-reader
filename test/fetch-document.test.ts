import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CORS_ERROR,
  MAX_FILE_BYTES,
  NON_TEXT_ERROR,
  NOT_FOUND_ERROR,
  SIZE_ERROR,
  fetchDocument,
  isAbortError
} from '../app/utils/fetch-document'

const MD_URL = 'https://example.com/docs/readme.md'
const EXTENSIONLESS_URL = 'https://example.com/docs/latest'

function makeResponse(options: {
  status?: number
  statusText?: string
  contentType?: string | null
  contentLength?: number | null
  body?: ReadableStream<Uint8Array> | null
  text?: string
}): Response {
  const headers = new Headers()
  if (options.contentType !== null) {
    headers.set('content-type', options.contentType ?? 'text/markdown')
  }
  if (typeof options.contentLength === 'number') {
    headers.set('content-length', String(options.contentLength))
  }
  const status = options.status ?? 200
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: options.statusText ?? '',
    headers,
    body: options.body ?? null,
    text: async () => options.text ?? ''
  } as unknown as Response
}

function byteStream(chunks: number, chunkSize: number): ReadableStream<Uint8Array> {
  let sent = 0
  return new ReadableStream({
    pull(controller) {
      if (sent >= chunks) {
        controller.close()
        return
      }
      sent += 1
      controller.enqueue(new Uint8Array(chunkSize))
    }
  })
}

function errorStream(error: Error): ReadableStream<Uint8Array> {
  return new ReadableStream({
    pull() {
      throw error
    }
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchDocument success', () => {
  it('returns the text for a markdown response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => makeResponse({ text: '# hello' }))
    )
    await expect(fetchDocument(MD_URL)).resolves.toEqual({ ok: true, text: '# hello' })
  })

  it('skips the content-type gate for .md URLs served as binary', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => makeResponse({ contentType: 'application/octet-stream', text: '# hi' }))
    )
    await expect(fetchDocument(MD_URL)).resolves.toEqual({ ok: true, text: '# hi' })
  })

  it('allows extensionless URLs with a text/* content type', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => makeResponse({ contentType: 'text/plain; charset=utf-8', text: 'hi' }))
    )
    await expect(fetchDocument(EXTENSIONLESS_URL)).resolves.toEqual({ ok: true, text: 'hi' })
  })
})

describe('fetchDocument errors', () => {
  it('maps a thrown network/CORS failure to the actionable message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))))
    await expect(fetchDocument(MD_URL)).resolves.toEqual({ ok: false, message: CORS_ERROR })
  })

  it('reports 404 distinctly', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => makeResponse({ status: 404, statusText: 'Not Found' }))
    )
    await expect(fetchDocument(MD_URL)).resolves.toEqual({ ok: false, message: NOT_FOUND_ERROR })
  })

  it('reports other non-2xx statuses with the status code', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => makeResponse({ status: 500, statusText: 'Server Error' }))
    )
    const result = await fetchDocument(MD_URL)
    expect(result).toEqual({
      ok: false,
      message: 'Request failed with status 500 Server Error.'
    })
  })

  it('rejects non-text content types for extensionless URLs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => makeResponse({ contentType: 'application/json', text: '{}' }))
    )
    await expect(fetchDocument(EXTENSIONLESS_URL)).resolves.toEqual({
      ok: false,
      message: NON_TEXT_ERROR
    })
  })

  it('rejects extensionless URLs with no content-type header', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => makeResponse({ contentType: null, text: 'hi' }))
    )
    await expect(fetchDocument(EXTENSIONLESS_URL)).resolves.toEqual({
      ok: false,
      message: NON_TEXT_ERROR
    })
  })

  it('rejects files over 5 MB via content-length without reading the body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        makeResponse({ contentLength: MAX_FILE_BYTES + 1, text: 'short' })
      )
    )
    await expect(fetchDocument(MD_URL)).resolves.toEqual({ ok: false, message: SIZE_ERROR })
  })

  it('rejects streamed bodies that grow past 5 MB with no content-length', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => makeResponse({ contentType: 'text/plain', body: byteStream(8, 1024 * 1024) }))
    )
    await expect(fetchDocument(MD_URL)).resolves.toEqual({ ok: false, message: SIZE_ERROR })
  })

  it('maps a mid-stream network failure to the actionable message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => makeResponse({ contentType: 'text/plain', body: errorStream(new TypeError('boom')) }))
    )
    await expect(fetchDocument(MD_URL)).resolves.toEqual({ ok: false, message: CORS_ERROR })
  })
})

describe('abort handling', () => {
  it('rethrows abort errors instead of converting them to messages', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new DOMException('Aborted', 'AbortError')))
    )
    const promise = fetchDocument(MD_URL)
    await expect(promise).rejects.toHaveProperty('name', 'AbortError')
  })

  it('passes the caller signal into fetch', async () => {
    const fetchMock = vi.fn(async () => makeResponse({ text: 'ok' }))
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()
    await fetchDocument(MD_URL, controller.signal)
    expect(fetchMock).toHaveBeenCalledWith(MD_URL, { signal: controller.signal })
  })
})

describe('isAbortError', () => {
  it('recognizes DOMException-style aborts and rejects other values', () => {
    expect(isAbortError(new DOMException('Aborted', 'AbortError'))).toBe(true)
    expect(isAbortError({ name: 'AbortError' })).toBe(true)
    expect(isAbortError(new TypeError('x'))).toBe(false)
    expect(isAbortError(null)).toBe(false)
    expect(isAbortError('AbortError')).toBe(false)
  })
})
