import { mkdirSync, mkdtempSync, renameSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const FIXTURE_BASE = '/__fixtures__'
export const VALID_MD_URL = 'http://localhost:4173/__fixtures__/valid.md'
export const BIG_MD_URL = 'http://localhost:4173/__fixtures__/big.md'
export const UNREACHABLE_URL = 'http://localhost:9/missing.md'
export const LINKED_A_URL = 'http://localhost:4173/__fixtures__/linked/a.md'
export const LINKED_B_URL = 'http://localhost:4173/__fixtures__/linked/b.md'
export const WIDE_MD_URL = 'http://localhost:4173/__fixtures__/wide.md'
export const EMPTY_MD_URL = 'http://localhost:4173/__fixtures__/empty.md'

const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
)

const FILLER = Array.from(
  { length: 60 },
  (_, index) => `Paragraph ${index}: filler text that makes this document tall enough to scroll.`
).join('\n\n')

const LINKED_A_MD = `# Doc A

${FILLER}

[to B](./b.md)

[to B section](./b.md#target-section)

[external](https://example.com)

[mdx](./other.mdx)

![pic](./pic.png)
`

const LINKED_B_MD = `# Doc B

[to C](./c.md)

## Target Section

${FILLER}
`

const LINKED_C_MD = `# Doc C

${FILLER}
`

const VALID_MD = `# Fixture Document

Some **bold** text and a [link](https://example.com).

## Section One

| a | b |
| - | - |
| 1 | 2 |

- [x] done
`

const BIG_MD = `# Big File\n\n${'x'.repeat(6 * 1024 * 1024)}`

const WIDE_COLUMNS = Array.from({ length: 12 }, (_, index) => `Column ${index}`)
const WIDE_MD = `# Wide Table

${FILLER}

| ${WIDE_COLUMNS.join(' | ')} |
| ${WIDE_COLUMNS.map(() => '---').join(' | ')} |
| ${WIDE_COLUMNS.map((_, index) => `value ${index} with enough text to widen the table`).join(' | ')} |
`

const EMPTY_MD = '   \n\n'

function writeAtomic(path: string, contents: string): void {
  const tempPath = `${path}.tmp`
  writeFileSync(tempPath, contents)
  renameSync(tempPath, path)
}

export default function installFixtures(): void {
  const outputDir = fileURLToPath(new URL('../.output/public', import.meta.url))
  const fixtureDir = `${outputDir}${FIXTURE_BASE}`
  mkdirSync(fixtureDir, { recursive: true })
  writeAtomic(`${fixtureDir}/valid.md`, VALID_MD)
  writeAtomic(`${fixtureDir}/big.md`, BIG_MD)
  writeAtomic(`${fixtureDir}/wide.md`, WIDE_MD)
  writeAtomic(`${fixtureDir}/empty.md`, EMPTY_MD)

  const linkedDir = `${fixtureDir}/linked`
  mkdirSync(linkedDir, { recursive: true })
  writeAtomic(`${linkedDir}/a.md`, LINKED_A_MD)
  writeAtomic(`${linkedDir}/b.md`, LINKED_B_MD)
  writeAtomic(`${linkedDir}/c.md`, LINKED_C_MD)
  writeFileSync(`${linkedDir}/pic.png`, PNG_BYTES)
}

export interface UploadFixtures {
  singleMd: string
  folderDir: string
  bigSingle: string
  linkedDir: string
}

export function installUploadFixtures(): UploadFixtures {
  const dir = mkdtempSync(join(tmpdir(), 'md-reader-upload-'))
  const singleMd = join(dir, 'single.md')
  const folderDir = join(dir, 'docs')
  const bigSingle = join(dir, 'oversized.md')
  const linkedDir = join(dir, 'linked')

  writeFileSync(singleMd, '# Single Upload')
  mkdirSync(join(folderDir, 'sub'), { recursive: true })
  writeFileSync(join(folderDir, 'README.md'), '# Folder Upload\n\nThis is the README.')
  writeFileSync(join(folderDir, 'guide.md'), '# Guide')
  writeFileSync(join(folderDir, 'sub', 'deep.md'), '# Deep')
  writeFileSync(join(folderDir, 'notes.txt'), 'not markdown')
  writeFileSync(join(folderDir, 'note.mdx'), '# mdx')
  writeFileSync(join(folderDir, 'img.png'), 'fake-png-bytes')
  writeFileSync(join(folderDir, 'over5.md'), BIG_MD)
  writeFileSync(bigSingle, BIG_MD)

  mkdirSync(linkedDir, { recursive: true })
  writeFileSync(
    join(linkedDir, 'README.md'),
    `# Linked A\n\n${FILLER}\n\n[to B](b.md)\n\n[missing](missing.md)\n\n![pic](img.png)\n`
  )
  writeFileSync(join(linkedDir, 'b.md'), '# Linked B\n\n[to C](c.md)')
  writeFileSync(join(linkedDir, 'c.md'), '# Linked C')
  writeFileSync(join(linkedDir, 'img.png'), PNG_BYTES)

  return { singleMd, folderDir, bigSingle, linkedDir }
}
