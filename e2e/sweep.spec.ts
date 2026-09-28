import type { Page } from '@playwright/test';
import { adminLogin, API, expect, loadState, OWNER, settled, test } from './helpers';

// Visits every storefront and admin screen in light and dark mode, failing on browser errors,
// error screens, horizontal overflow or leftover "PartsBay" branding, and saves a screenshot of each.

async function check(page: Page, path: string, shot: string, testInfo: { project: { name: string } }) {
  const res = await page.goto(path);
  expect(res?.status(), `${path} HTTP status`).toBeLessThan(400);
  await settled(page);
  if (path.startsWith('/admin')) {
    // Guard against silently sweeping the login screen.
    expect(new URL(page.url()).pathname, `${path} redirected`).not.toMatch(/^\/admin\/login/);
    await expect(page.getByRole('button', { name: 'Sign in' }), `${path} shows login`).toHaveCount(0);
  }
  await expect(page.locator('body')).not.toContainText(/partsbay/i);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, `${path} horizontal overflow (px)`).toBeLessThanOrEqual(1);
  await page.screenshot({ path: `e2e-results/screens/${testInfo.project.name}/${shot}.png`, fullPage: true });
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} mode`, () => {
    test.use({ colorScheme: scheme });

    test('storefront pages', async ({ page, request }, testInfo) => {
      const { orderNo, phone, slug } = loadState();
      const fams = await (await request.get(`${API}/api/catalog/families`)).json();
      const fam = await (await request.get(`${API}/api/catalog/families/macbook-air`)).json();
      const model = (fam.models ?? fam.items ?? [])[0];
      const pages: [string, string][] = [
        ['/', 'home'],
        ['/shop', 'shop'],
        ...fams.map((f: { slug: string }) => [`/d/${f.slug}`, `family-${f.slug}`] as [string, string]),
        ...(model ? [[`/d/macbook-air/${model.slug ?? model.id}`, 'model'] as [string, string]] : []),
        ['/search?q=A2337', 'search'],
        [`/p/${slug}`, 'product'],
        ['/bag', 'bag'],
        ['/checkout', 'checkout'],
        ['/offers', 'offers'],
        ['/help', 'help'],
        ['/help/shipping', 'help-shipping'],
        ['/help/returns', 'help-returns'],
        ['/track', 'track'],
        [`/track/${orderNo}?phone=${phone}`, 'track-order'],
        [`/order/${orderNo}?phone=${phone}`, 'order'],
        ['/orders', 'orders'],
      ];
      for (const [path, name] of pages) await test.step(path, () => check(page, path, `store-${scheme}-${name}`, testInfo));
      await test.step('404 page', async () => {
        const r = await page.goto('/this-page-does-not-exist');
        expect(r?.status()).toBe(404);
      });
    });

    test('admin pages (owner)', async ({ page, request }, testInfo) => {
      const { orderNo } = loadState();
      const { token } = await (await request.post(`${API}/api/admin/auth/login`, { data: OWNER })).json();
      const get = async (p: string) => (await request.get(`${API}${p}`, { headers: { authorization: `Bearer ${token}` } })).json();
      const first = (r: { items?: { id: string }[] } | { id: string }[]) => (Array.isArray(r) ? r[0] : r.items?.[0])?.id;
      const productId = first(await get('/api/admin/products?limit=1'));
      const purchaseId = first(await get('/api/admin/purchases?limit=1'));
      const customerId = first(await get('/api/admin/customers?limit=1'));

      await adminLogin(page);
      const pages: [string, string][] = [
        ['/admin', 'dashboard'],
        ['/admin/orders', 'orders'],
        [`/admin/orders/${orderNo}`, 'order-detail'],
        ['/admin/invoices', 'invoices'],
        ['/admin/customers', 'customers'],
        ...(customerId ? [[`/admin/customers/${customerId}`, 'customer-detail'] as [string, string]] : []),
        ['/admin/leads', 'leads'],
        ['/admin/products', 'products'],
        ...(productId ? [[`/admin/products/${productId}`, 'product-edit'] as [string, string]] : []),
        ['/admin/products/new', 'product-new'],
        ['/admin/catalog', 'catalog'],
        ['/admin/inventory', 'inventory'],
        ['/admin/purchases', 'purchases'],
        ...(purchaseId ? [[`/admin/purchases/${purchaseId}`, 'purchase-detail'] as [string, string]] : []),
        ['/admin/purchases/new', 'purchase-new'],
        ['/admin/suppliers', 'suppliers'],
        ['/admin/offers', 'offers'],
        ['/admin/reports', 'reports'],
        ['/admin/settings', 'settings'],
      ];
      for (const [path, name] of pages) await test.step(path, () => check(page, path, `admin-${scheme}-${name}`, testInfo));
    });
  });
}
