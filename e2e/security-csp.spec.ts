import { expect, test, type Page } from '@playwright/test'

function recordDialogs(page: Page): string[] {
  const messages: string[] = []
  page.on('dialog', (dialog) => {
    messages.push(dialog.message())
    void dialog.dismiss()
  })
  return messages
}

function recordCspViolations(page: Page): string[] {
  const violations: string[] = []
  page.on('console', (message) => {
    if (message.text().includes('Content Security Policy')) violations.push(message.text())
  })
  return violations
}

test('serves the hardening headers with a strict policy', async ({ page }) => {
  const response = await page.goto('/')
  expect(response?.status()).toBe(200)

  const headers = response?.headers() ?? {}
  const csp = headers['content-security-policy'] ?? ''
  expect(csp).toContain("default-src 'self'")
  expect(csp).toContain("script-src 'self'")
  expect(csp).toMatch(/script-src 'self' 'sha256-/)
  expect(csp).not.toContain('unsafe-eval')
  expect(csp).not.toContain('unsafe-inline')
  expect(csp).toContain('img-src * data: blob:')
  expect(csp).toContain('connect-src *')
  expect(csp).toContain("style-src 'self'")
  expect(csp).toContain("frame-ancestors 'none'")
  expect(headers['x-content-type-options']).toBe('nosniff')
  expect(headers['referrer-policy']).toBe('no-referrer')
})

test('refuses injected inline scripts', async ({ page }) => {
  await page.goto('/')

  const ran = await page.evaluate(() => {
    const script = document.createElement('script')
    script.textContent = 'window.__cspInlineProbe = true'
    document.body.append(script)
    return Reflect.get(window, '__cspInlineProbe') === true
  })

  expect(ran).toBe(false)
})

test('boots the app under the policy', async ({ page }) => {
  const violations = recordCspViolations(page)
  await page.goto('/')
  await expect(page.getByLabel('Markdown file URL')).toBeVisible()
  expect(violations).toEqual([])
})

test('renders the XSS fixture with no dialog and no live payload', async ({
  page,
  baseURL
}) => {
  const dialogs = recordDialogs(page)
  const source = `${baseURL}/__fixtures__/xss.md`

  const fixture = await page.request.get(source)
  expect(fixture.status()).toBe(200)
  expect(fixture.headers()['content-type']).toContain('text/markdown')

  const response = await page.goto(`/read?src=${encodeURIComponent(source)}`)
  expect(response?.status()).toBe(200)

  await expect(page.getByRole('heading', { level: 1, name: 'XSS fixture' })).toBeVisible()

  expect(await page.locator('.markdown-body script, .markdown-body iframe').count()).toBe(0)
  expect(await page.locator('[onerror], [onload]').count()).toBe(0)
  expect(await page.locator('a[href^="javascript:"], a[href^="vbscript:"]').count()).toBe(0)
  await expect(page.locator('img[alt="data uri pixel"]')).toBeVisible()
  await expect(page.getByRole('link', { name: 'javascript anchor' })).toHaveCount(0)

  expect(dialogs).toEqual([])
})

test('refuses an unsafe src query without a dialog', async ({ page }) => {
  const dialogs = recordDialogs(page)

  const response = await page.goto('/read?src=javascript:alert(1)')
  expect(response?.status()).toBe(200)
  await expect(page.getByRole('alert')).toHaveText('Enter a full http:// or https:// URL.')

  expect(dialogs).toEqual([])
})
