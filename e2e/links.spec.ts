import { expect, test } from '@playwright/test'
import { LINKED_A_URL, installUploadFixtures } from './fixtures'

const fixtures = installUploadFixtures()

test('URL mode: internal links navigate A to B to C and back restores scroll', async ({ page }) => {
  await page.goto(`/read?src=${encodeURIComponent(LINKED_A_URL)}`)
  await expect(page.getByRole('heading', { level: 1, name: 'Doc A' })).toBeVisible()

  const toB = page.getByRole('link', { name: 'to B', exact: true })
  await toB.scrollIntoViewIfNeeded()
  const savedY = await page.evaluate(() => window.scrollY)
  expect(savedY).toBeGreaterThan(100)
  await toB.click()

  await expect(page).toHaveURL(/linked%2Fb\.md/)
  await expect(page.getByRole('heading', { level: 1, name: 'Doc B' })).toBeVisible()

  await page.getByRole('link', { name: 'to C', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Doc C' })).toBeVisible()

  await page.goBack()
  await expect(page.getByRole('heading', { level: 1, name: 'Doc B' })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('heading', { level: 1, name: 'Doc A' })).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(savedY - 80)
})

test('URL mode: a fragment link scrolls to the target heading', async ({ page }) => {
  await page.goto(`/read?src=${encodeURIComponent(LINKED_A_URL)}`)
  await page.getByRole('link', { name: 'to B section', exact: true }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Target Section' })).toBeVisible()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
})

test('URL mode: external and .mdx links open in a new tab, internal ones do not', async ({
  page
}) => {
  await page.goto(`/read?src=${encodeURIComponent(LINKED_A_URL)}`)
  const external = page.getByRole('link', { name: 'external' })
  await expect(external).toHaveAttribute('target', '_blank')
  await expect(external).toHaveAttribute('rel', 'noopener noreferrer')
  await expect(page.getByRole('link', { name: 'mdx' })).toHaveAttribute('target', '_blank')
  await expect(page.getByRole('link', { name: 'to B', exact: true })).not.toHaveAttribute(
    'target',
    '_blank'
  )
})

test('URL mode: relative images are served from the source URL', async ({ page }) => {
  await page.goto(`/read?src=${encodeURIComponent(LINKED_A_URL)}`)
  await expect(page.locator('img[src$="pic.png"]')).toBeVisible()
})

test('local mode: navigation, blob images, breadcrumb, file tree and missing-file message', async ({
  page
}) => {
  await page.goto('/')
  await page.getByLabel('Choose a folder').setInputFiles(fixtures.linkedDir)

  await expect(page.getByRole('heading', { level: 1, name: 'Linked A' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('README.md')
  await expect(page.getByRole('link', { name: 'c.md' })).toBeVisible()
  await expect(page.locator('img[data-md-object-url]')).toHaveAttribute('src', /^blob:/)

  await page.getByRole('link', { name: 'to B', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Linked B' })).toBeVisible()

  await page.goBack()
  await expect(page.getByRole('heading', { level: 1, name: 'Linked A' })).toBeVisible()
  await page.getByRole('link', { name: 'missing', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText("Can't find missing.md in this upload.")
})
