import { expect, test } from '@playwright/test'

test('the generated site serves the app shell from a static server', async ({ page }) => {
  const response = await page.goto('/')
  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1, name: 'md-reader' })).toBeVisible()
  expect(await page.title()).toContain('md-reader')
})

test('hard load + refresh on /read?... falls back to the SPA shell', async ({ page }) => {
  const url = '/read?src=' + encodeURIComponent('https://example.com/README.md')
  const response = await page.goto(url)
  expect(response?.status()).toBe(200)
  const reloaded = await page.reload()
  expect([200, 304]).toContain(reloaded?.status())
  await expect(page.locator('#__nuxt')).not.toBeEmpty()
})
