import { defineConfig, devices } from '@playwright/test';

// Default to GitHub Pages, override with BASE_URL env var for local dev
const BASE_URL = process.env.BASE_URL || 'https://galsened.github.io/RoamWise-frontend-WX/';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 120_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  expect: {
    timeout: 45_000,
  },
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // No webServer in CI - tests run against live GitHub Pages
  // For local dev, use: BASE_URL=http://localhost:5173/roamwise-app/ npm run test:e2e:local
});