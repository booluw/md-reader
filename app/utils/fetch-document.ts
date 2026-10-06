import { hasMarkdownExtension } from './source-url'

export const MAX_FILE_BYTES = 5 * 1024 * 1024

export const CORS_ERROR =
  "This site doesn't allow other websites to read its files. Try the raw link, or download the file and upload it."
export const NOT_FOUND_ERROR = 'File not found (404). Check the link.'
export const NON_TEXT_ERROR = 'This URL does not point to a text file.'
export const SIZE_ERROR = 'File is larger than 5 MB.'

export type FetchDocumentResult =
  | { ok: true; text: string }
  | { ok: false; message: string }

class FileTooLargeError extends Error {}

export function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name: unknown }).name === 'AbortError'
  )
}

function requiresTextContentType(href: string): boolean {
  try {
    return !hasMarkdownExtension(new URL(href).pathname)
  } catch {
    return true
  }
}

async function readBody(response: Response): Promise<string> {
  const body = response.body
  if (!body) {
    const text = await response.text()
    if (new TextEncoder().encode(text).byteLength > MAX_FILE_BYTES) {
      throw new FileTooLargeError()
    }
    return text
  }
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let text = ''
  let bytes = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > MAX_FILE_BYTES) {
        await reader.cancel().catch(() => undefined)
        throw new FileTooLargeError()
      }
      text += decoder.decode(value, { stream: true })
    }
    text += decoder.decode()
  } finally {
    reader.releaseLock()
  }
  return text
}

export async function fetchDocument(
  href: string,
  signal?: AbortSignal
): Promise<FetchDocumentResult> {
  let response: Response
  try {
    response = await fetch(href, { signal })
  } catch (error) {
    if (isAbortError(error)) throw error
    return { ok: false, message: CORS_ERROR }
  }

  if (response.status === 404) {
    return { ok: false, message: NOT_FOUND_ERROR }
  }
  if (!response.ok) {
    return {
      ok: false,
      message: `Request failed with status ${response.status} ${response.statusText}.`
    }
  }

  const contentType = response.headers.get('content-type')
  if (requiresTextContentType(href) && !(contentType ?? '').startsWith('text/')) {
    return { ok: false, message: NON_TEXT_ERROR }
  }

  const contentLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > MAX_FILE_BYTES) {
    return { ok: false, message: SIZE_ERROR }
  }

  try {
    return { ok: true, text: await readBody(response) }
  } catch (error) {
    if (isAbortError(error)) throw error
    if (error instanceof FileTooLargeError) {
      return { ok: false, message: SIZE_ERROR }
    }
    return { ok: false, message: CORS_ERROR }
  }
}
