import { expect, test, type Page } from '@playwright/test'
import { LINKED_A_URL } from './fixtures'

function recordDialogs(page: Page): string[] {
  const messages: string[] = []
  page.on('dialog', (dialog) => {
    messages.push(dialog.message())
    void dialog.dismiss()
  })
  return messages
}

test('renders the XSS fixture with no dialog and no live payload', async ({ page, baseURL }) => {
  const dialogs = recordDialogs(page)
  const source = `${baseURL}/__fixtures__/xss.md`

  await page.goto(`/read?src=${encodeURIComponent(source)}`)
  await expect(page.getByRole('heading', { level: 1, name: 'XSS fixture' })).toBeVisible()

  expect(await page.locator('.markdown-body script, .markdown-body iframe').count()).toBe(0)
  expect(await page.locator('[onerror], [onload]').count()).toBe(0)

  expect(dialogs).toEqual([])
})

test('refuses unsafe src schemes without a dialog', async ({ page }) => {
  const dialogs = recordDialogs(page)

  await page.goto('/read?src=javascript:alert(1)')
  await expect(page.getByRole('alert')).toHaveText('Enter a full http:// or https:// URL.')

  expect(dialogs).toEqual([])
})

test('external links and images carry referrer-safe attributes', async ({ page }) => {
  await page.goto(`/read?src=${encodeURIComponent(LINKED_A_URL)}`)

  const external = page.getByRole('link', { name: 'external' })
  await expect(external).toHaveAttribute('rel', 'noopener noreferrer')
  await expect(external).toHaveAttribute('target', '_blank')
  await expect(page.locator('img.md-image')).toHaveAttribute('referrerpolicy', 'no-referrer')
})