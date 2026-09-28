import { adminLogin, API, expect, OWNER, settled, test } from './helpers';

// Admin screens redesigned to the Figma: inventory side panel + reorder → PO, harvest panel on
// Purchases, Customers & Leads header / tabs / top customers.
test.describe.configure({ mode: 'serial' });

let token = '';
const auth = () => ({ authorization: `Bearer ${token}` });
test.beforeAll(async ({ request }) => {
  token = (await (await request.post(`${API}/api/admin/auth/login`, { data: OWNER })).json()).token;
});

test('inventory: recent movements beside the stock, and reorder suggestions open a pre-filled PO', async ({ page, request }) => {
  await adminLogin(page);
  await page.goto('/admin/inventory');
  await settled(page);
  await expect(page.getByTestId('recent-movements').getByRole('listitem').first()).toBeVisible();
  const suggestions = await (await request.get(`${API}/api/admin/inventory/reorder`, { headers: auth() })).json();
  if (!suggestions.length) {
    await expect(page.getByText('Nothing runs out in the next 3 weeks.')).toBeVisible();
    return;
  }
  await expect(page.getByTestId('reorder-suggestions')).toContainText(suggestions[0].title);
  await page.getByRole('link', { name: 'Create purchase order' }).click();
  await page.waitForURL('**/admin/purchases/new?reorder=1');
  await expect(page.getByText(`Pre-filled with ${suggestions.length} part(s) from reorder suggestions`)).toBeVisible();
  await expect(page.getByText(suggestions[0].sku)).toBeVisible();
});

test('purchases: harvest a donor unit from the side panel', async ({ page, request }) => {
  const list = await (await request.get(`${API}/api/admin/purchases`, { headers: auth() })).json();
  const po = list.items.find((p: { lines: { kind: string; received: number; harvested: number }[] }) => p.lines.some((l) => l.kind === 'DONOR' && l.received > l.harvested));
  test.skip(!po, 'no donor devices waiting to be harvested');
  const line = po.lines.find((l: { kind: string; received: number; harvested: number }) => l.kind === 'DONOR' && l.received > l.harvested);
  const inv = await (await request.get(`${API}/api/admin/inventory?state=OK&pageSize=1`, { headers: auth() })).json();
  const part = inv.items[0];

  await adminLogin(page);
  await page.goto('/admin/purchases');
  await settled(page);
  await page.getByRole('row').filter({ hasText: po.poNo }).getByRole('button', { name: 'Harvest' }).click();
  await expect(page.getByTestId('harvest-unit')).toContainText(`Donor unit #${line.harvested + 1} of ${line.qty}`);
  await page.getByPlaceholder('Search the part you pulled').fill(part.sku);
  await page.getByRole('button', { name: new RegExp(part.sku) }).first().click();
  await page.getByRole('button', { name: 'Split cost evenly' }).click();
  await page.getByRole('button', { name: 'Add to stock' }).click();
  await expect(page.getByText('1 part added to stock')).toBeVisible();
  const after = (await (await request.get(`${API}/api/admin/purchases/${po.id}`, { headers: auth() })).json()).lines.find((l: { id: string }) => l.id === line.id);
  expect(after.harvested).toBe(line.harvested + 1);
});

test('customers & leads: one header, three tabs, top customers', async ({ page }) => {
  await adminLogin(page);
  await page.goto('/admin/leads');
  await settled(page);
  for (const k of ['Customers', 'Repeat rate', 'Open leads', 'Lead conversion']) await expect(page.getByText(k, { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Top customers' })).toBeVisible();
  await page.getByRole('tab', { name: 'Repair shops (B2B)' }).click();
  await page.waitForURL('**/admin/customers?type=b2b');
  await settled(page);
  const rows = page.getByRole('row').filter({ hasText: /\+91/ });
  await expect(rows.first()).toBeVisible();
  for (const r of await rows.all()) await expect(r).toContainText('B2B');
});

test('offers: live campaign card, and a new coupon is created from the side panel', async ({ page, request }) => {
  await adminLogin(page);
  await page.goto('/admin/offers');
  await settled(page);
  const coupons = await (await request.get(`${API}/api/admin/coupons`, { headers: auth() })).json();
  const live = coupons.find((c: { state: string; showBanner: boolean }) => c.state === 'ACTIVE' && c.showBanner);
  if (live) await expect(page.getByTestId('campaign-card')).toContainText(live.code);
  else await expect(page.getByText('No live campaign')).toBeVisible();

  const code = `E2E${Date.now().toString(36).toUpperCase()}`;
  await page.getByRole('button', { name: 'New coupon' }).click();
  const panel = page.getByTestId('coupon-panel');
  await expect(panel).toBeVisible(); // beside the list, not a modal
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await panel.getByPlaceholder('DIWALI26').fill(code);
  await page.getByRole('button', { name: 'Create coupon' }).click();
  await expect(page.getByText(`${code} created`)).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: code })).toBeVisible();
  const created = (await (await request.get(`${API}/api/admin/coupons`, { headers: auth() })).json()).find((c: { code: string }) => c.code === code);
  await request.put(`${API}/api/admin/coupons/${created.id}`, { headers: auth(), data: { active: false } });
});

test('settings side menu, catalog columns, reports revenue vs cost', async ({ page }) => {
  await adminLogin(page);
  await page.goto('/admin/settings');
  await settled(page);
  const menu = page.getByRole('navigation', { name: 'Settings sections' });
  await menu.getByRole('tab', { name: 'Staff & roles' }).click();
  await expect(page.getByRole('button', { name: 'Add staff' })).toBeVisible();

  await page.goto('/admin/catalog');
  await settled(page);
  const cols = page.getByTestId('catalog-columns');
  await cols.getByRole('navigation', { name: 'Device families' }).getByRole('button', { name: /MacBook Pro/ }).click();
  await expect(cols.getByRole('heading', { name: /MacBook Pro · \d+ models/ })).toBeVisible();
  await expect(cols.getByRole('heading', { name: 'Part categories' })).toBeVisible();

  await page.goto('/admin/reports');
  await settled(page);
  await expect(page.getByRole('heading', { name: 'Revenue vs cost of goods' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Profit by category' })).toBeVisible();
});

test('order detail: COD orders show the confirm-with-customer banner', async ({ page, request }) => {
  const list = await (await request.get(`${API}/api/admin/orders?status=NEW&pageSize=50`, { headers: auth() })).json();
  const cod = list.items.find((o: { paymentMethod: string }) => o.paymentMethod === 'COD');
  test.skip(!cod, 'no new COD order');
  await adminLogin(page);
  await page.goto(`/admin/orders/${cod.id}`);
  await settled(page);
  const banner = page.getByTestId('cod-confirm');
  await expect(banner).toContainText('Cash on Delivery order');
  await expect(banner.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', /wa\.me\/91\d{10}\?text=.*Cash%20on%20Delivery/);
  await expect(banner.getByRole('link', { name: 'Call' })).toHaveAttribute('href', /^tel:\+91\d{10}$/);
});
