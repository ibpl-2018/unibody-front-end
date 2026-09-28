import { adminLogin, API, expect, PACKER, randomPhone, saveState, settled, test } from './helpers';

// One customer journey end to end through the real UI:
// storefront checkout (OTP, COD) → live tracking page updates while admin moves the order → GST invoice on dispatch.
test.describe.configure({ mode: 'serial' });

const phone = randomPhone();
let orderNo = '';
let slug = '';
let otpAt = 0; // the API allows one OTP per phone every 30 s

test.beforeAll(async ({ request }) => {
  const r = await request.get(`${API}/api/products?family=macbook-air&inStock=1&limit=20`);
  const items = (await r.json()).items as { slug: string; stock: number; price: number; codAllowed?: boolean }[];
  // Well-stocked part priced inside the COD window (min ₹299, max ₹15,000).
  slug = items.find((p) => p.stock > 3 && p.price >= 30_000 && p.price <= 500_000 && p.codAllowed !== false)!.slug;
});

test('customer: listing → product → bag → OTP checkout → COD order', async ({ page }) => {
  await page.goto('/d/macbook-air');
  await settled(page);
  await expect(page.getByRole('heading', { name: 'MacBook Air', level: 1 })).toBeVisible();

  await page.goto(`/p/${slug}`);
  await settled(page);
  await page.getByRole('button', { name: 'Add to Bag' }).first().click();

  await page.goto('/bag');
  await settled(page);
  await expect(page.getByText('Your bag is empty')).toHaveCount(0);
  await page.getByRole('link', { name: 'Checkout' }).click();
  await page.waitForURL('**/checkout');
  await settled(page);

  await page.locator('#c-name').fill('Playwright Tester');
  await page.locator('#c-phone').fill(phone);
  await page.getByRole('button', { name: 'Verify', exact: true }).click();
  otpAt = Date.now();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Verify your mobile')).toBeVisible();
  // OTP_DEV_MODE shows the code as a tap-to-fill button.
  await dialog.getByRole('button', { name: /^\d{6}$/ }).click();
  await expect(page.getByText('Verified', { exact: true })).toBeVisible();

  await page.locator('#a-pin').fill('560038');
  await expect(page.locator('#a-city')).toHaveValue(/Bengaluru/i);
  await page.locator('#a-l1').fill('Flat 4B, Palm Court');
  await page.locator('#a-l2').fill('Indiranagar 100ft Road');

  await page.getByRole('radio', { name: /Cash on Delivery/ }).click();
  await page.getByRole('button', { name: /^Place order/ }).click();
  await page.waitForURL(/\/order\/UB-\d{6}-\d{4}/);
  orderNo = /\/order\/(UB-\d{6}-\d{4})/.exec(page.url())![1];
  await settled(page);
  await expect(page.getByText(orderNo).first()).toBeVisible();
  saveState({ orderNo, phone, slug });
});

test('admin: process the order while the customer watches live tracking', async ({ page, context }) => {
  const customer = await context.newPage();
  await customer.goto(`/track/${orderNo}?phone=${phone}`);
  await expect(customer.getByText('Live', { exact: true })).toBeVisible({ timeout: 15_000 });

  await adminLogin(page);
  await page.goto(`/admin/orders/${orderNo}`);
  await settled(page);
  await expect(page.getByText(orderNo).first()).toBeVisible();

  await page.getByRole('button', { name: 'Confirm order' }).click();
  // SSE pushes the change to the customer's open page without a reload.
  await expect(customer.getByText('Your parts are being picked and bench-tested.')).toBeVisible();

  await page.getByRole('button', { name: 'Mark packed' }).click();
  await expect(customer.getByText('Packed and quality-checked — handing to the courier.')).toBeVisible();

  // Found by its visible label — admin form labels are linked to their inputs.
  await page.getByLabel('AWB number').fill('PW' + Date.now());
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Shipment saved — customer can now track it')).toBeVisible();

  await page.getByRole('button', { name: 'Mark shipped' }).click();
  await expect(customer.getByText(/Delhivery · AWB PW/).first()).toBeVisible();
  await expect(customer.getByRole('list', { name: 'Order progress' }).getByText('Shipped')).toBeVisible();
  await expect(page.getByText(/INV\/\d{2}-\d{2}\/\d{5}/).first()).toBeVisible();
  await customer.close();
});

test('admin: create a phone order (COD) on the New order screen', async ({ page, request }) => {
  const p = await (await request.get(`${API}/api/products/${slug}`)).json();
  await adminLogin(page);
  await page.goto('/admin/orders');
  await page.getByRole('link', { name: 'New order' }).click();
  await page.waitForURL('**/admin/orders/new');
  await settled(page);
  await page.getByLabel('Mobile number').fill(randomPhone());
  await page.getByLabel('Full name').fill('Phone Order Tester');
  await page.getByLabel('Pincode').fill('560038');
  await expect(page.getByLabel('City')).toHaveValue(/Bengaluru/i);
  await page.getByLabel('Flat / House no. / Building').fill('12 MG Road');
  await page.getByLabel('Area / Street / Locality').fill('Indiranagar');
  await page.getByPlaceholder('Search product by name, SKU or A-number').fill(p.sku);
  await page.getByRole('button', { name: p.sku }).first().click(); // name matches as a substring
  await expect(page.getByText(/^Total$/)).toBeVisible();
  await page.getByRole('button', { name: 'Create order' }).click();
  await page.waitForURL(/\/admin\/orders\/[0-9a-f-]{36}$/);
  await settled(page);
  await expect(page.getByText('Order created by staff')).toBeVisible();
  await expect(page.getByText(/#UB-\d{6}-\d{4}/).first()).toBeVisible();
});

test('admin: bulk-print invoices from the Invoices list', async ({ page, context }) => {
  await adminLogin(page);
  await page.goto('/admin/invoices');
  await settled(page);
  const rows = page.getByRole('checkbox', { name: 'Select row' });
  await rows.nth(0).check();
  await rows.nth(1).check();
  const [popup] = await Promise.all([context.waitForEvent('page'), page.getByRole('button', { name: 'Print 2 invoices' }).click()]);
  await popup.waitForLoadState('networkidle');
  await expect(popup.getByRole('heading', { name: 'TAX INVOICE' })).toHaveCount(2);
  await popup.close();
});

test('customer: online payment via the /pay page (mock Razorpay)', async ({ page, request }) => {
  // Create a pending UPI order through the API (fresh number: OTPs are limited to one per 30 s per phone),
  // then pay it through the web /pay page — the same page the mobile app opens for online payments.
  const payPhone = randomPhone();
  const ok = async <T>(r: Promise<import('@playwright/test').APIResponse>): Promise<T> => {
    const res = await r;
    expect(res.ok(), `${res.url()} -> ${res.status()} ${await res.text()}`).toBeTruthy();
    return res.json();
  };
  const s = await ok<{ devCode: string }>(request.post(`${API}/api/otp/send`, { data: { phone: payPhone } }));
  const { token } = await ok<{ token: string }>(request.post(`${API}/api/otp/verify`, { data: { phone: payPhone, code: s.devCode } }));
  const p = await ok<{ id: string }>(request.get(`${API}/api/products/${slug}`));
  const o = await ok<{ orderNo: string }>(
    request.post(`${API}/api/orders`, {
      headers: { authorization: `Bearer ${token}` },
      data: { name: 'Playwright Tester', address: { line1: 'Flat 4B', line2: 'Indiranagar', pincode: '560038', city: 'Bengaluru', state: 'Karnataka' }, items: [{ productId: p.id, qty: 1 }], paymentMethod: 'UPI' },
    }),
  );
  await page.goto(`/pay/${o.orderNo}?phone=${payPhone}`);
  await settled(page);
  await expect(page.getByText('Test payment')).toBeVisible();
  await page.getByRole('button', { name: /^Pay .*\(success\)$/ }).click();
  await expect(page.getByText('Payment successful')).toBeVisible();
});

test('customer: my orders after OTP sign-in', async ({ page }) => {
  await page.waitForTimeout(Math.max(0, otpAt + 31_000 - Date.now()));
  await page.goto('/orders');
  await settled(page);
  await page.locator('#login-phone').fill(phone);
  await page.getByRole('button', { name: /continue|send|get code|sign in/i }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: /^\d{6}$/ }).click();
  await expect(page.getByText(orderNo).first()).toBeVisible();
});

test('packer: restricted screens and no cost data', async ({ page }) => {
  await adminLogin(page, PACKER);
  for (const path of ['/admin/reports', '/admin/purchases', '/admin/invoices']) {
    await page.goto(path);
    await settled(page);
    await expect(page.getByText('You don’t have access'), path).toBeVisible();
  }
  await page.goto('/admin/orders');
  await settled(page);
  await expect(page.getByText('You don’t have access')).toHaveCount(0);
});
