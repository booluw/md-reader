import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const SCRIPT_PATTERN = /<script([^>]*)>([\s\S]*?)<\/script>/gi

export function sha256(value) {
  return `sha256-${createHash('sha256').update(value, 'utf8').digest('base64')}`
}

export function inlineScriptHashes(html) {
  const hashes = []
  for (const match of html.matchAll(SCRIPT_PATTERN)) {
    const attributes = match[1] ?? ''
    if (/\bsrc\s*=/i.test(attributes)) continue
    hashes.push(sha256(match[2] ?? ''))
  }
  return hashes
}

export function cspHashesLine(html) {
  return inlineScriptHashes(html).join(' ')
}

export function writeCspHashes(htmlPath, outPath) {
  const html = readFileSync(htmlPath, 'utf8')
  const hashes = inlineScriptHashes(html)
  if (hashes.length === 0) throw new Error(`No inline <script> tags found in ${htmlPath}`)
  const quoted = hashes.map((hash) => `'${hash}'`).join(' ')
  const setDirective = `set $csp_script_hashes "${quoted}";\n`
  writeFileSync(outPath, setDirective)
  return hashes
}

function main(argv) {
  const htmlPath = argv[0] ?? '.output/public/index.html'
  const outPath = argv[1] ?? '.output/csp-hashes.conf'
  const hashes = writeCspHashes(htmlPath, outPath)
  process.stdout.write(`wrote ${hashes.length} script hash(es) to ${outPath}\n`)
}

const invokedPath = process.argv[1]
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  main(process.argv.slice(2))
}
