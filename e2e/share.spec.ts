import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { LINKED_B_URL, installUploadFixtures } from './fixtures'
import { LOCAL_SHARE_MESSAGE } from '../app/utils/share'

const fixtures = installUploadFixtures()

interface ClipboardWindow {
  __copied?: string[]
}

function stubClipboard(page: Page, mode: 'ok' | 'fail'): Promise<unknown> {
  return page.addInitScript((fail) => {
    const copied: string[] = []
    Object.defineProperty(window, '__copied', { value: copied, configurable: true })
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: (text: string) => {
          if (fail) return Promise.reject(new Error('clipboard denied'))
          copied.push(text)
          return Promise.resolve()
        }
      },
      configurable: true
    })
  }, mode === 'fail')
}

test('share copies the reader URL and confirms with a toast', async ({ page }) => {
  await stubClipboard(page, 'ok')
  await page.goto(`/read?src=${encodeURIComponent(LINKED_B_URL)}`)
  await page.getByRole('button', { name: 'Share' }).click()

  await expect(page.getByRole('status').filter({ hasText: 'Link copied' })).toBeVisible()
  const copied = await page.evaluate(() => (window as unknown as ClipboardWindow).__copied ?? [])
  expect(copied).toHaveLength(1)
  expect(copied[0]).toContain('/read?src=')
  expect(copied[0]).toContain('linked%2Fb.md')
})

test('share falls back to a selectable field when the clipboard fails', async ({ page }) => {
  await stubClipboard(page, 'fail')
  await page.goto(`/read?src=${encodeURIComponent(LINKED_B_URL)}`)
  await page.getByRole('button', { name: 'Share' }).click()

  const field = page.getByLabel('Copy this link')
  await expect(field).toBeVisible()
  await expect(field).toHaveValue(/\/read\?src=/)
  await expect(field).toBeFocused()
})

test('share is disabled for local uploads with an explanation', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Choose a Markdown file').setInputFiles(fixtures.singleMd)
  await expect(page.getByRole('heading', { level: 1, name: 'Single Upload' })).toBeVisible()

  const share = page.getByRole('button', { name: 'Share' })
  await expect(share).toHaveAttribute('aria-disabled', 'true')
  await expect(share).toHaveAttribute('title', LOCAL_SHARE_MESSAGE)

  await share.click({ force: true })
  await expect(page.getByRole('status').filter({ hasText: LOCAL_SHARE_MESSAGE })).toBeVisible()
})

test('a shared reader link opens and scrolls to its heading', async ({ page }) => {
  await page.goto(`/read?src=${encodeURIComponent(LINKED_B_URL)}#target-section`)
  await expect(page.getByRole('heading', { level: 2, name: 'Target Section' })).toBeVisible()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
})
