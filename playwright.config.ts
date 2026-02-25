import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/playwright',
  timeout: 90_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [
    [ 'list' ],
    [ 'html', { open: 'never' } ],
  ],
})
