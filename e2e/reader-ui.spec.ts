import { expect, test } from '@playwright/test'
import {
  EMPTY_MD_URL,
  LINKED_A_URL,
  LINKED_B_URL,
  WIDE_MD_URL,
  installUploadFixtures
} from './fixtures'

installUploadFixtures()

test.describe('theme', () => {
  test('follows the system dark preference', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })

  test('manual toggle switches theme and persists across reload', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await page.getByRole('button', { name: 'Switch to dark theme' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.getByRole('button', { name: 'Switch to light theme' })).toBeVisible()
  })
})

test('reader header shows the source, share and open another controls', async ({ page }) => {
  await page.goto(`/read?src=${encodeURIComponent(LINKED_A_URL)}`)
  await expect(page.getByTestId('reader-source')).toHaveText('a.md')
  await expect(page.getByRole('button', { name: 'Share' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Open another' })).toBeVisible()
})

test('table of contents lists headings and selects the active one', async ({ page }) => {
  await page.goto(`/read?src=${encodeURIComponent(LINKED_B_URL)}`)
  const toc = page.getByRole('navigation', { name: 'Table of contents' })
  await expect(toc).toBeVisible()
  const target = toc.getByRole('link', { name: 'Target Section' })
  await expect(target).toBeVisible()

  await target.click()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  await expect(target).toHaveAttribute('aria-current', 'true')
})

test('typography caps the reading measure', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto(`/read?src=${encodeURIComponent(LINKED_B_URL)}`)
  const width = await page
    .locator('.markdown-body')
    .evaluate((element) => element.getBoundingClientRect().width)
  expect(width).toBeGreaterThan(400)
  expect(width).toBeLessThan(900)
})

test('wide tables scroll inside their own container without widening the page', async ({
  page
}) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto(`/read?src=${encodeURIComponent(WIDE_MD_URL)}`)
  const table = page.locator('.markdown-body table')
  await expect(table).toBeVisible()
  expect(await table.evaluate((element) => getComputedStyle(element).overflowX)).toBe('auto')
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  )
  expect(overflow).toBeLessThanOrEqual(1)
})

test('an empty file shows a designed empty state', async ({ page }) => {
  await page.goto(`/read?src=${encodeURIComponent(EMPTY_MD_URL)}`)
  await expect(page.getByText('This file is empty')).toBeVisible()
})
