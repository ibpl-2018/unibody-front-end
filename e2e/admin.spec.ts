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
