import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import type { Browser, Page } from '@playwright/test'
import { installUploadFixtures } from './fixtures'

const fixtures = installUploadFixtures()

const BASE_URL = 'http://localhost:4173'

const EVICTED_MESSAGE =
  'This file was uploaded on another device or has been cleared. Ask for a web link, or upload it again.'

async function withStorageOverride(
  browser: Browser,
  persist: boolean,
  run: (page: Page) => Promise<void>
): Promise<void> {
  const context = await browser.newContext({ baseURL: BASE_URL })
  await context.addInitScript((succeed) => {
    Object.defineProperty(navigator, 'storage', {
      value: {
        persist: async () => succeed,
        persisted: async () => succeed,
        estimate: async () => ({ usage: 0, quota: 100_000_000 })
      }
    })
  }, persist)
  const page = await context.newPage()
  try {
    await run(page)
  } finally {
    await context.close()
  }
}

test('a saved upload survives a reload and reopens the same file', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Choose a Markdown file').setInputFiles(fixtures.singleMd)

  await expect(page).toHaveURL(/path=single\.md/)
  await expect(page.getByRole('heading', { level: 1, name: 'Single Upload' })).toBeVisible()

  await page.reload()

  await expect(page.getByRole('heading', { level: 1, name: 'Single Upload' })).toBeVisible()
})

test('landing lists saved uploads with file count, size, and date', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Choose a Markdown file').setInputFiles(fixtures.singleMd)
  await expect(page).toHaveURL(/path=single\.md/)

  await page.goto('/')

  await expect(page.getByRole('heading', { level: 2, name: 'Saved uploads' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'single.md' })).toBeVisible()
  await expect(page.getByText(/1 file · \d+ B · .* \d+/)).toBeVisible()

  await page.reload()
  await expect(page.getByRole('link', { name: 'single.md' })).toBeVisible()
})

test('deleting a bundle removes it and its link shows the evicted message', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Choose a Markdown file').setInputFiles(fixtures.singleMd)
  await expect(page).toHaveURL(/path=single\.md/)
  const readUrl = page.url()

  await page.goto('/')
  const row = page.getByRole('listitem').filter({ hasText: 'single.md' })
  await row.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.getByRole('link', { name: 'single.md' })).toHaveCount(0)

  await page.goto(readUrl)
  await expect(page.getByRole('heading', { level: 1, name: 'Could not open this file' })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveText(EVICTED_MESSAGE)
})

test('delete all asks for confirmation and clears the list', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Choose a Markdown file').setInputFiles(fixtures.singleMd)
  await expect(page).toHaveURL(/path=single\.md/)
  await page.goto('/')
  await page.getByLabel('Choose a folder').setInputFiles(fixtures.folderDir)
  await expect(page).toHaveURL(/path=README\.md/)

  await page.goto('/')
  await expect(page.getByRole('link', { name: 'single.md' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'docs' })).toBeVisible()

  await page.getByRole('button', { name: 'Delete all' }).click()
  await expect(page.getByRole('alert')).toHaveText('Delete all saved uploads?')
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('link', { name: 'single.md' })).toBeVisible()

  await page.getByRole('button', { name: 'Delete all' }).click()
  const confirmBox = page.getByRole('group', { name: 'Delete all saved uploads confirmation' })
  await confirmBox.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Saved uploads' })).toHaveCount(0)

  await page.goto('/')
  await page.getByLabel('Choose a Markdown file').setInputFiles(fixtures.singleMd)
  await expect(page).toHaveURL(/path=single\.md/)
})

test('an unknown local bundle shows the evicted message, never a blank page', async ({ page }) => {
  await page.goto(`/read?local=${randomUUID()}&path=missing.md`)

  await expect(page.getByRole('heading', { level: 1, name: 'Could not open this file' })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveText(EVICTED_MESSAGE)
})

test('private browsing keeps uploads for the session and says so', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: BASE_URL })
  await context.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', { value: undefined })
  })
  const page = await context.newPage()
  try {
    await page.goto('/')
    await page.getByLabel('Choose a Markdown file').setInputFiles(fixtures.singleMd)

    await expect(page).toHaveURL(/path=single\.md/)
    await expect(page.getByRole('heading', { level: 1, name: 'Single Upload' })).toBeVisible()

    await page.goto('/')
    await expect(
      page.getByText('Private browsing: uploads last only for this session.')
    ).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'Saved uploads' })).toHaveCount(0)

    await page.goto('/')
    await page.getByLabel('Choose a Markdown file').setInputFiles(fixtures.singleMd)
    await expect(page).toHaveURL(/path=single\.md/)
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'Could not open this file' })).toBeVisible()
  } finally {
    await context.close()
  }
})

test('shows a notice when persistent storage is denied', async ({ browser }) => {
  await withStorageOverride(browser, false, async (page) => {
    await page.goto('/')
    await page.getByLabel('Choose a Markdown file').setInputFiles(fixtures.singleMd)

    await expect(page).toHaveURL(/path=single\.md/)
    await page.goto('/')
    await expect(
      page.getByText('Your browser may clear locally uploaded files. Keep a backup on your device.')
    ).toBeVisible()
  })
})

test('no notice appears when persistent storage is granted', async ({ browser }) => {
  await withStorageOverride(browser, true, async (page) => {
    await page.goto('/')
    await page.getByLabel('Choose a Markdown file').setInputFiles(fixtures.singleMd)

    await expect(page).toHaveURL(/path=single\.md/)
    await page.goto('/')
    await expect(
      page.getByText('Your browser may clear locally uploaded files. Keep a backup on your device.')
    ).toHaveCount(0)
  })
})