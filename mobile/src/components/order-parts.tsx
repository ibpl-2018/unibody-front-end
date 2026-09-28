import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { api, errorMessage } from '@/lib/api';
import { fmtDateTime, fmtDay } from '@/lib/format';
import { paymentState, payOnline, simulateMockPayment } from '@/lib/payment';
import { CONDITION_SHORT, formatINR, ORDER_FLOW, PAYMENT_METHOD_LABEL, STATUS_LABEL, type OrderPublicDTO, type OrderStatus } from '@/shared';
import { useStoreConfig } from '@/state/store-config';
import { useTheme } from '@/theme/ThemeProvider';
import { SummaryRow } from './summary';
import { Button, Card, Divider, Input, Notice, ProductImage, Sheet, Text } from './ui';

/** Vertical order timeline: the happy-path steps, filled from the order's events. */
export function OrderTimeline({ order }: { order: OrderPublicDTO }) {
  const { colors } = useTheme();
  const events = order.events.filter((e) => !e.internal);
  const terminal = order.status === 'CANCELLED' || order.status === 'RETURNED';
  const reached = new Map<OrderStatus, { at: string; note: string | null; label: string }>();
  for (const e of [...events].sort((a, b) => a.at.localeCompare(b.at))) {
    if (e.status && !reached.has(e.status)) reached.set(e.status, { at: e.at, note: e.note, label: e.label });
  }
  if (!reached.has('NEW')) reached.set('NEW', { at: order.createdAt, note: null, label: 'Order placed' });
  const currentIdx = ORDER_FLOW.indexOf(order.status);
  const steps: { status: OrderStatus; done: boolean; current: boolean }[] = ORDER_FLOW.map((s, i) => ({
    status: s,
    done: terminal ? reached.has(s) : i <= currentIdx,
    current: !terminal && i === currentIdx,
  }));
  if (terminal) {
    const lastDone = steps.filter((s) => s.done);
    steps.splice(lastDone.length, steps.length - lastDone.length, { status: order.status, done: true, current: true });
  }

  return (
    <View accessibilityRole="list">
      {steps.map((s, i) => {
        const info = reached.get(s.status);
        const last = i === steps.length - 1;
        const isBad = s.status === 'CANCELLED' || s.status === 'RETURNED';
        const dotColor = isBad ? colors.danger : s.done ? colors.success : colors.line;
        const nextDone = !last && steps[i + 1].done;
        return (
          <View key={s.status} style={{ flexDirection: 'row', gap: 14 }} accessible accessibilityLabel={`${STATUS_LABEL[s.status]}${s.done ? ', done' : ', pending'}${info ? `, ${fmtDateTime(info.at)}` : ''}`}>
            <View style={{ alignItems: 'center', width: 24 }}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: s.done ? dotColor : colors.surface,
                  borderWidth: s.done ? 0 : 2,
                  borderColor: s.current ? colors.success : colors.line,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                {s.done && <Ionicons name={isBad ? 'close' : 'checkmark'} size={14} color="#fff" />}
              </View>
              {!last && <View style={{ flex: 1, width: 2, minHeight: 28, backgroundColor: nextDone ? colors.success : colors.line }} />}
            </View>
            <View style={{ flex: 1, paddingBottom: last ? 0 : 18 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <Text variant="callout" weight={s.current ? '700' : '600'} color={s.done ? 'fg' : 'muted'}>
                  {STATUS_LABEL[s.status]}
                </Text>
                {info ? (
                  <Text variant="caption" color="muted">
                    {fmtDateTime(info.at)}
                  </Text>
                ) : s.status === 'DELIVERED' && order.etaDate && !terminal ? (
                  <Text variant="caption" color="muted">
                    Expected {fmtDay(order.etaDate)}
                  </Text>
                ) : null}
              </View>
              {info && (info.note || (info.label && info.label !== STATUS_LABEL[s.status])) && (
                <Text variant="footnote" color="muted">
                  {info.note ?? info.label}
                </Text>
              )}
              {s.status === 'SHIPPED' && s.done && order.shipment && (
                <Text variant="footnote" color="muted">
                  {order.shipment.courier} · AWB {order.shipment.awb}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function OrderItems({ order }: { order: OrderPublicDTO }) {
  const { colors } = useTheme();
  const t = order.totals;
  const paid = order.paymentStatus === 'PAID' || order.paymentStatus === 'COD_COLLECTED';
  return (
    <Card style={{ gap: 12 }}>
      <Text variant="title3">Items</Text>
      {order.items.map((it) => (
        <View key={it.id} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <ProductImage src={it.image} alt={it.title} tint={it.icon} style={{ width: 52 }} radius={12} padding={5} />
          <View style={{ flex: 1 }}>
            <Text variant="subhead" weight="600" numberOfLines={2}>
              {it.title}
            </Text>
            <Text variant="caption" color="muted">
              Qty {it.qty} · {CONDITION_SHORT[it.condition]}
              {it.unitSerials.length ? ` · ${it.unitSerials.join(', ')}` : ''}
            </Text>
          </View>
          <Text variant="subhead" weight="600">
            {formatINR(it.lineTotal)}
          </Text>
        </View>
      ))}
      <Divider />
      <View style={{ gap: 6 }}>
        <SummaryRow label="Subtotal" value={formatINR(t.subtotal)} />
        {t.couponDiscount > 0 && <SummaryRow label={`Coupon${order.couponCode ? ` (${order.couponCode})` : ''}`} value={`−${formatINR(t.couponDiscount)}`} tone="success" />}
        {t.prepaidDiscount > 0 && <SummaryRow label="Prepaid discount" value={`−${formatINR(t.prepaidDiscount)}`} tone="success" />}
        <SummaryRow label="Delivery" value={t.shipping ? formatINR(t.shipping) : 'Free'} tone={t.shipping ? undefined : 'success'} />
        {t.codFee > 0 && <SummaryRow label="COD fee" value={formatINR(t.codFee)} />}
        <Divider style={{ marginVertical: 4 }} />
        <SummaryRow label={`${paid ? 'Paid' : order.paymentMethod === 'COD' ? 'To pay on delivery' : 'Total'} (${PAYMENT_METHOD_LABEL[order.paymentMethod]})`} value={formatINR(t.total)} bold />
      </View>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 4 }}>
        <Ionicons name="location-outline" size={16} color={colors.muted} style={{ marginTop: 1 }} />
        <Text variant="footnote" color="muted" style={{ flex: 1 }}>
          {order.customerName} · {order.phoneMasked}
          {'\n'}
          {[order.address.line1, order.address.line2, order.address.landmark, `${order.address.city} ${order.address.pincode}`].filter(Boolean).join(', ')}
        </Text>
      </View>
      {order.invoiceNo && (
        <Text variant="caption" color="muted">
          Invoice {order.invoiceNo}
        </Text>
      )}
    </Card>
  );
}

/** Online order whose payment isn't complete yet: retry (and dev-only mock completion). */
export function PaymentPending({ order, phone, onChanged }: { order: OrderPublicDTO; phone: string; onChanged: () => void }) {
  const [busy, setBusy] = useState<null | 'pay' | 'mock'>(null);
  const [msg, setMsg] = useState<string | null>(null);
  if (order.paymentMethod === 'COD' || order.paymentStatus === 'PAID' || order.status === 'CANCELLED') return null;
  const retry = async () => {
    setBusy('pay');
    setMsg(null);
    try {
      const s = await payOnline(order.orderNo, phone);
      if (s !== 'paid') setMsg(s === 'failed' ? 'The payment failed. You can try again.' : 'We haven’t received the payment yet.');
    } catch (e) {
      setMsg(errorMessage(e));
    } finally {
      setBusy(null);
      onChanged();
    }
  };
  const mock = async () => {
    setBusy('mock');
    setMsg(null);
    try {
      const ok = await simulateMockPayment(order.orderNo, phone);
      if (!ok) setMsg('Payments are not in mock mode.');
      else await paymentState(order.orderNo, phone);
    } catch (e) {
      setMsg(errorMessage(e));
    } finally {
      setBusy(null);
      onChanged();
    }
  };
  return (
    <Notice tone={order.paymentStatus === 'FAILED' ? 'danger' : 'warning'} icon="card-outline">
      <Text variant="subhead" weight="600">
        {order.paymentStatus === 'FAILED' ? 'Payment failed' : 'Payment pending'}
      </Text>
      <Text variant="footnote" color="muted" style={{ marginTop: 2 }}>
        Complete the {formatINR(order.totals.total)} payment to confirm your order. Your parts are reserved for a short while.
      </Text>
      {msg && (
        <Text variant="footnote" color="danger" style={{ marginTop: 6 }}>
          {msg}
        </Text>
      )}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        <Button title="Complete payment" size="sm" icon="lock-closed" loading={busy === 'pay'} onPress={retry} />
        {__DEV__ && <Button title="Simulate payment (dev)" size="sm" variant="secondary" loading={busy === 'mock'} onPress={mock} />}
      </View>
    </Notice>
  );
}

export function HelpCard({ order, phone, onCancelled }: { order: OrderPublicDTO; phone: string; onCancelled: (o: OrderPublicDTO) => void }) {
  const { config } = useStoreConfig();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const wa = `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(`Hi Unibody, I need help with order ${order.orderNo}`)}`;

  const cancel = async () => {
    setBusy(true);
    setErr(null);
    try {
      const o = await api.store.cancelOrder(order.orderNo, phone, reason.trim() || undefined);
      setOpen(false);
      onCancelled(o);
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ gap: 10 }}>
      <Text variant="title3">Need help?</Text>
      <Button title="Chat on WhatsApp" variant="dark" icon="logo-whatsapp" full onPress={() => Linking.openURL(wa).catch(() => {})} />
      <Button title={`Call ${config.supportPhone}`} variant="outline" icon="call-outline" full onPress={() => Linking.openURL(`tel:${config.supportPhone.replace(/\s/g, '')}`).catch(() => {})} />
      {order.canCancel ? (
        <Pressable onPress={() => setOpen(true)} accessibilityRole="button" style={{ alignSelf: 'center', padding: 8 }}>
          <Text variant="subhead" color="danger" weight="600">
            Cancel order
          </Text>
        </Pressable>
      ) : (
        <Text variant="caption" color="muted" center>
          {order.status === 'CANCELLED' ? 'This order was cancelled.' : 'Cancel is available until your order is packed.'}
        </Text>
      )}
      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Cancel this order?"
        footer={
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="Keep order" variant="secondary" onPress={() => setOpen(false)} style={{ flex: 1 }} />
            <Button title="Cancel order" variant="danger" loading={busy} onPress={cancel} style={{ flex: 1 }} />
          </View>
        }>
        <Text variant="subhead" color="muted">
          {order.paymentStatus === 'PAID' ? 'Your payment will be refunded to the original method in 5–7 working days.' : 'Nothing has been charged for this order.'}
        </Text>
        <Input label="Reason (optional)" value={reason} onChangeText={setReason} placeholder="e.g. Ordered the wrong model" maxLength={200} />
        {err && <Notice tone="danger">{err}</Notice>}
      </Sheet>
    </Card>
  );
}
