'use client';
import { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { CategoryDTO, DeviceFamilyDTO, DeviceModelDTO, FamilyIcon } from '@unibody/shared';
import { Badge, Button, Checkbox, EmptyState, Field, Input, Modal, Select, Switch } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { DataTable, ErrorState, FilterSelect, FormGrid, LineTabs, PageHeader, SearchInput, Thumb, useConfirm, type Column } from '@/components/admin/ui';
import { adminApi, errMsg, fieldErrors, useApi } from '@/lib/admin/api';
import { invalidateCatalogCache } from '@/lib/admin/catalog';
import { useAdmin } from '@/lib/admin/session';

type Tab = 'families' | 'models' | 'categories';
const FAMILY_ICONS: FamilyIcon[] = ['laptop', 'imac', 'phone', 'ipad', 'mini', 'accessory'];
const CATEGORY_ICONS = ['display', 'keyboard', 'battery', 'cpu', 'charger', 'trackpad', 'fan', 'ssd', 'speaker', 'camera', 'laptop', 'cable', 'box'];
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function CatalogPage() {
  const { can } = useAdmin();
  const editable = can('catalogEdit');
  const [tab, setTab] = useState<Tab>('models');
  const fams = useApi(() => adminApi.admin.families(), []);
  const models = useApi(() => adminApi.admin.models(), []);
  const cats = useApi(() => adminApi.admin.categories(), []);
  const [modal, setModal] = useState<{ kind: Tab; item?: DeviceFamilyDTO | DeviceModelDTO | CategoryDTO } | null>(null);
  const refresh = () => {
    invalidateCatalogCache();
    void fams.refetch();
    void models.refetch();
    void cats.refetch();
  };

  return (
    <>
      <PageHeader
        title="Devices & Categories"
        subtitle="The device tree customers browse by, and the part categories. A-numbers power “Will it fit?”."
        actions={
          editable && (
            <Button onClick={() => setModal({ kind: tab })}>
              <Plus className="size-4" />
              {tab === 'families' ? 'Add family' : tab === 'models' ? 'Add model' : 'Add category'}
            </Button>
          )
        }
      />
      <LineTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'models', label: `Models${models.data ? ` · ${models.data.length}` : ''}` },
          { value: 'families', label: `Device families${fams.data ? ` · ${fams.data.length}` : ''}` },
          { value: 'categories', label: `Categories${cats.data ? ` · ${cats.data.length}` : ''}` },
        ]}
      />
      {tab === 'families' && <Families state={fams} editable={editable} onEdit={(item) => setModal({ kind: 'families', item })} onChanged={refresh} />}
      {tab === 'models' && <Models state={models} families={fams.data ?? []} editable={editable} onEdit={(item) => setModal({ kind: 'models', item })} onChanged={refresh} />}
      {tab === 'categories' && <Categories state={cats} editable={editable} onEdit={(item) => setModal({ kind: 'categories', item })} onChanged={refresh} />}

      {modal?.kind === 'families' && <FamilyModal item={modal.item as DeviceFamilyDTO | undefined} onClose={() => setModal(null)} onSaved={refresh} />}
      {modal?.kind === 'models' && <ModelModal item={modal.item as DeviceModelDTO | undefined} families={fams.data ?? []} onClose={() => setModal(null)} onSaved={refresh} />}
      {modal?.kind === 'categories' && <CategoryModal item={modal.item as CategoryDTO | undefined} categories={cats.data ?? []} onClose={() => setModal(null)} onSaved={refresh} />}
    </>
  );
}

type St<T> = { data: T[] | undefined; error: string | null; loading: boolean; refetch: () => Promise<void> };

function EditBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" aria-label="Edit" onClick={onClick} className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-fg">
      <Pencil className="size-4" />
    </button>
  );
}

function Families({ state, editable, onEdit, onChanged }: { state: St<DeviceFamilyDTO>; editable: boolean; onEdit: (f: DeviceFamilyDTO) => void; onChanged: () => void }) {
  const toast = useToast();
  const toggle = async (f: DeviceFamilyDTO, active: boolean) => {
    try {
      await adminApi.admin.updateFamily(f.id, { active });
      toast(active ? `${f.name} is visible` : `${f.name} hidden from the store`);
      onChanged();
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  };
  const cols: Column<DeviceFamilyDTO>[] = [
    {
      key: 'name',
      header: 'Family',
      cell: (f) => (
        <div className="flex items-center gap-3">
          <Thumb icon={f.icon === 'imac' ? 'display' : f.icon === 'accessory' ? 'cable' : 'laptop'} alt="" src={null} />
          <div className="leading-tight">
            <p className="font-medium">{f.name}</p>
            <p className="text-xs text-muted">/{f.slug}</p>
          </div>
        </div>
      ),
    },
    { key: 'icon', header: 'Icon', hide: 'md', cell: (f) => <Badge>{f.icon}</Badge> },
    { key: 'models', header: 'Models', align: 'right', cell: (f) => <span className="tabular-nums">{f.modelCount}</span> },
    { key: 'products', header: 'Products', align: 'right', cell: (f) => <span className="tabular-nums">{f.productCount}</span> },
    { key: 'order', header: 'Sort', align: 'right', hide: 'sm', cell: (f) => <span className="tabular-nums text-muted">{f.sortOrder}</span> },
    { key: 'active', header: 'Visible', align: 'center', cell: (f) => <Switch checked={f.active} onChange={(v) => toggle(f, v)} disabled={!editable} label={`Show ${f.name}`} /> },
    { key: 'edit', header: '', align: 'right', cell: (f) => editable && <EditBtn onClick={() => onEdit(f)} /> },
  ];
  if (state.error && !state.data) return <ErrorState message={state.error} onRetry={state.refetch} />;
  return <DataTable columns={cols} rows={state.data && [...state.data].sort((a, b) => a.sortOrder - b.sortOrder)} loading={state.loading} rowKey={(f) => f.id} />;
}

function Models({ state, families, editable, onEdit, onChanged }: { state: St<DeviceModelDTO>; families: DeviceFamilyDTO[]; editable: boolean; onEdit: (m: DeviceModelDTO) => void; onChanged: () => void }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [fam, setFam] = useState('');
  const [q, setQ] = useState('');
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return state.data?.filter((m) => (!fam || m.familyId === fam) && (!t || m.fullName.toLowerCase().includes(t) || m.aNumbers.some((a) => a.toLowerCase().includes(t)) || (m.emc ?? '').includes(t)));
  }, [state.data, fam, q]);
  const remove = async (m: DeviceModelDTO) => {
    if (!(await confirm({ title: `Delete ${m.fullName}?`, body: 'Only models without linked products can be deleted.', confirmLabel: 'Delete', danger: true }))) return;
    try {
      await adminApi.admin.deleteModel(m.id);
      toast('Model deleted');
      onChanged();
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  };
  const cols: Column<DeviceModelDTO>[] = [
    {
      key: 'name',
      header: 'Model',
      cell: (m) => (
        <div className="min-w-[200px] leading-tight">
          <p className="font-medium">{m.fullName}</p>
          <p className="text-xs text-muted">{m.familyName}</p>
        </div>
      ),
    },
    {
      key: 'a',
      header: 'A-numbers',
      cell: (m) => (
        <div className="flex max-w-[260px] flex-wrap gap-1">
          {m.aNumbers.map((a) => (
            <span key={a} className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] font-medium">
              {a}
            </span>
          ))}
        </div>
      ),
    },
    { key: 'years', header: 'Years', hide: 'md', cell: (m) => <span className="tabular-nums">{m.yearLabel}</span> },
    { key: 'emc', header: 'EMC', hide: 'lg', cell: (m) => <span className="font-mono text-xs text-muted">{m.emc ?? '—'}</span> },
    { key: 'chip', header: 'Chip', hide: 'lg', cell: (m) => <span className="text-[13px]">{m.chip ?? '—'}</span> },
    { key: 'size', header: 'Size', hide: 'xl', align: 'right', cell: (m) => <span className="tabular-nums">{m.sizeInch ? `${m.sizeInch}″` : '—'}</span> },
    { key: 'p', header: 'Products', align: 'right', cell: (m) => <span className="tabular-nums">{m.productCount ?? 0}</span> },
    {
      key: 'edit',
      header: '',
      align: 'right',
      cell: (m) =>
        editable && (
          <span className="inline-flex">
            <EditBtn onClick={() => onEdit(m)} />
            <button type="button" aria-label="Delete" onClick={() => remove(m)} disabled={!!m.productCount} title={m.productCount ? 'Linked to products' : 'Delete'} className="rounded-full p-2 text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-30">
              <Trash2 className="size-4" />
            </button>
          </span>
        ),
    },
  ];
  if (state.error && !state.data) return <ErrorState message={state.error} onRetry={state.refetch} />;
  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Search name, A-number or EMC" className="w-full sm:w-72" />
        <FilterSelect label="Family" value={fam} onChange={setFam} options={[{ value: '', label: 'All' }, ...families.map((f) => ({ value: f.id, label: f.name }))]} />
      </div>
      <DataTable columns={cols} rows={rows} loading={state.loading} rowKey={(m) => m.id} dense empty={<EmptyState title="No models match" />} />
    </>
  );
}

function Categories({ state, editable, onEdit, onChanged }: { state: St<CategoryDTO>; editable: boolean; onEdit: (c: CategoryDTO) => void; onChanged: () => void }) {
  const toast = useToast();
  const toggle = async (c: CategoryDTO, active: boolean) => {
    try {
      await adminApi.admin.updateCategory(c.id, { active });
      toast(active ? `${c.name} is visible` : `${c.name} hidden`);
      onChanged();
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  };
  const byId = new Map(state.data?.map((c) => [c.id, c]));
  const cols: Column<CategoryDTO>[] = [
    {
      key: 'name',
      header: 'Category',
      cell: (c) => (
        <div className="flex items-center gap-3">
          <Thumb icon={c.icon} src={null} alt="" />
          <div className="leading-tight">
            <p className="font-medium">{c.name}</p>
            <p className="text-xs text-muted">/{c.slug}</p>
          </div>
        </div>
      ),
    },
    { key: 'parent', header: 'Parent', hide: 'md', cell: (c) => <span className="text-muted">{c.parentId ? byId.get(c.parentId)?.name ?? '—' : '—'}</span> },
    { key: 'products', header: 'Products', align: 'right', cell: (c) => <span className="tabular-nums">{c.productCount ?? 0}</span> },
    { key: 'order', header: 'Sort', align: 'right', hide: 'sm', cell: (c) => <span className="tabular-nums text-muted">{c.sortOrder}</span> },
    { key: 'active', header: 'Visible', align: 'center', cell: (c) => <Switch checked={c.active} onChange={(v) => toggle(c, v)} disabled={!editable} label={`Show ${c.name}`} /> },
    { key: 'edit', header: '', align: 'right', cell: (c) => editable && <EditBtn onClick={() => onEdit(c)} /> },
  ];
  if (state.error && !state.data) return <ErrorState message={state.error} onRetry={state.refetch} />;
  return <DataTable columns={cols} rows={state.data && [...state.data].sort((a, b) => a.sortOrder - b.sortOrder)} loading={state.loading} rowKey={(c) => c.id} dense />;
}

// ------------------------------------------------------------------ modals
function useSave(onSaved: () => void, onClose: () => void) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    setErrors({});
    try {
      await fn();
      toast(ok);
      onSaved();
      onClose();
    } catch (e) {
      setErrors(fieldErrors(e));
      toast(errMsg(e), 'error');
    } finally {
      setBusy(false);
    }
  };
  return { busy, errors, save };
}

function ModalFooter({ onClose, busy, label, form }: { onClose: () => void; busy: boolean; label: string; form: string }) {
  return (
    <>
      <Button variant="secondary" onClick={onClose} type="button">
        Cancel
      </Button>
      <Button type="submit" form={form} loading={busy}>
        {label}
      </Button>
    </>
  );
}

function FamilyModal({ item, onClose, onSaved }: { item?: DeviceFamilyDTO; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(item?.name ?? '');
  const [slug, setSlug] = useState(item?.slug ?? '');
  const [icon, setIcon] = useState<FamilyIcon>(item?.icon ?? 'laptop');
  const [sort, setSort] = useState(String(item?.sortOrder ?? 0));
  const [active, setActive] = useState(item?.active ?? true);
  const { busy, errors, save } = useSave(onSaved, onClose);
  return (
    <Modal open onClose={onClose} title={item ? `Edit ${item.name}` : 'New device family'} footer={<ModalFooter onClose={onClose} busy={busy} label={item ? 'Save' : 'Create'} form="fam" />}>
      <form
        id="fam"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const b = { name: name.trim(), slug: slug.trim() || slugify(name), icon, sortOrder: Number(sort) || 0, active };
          void save(() => (item ? adminApi.admin.updateFamily(item.id, b) : adminApi.admin.createFamily(b)), item ? 'Family saved' : 'Family created');
        }}
      >
        <Field label="Name" error={errors.name}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="MacBook Air" autoFocus required />
        </Field>
        <FormGrid>
          <Field label="URL slug" error={errors.slug} hint={`/d/${slug || slugify(name) || 'slug'}`}>
            <Input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder={slugify(name)} />
          </Field>
          <Field label="Icon">
            <Select value={icon} onChange={(e) => setIcon(e.target.value as FamilyIcon)}>
              {FAMILY_ICONS.map((i) => (
                <option key={i}>{i}</option>
              ))}
            </Select>
          </Field>
          <Field label="Sort order">
            <Input value={sort} onChange={(e) => setSort(e.target.value.replace(/[^\d-]/g, ''))} inputMode="numeric" />
          </Field>
          <div className="flex items-end pb-2.5">
            <Checkbox label="Visible on the store" checked={active} onChange={(e) => setActive(e.target.checked)} />
          </div>
        </FormGrid>
      </form>
    </Modal>
  );
}

function ModelModal({ item, families, onClose, onSaved }: { item?: DeviceModelDTO; families: DeviceFamilyDTO[]; onClose: () => void; onSaved: () => void }) {
  const [familyId, setFamilyId] = useState(item?.familyId ?? families[0]?.id ?? '');
  const [name, setName] = useState(item?.name ?? '');
  const [yearFrom, setYearFrom] = useState(String(item?.yearFrom ?? new Date().getFullYear()));
  const [yearTo, setYearTo] = useState(item?.yearTo ? String(item.yearTo) : '');
  const [aNumbers, setANumbers] = useState(item?.aNumbers.join(', ') ?? '');
  const [emc, setEmc] = useState(item?.emc ?? '');
  const [chip, setChip] = useState(item?.chip ?? '');
  const [size, setSize] = useState(item?.sizeInch ? String(item.sizeInch) : '');
  const { busy, errors, save } = useSave(onSaved, onClose);
  const parsedA = aNumbers
    .toUpperCase()
    .split(/[\s,;/]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const badA = parsedA.filter((a) => !/^A\d{4}$/.test(a));
  return (
    <Modal open onClose={onClose} wide title={item ? `Edit ${item.fullName}` : 'New device model'} footer={<ModalFooter onClose={onClose} busy={busy} label={item ? 'Save' : 'Create'} form="model" />}>
      <form
        id="model"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (badA.length) return;
          const b = {
            familyId,
            name: name.trim(),
            yearFrom: Number(yearFrom),
            yearTo: yearTo ? Number(yearTo) : null,
            aNumbers: parsedA,
            emc: emc.trim() || null,
            chip: chip.trim() || null,
            sizeInch: size ? Number(size) : null,
          };
          void save(() => (item ? adminApi.admin.updateModel(item.id, b) : adminApi.admin.createModel(b)), item ? 'Model saved' : 'Model created');
        }}
      >
        <FormGrid>
          <Field label="Family" error={errors.familyId}>
            <Select value={familyId} onChange={(e) => setFamilyId(e.target.value)}>
              {families.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Model name" error={errors.name} hint='Shown after the family, e.g. 13" M1'>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder='13" M1' autoFocus required />
          </Field>
        </FormGrid>
        <Field label="A-numbers" error={errors.aNumbers || (badA.length ? `Not a valid A-number: ${badA.join(', ')}` : undefined)} hint="Printed on the bottom case — separate with commas">
          <Input value={aNumbers} onChange={(e) => setANumbers(e.target.value)} placeholder="A2337, A2179" className="font-mono" invalid={badA.length > 0} />
        </Field>
        <FormGrid cols={4}>
          <Field label="Year from" error={errors.yearFrom}>
            <Input value={yearFrom} onChange={(e) => setYearFrom(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" />
          </Field>
          <Field label="Year to" hint="Blank if one year">
            <Input value={yearTo} onChange={(e) => setYearTo(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" />
          </Field>
          <Field label="EMC">
            <Input value={emc} onChange={(e) => setEmc(e.target.value)} placeholder="3598" className="font-mono" />
          </Field>
          <Field label="Screen size (in)">
            <Input value={size} onChange={(e) => setSize(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" placeholder="13.3" />
          </Field>
        </FormGrid>
        <Field label="Chip">
          <Input value={chip} onChange={(e) => setChip(e.target.value)} placeholder="Apple M1 / Intel Core i5" />
        </Field>
      </form>
    </Modal>
  );
}

function CategoryModal({ item, categories, onClose, onSaved }: { item?: CategoryDTO; categories: CategoryDTO[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(item?.name ?? '');
  const [slug, setSlug] = useState(item?.slug ?? '');
  const [icon, setIcon] = useState(item?.icon ?? 'box');
  const [parentId, setParentId] = useState(item?.parentId ?? '');
  const [sort, setSort] = useState(String(item?.sortOrder ?? 0));
  const [active, setActive] = useState(item?.active ?? true);
  const { busy, errors, save } = useSave(onSaved, onClose);
  return (
    <Modal open onClose={onClose} title={item ? `Edit ${item.name}` : 'New category'} footer={<ModalFooter onClose={onClose} busy={busy} label={item ? 'Save' : 'Create'} form="cat" />}>
      <form
        id="cat"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const b = { name: name.trim(), slug: slug.trim() || slugify(name), icon, parentId: parentId || null, sortOrder: Number(sort) || 0, active };
          void save(() => (item ? adminApi.admin.updateCategory(item.id, b) : adminApi.admin.createCategory(b)), item ? 'Category saved' : 'Category created');
        }}
      >
        <Field label="Name" error={errors.name}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Display assembly" autoFocus required />
        </Field>
        <FormGrid>
          <Field label="URL slug" error={errors.slug}>
            <Input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder={slugify(name)} />
          </Field>
          <Field label="Icon" hint="Used as the tinted placeholder">
            <Select value={icon} onChange={(e) => setIcon(e.target.value)}>
              {CATEGORY_ICONS.map((i) => (
                <option key={i}>{i}</option>
              ))}
            </Select>
          </Field>
          <Field label="Parent">
            <Select value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">None (top level)</option>
              {categories
                .filter((c) => c.id !== item?.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Sort order">
            <Input value={sort} onChange={(e) => setSort(e.target.value.replace(/[^\d-]/g, ''))} inputMode="numeric" />
          </Field>
        </FormGrid>
        <Checkbox label="Visible on the store" checked={active} onChange={(e) => setActive(e.target.checked)} />
      </form>
    </Modal>
  );
}
