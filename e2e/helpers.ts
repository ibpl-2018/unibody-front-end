import { expect, type Page, test as base } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

export const API = (process.env.API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
export const OWNER = { email: process.env.ADMIN_EMAIL ?? 'owner@unibody.in', password: process.env.ADMIN_PASSWORD ?? 'Unibody@2026' };
export const PACKER = { email: 'packer@unibody.in', password: OWNER.password };
export const MANAGER = { email: 'manager@unibody.in', password: OWNER.password };

const STATE = 'e2e-results/state.json';
export function saveState(s: Record<string, string>) {
  mkdirSync('e2e-results', { recursive: true });
  writeFileSync(STATE, JSON.stringify(s));
}
export function loadState(): Record<string, string> {
  return JSON.parse(readFileSync(STATE, 'utf8'));
}

/** Fails the test on uncaught page errors, console.error and 5xx API responses. */
export const test = base.extend<{ errors: string[] }>({
  errors: [
    async ({ page }, use) => {
      // The storefront intro plays once per session; mark it seen so it never covers what a test clicks.
      // (e2e/intro.spec.ts tests the intro itself.)
      await page.context().addInitScript(() => {
        try {
          sessionStorage.setItem('ub-intro', '1');
        } catch {}
      });
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
      page.on('console', (m) => {
        if (m.type() !== 'error') return;
        const t = m.text();
        // Expected: 4xx from deliberate negative checks, and SSE reconnects when a page closes.
        if (/status of 4\d\d|EventSource|ERR_ABORTED|net::ERR_NETWORK_CHANGED/.test(t)) return;
        errors.push(`console: ${t}`);
      });
      page.on('response', (r) => {
        if (r.status() >= 500) errors.push(`HTTP ${r.status()} ${r.url()}`);
      });
      await use(errors);
      expect(errors, 'browser errors').toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };

export async function adminLogin(page: Page, who = OWNER) {
  await page.goto('/admin/login');
  // Let React hydrate first — typing into the server-rendered form would be wiped / submitted natively.
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Email', { exact: true }).fill(who.email);
  await page.getByLabel('Password', { exact: true }).fill(who.password);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/admin/login'));
  await expect(page.getByRole('heading', { name: 'Sign in to Admin' })).toHaveCount(0);
}

/** Waits for loading skeletons to settle and asserts no error screen is showing. */
export async function settled(page: Page) {
  await page.waitForLoadState('networkidle');
  await expect(page.getByText(/something went wrong|application error|unhandled runtime error/i)).toHaveCount(0);
}

export function randomPhone() {
  return '9' + String(Math.floor(100000000 + Math.random() * 899999999));
}
