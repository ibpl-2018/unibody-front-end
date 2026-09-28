'use client';
import { useState } from 'react';
import Link from 'next/link';
import { MessageCircle, NotebookPen, Phone, ShoppingCart } from 'lucide-react';
import { LEAD_STAGES, formatINR, formatPhone, type CustomerDTO, type LeadDTO, type LeadStage } from '@unibody/shared';
import { Badge, Button, EmptyState, Field, Modal, Segmented, Textarea } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { DataTable, ErrorState, Pagination, Panel, PillTabs, type Column } from '@/components/admin/ui';
import { CrmHeader } from '@/components/admin/crm-tabs';
import { LEAD_LABEL, LeadStageBadge } from '@/components/admin/badges';
import { NoAccess } from '@/components/admin/no-access';
import { adminApi, errMsg, telLink, useApi, waLink } from '@/lib/admin/api';
import { useAdmin } from '@/lib/admin/session';
import { useResetPage } from '@/lib/admin/url';
import { fmtDateTime } from '@/lib/format';
import { SITE_URL } from '@/lib/config';

type Tab = LeadStage | 'OPEN' | '';

function waMessage(l: LeadDTO) {
  const first = l.name?.split(' ')[0];
  const items = l.items.map((i) => `• ${i.title}${i.qty > 1 ? ` × ${i.qty}` : ''} — ${formatINR(i.price * i.qty)}`).join('\n');
  return `Hi${first ? ` ${first}` : ''}, this is Unibody 👋\n\nYou left these in your cart:\n${items}\n\nThey’re still in stock and tested before dispatch. Cash on Delivery is available. Reply here if you have any questions about fit — just share your MacBook’s A-number.\n\nComplete your order: ${SITE_URL}/cart`;
}

export default function LeadsPage() {
  const { can, refreshCounts } = useAdmin();
  const toast = useToast();
  const allowed = can('leads');
  const [tab, setTab] = useState<Tab>('ABANDONED');
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState<LeadDTO | null>(null);
  const [version, setVersion] = useState(0);
  const { data, error, loading, refetch, setData } = useApi(() => adminApi.admin.leads({ stage: tab === 'OPEN' ? undefined : tab || undefined, page }), [tab, page], { enabled: allowed });
  useResetPage(setPage, [tab]);
  if (!allowed) return <NoAccess what="leads" />;

  const setStage = async (l: LeadDTO, stage: LeadStage, note?: string | null) => {
    try {
      await adminApi.admin.setLeadStage(l.id, stage, note ?? l.note ?? undefined);
      setData((d) => d && { ...d, items: d.items.map((x) => (x.id === l.id ? { ...x, stage, note: note ?? x.note } : x)) });
      toast(`Lead marked ${LEAD_LABEL[stage].toLowerCase()}`);
      refreshCounts();
      setVersion((v) => v + 1);
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  };
  const contact = (l: LeadDTO) => {
    if (l.stage === 'ABANDONED') void setStage(l, 'CONTACTED');
  };

  const cols: Column<LeadDTO>[] = [
    {
      key: 'who',
      header: 'Lead',
      cell: (l) => (
        <div className="min-w-[150px] leading-tight">
          <p className="font-medium">{l.name ?? 'Unknown'}</p>
          <p className="text-xs tabular-nums text-muted">
            {formatPhone(l.phone)}
            {l.city && ` · ${l.city}`}
          </p>
        </div>
      ),
    },
    {
      key: 'cart',
      header: 'Cart',
      cell: (l) => (
        <div className="max-w-[320px] leading-tight">
          <p className="line-clamp-1 text-[13px]">{l.items[0]?.title ?? '—'}</p>
          {l.items.length > 1 && <p className="text-xs text-muted">+{l.items.length - 1} more</p>}
          {l.note && <p className="mt-0.5 line-clamp-1 text-xs italic text-muted">“{l.note}”</p>}
        </div>
      ),
    },
    { key: 'v', header: 'Value', align: 'right', cell: (l) => <span className="font-medium tabular-nums">{formatINR(l.value)}</span> },
    { key: 'at', header: 'Last activity', hide: 'lg', cell: (l) => <span className="whitespace-nowrap text-[13px] text-muted">{fmtDateTime(l.updatedAt)}</span> },
    { key: 'st', header: 'Stage', cell: (l) => <LeadStageBadge stage={l.stage} /> },
    {
      key: 'act',
      header: '',
      align: 'right',
      cell: (l) => (
        <span className="inline-flex items-center gap-0.5">
          <a href={telLink(l.phone)} onClick={() => contact(l)} aria-label="Call" title="Call" className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-fg">
            <Phone className="size-4" />
          </a>
          <a href={waLink(l.phone, waMessage(l))} target="_blank" rel="noreferrer" onClick={() => contact(l)} aria-label="WhatsApp with cart reminder" title="WhatsApp with cart reminder" className="rounded-full p-2 text-muted hover:bg-success-soft hover:text-success">
            <MessageCircle className="size-4" />
          </a>
          <Button size="sm" variant="outline" onClick={() => setEdit(l)} className="ml-1">
            <NotebookPen className="size-3.5" />
            Update
          </Button>
        </span>
      ),
    },
  ];
  return (
    <>
      <CrmHeader value="leads" version={version} />
      <PillTabs className="mb-4" value={tab} onChange={setTab} tabs={[...LEAD_STAGES.map((st) => ({ value: st as Tab, label: LEAD_LABEL[st] })), { value: '' as Tab, label: 'All' }]} />
      {error && !data ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <>
          <DataTable columns={cols} rows={data?.items} loading={loading} rowKey={(l) => l.id} empty={<EmptyState icon={<ShoppingCart className="size-6" />} title="No leads here" body="Carts abandoned after OTP verification show up automatically." />} />
          {data && <Pagination page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}
        </>
      )}
      <TopCustomers />
      {edit && <LeadModal lead={edit} onClose={() => setEdit(null)} onSave={(st, note) => setStage(edit, st, note).then(() => setEdit(null))} />}
    </>
  );
}

/** Highest lifetime value first (the customers list is sorted that way). */
function TopCustomers() {
  const { data } = useApi(() => adminApi.admin.customers({ page: 1 }), []);
  const cols: Column<CustomerDTO>[] = [
    {
      key: 'n',
      header: 'Customer',
      cell: (c) => (
        <div className="leading-tight">
          <p className="font-medium">{c.name ?? 'Unnamed'}</p>
          <p className="text-xs tabular-nums text-muted">{formatPhone(c.phone)}</p>
        </div>
      ),
    },
    { key: 'city', header: 'City', hide: 'md', cell: (c) => c.city ?? <span className="text-subtle">—</span> },
    { key: 'o', header: 'Orders', align: 'right', cell: (c) => <span className="tabular-nums">{c.orderCount}</span> },
    { key: 'ltv', header: 'Lifetime value', align: 'right', cell: (c) => <span className="font-medium tabular-nums">{formatINR(c.lifetimeValue)}</span> },
    { key: 't', header: 'Type', hide: 'sm', cell: (c) => (c.isB2B ? <Badge tone="purple" dot>B2B</Badge> : <Badge tone={c.registered ? 'info' : 'neutral'} dot>{c.registered ? 'Registered' : 'Guest'}</Badge>) },
  ];
  return (
    <Panel
      className="mt-6"
      title="Top customers"
      action={
        <Link href="/admin/customers" className="text-[13px] text-link hover:underline">
          All customers ›
        </Link>
      }>
      <DataTable columns={cols} rows={data?.items.slice(0, 5)} loading={!data} rowKey={(c) => c.id} rowHref={(c) => `/admin/customers/${c.id}`} dense />
    </Panel>
  );
}

function LeadModal({ lead, onClose, onSave }: { lead: LeadDTO; onClose: () => void; onSave: (s: LeadStage, note: string) => Promise<void> }) {
  const [stage, setStage] = useState<LeadStage>(lead.stage);
  const [note, setNote] = useState(lead.note ?? '');
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      open
      onClose={onClose}
      title={`${lead.name ?? formatPhone(lead.phone)} · ${formatINR(lead.value)}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={busy}
            onClick={async () => {
              setBusy(true);
              await onSave(stage, note.trim());
              setBusy(false);
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <ul className="mb-5 space-y-1.5 rounded-xl bg-surface-2/60 p-3 text-sm">
        {lead.items.map((i) => (
          <li key={i.productId} className="flex justify-between gap-3">
            <span className="line-clamp-1">
              {i.qty} × {i.title}
            </span>
            <span className="shrink-0 tabular-nums text-muted">{formatINR(i.price * i.qty)}</span>
          </li>
        ))}
      </ul>
      <div className="space-y-4">
        <Field label="Stage">
          <Segmented size="sm" value={stage} onChange={setStage} options={LEAD_STAGES.map((s) => ({ value: s, label: LEAD_LABEL[s] }))} />
        </Field>
        <Field label="Note">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Asked about A2337 fit, will order on Friday" />
        </Field>
      </div>
    </Modal>
  );
}
