import { expect, test } from '@playwright/test';

// The storefront launch intro: server-rendered, once per session, skippable, reduced-motion aware.
const intro = (page: import('@playwright/test').Page) => page.locator('#ub-intro');

test('is in the server HTML (first paint, no JS needed) and hidden for crawlers', async ({ request }) => {
  const html = await (await request.get('/')).text();
  expect(html).toContain('id="ub-intro"');
  expect(html).toContain('<noscript><style>#ub-intro{display:none!important}</style></noscript>');
  expect(html).toMatch(/Every part\./); // page content is in the HTML, not behind the overlay
});

test('plays once per session, then reveals the page', async ({ page }) => {
  await page.goto('/');
  await expect(intro(page)).toBeVisible();
  await expect(page.locator('.ub-logo')).toBeVisible();
  await expect(intro(page)).toBeHidden({ timeout: 6000 });
  await expect(page.getByRole('link', { name: 'Unibody home' })).toBeVisible();
  // Same session, next page: no intro.
  await page.goto('/shop');
  await expect(intro(page)).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.classList.contains('ub-intro-seen'))).toBe(true);
});

test('a tap skips straight to the reveal', async ({ page }) => {
  await page.goto('/');
  await expect(intro(page)).toBeVisible();
  await page.waitForTimeout(500);
  const t = Date.now();
  await page.mouse.click(640, 400);
  await expect(intro(page)).toBeHidden({ timeout: 2500 });
  expect(Date.now() - t).toBeLessThan(2000); // natural end would be ~3 s later
});

test('reduced motion gets a short fade', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce', baseURL: test.info().project.use.baseURL });
  const page = await ctx.newPage();
  await page.goto('/');
  const t = Date.now();
  await expect(intro(page)).toBeHidden({ timeout: 2000 });
  expect(Date.now() - t).toBeLessThan(1500);
  await ctx.close();
});

test('never shows on admin pages', async ({ page }) => {
  await page.goto('/admin/login');
  await expect(intro(page)).toHaveCount(0);
});
