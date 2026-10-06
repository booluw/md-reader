import { expect, test } from '@playwright/test'
import { BIG_MD_URL, UNREACHABLE_URL, VALID_MD_URL } from './fixtures'

test('invalid input shows an inline error and keeps focus', async ({ page }) => {
  await page.goto('/')
  const input = page.getByLabel('Markdown file URL')
  await input.fill('not a url')
  await page.getByRole('button', { name: 'Open' }).click()
  await expect(page.getByRole('alert')).toContainText('Enter a full http:// or https:// URL.')
  await expect(input).toBeFocused()
})

test('rejects non-markdown extensions with the exact message', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Markdown file URL').fill('https://example.com/doc.mdx')
  await page.getByRole('button', { name: 'Open' }).click()
  await expect(page.getByRole('alert')).toHaveText('Only .md and .markdown files are supported.')
})

test('opens a markdown URL and survives a hard refresh', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Markdown file URL').fill(VALID_MD_URL)
  await page.getByRole('button', { name: 'Open' }).click()
  await expect(page).toHaveURL(`http://localhost:4173/read?src=${VALID_MD_URL}`)
  const heading = page.getByRole('heading', { level: 1, name: 'Fixture Document' })
  await expect(heading).toBeVisible()
  await page.reload()
  await expect(heading).toBeVisible()
})

test('network failure shows an actionable error with Retry and Upload instead', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Markdown file URL').fill(UNREACHABLE_URL)
  await page.getByRole('button', { name: 'Open' }).click()
  const alert = page.getByRole('alert')
  await expect(alert).toContainText(
    "This site doesn't allow other websites to read its files."
  )
  await page.getByRole('button', { name: 'Retry' }).click()
  await expect(alert).toContainText(
    "This site doesn't allow other websites to read its files."
  )
  await expect(page.getByRole('link', { name: 'Upload instead' })).toBeVisible()
})

test('files larger than 5 MB show the size error', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Markdown file URL').fill(BIG_MD_URL)
  await page.getByRole('button', { name: 'Open' }).click()
  await expect(page.getByRole('alert')).toContainText('File is larger than 5 MB.')
})

test('recent URLs persist across reloads and can be cleared', async ({ page }) => {
  await page.goto('/')
  const input = page.getByLabel('Markdown file URL')
  await input.fill(VALID_MD_URL)
  await page.getByRole('button', { name: 'Open' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Fixture Document' })).toBeVisible()

  await page.goBack()
  const recentLink = page.getByRole('link', { name: VALID_MD_URL })
  await expect(recentLink).toBeVisible()

  await page.reload()
  await expect(recentLink).toBeVisible()

  await page.getByRole('button', { name: 'Clear' }).click()
  await expect(recentLink).toHaveCount(0)
})
