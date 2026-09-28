import { API, expect, OWNER, PACKER, test } from './helpers';

// Admin sign-in: a code to the phone on the staff account, Super Admin 2-step, forgot password.
// Codes come from the dev-mode hint (OTP_DEV_MODE); phones are removed again at the end.
test.describe.configure({ mode: 'serial' });

// Fresh numbers each run: a phone can only be sent one code every 30 seconds.
const run = String(Date.now()).slice(-5);
const PHONES = { packer: `98221${run}`, owner: `98223${run}` };
let ownerToken = '';
const ids: Record<string, string> = {};
const setStaff = (request: import('@playwright/test').APIRequestContext, who: 'owner' | 'packer', data: object) =>
  request.put(`${API}/api/admin/staff/${ids[who]}`, { headers: { authorization: `Bearer ${ownerToken}` }, data });
const devCode = async (page: import('@playwright/test').Page) => (await page.getByText(/Dev mode — code:/).locator('strong').innerText()).trim();

test.beforeAll(async ({ request }) => {
  ownerToken = (await (await request.post(`${API}/api/admin/auth/login`, { data: OWNER })).json()).token;
  const staff = await (await request.get(`${API}/api/admin/staff`, { headers: { authorization: `Bearer ${ownerToken}` } })).json();
  for (const who of ['owner', 'packer'] as const) ids[who] = staff.find((u: { email: string }) => u.email === `${who}@unibody.in`).id;
  expect((await setStaff(request, 'packer', { phone: PHONES.packer })).ok()).toBe(true);
});
test.afterAll(async ({ request }) => {
  for (const who of ['owner', 'packer'] as const) await setStaff(request, who, { phone: null, password: OWNER.password });
});

test('staff sign in with a code sent to their phone', async ({ page }) => {
  await page.goto('/admin/login');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Sign in with OTP on phone' }).click();
  await page.getByLabel('Mobile number').fill(PHONES.packer);
  await page.getByRole('button', { name: 'Send code' }).click();
  await page.getByLabel('6-digit code').fill(await devCode(page));
  await page.getByRole('button', { name: 'Verify & sign in' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/admin/login'));
  await expect(page.getByText('Packer').first()).toBeVisible();
});

test('forgot password: code to the phone, new password works', async ({ page }) => {
  await page.goto('/admin/login');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Forgot?' }).click();
  await page.getByLabel('Email', { exact: true }).fill(PACKER.email);
  await page.getByRole('button', { name: 'Send code' }).click();
  await page.getByLabel('6-digit code').fill(await devCode(page));
  await page.getByLabel('New password', { exact: true }).fill('Packer-New-2026');
  await page.getByRole('button', { name: 'Set new password' }).click();
  await expect(page.getByText('Password changed. Sign in with your new password.')).toBeVisible();
  await page.getByLabel('Email', { exact: true }).fill(PACKER.email);
  await page.getByLabel('Password', { exact: true }).fill('Packer-New-2026');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/admin/login'));
});

test('Super Admin with a phone on file needs the code after the password', async ({ page, request }) => {
  expect((await setStaff(request, 'owner', { phone: PHONES.owner })).ok()).toBe(true);
  await page.goto('/admin/login');
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Email', { exact: true }).fill(OWNER.email);
  await page.getByLabel('Password', { exact: true }).fill(OWNER.password);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByText(/2-step verification: we sent a 6-digit code to \+91 98•+\d{3}\./)).toBeVisible();
  await page.getByLabel('6-digit code').fill('000000' === (await devCode(page)) ? '111111' : '000000');
  await page.getByRole('button', { name: 'Verify & sign in' }).click();
  await expect(page.getByText('That code is not correct')).toBeVisible();
  await page.getByLabel('6-digit code').fill(await devCode(page));
  await page.getByRole('button', { name: 'Verify & sign in' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/admin/login'));
  expect((await setStaff(request, 'owner', { phone: null })).ok()).toBe(true);
});
