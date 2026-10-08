import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SCRIPT = join(__dirname, '..', 'scripts', 'csp-hashes.mjs')

function run(htmlPath: string, outPath: string): string[] {
  const stderr: string[] = []
  try {
    execFileSync(process.execPath, [SCRIPT, htmlPath, outPath], { stdio: ['ignore', 'pipe', 'pipe'] })
  } catch (error) {
    const failure = error as { stderr?: Buffer }
    stderr.push(String(failure.stderr ?? ''))
    return stderr
  }
  return []
}

function sha256(value: string): string {
  return `sha256-${createHash('sha256').update(value, 'utf8').digest('base64')}`
}

describe('csp-hashes', () => {
  it('hashes every inline script and ignores scripts with src', () => {
    const dir = mkdtempSync(join(tmpdir(), 'csp-hashes-'))
    const htmlPath = join(dir, 'index.html')
    const outPath = join(dir, 'csp-hashes.conf')
    const entryScript = 'window.__NUXT__={};window.__NUXT__.config={app:{buildId:"abc"}}'
    const importMap = '{"imports":{"#entry":"/_nuxt/entry.js"}}'
    writeFileSync(
      htmlPath,
      [
        '<!DOCTYPE html><html><head>',
        '<script type="importmap">' + importMap + '</script>',
        '<script src="/_nuxt/entry.js"></script>',
        '<script>window.__NUXT__={};window.__NUXT__.config={app:{buildId:"abc"}}</script>',
        '<script type="application/json">{"data":true}</script>',
        '</head><body></body></html>'
      ].join('\n')
    )

    const errors = run(htmlPath, outPath)
    expect(errors).toEqual([])

    const output = readFileSync(outPath, 'utf8')
    const match = /^set \$csp_script_hashes "([^"]+)";\n$/.exec(output)
    expect(match).not.toBeNull()
    const hashes = (match?.[1] ?? '').split(' ')
    expect(hashes).toHaveLength(3)
    expect(hashes.every((hash) => /^'sha256-[A-Za-z0-9+/=]+'$/.test(hash))).toBe(true)
    expect(hashes).toContain(`'${sha256(importMap)}'`)
    expect(hashes).toContain(`'${sha256(entryScript)}'`)
    expect(hashes).toContain(`'${sha256('{"data":true}')}'`)
  })

  it('produces identical output across runs', () => {
    const dir = mkdtempSync(join(tmpdir(), 'csp-hashes-'))
    const htmlPath = join(dir, 'index.html')
    const first = join(dir, 'first.conf')
    const second = join(dir, 'second.conf')
    writeFileSync(htmlPath, '<html><script>inline()</script></html>')

    expect(run(htmlPath, first)).toEqual([])
    expect(run(htmlPath, second)).toEqual([])
    expect(readFileSync(first, 'utf8')).toBe(readFileSync(second, 'utf8'))
  })

  it('fails when there are no inline scripts', () => {
    const dir = mkdtempSync(join(tmpdir(), 'csp-hashes-'))
    const htmlPath = join(dir, 'index.html')
    const outPath = join(dir, 'csp-hashes.conf')
    writeFileSync(htmlPath, '<html><script src="/entry.js"></script></html>')

    const errors = run(htmlPath, outPath)
    expect(errors.join('')).toContain('No inline <script> tags found')
  })
})
