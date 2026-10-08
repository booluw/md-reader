import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { defineConfig, devices } from '@playwright/test'

const darwinFirefoxHome =
  process.platform === 'darwin'
    ? mkdtempSync(join(tmpdir(), 'playwright-firefox-home-'))
    : undefined

export default defineConfig({
  testDir: './e2e',
  testMatch: /security-csp\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: 'http://localhost:4174',
    trace: 'on-first-retry'
  },
  expect: { timeout: 10_000 },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        ...(darwinFirefoxHome
          ? {
              launchOptions: {
                env: { ...process.env, CFFIXED_USER_HOME: darwinFirefoxHome }
              }
            }
          : {})
      }
    },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } }
  ],
  webServer: {
    command: 'bash scripts/security-e2e.sh',
    url: 'http://localhost:4174/',
    reuseExistingServer: !process.env.CI,
    timeout: 300_000
  }
})
