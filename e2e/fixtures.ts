import { mkdirSync, mkdtempSync, renameSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const FIXTURE_BASE = '/__fixtures__'
export const VALID_MD_URL = 'http://localhost:4173/__fixtures__/valid.md'
export const BIG_MD_URL = 'http://localhost:4173/__fixtures__/big.md'
export const UNREACHABLE_URL = 'http://localhost:9/missing.md'

const VALID_MD = `# Fixture Document

Some **bold** text and a [link](https://example.com).

## Section One

| a | b |
| - | - |
| 1 | 2 |

- [x] done
`

const BIG_MD = `# Big File\n\n${'x'.repeat(6 * 1024 * 1024)}`

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
}

export interface UploadFixtures {
  singleMd: string
  folderDir: string
  bigSingle: string
}

export function installUploadFixtures(): UploadFixtures {
  const dir = mkdtempSync(join(tmpdir(), 'md-reader-upload-'))
  const singleMd = join(dir, 'single.md')
  const folderDir = join(dir, 'docs')
  const bigSingle = join(dir, 'oversized.md')

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

  return { singleMd, folderDir, bigSingle }
}
