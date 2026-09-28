'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { MapPin, MessageCircle, Phone } from 'lucide-react';
import { formatINR, formatPhone } from '@unibody/shared';
import { Badge, Button, EmptyState, Field, Input, Skeleton, Switch, buttonClass } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { DataTable, ErrorState, PageHeader, Panel, StatMini } from '@/components/admin/ui';
import { orderColumns } from '@/components/admin/badges';
import { NoAccess } from '@/components/admin/no-access';
import { adminApi, errMsg, telLink, useApi, waLink } from '@/lib/admin/api';
import { useAdmin } from '@/lib/admin/session';
import { fmtDate } from '@/lib/format';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAdmin();
  const toast = useToast();
  const { data: c, error, refetch, setData } = useApi(() => adminApi.admin.customer(id), [id], { enabled: can('customers') });
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (c) {
      setName(c.name ?? '');
      setEmail(c.email ?? '');
    }
  }, [c]);
  if (!can('customers')) return <NoAccess what="customers" />;
  if (error && !c) return <ErrorState message={error} onRetry={refetch} />;
  if (!c) return <Skeleton className="h-[480px]" />;

  const save = async (patch: { name?: string; email?: string; isB2B?: boolean }, ok: string) => {
    setBusy(true);
    try {
      await adminApi.admin.updateCustomer(c.id, patch);
      setData({ ...c, ...patch });
      toast(ok);
    } catch (e) {
      toast(errMsg(e), 'error');
    } finally {
      setBusy(false);
    }
  };
  const aov = c.orderCount ? Math.round(c.lifetimeValue / c.orderCount) : 0;
  return (
    <>
      <PageHeader
        back={{ href: '/admin/customers', label: 'Customers' }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {c.name ?? 'Unnamed customer'}
            {c.isB2B && <Badge tone="purple">B2B</Badge>}
            <Badge tone={c.registered ? 'info' : 'neutral'}>{c.registered ? 'Registered' : 'Guest'}</Badge>
          </span>
        }
        subtitle={`${formatPhone(c.phone)}${c.city ? ` · ${c.city}` : ''} · customer since ${fmtDate(c.createdAt)}`}
        actions={
          <>
            <a href={telLink(c.phone)} className={buttonClass('outline')}>
              <Phone className="size-4" />
              Call
            </a>
            <a href={waLink(c.phone, `Hi ${c.name?.split(' ')[0] ?? ''}, this is Unibody.`)} target="_blank" rel="noreferrer" className={buttonClass('outline', 'md', 'text-success')}>
              <MessageCircle className="size-4" />
              WhatsApp
            </a>
          </>
        }
      />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatMini label="Orders" value={c.orderCount} />
        <StatMini label="Lifetime value" value={formatINR(c.lifetimeValue)} tone="success" />
        <StatMini label="Average order" value={aov ? formatINR(aov) : '—'} />
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Panel title="Orders" padded={false}>
          <DataTable className="rounded-none border-0" columns={orderColumns({ items: false })} rows={c.orders} rowKey={(o) => o.id} rowHref={(o) => `/admin/orders/${o.id}`} empty={<EmptyState title="No orders yet" />} />
        </Panel>
        <div className="space-y-5">
          <Panel title="Profile">
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void save({ name: name.trim(), email: email.trim() }, 'Customer saved');
              }}
            >
              <Field label="Name">
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Email">
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
              </Field>
              <Button type="submit" size="sm" variant="dark" loading={busy} disabled={name === (c.name ?? '') && email === (c.email ?? '')}>
                Save
              </Button>
            </form>
            <div className="mt-5 flex items-center gap-3 border-t border-line-subtle pt-4">
              <div className="flex-1 leading-tight">
                <p className="text-sm font-medium">B2B / repair shop</p>
                <p className="text-xs text-muted">Tag trade customers for bulk follow-ups</p>
              </div>
              <Switch checked={c.isB2B} onChange={(v) => save({ isB2B: v }, v ? 'Marked as B2B' : 'B2B tag removed')} label="B2B customer" disabled={busy} />
            </div>
          </Panel>
          <Panel title="Saved addresses">
            {c.addresses.length === 0 ? (
              <p className="text-sm text-muted">No saved addresses (guest checkout).</p>
            ) : (
              <ul className="space-y-3">
                {c.addresses.map((a) => (
                  <li key={a.id} className="flex gap-3 rounded-xl bg-surface-2/60 p-3 text-sm">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-muted" />
                    <div className="leading-relaxed">
                      <Badge className="mb-1">{a.label}</Badge>
                      <p>
                        {a.line1}, {a.line2}
                      </p>
                      <p className="text-muted">
                        {a.city}, {a.state} — {a.pincode}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
