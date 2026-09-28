'use client';
import { useEffect, useMemo, useState } from 'react';
import { Gift, Pause, Pencil, Tag, TicketPercent, X } from 'lucide-react';
import { COUPON_TYPES, formatINR, type CouponDTO, type CouponInput, type CouponType } from '@unibody/shared';
import { Badge, Button, Checkbox, EmptyState, Field, Input, Modal, Segmented, Switch, Textarea } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { DataTable, ErrorState, FormGrid, MoneyInput, PageHeader, Panel, PillTabs, type Column } from '@/components/admin/ui';
import { CouponStateBadge } from '@/components/admin/badges';
import { NoAccess } from '@/components/admin/no-access';
import { adminApi, errMsg, fieldErrors, inputToPaise, paiseToInput, useApi } from '@/lib/admin/api';
import { useAdmin } from '@/lib/admin/session';
import { fmtDate } from '@/lib/format';
import { cn } from '@/lib/cn';

type Filter = 'ALL' | CouponDTO['state'];
const TYPE_LABEL: Record<CouponType, string> = { PERCENT: '% off', FLAT: '₹ off', FREE_COD: 'Free COD' };
const describe = (c: Pick<CouponDTO, 'type' | 'value' | 'maxDiscount' | 'minOrder'>) =>
  [
    c.type === 'PERCENT' ? `${c.value}% off${c.maxDiscount ? ` up to ${formatINR(c.maxDiscount)}` : ''}` : c.type === 'FLAT' ? `${formatINR(c.value)} off` : 'No COD fee',
    c.minOrder ? `on orders over ${formatINR(c.minOrder)}` : null,
  ]
    .filter(Boolean)
    .join(' ');

/** ISO <-> <input type="datetime-local"> in IST */
const toLocal = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() + 5.5 * 3600000).toISOString().slice(0, 16) : '');
const fromLocal = (v: string) => (v ? new Date(`${v}:00+05:30`).toISOString() : null);

export default function OffersPage() {
  const { can } = useAdmin();
  const allowed = can('coupons');
  const { data, error, loading, refetch } = useApi(() => adminApi.admin.coupons(), [], { enabled: allowed });
  const [filter, setFilter] = useState<Filter>('ALL');
  const [modal, setModal] = useState<{ item?: CouponDTO; campaign?: boolean } | null>(null);
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)');
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener('change', on);
    if (new URLSearchParams(window.location.search).get('new') === '1') setModal({});
    return () => mq.removeEventListener('change', on);
  }, []);
  const toast = useToast();
  const live = data?.find((c) => c.state === 'ACTIVE' && c.showBanner);
  const pause = async (c: CouponDTO) => {
    try {
      await adminApi.admin.updateCoupon(c.id, { active: false });
      toast(`${c.code} paused — banner hidden`);
      void refetch();
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  };
  const rows = useMemo(() => data?.filter((c) => filter === 'ALL' || c.state === filter), [data, filter]);
  const count = (s: Filter) => data?.filter((c) => s === 'ALL' || c.state === s).length;
  if (!allowed) return <NoAccess what="offers" />;

  const cols: Column<CouponDTO>[] = [
    {
      key: 'code',
      header: 'Code',
      cell: (c) => (
        <div className="flex items-center gap-3">
          <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl text-white', c.state === 'ACTIVE' ? 'gradient-sunrise' : 'bg-subtle')}>
            <TicketPercent className="size-4" />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="font-mono font-semibold tracking-wide">{c.code}</p>
            <p className="line-clamp-1 max-w-[280px] text-xs text-muted">{c.description || describe(c)}</p>
          </div>
        </div>
      ),
    },
    { key: 'd', header: 'Discount', hide: 'md', cell: (c) => <span className="text-[13px]">{describe(c)}</span> },
    {
      key: 'dates',
      header: 'Runs',
      hide: 'lg',
      cell: (c) => (
        <span className="text-[13px] text-muted">
          {c.startsAt ? fmtDate(c.startsAt) : 'Now'} → {c.endsAt ? fmtDate(c.endsAt) : 'No end'}
        </span>
      ),
    },
    {
      key: 'used',
      header: 'Used',
      align: 'right',
      cell: (c) => (
        <span className="tabular-nums">
          {c.used}
          {c.usageLimit ? <span className="text-subtle"> / {c.usageLimit}</span> : null}
        </span>
      ),
    },
    { key: 'given', header: 'Discount given', align: 'right', hide: 'sm', cell: (c) => <span className="tabular-nums text-muted">{formatINR(c.discountGiven)}</span> },
    {
      key: 's',
      header: 'Status',
      cell: (c) => (
        <span className="inline-flex flex-wrap gap-1">
          <CouponStateBadge state={c.state} />
          {c.showBanner && <Badge tone="purple">Banner</Badge>}
        </span>
      ),
    },
    {
      key: 'e',
      header: '',
      align: 'right',
      cell: (c) => (
        <button type="button" aria-label="Edit" onClick={() => setModal({ item: c })} className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-fg">
          <Pencil className="size-4" />
        </button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Offers & Coupons"
        subtitle="Festive codes, first-order offers and the store-wide banner."
        actions={
          <>
            <Button variant="outline" onClick={() => setModal({})}>
              <Tag className="size-4" />
              New coupon
            </Button>
            <Button onClick={() => setModal({ campaign: true })}>
              <Gift className="size-4" />
              New campaign
            </Button>
          </>
        }
      />
      <div className={modal && wide ? 'grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_420px]' : ''}>
        <div className="min-w-0">
          <CampaignCard live={live} loading={!data} onEdit={(c) => setModal({ item: c })} onPause={pause} onNew={() => setModal({ campaign: true })} />
      <PillTabs
        className="mb-4"
        value={filter}
        onChange={setFilter}
        tabs={(['ALL', 'ACTIVE', 'SCHEDULED', 'PAUSED', 'ENDED'] as Filter[]).map((f) => ({ value: f, label: f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase(), count: count(f) }))}
      />
      {error && !data ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <DataTable columns={cols} rows={rows} loading={loading} rowKey={(c) => c.id} onRowClick={(c) => setModal({ item: c })} empty={<EmptyState icon={<Tag className="size-6" />} title="No coupons here" />} />
      )}
        </div>
        {modal && <CouponEditor key={modal.item?.id ?? (modal.campaign ? 'campaign' : 'new')} item={modal.item} preset={modal} inline={wide} onClose={() => setModal(null)} onSaved={() => void refetch()} />}
      </div>
    </>
  );
}

/** New / edit coupon. `inline` renders it as the side panel beside the list (A10); otherwise a modal (narrow screens). */
/** The live store-banner campaign (A10), or a prompt to start one. */
function CampaignCard({ live, loading, onEdit, onPause, onNew }: { live?: CouponDTO; loading: boolean; onEdit: (c: CouponDTO) => void; onPause: (c: CouponDTO) => void; onNew: () => void }) {
  if (loading) return <div className="mb-5 h-[124px] animate-pulse rounded-[var(--radius-card)] bg-surface-2" />;
  if (!live)
    return (
      <div className="mb-5 flex flex-wrap items-center gap-4 rounded-[var(--radius-card)] border border-dashed border-line p-5">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">No live campaign</p>
          <p className="text-sm text-muted">A campaign is a coupon shown as the banner at the top of the store.</p>
        </div>
        <Button variant="outline" onClick={onNew}>
          <Gift className="size-4" />
          Start a campaign
        </Button>
      </div>
    );
  return (
    <section data-testid="campaign-card" className="mb-5 flex flex-wrap items-center gap-4 rounded-[var(--radius-card)] bg-[#111113] p-6 text-white">
      <div className="min-w-0 flex-1">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-[#ff3b30]/15 px-2.5 py-0.5 text-xs font-medium text-[#ff6961]">
          <Gift className="size-3.5" /> Live campaign{live.endsAt ? ` · ends ${fmtDate(live.endsAt)}` : ''}
        </p>
        <h2 className="mt-2 text-[22px] font-semibold tracking-tight">{live.bannerTitle || live.description}</h2>
        <p className="mt-1 text-sm text-white/65">
          Home banner · <span className="font-mono">{live.code}</span> · {live.used} order{live.used === 1 ? '' : 's'} · {formatINR(live.discountGiven)} discount given
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => onEdit(live)} className="bg-white text-[#111113] hover:bg-white/90">
          <Pencil className="size-4" />
          Edit
        </Button>
        <Button variant="outline" onClick={() => onPause(live)} className="border-white/30 bg-transparent text-white hover:bg-white/10">
          <Pause className="size-4" />
          Pause
        </Button>
      </div>
    </section>
  );
}

function CouponEditor({ item, preset, inline, onClose, onSaved }: { item?: CouponDTO; preset?: { campaign?: boolean }; inline?: boolean; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [code, setCode] = useState(item?.code ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [type, setType] = useState<CouponType>(item?.type ?? 'PERCENT');
  const [value, setValue] = useState(item ? (item.type === 'FLAT' ? paiseToInput(item.value) : String(item.value)) : '10');
  const [maxDiscount, setMaxDiscount] = useState(paiseToInput(item?.maxDiscount));
  const [minOrder, setMinOrder] = useState(paiseToInput(item?.minOrder));
  const [usageLimit, setUsageLimit] = useState(item?.usageLimit ? String(item.usageLimit) : '');
  const [perPhone, setPerPhone] = useState(item?.perPhoneLimit ? String(item.perPhoneLimit) : '1');
  const [prepaidOnly, setPrepaidOnly] = useState(item?.prepaidOnly ?? false);
  const [allowCod, setAllowCod] = useState(item?.allowCod ?? true);
  const [startsAt, setStartsAt] = useState(toLocal(item?.startsAt ?? null));
  const [endsAt, setEndsAt] = useState(toLocal(item?.endsAt ?? null));
  const [active, setActive] = useState(item?.active ?? true);
  const [showBanner, setShowBanner] = useState(item?.showBanner ?? !!preset?.campaign);
  const [bannerTitle, setBannerTitle] = useState(item?.bannerTitle ?? '');
  const [bannerSubtitle, setBannerSubtitle] = useState(item?.bannerSubtitle ?? '');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const numValue = type === 'FLAT' ? inputToPaise(value) ?? 0 : Math.round(Number(value) || 0);
  const summary = describe({ type, value: numValue, maxDiscount: inputToPaise(maxDiscount), minOrder: inputToPaise(minOrder) });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!/^[A-Z0-9]{3,24}$/.test(code)) errs.code = '3–24 letters or numbers, no spaces';
    if (type === 'PERCENT' && (numValue < 1 || numValue > 90)) errs.value = 'Between 1 and 90%';
    if (type === 'FLAT' && numValue < 100) errs.value = 'Enter an amount';
    if (startsAt && endsAt && fromLocal(startsAt)! >= fromLocal(endsAt)!) errs.endsAt = 'End must be after start';
    if (showBanner && !bannerTitle.trim()) errs.bannerTitle = 'Add a banner headline';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const body: CouponInput = {
      code,
      description: description.trim() || summary,
      type,
      value: type === 'FREE_COD' ? 0 : numValue,
      maxDiscount: type === 'PERCENT' ? inputToPaise(maxDiscount) : null,
      minOrder: inputToPaise(minOrder),
      usageLimit: usageLimit ? Number(usageLimit) : null,
      perPhoneLimit: perPhone ? Number(perPhone) : null,
      prepaidOnly,
      allowCod: prepaidOnly ? false : allowCod,
      startsAt: fromLocal(startsAt),
      endsAt: fromLocal(endsAt),
      active,
      showBanner,
      bannerTitle: bannerTitle.trim() || null,
      bannerSubtitle: bannerSubtitle.trim() || null,
    };
    setBusy(true);
    try {
      if (item) await adminApi.admin.updateCoupon(item.id, body);
      else await adminApi.admin.createCoupon(body);
      toast(item ? 'Coupon saved' : `${code} created`);
      onSaved();
      onClose();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  const title = item ? `Edit ${item.code}` : showBanner ? 'New campaign' : 'New coupon';
  const actions = (
    <>
      <Button variant="secondary" onClick={onClose}>
        Cancel
      </Button>
      <Button type="submit" form="coupon" loading={busy}>
        {item ? 'Save coupon' : fromLocal(startsAt) && fromLocal(startsAt)! > new Date().toISOString() ? 'Schedule' : 'Create coupon'}
      </Button>
    </>
  );
  const narrow = !!inline;
  const form = (
      <form id="coupon" onSubmit={submit} className="space-y-5">
        <FormGrid>
          <Field label="Code" error={errors.code} hint="Customers type this at checkout">
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="DIWALI26" className="font-mono tracking-wider" maxLength={24} disabled={!!item} autoFocus={!item} invalid={!!errors.code} />
          </Field>
          <Field label="Type">
            <Segmented className="w-full [&>button]:flex-1" value={type} onChange={setType} options={COUPON_TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] }))} />
          </Field>
        </FormGrid>
        {type !== 'FREE_COD' && (
          <FormGrid cols={narrow ? 2 : 3}>
            <Field label={type === 'PERCENT' ? 'Percent off' : 'Amount off'} error={errors.value}>
              {type === 'PERCENT' ? (
                <div className="relative">
                  <Input value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, '').slice(0, 2))} inputMode="numeric" className="pr-8" invalid={!!errors.value} />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted">%</span>
                </div>
              ) : (
                <MoneyInput value={value} onChange={setValue} invalid={!!errors.value} />
              )}
            </Field>
            {type === 'PERCENT' && (
              <Field label="Max discount" hint="Cap per order (optional)">
                <MoneyInput value={maxDiscount} onChange={setMaxDiscount} placeholder="No cap" />
              </Field>
            )}
            <Field label="Minimum order" hint="Optional">
              <MoneyInput value={minOrder} onChange={setMinOrder} placeholder="Any amount" />
            </Field>
          </FormGrid>
        )}
        {type === 'FREE_COD' && (
          <Field label="Minimum order" hint="Optional">
            <MoneyInput value={minOrder} onChange={setMinOrder} placeholder="Any amount" />
          </Field>
        )}
        <FormGrid cols={narrow ? 2 : 4}>
          <Field label="Total uses" hint="Blank = unlimited">
            <Input value={usageLimit} onChange={(e) => setUsageLimit(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="∞" />
          </Field>
          <Field label="Uses per phone">
            <Input value={perPhone} onChange={(e) => setPerPhone(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="∞" />
          </Field>
          <Field label="Starts (IST)" hint="Blank = now">
            <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </Field>
          <Field label="Ends (IST)" error={errors.endsAt} hint="Blank = no end">
            <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} invalid={!!errors.endsAt} />
          </Field>
        </FormGrid>
        <Field label="Internal description" hint={`Defaults to “${summary}”`}>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={summary} />
        </Field>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <Checkbox label="Prepaid orders only" checked={prepaidOnly} onChange={(e) => setPrepaidOnly(e.target.checked)} />
          {!prepaidOnly && <Checkbox label="Can combine with COD" checked={allowCod} onChange={(e) => setAllowCod(e.target.checked)} />}
          <Checkbox label="Active" checked={active} onChange={(e) => setActive(e.target.checked)} />
        </div>

        <div className="rounded-2xl border border-line-subtle p-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 leading-tight">
              <p className="text-sm font-semibold">Show as store banner</p>
              <p className="text-xs text-muted">Appears at the top of the home page while the coupon is active</p>
            </div>
            <Switch checked={showBanner} onChange={setShowBanner} label="Show banner" />
          </div>
          {showBanner && (
            <div className="mt-4 space-y-3">
              <FormGrid>
                <Field label="Headline" error={errors.bannerTitle}>
                  <Input value={bannerTitle} onChange={(e) => setBannerTitle(e.target.value)} maxLength={120} placeholder="Up to 20% off batteries & keyboards." invalid={!!errors.bannerTitle} />
                </Field>
                <Field label="Sub-line">
                  <Textarea value={bannerSubtitle} onChange={(e) => setBannerSubtitle(e.target.value)} maxLength={200} className="h-11 min-h-11 py-2.5" placeholder={`Use code ${code || 'CODE'} at checkout.`} />
                </Field>
              </FormGrid>
              <p className="text-xs font-medium text-muted">Live preview</p>
              <BannerPreview code={code} title={bannerTitle} subtitle={bannerSubtitle} endsAt={fromLocal(endsAt)} />
            </div>
          )}
        </div>
      </form>
  );
  return inline ? (
    <Panel
      className="xl:sticky xl:top-20"
      title={
        <span className="leading-tight">
          {title}
          <span className="block text-xs font-normal text-muted">Preview updates live</span>
        </span>
      }
      action={
        <button type="button" aria-label="Close" onClick={onClose} className="rounded-full p-1.5 text-muted hover:bg-surface-2 hover:text-fg">
          <X className="size-4" />
        </button>
      }>
      <div data-testid="coupon-panel">{form}</div>
      <div className="mt-5 flex justify-end gap-2 border-t border-line-subtle pt-4">{actions}</div>
    </Panel>
  ) : (
    <Modal open wide onClose={onClose} title={title} footer={actions}>
      {form}
    </Modal>
  );
}

function BannerPreview({ code, title, subtitle, endsAt }: { code: string; title: string; subtitle: string; endsAt: string | null }) {
  const days = endsAt ? Math.max(0, Math.ceil((+new Date(endsAt) - Date.now()) / 86400000)) : null;
  return (
    <div className="gradient-sunrise relative overflow-hidden rounded-2xl p-5 text-white">
      <div aria-hidden className="absolute -right-10 -top-10 size-40 rounded-full bg-white/15 blur-2xl" />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/80">Festive offer{days !== null && ` · ends in ${days} day${days === 1 ? '' : 's'}`}</p>
          <p className="mt-1 text-xl font-semibold tracking-tight">{title || 'Your headline here'}</p>
          <p className="mt-0.5 text-sm text-white/85">{subtitle || `Use code ${code || 'CODE'} at checkout.`}</p>
        </div>
        <span className="self-start rounded-full border border-dashed border-white/70 bg-white/15 px-4 py-2 font-mono text-sm font-semibold tracking-widest sm:self-center">{code || 'CODE'}</span>
      </div>
    </div>
  );
}
