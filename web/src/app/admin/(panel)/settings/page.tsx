'use client';
import { useEffect, useState } from 'react';
import { Lock, Pencil, Plus, UserPlus } from 'lucide-react';
import { ADMIN_ROLES, GST_STATE_CODES, ROLE_LABEL, formatINR, type AdminRole, type AdminUserDTO, type ServiceAreaDTO, type SettingsDTO, type SettingsInput } from '@unibody/shared';
import { Badge, Button, Checkbox, Field, Input, Modal, Select, Skeleton, Switch, Textarea, ThemeToggle } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { DataTable, ErrorState, FormGrid, LineTabs, MoneyInput, PageHeader, Panel, type Column } from '@/components/admin/ui';
import { adminApi, errMsg, fieldErrors, inputToPaise, paiseToInput, useApi } from '@/lib/admin/api';
import { useAdmin } from '@/lib/admin/session';
import { fmtDateTime } from '@/lib/format';
import { cn } from '@/lib/cn';

type Tab = 'store' | 'pricing' | 'messaging' | 'areas' | 'staff' | 'appearance';
const ROLE_INFO: Record<AdminRole, string> = {
  OWNER: 'Everything, including costs, staff, approvals and the security desk. Only one person.',
  MANAGER: 'Orders, catalog, stock, purchases, customers, offers and reports (no costs). Write-offs, price changes, deletes and late cancels need Super Admin approval.',
  PACKER: 'Orders, scan-to-pack, shipping, stock counts and stock look-up. Late cancels / returns need approval.',
};

export default function SettingsPage() {
  const { can } = useAdmin();
  const view = can('settingsView');
  const editable = can('settingsEdit');
  const tabs = [
    view && { value: 'store' as Tab, label: 'Store & GST' },
    view && { value: 'pricing' as Tab, label: 'Pricing & payments' },
    view && { value: 'messaging' as Tab, label: 'Announcement' },
    view && { value: 'areas' as Tab, label: 'Service areas' },
    can('staff') && { value: 'staff' as Tab, label: 'Staff & roles' },
    { value: 'appearance' as Tab, label: 'Appearance' },
  ].filter(Boolean) as { value: Tab; label: string }[];
  const [tab, setTab] = useState<Tab>(tabs[0].value);
  const settings = useApi(() => adminApi.admin.settings(), [], { enabled: view });

  return (
    <>
      <PageHeader title="Settings" subtitle={editable ? 'Changes apply to the store immediately.' : view ? 'Only the owner can change settings.' : 'Personal preferences for this device.'} />
      <LineTabs value={tab} onChange={setTab} tabs={tabs} />
      {view && !editable && tab !== 'appearance' && (
        <p className="mb-5 inline-flex items-center gap-2 rounded-xl bg-surface-2 px-3.5 py-2.5 text-sm text-muted">
          <Lock className="size-4" />
          View only — ask the owner to change these.
        </p>
      )}
      {(tab === 'store' || tab === 'pricing' || tab === 'messaging') &&
        (settings.error && !settings.data ? (
          <ErrorState message={settings.error} onRetry={settings.refetch} />
        ) : !settings.data ? (
          <Skeleton className="h-96" />
        ) : (
          <SettingsForm key={tab} tab={tab} s={settings.data} editable={editable} onSaved={(d) => settings.setData(d)} />
        ))}
      {tab === 'areas' && <ServiceAreas editable={editable} />}
      {tab === 'staff' && <Staff />}
      {tab === 'appearance' && (
        <Panel title="Appearance" className="max-w-2xl">
          <p className="mb-4 text-sm text-muted">Choose how the admin looks on this device. Auto follows your system setting.</p>
          <ThemeToggle withAuto />
        </Panel>
      )}
    </>
  );
}

function SettingsForm({ tab, s, editable, onSaved }: { tab: Tab; s: SettingsDTO; editable: boolean; onSaved: (s: SettingsDTO) => void }) {
  const toast = useToast();
  const [f, setF] = useState({
    storeName: s.storeName,
    legalName: s.legalName,
    gstin: s.gstin,
    storeState: s.storeState,
    storeAddress: s.storeAddress,
    supportPhone: s.supportPhone,
    supportEmail: s.supportEmail,
    codEnabled: s.codEnabled,
    codFee: paiseToInput(s.codFee),
    codMinOrder: paiseToInput(s.codMinOrder),
    codMaxOrder: paiseToInput(s.codMaxOrder),
    prepaidDiscountPct: String(s.prepaidDiscountPct),
    freeShippingOver: paiseToInput(s.freeShippingOver),
    shippingFee: paiseToInput(s.shippingFee),
    onlinePaymentsEnabled: s.onlinePaymentsEnabled,
    announcement: s.announcement,
    disclaimer: s.disclaimer,
  });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (f.gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(f.gstin)) return setErrors({ gstin: 'GSTIN should be 15 characters, e.g. 29ABCDE1234F1Z5' });
    const body: SettingsInput = {
      ...f,
      codFee: inputToPaise(f.codFee) ?? 0,
      codMinOrder: inputToPaise(f.codMinOrder) ?? 0,
      codMaxOrder: inputToPaise(f.codMaxOrder) ?? 0,
      prepaidDiscountPct: Number(f.prepaidDiscountPct) || 0,
      freeShippingOver: inputToPaise(f.freeShippingOver) ?? 0,
      shippingFee: inputToPaise(f.shippingFee) ?? 0,
    };
    setBusy(true);
    setErrors({});
    try {
      onSaved(await adminApi.admin.updateSettings(body));
      toast('Settings saved');
    } catch (err) {
      setErrors(fieldErrors(err));
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="max-w-3xl">
      <fieldset disabled={!editable} className="space-y-5">
        {tab === 'store' && (
          <Panel title="Store profile">
            <div className="space-y-4">
              <FormGrid>
                <Field label="Store name">
                  <Input value={f.storeName} onChange={(e) => set('storeName', e.target.value)} />
                </Field>
                <Field label="Legal name (on invoices)">
                  <Input value={f.legalName} onChange={(e) => set('legalName', e.target.value)} />
                </Field>
                <Field label="GSTIN" error={errors.gstin}>
                  <Input value={f.gstin} onChange={(e) => set('gstin', e.target.value.toUpperCase())} maxLength={15} className="font-mono" invalid={!!errors.gstin} />
                </Field>
                <Field label="State of registration" hint={`GST state code ${GST_STATE_CODES[f.storeState] ?? '—'} · decides CGST+SGST vs IGST`}>
                  <Select value={f.storeState} onChange={(e) => set('storeState', e.target.value)}>
                    {Object.keys(GST_STATE_CODES).map((st) => (
                      <option key={st}>{st}</option>
                    ))}
                  </Select>
                </Field>
              </FormGrid>
              <Field label="Registered address">
                <Textarea value={f.storeAddress} onChange={(e) => set('storeAddress', e.target.value)} className="min-h-20" />
              </Field>
              <FormGrid>
                <Field label="Support phone">
                  <Input value={f.supportPhone} onChange={(e) => set('supportPhone', e.target.value)} inputMode="tel" />
                </Field>
                <Field label="Support email">
                  <Input type="email" value={f.supportEmail} onChange={(e) => set('supportEmail', e.target.value)} />
                </Field>
              </FormGrid>
            </div>
          </Panel>
        )}
        {tab === 'pricing' && (
          <>
            <Panel title="Cash on Delivery">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex-1 leading-tight">
                  <p className="text-sm font-medium">Offer Cash on Delivery</p>
                  <p className="text-xs text-muted">Only in service areas with COD switched on</p>
                </div>
                <Switch checked={f.codEnabled} onChange={(v) => set('codEnabled', v)} label="COD enabled" disabled={!editable} />
              </div>
              <FormGrid cols={3}>
                <Field label="COD fee">
                  <MoneyInput value={f.codFee} onChange={(v) => set('codFee', v)} />
                </Field>
                <Field label="Min order for COD">
                  <MoneyInput value={f.codMinOrder} onChange={(v) => set('codMinOrder', v)} />
                </Field>
                <Field label="Max order for COD">
                  <MoneyInput value={f.codMaxOrder} onChange={(v) => set('codMaxOrder', v)} />
                </Field>
              </FormGrid>
            </Panel>
            <Panel title="Online payments & shipping">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex-1 leading-tight">
                  <p className="text-sm font-medium">UPI, cards & net banking (Razorpay)</p>
                  <p className="text-xs text-muted">Turn off to accept COD only</p>
                </div>
                <Switch checked={f.onlinePaymentsEnabled} onChange={(v) => set('onlinePaymentsEnabled', v)} label="Online payments" disabled={!editable} />
              </div>
              <FormGrid cols={3}>
                <Field label="Prepaid discount" hint="Nudges customers away from COD">
                  <div className="relative">
                    <Input value={f.prepaidDiscountPct} onChange={(e) => set('prepaidDiscountPct', e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" className="pr-8" />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted">%</span>
                  </div>
                </Field>
                <Field label="Shipping fee">
                  <MoneyInput value={f.shippingFee} onChange={(v) => set('shippingFee', v)} />
                </Field>
                <Field label="Free shipping over">
                  <MoneyInput value={f.freeShippingOver} onChange={(v) => set('freeShippingOver', v)} />
                </Field>
              </FormGrid>
              <p className="mt-4 rounded-xl bg-surface-2 px-3.5 py-2.5 text-[13px] text-muted">
                Example: a {formatINR(250000)} order pays {formatINR(Math.round((250000 * (Number(f.prepaidDiscountPct) || 0)) / 100))} less when prepaid, or {formatINR(inputToPaise(f.codFee) ?? 0)} extra with COD. Shipping is{' '}
                {250000 >= (inputToPaise(f.freeShippingOver) ?? 0) ? 'free' : formatINR(inputToPaise(f.shippingFee) ?? 0)}.
              </p>
            </Panel>
          </>
        )}
        {tab === 'messaging' && (
          <Panel title="Announcement & disclaimer">
            <div className="space-y-4">
              <Field label="Announcement bar" hint={`${f.announcement.length}/200 · shown at the very top of every store page`}>
                <Input value={f.announcement} onChange={(e) => set('announcement', e.target.value.slice(0, 200))} />
              </Field>
              {f.announcement && <div className="rounded-xl bg-hero px-4 py-2 text-center text-xs text-hero-fg">{f.announcement}</div>}
              <Field label="Footer disclaimer" hint="Shown on every page. Keep the “not affiliated with Apple” wording.">
                <Textarea value={f.disclaimer} onChange={(e) => set('disclaimer', e.target.value.slice(0, 2000))} className="min-h-36" />
              </Field>
            </div>
          </Panel>
        )}
        {editable && (
          <div className="flex justify-end">
            <Button type="submit" loading={busy}>
              Save changes
            </Button>
          </div>
        )}
      </fieldset>
    </form>
  );
}

function ServiceAreas({ editable }: { editable: boolean }) {
  const toast = useToast();
  const { data, error, loading, refetch } = useApi(() => adminApi.admin.serviceAreas(), []);
  const [modal, setModal] = useState<{ item?: ServiceAreaDTO } | null>(null);
  const toggle = async (a: ServiceAreaDTO, patch: Partial<ServiceAreaDTO>) => {
    try {
      await adminApi.admin.updateServiceArea(a.id, patch);
      toast('Service area updated');
      void refetch();
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  };
  const cols: Column<ServiceAreaDTO>[] = [
    {
      key: 'c',
      header: 'City',
      cell: (a) => (
        <div className="leading-tight">
          <p className="font-medium">{a.city}</p>
          <p className="text-xs text-muted">{a.state}</p>
        </div>
      ),
    },
    {
      key: 'p',
      header: 'Pincodes',
      cell: (a) => (
        <div className="flex flex-wrap gap-1">
          {a.pincodePrefixes.map((p) => (
            <span key={p} className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[11px]">
              {p}xxx
            </span>
          ))}
        </div>
      ),
    },
    { key: 'e', header: 'Delivery', cell: (a) => <span className="whitespace-nowrap">{a.etaDays === 1 ? 'Next day' : `${a.etaDays} days`}</span> },
    { key: 'f', header: 'Shipping', hide: 'md', cell: (a) => <span className="text-muted">{a.shippingFee === null ? 'Default' : formatINR(a.shippingFee)}</span> },
    { key: 'cod', header: 'COD', align: 'center', cell: (a) => <Switch checked={a.cod} onChange={(v) => toggle(a, { cod: v })} disabled={!editable} label={`COD in ${a.city}`} /> },
    { key: 'act', header: 'Active', align: 'center', cell: (a) => <Switch checked={a.active} onChange={(v) => toggle(a, { active: v })} disabled={!editable} label={`Deliver to ${a.city}`} /> },
    {
      key: 'ed',
      header: '',
      align: 'right',
      cell: (a) =>
        editable && (
          <button type="button" aria-label="Edit" onClick={() => setModal({ item: a })} className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-fg">
            <Pencil className="size-4" />
          </button>
        ),
    },
  ];
  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">Pincodes starting with these prefixes can order. ETA and COD are shown at checkout.</p>
        {editable && (
          <Button onClick={() => setModal({})} size="sm">
            <Plus className="size-4" />
            Add city
          </Button>
        )}
      </div>
      {error && !data ? <ErrorState message={error} onRetry={refetch} /> : <DataTable columns={cols} rows={data} loading={loading} rowKey={(a) => a.id} />}
      {modal && <AreaModal item={modal.item} onClose={() => setModal(null)} onSaved={() => void refetch()} />}
    </>
  );
}

function AreaModal({ item, onClose, onSaved }: { item?: ServiceAreaDTO; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [city, setCity] = useState(item?.city ?? '');
  const [state, setState] = useState(item?.state ?? 'Karnataka');
  const [prefixes, setPrefixes] = useState(item?.pincodePrefixes.join(', ') ?? '');
  const [eta, setEta] = useState(String(item?.etaDays ?? 2));
  const [cod, setCod] = useState(item?.cod ?? true);
  const [fee, setFee] = useState(paiseToInput(item?.shippingFee));
  const [active, setActive] = useState(item?.active ?? true);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const list = prefixes.split(/[\s,]+/).filter(Boolean);
  const bad = list.filter((p) => !/^\d{2,6}$/.test(p));
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!list.length || bad.length) return setErrors({ pincodePrefixes: bad.length ? `Invalid: ${bad.join(', ')}` : 'Add at least one prefix' });
    setBusy(true);
    const b = { city: city.trim(), state, pincodePrefixes: list, etaDays: Number(eta) || 2, cod, shippingFee: inputToPaise(fee), active };
    try {
      if (item) await adminApi.admin.updateServiceArea(item.id, b);
      else await adminApi.admin.createServiceArea(b);
      toast(item ? 'Service area saved' : `${b.city} added`);
      onSaved();
      onClose();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open
      onClose={onClose}
      title={item ? `Edit ${item.city}` : 'Add a city'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="area" loading={busy}>
            Save
          </Button>
        </>
      }
    >
      <form id="area" onSubmit={submit} className="space-y-4">
        <FormGrid>
          <Field label="City" error={errors.city}>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Kochi" autoFocus required />
          </Field>
          <Field label="State">
            <Select value={state} onChange={(e) => setState(e.target.value)}>
              {Object.keys(GST_STATE_CODES).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
        </FormGrid>
        <Field label="Pincode prefixes" error={errors.pincodePrefixes} hint="2–6 digits, comma separated (e.g. 682, 683)">
          <Input value={prefixes} onChange={(e) => setPrefixes(e.target.value)} placeholder="682, 683" className="font-mono" invalid={!!errors.pincodePrefixes} />
        </Field>
        <FormGrid>
          <Field label="Delivery (days)">
            <Input value={eta} onChange={(e) => setEta(e.target.value.replace(/\D/g, '').slice(0, 2))} inputMode="numeric" />
          </Field>
          <Field label="Shipping fee" hint="Blank = store default">
            <MoneyInput value={fee} onChange={setFee} placeholder="Default" />
          </Field>
        </FormGrid>
        <div className="flex gap-6">
          <Checkbox label="Cash on Delivery" checked={cod} onChange={(e) => setCod(e.target.checked)} />
          <Checkbox label="Active" checked={active} onChange={(e) => setActive(e.target.checked)} />
        </div>
      </form>
    </Modal>
  );
}

function Staff() {
  const { user } = useAdmin();
  const { data, error, loading, refetch } = useApi(() => adminApi.admin.staff(), []);
  const [modal, setModal] = useState<{ item?: AdminUserDTO } | null>(null);
  const cols: Column<AdminUserDTO>[] = [
    {
      key: 'n',
      header: 'Name',
      cell: (u) => (
        <div className="flex items-center gap-3">
          <span className={cn('flex size-9 items-center justify-center rounded-full text-sm font-semibold', u.active ? 'bg-fg text-bg' : 'bg-surface-2 text-subtle')}>{u.name.slice(0, 1)}</span>
          <div className="leading-tight">
            <p className="font-medium">
              {u.name} {u.id === user.id && <span className="text-xs font-normal text-muted">(you)</span>}
            </p>
            <p className="text-xs text-muted">{u.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'r', header: 'Role', cell: (u) => <Badge tone={u.role === 'OWNER' ? 'purple' : u.role === 'MANAGER' ? 'info' : 'neutral'}>{ROLE_LABEL[u.role]}</Badge> },
    { key: 'l', header: 'Last sign-in', hide: 'md', cell: (u) => <span className="text-[13px] text-muted">{u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : 'Never'}</span> },
    { key: 's', header: 'Status', cell: (u) => <Badge tone={u.active ? 'success' : 'neutral'} dot>{u.active ? 'Active' : 'Disabled'}</Badge> },
    {
      key: 'e',
      header: '',
      align: 'right',
      cell: (u) => (
        <button type="button" aria-label="Edit" onClick={() => setModal({ item: u })} className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-fg">
          <Pencil className="size-4" />
        </button>
      ),
    },
  ];
  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">Each person signs in with their own email. Disable accounts when someone leaves.</p>
        <Button size="sm" onClick={() => setModal({})}>
          <UserPlus className="size-4" />
          Add staff
        </Button>
      </div>
      {error && !data ? <ErrorState message={error} onRetry={refetch} /> : <DataTable columns={cols} rows={data} loading={loading} rowKey={(u) => u.id} />}
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {ADMIN_ROLES.map((r) => (
          <div key={r} className="rounded-2xl border border-line-subtle bg-surface p-4">
            <p className="text-sm font-semibold">{ROLE_LABEL[r]}</p>
            <p className="mt-1 text-xs text-muted">{ROLE_INFO[r]}</p>
          </div>
        ))}
      </div>
      {modal && <StaffModal item={modal.item} self={modal.item?.id === user.id} onClose={() => setModal(null)} onSaved={() => void refetch()} />}
    </>
  );
}

function StaffModal({ item, self, onClose, onSaved }: { item?: AdminUserDTO; self: boolean; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [name, setName] = useState(item?.name ?? '');
  const [email, setEmail] = useState(item?.email ?? '');
  const [role, setRole] = useState<AdminRole>(item?.role ?? 'PACKER');
  const [password, setPassword] = useState('');
  const [active, setActive] = useState(item?.active ?? true);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => setErrors({}), [password]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!item && password.length < 8) return setErrors({ password: 'At least 8 characters' });
    if (item && password && password.length < 8) return setErrors({ password: 'At least 8 characters' });
    setBusy(true);
    const b = { name: name.trim(), email: email.trim().toLowerCase(), role, active, ...(password ? { password } : {}) };
    try {
      if (item) await adminApi.admin.updateStaff(item.id, b);
      else await adminApi.admin.createStaff(b);
      toast(item ? 'Staff member saved' : `${b.name} can now sign in`);
      onSaved();
      onClose();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open
      onClose={onClose}
      title={item ? `Edit ${item.name}` : 'Add staff member'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="staff" loading={busy}>
            Save
          </Button>
        </>
      }
    >
      <form id="staff" onSubmit={submit} className="space-y-4">
        <FormGrid>
          <Field label="Name" error={errors.name}>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
          </Field>
          <Field label="Email" error={errors.email}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
        </FormGrid>
        <Field label="Role" hint={ROLE_INFO[role]}>
          <Select value={role} onChange={(e) => setRole(e.target.value as AdminRole)} disabled={self}>
            {/* There is only one Super Admin — it can't be given to anyone else. */}
            {ADMIN_ROLES.filter((r) => r !== 'OWNER' || role === 'OWNER').map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={item ? 'New password (optional)' : 'Password'} error={errors.password} hint="Minimum 8 characters">
          <Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} invalid={!!errors.password} />
        </Field>
        {!self && <Checkbox label="Account active" checked={active} onChange={(e) => setActive(e.target.checked)} />}
        {self && (
          <p className="inline-flex items-center gap-1.5 text-xs text-muted">
            You can’t change your own role or disable yourself.
          </p>
        )}
      </form>
    </Modal>
  );
}
