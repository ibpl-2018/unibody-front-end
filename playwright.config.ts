import { defineConfig } from '@playwright/test';

// Browser E2E for the storefront + admin. Needs the API (dev switches on) and web running:
//   WEB_URL=http://localhost:3000 API_URL=http://localhost:4000 pnpm e2e
// Uses the locally installed Google Chrome (no browser download).
export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e-results/artifacts',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { outputFolder: 'e2e-results/report', open: 'never' }]],
  use: {
    baseURL: process.env.WEB_URL ?? 'http://localhost:3000',
    channel: 'chrome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /(flow|security|auth)\.spec\.ts/, use: { viewport: { width: 1440, height: 900 } } },
    { name: 'desktop', testMatch: /sweep\.spec\.ts/, dependencies: ['setup'], use: { viewport: { width: 1440, height: 900 } } },
    { name: 'intro', testMatch: /intro\.spec\.ts/, use: { viewport: { width: 1280, height: 800 }, video: 'on' } },
    { name: 'mobile', testMatch: /sweep\.spec\.ts/, dependencies: ['setup'], use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
});
