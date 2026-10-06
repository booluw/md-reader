import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { installUploadFixtures } from './fixtures'

const fixtures = installUploadFixtures()

interface DropPayload {
  name: string
  content: string
  relativePath?: string
}

async function dropPayload(page: Page, files: DropPayload[]): Promise<void> {
  await page.evaluate((payload) => {
    const transfer = new DataTransfer()
    for (const { name, content, relativePath } of payload) {
      const file = new File([content], name, { type: 'text/markdown' })
      if (relativePath) {
        Object.defineProperty(file, 'webkitRelativePath', { value: relativePath })
      }
      transfer.items.add(file)
    }
    const zone = document.querySelector('[data-testid="drop-zone"]')
    zone?.dispatchEvent(
      new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer })
    )
  }, files)
}

test('uploading a file happens with zero data-carrying network requests', async ({ page }) => {
  const dataRequests: string[] = []
  page.on('request', (request) => {
    if (request.resourceType() === 'fetch' || request.resourceType() === 'xhr') {
      dataRequests.push(request.url())
    }
  })

  await page.goto('/')
  await page.getByLabel('Choose a Markdown file').setInputFiles(fixtures.singleMd)

  await expect(page).toHaveURL(/\/read\?local=/)
  await expect(page.getByRole('heading', { level: 1, name: 'Single Upload' })).toBeVisible()
  await expect(page).toHaveURL(/path=single\.md/)
  expect(dataRequests).toEqual([])
})

test('folder upload opens the README and reports skipped files', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Choose a folder').setInputFiles(fixtures.folderDir)

  await expect(page).toHaveURL(/path=README\.md/)
  await expect(page.getByRole('heading', { level: 1, name: 'Folder Upload' })).toBeVisible()
  const status = page.getByRole('status').filter({ hasText: 'files skipped' })
  await expect(status).toContainText('2 files skipped')
  await expect(status).toContainText('Skipped, larger than 5 MB: over5.md')
})

test('dropping a markdown file opens it in the reader', async ({ page }) => {
  await page.goto('/')
  await dropPayload(page, [{ name: 'dropped.md', content: '# Dropped Doc' }])

  await expect(page).toHaveURL(/\/read\?local=/)
  await expect(page.getByRole('heading', { level: 1, name: 'Dropped Doc' })).toBeVisible()
})

test('dropping a .mdx file shows the exact rejection', async ({ page }) => {
  await page.goto('/')
  await dropPayload(page, [{ name: 'doc.mdx', content: '# mdx' }])
  await expect(page.getByRole('alert')).toHaveText(
    'Only .md and .markdown files are supported.'
  )
})

test('a folder without a README shows a pickable file list', async ({ page }) => {
  await page.goto('/')
  await dropPayload(page, [
    { name: 'a.md', content: '# A', relativePath: 'bundle/a.md' },
    { name: 'b.md', content: '# B', relativePath: 'bundle/sub/b.md' }
  ])

  await expect(page).toHaveURL(/\/read\?local=/)
  await expect(page.getByRole('heading', { level: 1, name: 'bundle' })).toBeVisible()
  await page.getByRole('link', { name: 'sub/b.md' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'B' })).toBeVisible()
})

test('an oversized single file is rejected by name', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Choose a Markdown file').setInputFiles(fixtures.bigSingle)
  await expect(page.getByRole('alert')).toContainText('oversized.md is larger than 5 MB.')
})