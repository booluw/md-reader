import { mkdirSync, renameSync, writeFileSync } from 'node:fs'
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
