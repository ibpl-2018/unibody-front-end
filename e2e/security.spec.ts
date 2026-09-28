import { adminLogin, API, expect, MANAGER, OWNER, PACKER, settled, test } from './helpers';

// Inventory control & anti-theft through the real admin UI:
// a partner's write-off is shown to them as done but held → the Super Admin rejects it on the Security desk →
// a stock count finds a missing unit → the owner writes it off → labels print → the audit log verifies.
test.describe.configure({ mode: 'serial' });

let product: { productId: string; sku: string; title: string; onHand: number };
let ownerToken = '';
const auth = () => ({ authorization: `Bearer ${ownerToken}` });

test.beforeAll(async ({ request }) => {
  ownerToken = (await (await request.post(`${API}/api/admin/auth/login`, { data: OWNER })).json()).token;
  await request.put(`${API}/api/admin/security/settings`, { headers: auth(), data: { approvalMode: 'DISCREET' } });
  const inv = await (await request.get(`${API}/api/admin/inventory?state=OK&pageSize=200`, { headers: auth() })).json();
  product = inv.items.find((r: { available: number; reserved: number }) => r.available >= 6 && r.reserved === 0);
});

test('partner write-off looks done to them, but is held for the Super Admin', async ({ page, request }) => {
  await adminLogin(page, MANAGER);
  await page.goto(`/admin/inventory?q=${product.sku}`);
  await settled(page);
  await page.getByRole('row').filter({ hasText: product.sku }).getByRole('button', { name: 'Adjust' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: '− Remove' }).click();
  await dialog.getByLabel('Quantity').fill('2');
  await dialog.getByLabel('Reason').selectOption('Damaged / failed testing');
  await dialog.locator('button[type=submit]').click();
  await expect(page.getByText(`${product.sku}: ${product.onHand - 2} available now`)).toBeVisible(); // what they're shown
  // Real stock is unchanged.
  const real = await (await request.get(`${API}/api/admin/inventory?q=${product.sku}`, { headers: auth() })).json();
  expect(real.items.find((r: { productId: string }) => r.productId === product.productId).onHand).toBe(product.onHand);
});

test('Super Admin sees it on the Security desk and rejects it', async ({ page, request }) => {
  await adminLogin(page, OWNER);
  await page.goto('/admin/security');
  await settled(page);
  await page.getByRole('tab', { name: 'Approvals' }).click();
  const card = page.getByTestId('approval').filter({ hasText: product.title }).first();
  await expect(card).toContainText('Shown to them as done');
  await expect(card).toContainText('Removes 2 unit(s) from stock');
  await card.getByRole('button', { name: 'Reject' }).click();
  await page.getByRole('dialog').getByLabel('Note (optional, kept in the audit log)').fill('No damaged parts in the repair bin');
  await page.getByRole('dialog').getByRole('button', { name: 'Reject' }).click();
  await expect(page.getByText('Rejected — nothing was changed')).toBeVisible();
  const real = await (await request.get(`${API}/api/admin/inventory?q=${product.sku}`, { headers: auth() })).json();
  expect(real.items.find((r: { productId: string }) => r.productId === product.productId).onHand).toBe(product.onHand);
});

test('stock count by staff finds a missing unit; the owner writes it off', async ({ page, browser, request }) => {
  // Measure now: earlier tests in this run may have packed / shipped this product.
  const onHandBefore = (await (await request.get(`${API}/api/admin/inventory?q=${product.sku}`, { headers: auth() })).json()).items.find((r: { productId: string }) => r.productId === product.productId).onHand;
  const units = (await (await request.get(`${API}/api/admin/inventory/units?productId=${product.productId}&status=IN_STOCK`, { headers: auth() })).json()).items as { serial: string }[];
  const total = units.length; // every piece on the shelf has a unit

  // Staff (packer) counts the shelf but one unit is gone.
  await adminLogin(page, PACKER);
  await page.goto('/admin/stock-counts');
  await settled(page);
  await page.getByRole('button', { name: 'Start a count' }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByPlaceholder('Search product by name, SKU or A-number').fill(product.sku);
  await dlg.getByRole('button', { name: product.sku }).first().click();
  await dlg.getByRole('button', { name: 'Start scanning' }).click();
  await page.waitForURL(/\/admin\/stock-counts\/[0-9a-f-]{36}$/);
  const scan = page.getByLabel('Scan unit code');
  for (const u of units.slice(1)) {
    await scan.fill(u.serial);
    await scan.press('Enter');
    await expect(page.getByTestId('last-scan')).toContainText(u.serial);
  }
  await expect(page.getByTestId('scanned-count')).toContainText(String(total - 1));
  await page.getByRole('button', { name: 'Finish count' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Finish & report' }).click();
  await expect(page.getByText(`Missing units · 1`)).toBeVisible();
  await expect(page.getByText(units[0].serial)).toBeVisible();
  const countUrl = page.url();

  // Owner reviews and writes it off.
  const ctx = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  const owner = await ctx.newPage();
  await owner.addInitScript(() => sessionStorage.setItem('ub-intro', '1'));
  await adminLogin(owner, OWNER);
  await owner.goto('/admin/security');
  await owner.getByRole('tab', { name: 'Alerts' }).click();
  await expect(owner.getByTestId('alert').filter({ hasText: '1 unit(s) missing in stock count' }).first()).toBeVisible();
  await owner.goto(countUrl);
  await settled(owner);
  await owner.getByLabel(`Write off ${units[0].serial}`).check();
  await owner.getByRole('button', { name: 'Write off 1 unit(s) & close' }).click();
  await expect(owner.getByText('1 unit(s) written off')).toBeVisible();
  const after = await (await request.get(`${API}/api/admin/inventory?q=${product.sku}`, { headers: auth() })).json();
  expect(after.items.find((r: { productId: string }) => r.productId === product.productId).onHand).toBe(onHandBefore - 1);
  await ctx.close();
});

test('unit barcode labels print, and the audit log verifies intact', async ({ page, context }) => {
  await adminLogin(page, OWNER);
  await page.goto(`/admin/unit-labels?productId=${product.productId}`);
  await expect(page.getByTestId('unit-label').first()).toBeVisible();
  await expect(page.locator('svg[data-code] rect').first()).toBeAttached(); // real barcode bars drawn
  const inStock = (await (await page.request.get(`${API}/api/admin/inventory/units?productId=${product.productId}&status=IN_STOCK`, { headers: auth() })).json()).total;
  expect(await page.getByTestId('unit-label').count()).toBe(inStock); // one label per piece on the shelf

  await page.goto('/admin/security');
  await page.getByRole('tab', { name: 'Audit log' }).click();
  await page.getByRole('button', { name: 'Verify integrity' }).click();
  await expect(page.getByText(/Intact — all \d+ entries check out/)).toBeVisible();
  void context;
});
