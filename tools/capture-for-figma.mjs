// Captures the live screens that correspond to the Figma frames (for side-by-side design review).
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const OUT = process.argv[2];
const WEB = 'http://localhost:3000', APP = 'http://localhost:8084', API = 'http://localhost:4000';
mkdirSync(OUT, { recursive: true });
const j = (r) => r.json();
const post = (u, b, t) => fetch(API + u, { method: 'POST', headers: { 'content-type': 'application/json', ...(t ? { authorization: `Bearer ${t}` } : {}) }, body: JSON.stringify(b) }).then(j);
const get = (u, t) => fetch(API + u, { headers: t ? { authorization: `Bearer ${t}` } : {} }).then(j);

const M1 = '287d2954-f929-493c-9978-17174e2f894e';
const SLUG = 'display-assembly-for-macbook-air-13-m1-2020-space-grey-a2337-1';
const owner = (await post('/api/admin/auth/login', { email: 'owner@unibody.in', password: 'Unibody@2026' })).token;
// A real order to show on confirmation / tracking screens.
const phone = '9876500011';
const otp = await post('/api/otp/send', { phone });
const cust = (await post('/api/otp/verify', { phone, code: otp.devCode })).token;
const product = await get(`/api/products/${SLUG}`);
const order = await post('/api/orders', { name: 'Rahul Sharma', address: { line1: 'Flat 12B, Prestige Lakeside', line2: 'Whitefield Main Road', pincode: '560066', city: 'Bengaluru', state: 'Karnataka' }, items: [{ productId: product.id, qty: 1 }], paymentMethod: 'COD', source: 'WEB' }, cust);
await post(`/api/admin/orders/${order.orderNo}/status`, { status: 'CONFIRMED' }, owner);
const detail = await get(`/api/admin/orders/${order.orderNo}`, owner);
const anyProduct = (await get('/api/admin/products?pageSize=1', owner)).items[0];

const browser = await chromium.launch({ channel: 'chrome' });
const settle = async (p) => { await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(600); };
const snap = async (p, name, full = true) => { await settle(p); await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: full }); console.log('✓', name); };

// ---------- desktop storefront ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('ub-intro', '1'); localStorage.setItem('theme', 'light'); } catch {} });
  const p = await ctx.newPage();
  await p.goto(WEB + '/'); await snap(p, 'D01-home');
  await p.goto(`${WEB}/d/macbook-air/${M1}`); await snap(p, 'D02-listing');
  await p.goto(`${WEB}/p/${SLUG}`); await snap(p, 'D03-product');
  await p.getByRole('button', { name: 'Add to Bag' }).first().click();
  await p.goto(WEB + '/bag'); await snap(p, 'D04-bag', false);
  await p.goto(WEB + '/checkout'); await snap(p, 'D05-checkout');
  await p.goto(`${WEB}/order/${order.orderNo}?phone=${phone}&new=1`); await snap(p, 'D06-confirmed');
  await p.goto(`${WEB}/track/${order.orderNo}?phone=${phone}`); await snap(p, 'D07-track');
  await ctx.close();
}
// ---------- admin ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  const p = await ctx.newPage();
  await p.goto(WEB + '/admin/login'); await snap(p, 'A00-signin', false);
  await p.getByLabel('Work email').fill('owner@unibody.in');
  await p.getByLabel('Password', { exact: true }).fill('Unibody@2026');
  await p.getByRole('button', { name: 'Sign in' }).click();
  await p.waitForURL((u) => !u.pathname.startsWith('/admin/login'));
  for (const [path, name] of [
    ['/admin', 'A01-dashboard'], ['/admin/orders', 'A02-orders'], [`/admin/orders/${detail.id}`, 'A03-order-detail'], ['/admin/products', 'A04-products'],
    [`/admin/products/${anyProduct.id}`, 'A05-product-edit'], ['/admin/inventory', 'A06-inventory'], ['/admin/purchases', 'A07-purchases'], ['/admin/invoices', 'A08-invoices'],
    ['/admin/customers', 'A09-customers'], ['/admin/offers', 'A10-offers'], ['/admin/reports', 'A11-reports'], ['/admin/settings', 'A12-settings'], ['/admin/catalog', 'A13-catalog'],
  ]) { await p.goto(WEB + path); await snap(p, name); }
  await ctx.close();
}
// ---------- mobile app (Expo web, 390 × 844) ----------
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: 'light', isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  const go = async (path, name, full = true) => { await p.goto(APP + path); await p.waitForTimeout(path === '/' ? 9000 : 3500); await snap(p, name, full); };
  await go('/', 'M01-home'); // intro plays first on app launch; 3.5 s wait lets it finish
  await go(`/parts?family=macbook-air&model=${M1}`, 'M03-listing');
  await go(`/product/${SLUG}`, 'M04-product');
  await p.getByText('Add to Bag').first().click().catch(() => console.log('  (add to bag not clickable)'));
  await p.waitForTimeout(800);
  await go('/bag', 'M05-bag', false);
  await go('/checkout', 'M06-checkout', true);
  await go(`/confirmation/${order.orderNo}`, 'M09-confirmed', false);
  await go(`/order/${order.orderNo}?phone=${phone}`, 'M10-track', false);
  await ctx.close();
}
await browser.close();
