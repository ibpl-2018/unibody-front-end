import { View } from 'react-native';

import { formatINR, type QuoteDTO } from '@/shared';
import { Divider, Text } from './ui';

export function SummaryRow({ label, value, tone, bold }: { label: string; value: string; tone?: 'success' | 'muted'; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text variant={bold ? 'headline' : 'subhead'} color={bold ? 'fg' : 'muted'} style={{ flex: 1 }}>
        {label}
      </Text>
      <Text variant={bold ? 'title3' : 'subhead'} color={tone === 'success' ? 'success' : 'fg'} weight={bold ? '700' : '500'}>
        {value}
      </Text>
    </View>
  );
}

/** Order totals from a server quote (paise). */
export function QuoteSummary({ quote, codLabel = 'COD fee' }: { quote: QuoteDTO; codLabel?: string }) {
  return (
    <View style={{ gap: 8 }}>
      <SummaryRow label={`Subtotal (${quote.itemCount} ${quote.itemCount === 1 ? 'item' : 'items'})`} value={formatINR(quote.subtotal)} />
      {quote.couponDiscount > 0 && <SummaryRow label={`Coupon (${quote.couponCode})`} value={`−${formatINR(quote.couponDiscount)}`} tone="success" />}
      {quote.prepaidDiscount > 0 && <SummaryRow label="Prepaid discount" value={`−${formatINR(quote.prepaidDiscount)}`} tone="success" />}
      <SummaryRow label="Delivery" value={quote.shipping ? formatINR(quote.shipping) : 'Free'} tone={quote.shipping ? undefined : 'success'} />
      {quote.codFee > 0 && <SummaryRow label={codLabel} value={formatINR(quote.codFee)} />}
      <Divider style={{ marginVertical: 4 }} />
      <SummaryRow label="Total" value={formatINR(quote.total)} bold />
      <Text variant="caption" color="muted">
        Prices include GST.
      </Text>
    </View>
  );
}
