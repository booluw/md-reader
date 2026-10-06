import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { expect, test } from '@playwright/test'

const entry = fileURLToPath(new URL('../app/utils/markdown.ts', import.meta.url))
const bundleFile = fileURLToPath(
  new URL(`../.output/public/render-bench-${process.pid}.js`, import.meta.url)
)

const paragraph =
  'Lorem ipsum **dolor** sit amet, `consectetur` adipiscing elit, sed do [eiusmod](https://example.com) tempor.\n\n'
const oneMegabyte =
  '# Benchmark Document\n\n' + paragraph.repeat(Math.ceil((1024 * 1024) / paragraph.length))

test.beforeAll(async () => {
  const result = await build({
    entryPoints: [entry],
    bundle: true,
    format: 'iife',
    globalName: 'MarkdownRenderer',
    platform: 'browser',
    write: false
  })
  const code = result.outputFiles[0]?.text
  if (!code) throw new Error('esbuild produced no bundle output')
  writeFileSync(bundleFile, code)
})

test('renders a 1 MB file in under 500 ms', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.addScriptTag({ url: `/render-bench-${process.pid}.js` })
  const elapsed = await page.evaluate((markdown) => {
    const bridge = window as unknown as {
      MarkdownRenderer: {
        render: (text: string, source: { kind: string; href: string }) => unknown
      }
    }
    const start = performance.now()
    bridge.MarkdownRenderer.render(markdown, {
      kind: 'url',
      href: 'https://example.com/big.md'
    })
    return performance.now() - start
  }, oneMegabyte)
  console.log(`[perf] ${testInfo.project.name}: render(1 MB) = ${elapsed.toFixed(0)} ms`)
  expect(elapsed).toBeLessThan(500)
})
