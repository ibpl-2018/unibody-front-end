import * as WebBrowser from 'expo-web-browser';

import { api } from './api';
import { APP_SCHEME, WEB_URL } from './config';

export const returnUrlFor = (orderNo: string) => `${APP_SCHEME}://order/${encodeURIComponent(orderNo)}`;

export const payUrlFor = (orderNo: string, phone: string) =>
  `${WEB_URL}/pay/${encodeURIComponent(orderNo)}?phone=${encodeURIComponent(phone)}&return=${encodeURIComponent(returnUrlFor(orderNo))}`;

/**
 * Opens the web storefront's Razorpay page in an auth session. The page redirects to
 * unibody://order/<orderNo> when done, which closes the session. We then ask the API
 * for the real payment status (never trust the redirect alone).
 */
export async function payOnline(orderNo: string, phone: string): Promise<'paid' | 'pending' | 'failed'> {
  try {
    await WebBrowser.openAuthSessionAsync(payUrlFor(orderNo, phone), returnUrlFor(orderNo));
  } catch {
    // fall through to status check
  }
  return paymentState(orderNo, phone);
}

export async function paymentState(orderNo: string, phone: string): Promise<'paid' | 'pending' | 'failed'> {
  const o = await api.store.track(orderNo, phone);
  if (o.paymentStatus === 'PAID') return 'paid';
  if (o.paymentStatus === 'FAILED') return 'failed';
  return 'pending';
}

/** Dev only: complete a mocked Razorpay payment (API running with PAYMENTS_MOCK). */
export async function simulateMockPayment(orderNo: string, phone: string): Promise<boolean> {
  const info = await api.store.paymentInfo(orderNo, phone);
  if (!info.mock) return false;
  await api.store.verifyPayment({
    orderNo,
    razorpay_order_id: info.razorpay?.orderId ?? `order_mock_${orderNo}`,
    razorpay_payment_id: `pay_mock_${Date.now()}`,
    razorpay_signature: 'mock_signature',
  });
  return true;
}
