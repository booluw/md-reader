import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { LINKED_B_URL, VALID_MD_URL } from './fixtures'

async function seriousViolations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).analyze()
  return results.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => `${violation.id}: ${violation.help}`)
}

test('landing page has no serious or critical accessibility violations', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'md-reader' })).toBeVisible()
  expect(await seriousViolations(page)).toEqual([])
})

test('reader page has no serious or critical accessibility violations', async ({ page }) => {
  await page.goto(`/read?src=${encodeURIComponent(LINKED_B_URL)}`)
  await expect(page.getByRole('heading', { level: 1, name: 'Doc B' })).toBeVisible()
  expect(await seriousViolations(page)).toEqual([])
})

test('reader dark theme has no serious or critical accessibility violations', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto(`/read?src=${encodeURIComponent(VALID_MD_URL)}`)
  await expect(page.getByRole('heading', { level: 1, name: 'Fixture Document' })).toBeVisible()
  expect(await seriousViolations(page)).toEqual([])
})
