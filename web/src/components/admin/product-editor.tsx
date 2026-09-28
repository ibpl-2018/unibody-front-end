'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Copy, ExternalLink, ImagePlus, Loader2, Search, Star, Trash2, X } from 'lucide-react';
import {
  COLOURS,
  COLOUR_HEX,
  CONDITIONS,
  CONDITION_DESCRIPTION,
  CONDITION_LABEL,
  KEYBOARD_LAYOUTS,
  formatINR,
  percentOff,
  type AdminProductDTO,
  type Condition,
  type ProductInput,
  type ProductStatus,
} from '@unibody/shared';
import { Badge, Button, ConditionBadge, Field, Input, ProductImage, Segmented, Select, Skeleton, Switch, Textarea } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { ErrorState, FormGrid, MoneyInput, Panel, useConfirm } from './ui';
import { adminApi, errMsg, fieldErrors, inputToPaise, paiseToInput } from '@/lib/admin/api';
import { useCatalog } from '@/lib/admin/catalog';
import { useAdmin } from '@/lib/admin/session';
import { cn } from '@/lib/cn';

interface Form {
  title: string;
  description: string;
  familyId: string;
  categoryId: string;
  modelIds: string[];
  condition: Condition;
  colour: string;
  keyboardLayout: string;
  partNumber: string;
  warrantyDays: string;
  mrp: string;
  price: string;
  cost: string;
  gstRate: number;
  hsn: string;
  codAllowed: boolean;
  status: ProductStatus;
  featured: boolean;
  lowStockAlert: string;
  bin: string;
  weightGrams: string;
  images: string[];
  initialStock: string;
}
const EMPTY: Form = {
  title: '',
  description: '',
  familyId: '',
  categoryId: '',
  modelIds: [],
  condition: 'GENUINE_A',
  colour: '',
  keyboardLayout: '',
  partNumber: '',
  warrantyDays: '90',
  mrp: '',
  price: '',
  cost: '',
  gstRate: 18,
  hsn: '84733099',
  codAllowed: true,
  status: 'ACTIVE',
  featured: false,
  lowStockAlert: '2',
  bin: '',
  weightGrams: '',
  images: [],
  initialStock: '',
};
const fromProduct = (p: AdminProductDTO): Form => ({
  title: p.title,
  description: p.description,
  familyId: p.familyId,
  categoryId: p.categoryId,
  modelIds: p.modelIds,
  condition: p.condition,
  colour: p.colour ?? '',
  keyboardLayout: p.keyboardLayout ?? '',
  partNumber: p.partNumber ?? '',
  warrantyDays: String(p.warrantyDays),
  mrp: paiseToInput(p.mrp),
  price: paiseToInput(p.price),
  cost: paiseToInput(p.cost),
  gstRate: p.gstRate,
  hsn: p.hsn,
  codAllowed: p.codAllowed,
  status: p.status,
  featured: p.featured,
  lowStockAlert: String(p.lowStockAlert),
  bin: p.bin ?? '',
  weightGrams: p.weightGrams ? String(p.weightGrams) : '',
  images: p.images,
  initialStock: '',
});
const int = (s: string) => (s.trim() === '' ? null : Math.round(Number(s)));

export function ProductEditor({ id }: { id?: string }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { can } = useAdmin();
  const editable = can('productEdit');
  const showCost = can('cost');
  const { data: cat } = useCatalog();
  const [product, setProduct] = useState<AdminProductDTO | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [f, setF] = useState<Form>(EMPTY);
  const [saved, setSaved] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!id) return;
    setLoadError(null);
    adminApi.admin
      .product(id)
      .then((p) => {
        setProduct(p);
        const fm = fromProduct(p);
        setF(fm);
        setSaved(fm);
        document.title = `${p.title} · Unibody Admin`;
      })
      .catch((e) => setLoadError(errMsg(e)));
  };
  useEffect(load, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setF((s) => ({ ...s, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: '' }));
  };
  const dirty = JSON.stringify(f) !== JSON.stringify(saved);
  useEffect(() => {
    if (!dirty) return;
    const on = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', on);
    return () => window.removeEventListener('beforeunload', on);
  }, [dirty]);

  const category = cat?.categories.find((c) => c.id === f.categoryId);
  const showKeyboard = !!category && /keyboard|top-case|topcase/.test(category.slug);
  const price = inputToPaise(f.price) ?? 0;
  const cost = inputToPaise(f.cost) ?? 0;
  const mrp = inputToPaise(f.mrp);
  const margin = price > 0 && cost > 0 ? ((price - cost) / price) * 100 : null;
  const gstIncl = price ? Math.round(price - (price * 100) / (100 + f.gstRate)) : 0;

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (f.title.trim().length < 4) e.title = 'Give the part a clear title (at least 4 characters)';
    if (!f.familyId) e.familyId = 'Pick a device family';
    if (!f.categoryId) e.categoryId = 'Pick a category';
    if (!f.modelIds.length) e.modelIds = 'Pick at least one compatible model';
    if (price < 100) e.price = 'Enter a selling price';
    if (mrp !== null && mrp < price) e.mrp = 'MRP should be at least the selling price';
    return e;
  }

  async function save() {
    const e = validate();
    setErrors(e);
    if (Object.values(e).some(Boolean)) {
      toast('Please fix the highlighted fields', 'error');
      return;
    }
    const body: ProductInput = {
      title: f.title.trim(),
      description: f.description.trim(),
      familyId: f.familyId,
      categoryId: f.categoryId,
      modelIds: f.modelIds,
      condition: f.condition,
      colour: f.colour || null,
      keyboardLayout: showKeyboard ? f.keyboardLayout || null : null,
      partNumber: f.partNumber.trim() || null,
      warrantyDays: int(f.warrantyDays) ?? 0,
      mrp,
      price,
      cost: showCost ? cost : product?.cost ?? 0,
      gstRate: f.gstRate,
      hsn: f.hsn.trim() || '84733099',
      codAllowed: f.codAllowed,
      status: f.status,
      featured: f.featured,
      lowStockAlert: int(f.lowStockAlert) ?? 0,
      bin: f.bin.trim() || null,
      weightGrams: int(f.weightGrams),
      images: f.images,
      initialStock: !id ? int(f.initialStock) ?? undefined : undefined,
    };
    if (!showCost) delete (body as Partial<ProductInput>).cost;
    setSaving(true);
    try {
      const p = id ? await adminApi.admin.updateProduct(id, body) : await adminApi.admin.createProduct(body);
      const fm = fromProduct(p);
      setProduct(p);
      setF(fm);
      setSaved(fm);
      toast(id ? 'Product saved' : 'Product created');
      if (!id) router.replace(`/admin/products/${p.id}`);
    } catch (err) {
      setErrors(fieldErrors(err));
      toast(errMsg(err), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!product || !(await confirm({ title: 'Delete this product?', body: 'This can’t be undone. Products with orders can’t be deleted — hide them instead.', confirmLabel: 'Delete', danger: true }))) return;
    try {
      await adminApi.admin.deleteProduct(product.id);
      toast('Product deleted');
      router.replace('/admin/products');
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  }
  async function duplicate() {
    if (!product) return;
    try {
      const c = await adminApi.admin.duplicateProduct(product.id);
      toast('Duplicated as a draft');
      router.push(`/admin/products/${c.id}`);
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  }

  if (loadError) return <ErrorState message={loadError} onRetry={load} />;
  if ((id && !product) || !cat)
    return (
      <div className="space-y-5">
        <Skeleton className="h-14 w-96" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Skeleton className="h-[600px]" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );

  return (
    <div className={cn(!editable && '[&_fieldset]:pointer-events-none')}>
      {/* sticky header */}
      <div className="sticky top-16 z-20 -mx-4 mb-6 border-b border-line-subtle bg-bg/85 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/admin/products" className="rounded-full p-1.5 text-muted hover:bg-surface-2 hover:text-fg" aria-label="Back to products">
            <ArrowLeft className="size-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold tracking-tight">{id ? f.title || 'Untitled product' : 'New product'}</h1>
            {product && (
              <p className="truncate text-xs text-muted">
                <span className="font-mono">{product.sku}</span> · {product.stock} available · {product.reserved} reserved
              </p>
            )}
          </div>
          {product && (
            <>
              <a href={`/p/${product.slug}`} target="_blank" rel="noreferrer" className="hidden items-center gap-1 text-[13px] font-medium text-link sm:inline-flex">
                View on store <ExternalLink className="size-3.5" />
              </a>
              {editable && (
                <>
                  <Button variant="ghost" size="sm" onClick={duplicate} title="Duplicate">
                    <Copy className="size-4" />
                    <span className="hidden md:inline">Duplicate</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="text-danger" onClick={remove} title="Delete">
                    <Trash2 className="size-4" />
                  </Button>
                </>
              )}
            </>
          )}
          {editable && (
            <Button onClick={save} loading={saving} disabled={!!id && !dirty}>
              <Check className="size-4" />
              {id ? (dirty ? 'Save changes' : 'Saved') : 'Create product'}
            </Button>
          )}
        </div>
      </div>
      {!editable && <p className="mb-5 rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning">View only — your role can’t edit products.</p>}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <fieldset disabled={!editable} className="min-w-0 space-y-5">
          <Panel title="Basics">
            <div className="space-y-4">
              <Field label="Title" error={errors.title} hint="Customers search by this. Include the part, model and colour.">
                <Input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder='Display Assembly for MacBook Air 13" M1 (2020) — Space Grey' invalid={!!errors.title} />
              </Field>
              <Field label="Description" error={errors.description}>
                <Textarea value={f.description} onChange={(e) => set('description', e.target.value)} className="min-h-32" placeholder="What’s included, testing done, installation notes…" />
              </Field>
            </div>
          </Panel>

          <Panel title="Photos">
            <ImagesField images={f.images} onChange={(v) => set('images', v)} tint={category?.icon} />
          </Panel>

          <Panel title="Compatibility">
            <div className="space-y-4">
              <FormGrid>
                <Field label="Device family" error={errors.familyId}>
                  <Select
                    value={f.familyId}
                    invalid={!!errors.familyId}
                    onChange={(e) => {
                      const fam = e.target.value;
                      setF((s) => ({ ...s, familyId: fam, modelIds: s.modelIds.filter((m) => cat.models.find((x) => x.id === m)?.familyId === fam) }));
                    }}
                  >
                    <option value="">Choose…</option>
                    {cat.families.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Category" error={errors.categoryId}>
                  <Select value={f.categoryId} onChange={(e) => set('categoryId', e.target.value)} invalid={!!errors.categoryId}>
                    <option value="">Choose…</option>
                    {cat.categories.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </FormGrid>
              <Field label="Compatible models" error={errors.modelIds}>
                <ModelPicker familyId={f.familyId} value={f.modelIds} onChange={(v) => set('modelIds', v)} models={cat.models} invalid={!!errors.modelIds} />
              </Field>
            </div>
          </Panel>

          <Panel title="Pricing">
            <FormGrid cols={showCost ? 3 : 2}>
              <Field label="MRP" error={errors.mrp} hint={mrp && price && mrp > price ? `${percentOff(price, mrp)}% off shown on store` : 'Optional, shown struck-through'}>
                <MoneyInput value={f.mrp} onChange={(v) => set('mrp', v)} invalid={!!errors.mrp} />
              </Field>
              <Field label="Selling price (incl. GST)" error={errors.price}>
                <MoneyInput value={f.price} onChange={(v) => set('price', v)} invalid={!!errors.price} />
              </Field>
              {showCost && (
                <Field
                  label="Cost"
                  error={errors.cost}
                  hint={
                    margin !== null ? (
                      <span className={cn('font-medium', margin < 15 ? 'text-danger' : margin < 30 ? 'text-warning' : 'text-success')}>
                        {margin.toFixed(1)}% margin · {formatINR(price - cost)} profit
                      </span>
                    ) : (
                      'Only visible to owners'
                    )
                  }
                >
                  <MoneyInput value={f.cost} onChange={(v) => set('cost', v)} invalid={!!errors.cost} />
                </Field>
              )}
            </FormGrid>
            <div className="mt-5 grid gap-4 border-t border-line-subtle pt-5 sm:grid-cols-3">
              <Field label="GST rate" error={errors.gstRate}>
                <Select value={f.gstRate} onChange={(e) => set('gstRate', Number(e.target.value))}>
                  {[0, 5, 12, 18, 28].map((r) => (
                    <option key={r} value={r}>
                      {r}%
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="HSN code" error={errors.hsn}>
                <Input value={f.hsn} onChange={(e) => set('hsn', e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" className="font-mono" />
              </Field>
              <div className="flex flex-col justify-end pb-2 text-[13px] text-muted">
                {price > 0 && (
                  <>
                    <span>
                      Taxable {formatINR(price - gstIncl, { decimals: true })}
                    </span>
                    <span>
                      GST {formatINR(gstIncl, { decimals: true })}
                    </span>
                  </>
                )}
              </div>
            </div>
          </Panel>
        </fieldset>

        <fieldset disabled={!editable} className="min-w-0 space-y-5">
          <Panel title="Visibility">
            <Segmented
              className="w-full [&>button]:flex-1"
              value={f.status}
              onChange={(v) => set('status', v)}
              options={[
                { value: 'ACTIVE', label: 'Live' },
                { value: 'DRAFT', label: 'Draft' },
                { value: 'HIDDEN', label: 'Hidden' },
              ]}
            />
            <div className="mt-4 space-y-3.5">
              <ToggleRow label="Featured" hint="Shown on the home page" checked={f.featured} onChange={(v) => set('featured', v)} icon={<Star className="size-4 text-vivid-orange" />} />
              <ToggleRow label="Cash on Delivery" hint="Allow COD for this part" checked={f.codAllowed} onChange={(v) => set('codAllowed', v)} />
            </div>
          </Panel>

          <Panel title="Condition & details">
            <div className="space-y-4">
              <Field label="Condition" hint={CONDITION_DESCRIPTION[f.condition]}>
                <Select value={f.condition} onChange={(e) => set('condition', e.target.value as Condition)}>
                  {CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {CONDITION_LABEL[c]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Colour">
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => set('colour', '')} className={cn('rounded-full px-2.5 py-1 text-xs font-medium ring-1', !f.colour ? 'bg-fg text-bg ring-fg' : 'ring-line hover:ring-subtle')}>
                    None
                  </button>
                  {COLOURS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      title={c}
                      aria-label={c}
                      aria-pressed={f.colour === c}
                      onClick={() => set('colour', c)}
                      className={cn('size-7 rounded-full ring-1 ring-black/10 transition', f.colour === c ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : 'hover:scale-110')}
                      style={{ background: COLOUR_HEX[c] }}
                    />
                  ))}
                </div>
                {f.colour && <p className="text-xs text-muted">{f.colour}</p>}
              </Field>
              {showKeyboard && (
                <Field label="Keyboard layout">
                  <Segmented
                    size="sm"
                    value={f.keyboardLayout || 'NONE'}
                    onChange={(v) => set('keyboardLayout', v === 'NONE' ? '' : v)}
                    options={[{ value: 'NONE', label: '—' }, ...KEYBOARD_LAYOUTS.map((k) => ({ value: k, label: k }))]}
                  />
                </Field>
              )}
              <FormGrid>
                <Field label="Part number" error={errors.partNumber}>
                  <Input value={f.partNumber} onChange={(e) => set('partNumber', e.target.value)} placeholder="661-17537" className="font-mono" />
                </Field>
                <Field label="Warranty (days)" error={errors.warrantyDays}>
                  <Input value={f.warrantyDays} onChange={(e) => set('warrantyDays', e.target.value.replace(/\D/g, ''))} inputMode="numeric" />
                </Field>
              </FormGrid>
            </div>
          </Panel>

          <Panel title="Inventory">
            <div className="space-y-4">
              {!id ? (
                <Field label="Opening stock" hint="Recorded as an adjustment at the cost above">
                  <Input value={f.initialStock} onChange={(e) => set('initialStock', e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="0" />
                </Field>
              ) : (
                product && (
                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-surface-2 p-3 text-center">
                    {[
                      ['On hand', product.stock + product.reserved],
                      ['Reserved', product.reserved],
                      ['Available', product.stock],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <p className="text-lg font-semibold tabular-nums">{v}</p>
                        <p className="text-[11px] text-muted">{k}</p>
                      </div>
                    ))}
                  </div>
                )
              )}
              {product && (
                <Link href={`/admin/inventory?q=${encodeURIComponent(product.sku)}`} className="-mt-1 inline-flex items-center gap-1 text-[13px] font-medium text-link">
                  Adjust stock or add serial units <ArrowRight className="size-3.5" />
                </Link>
              )}
              <FormGrid>
                <Field label="Low-stock alert at">
                  <Input value={f.lowStockAlert} onChange={(e) => set('lowStockAlert', e.target.value.replace(/\D/g, ''))} inputMode="numeric" />
                </Field>
                <Field label="Bin / shelf">
                  <Input value={f.bin} onChange={(e) => set('bin', e.target.value)} placeholder="A3-12" />
                </Field>
              </FormGrid>
              <Field label="Shipping weight (g)">
                <Input value={f.weightGrams} onChange={(e) => set('weightGrams', e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="450" />
              </Field>
            </div>
          </Panel>

          <Panel title="Store preview">
            <div className="overflow-hidden rounded-2xl border border-line-subtle">
              <ProductImage src={f.images[0]} alt="" tint={category?.icon} rounded="rounded-none" className="aspect-[4/3]" />
              <div className="space-y-1.5 p-4">
                <ConditionBadge condition={f.condition} />
                <p className="line-clamp-2 text-sm font-semibold">{f.title || 'Product title'}</p>
                <p className="flex items-baseline gap-2">
                  <span className="text-lg font-semibold">{formatINR(price)}</span>
                  {mrp && mrp > price ? <span className="text-xs text-subtle line-through">{formatINR(mrp)}</span> : null}
                  {mrp && mrp > price ? <Badge tone="success">{percentOff(price, mrp)}% off</Badge> : null}
                </p>
              </div>
            </div>
          </Panel>
        </fieldset>
      </div>
    </div>
  );
}

function ToggleRow({ label, hint, checked, onChange, icon }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <div className="flex-1 leading-tight">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

function ModelPicker({ familyId, value, onChange, models, invalid }: { familyId: string; value: string[]; onChange: (v: string[]) => void; models: import('@unibody/shared').DeviceModelDTO[]; invalid?: boolean }) {
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return models
      .filter((m) => !familyId || m.familyId === familyId)
      .filter((m) => !t || m.fullName.toLowerCase().includes(t) || m.aNumbers.some((a) => a.toLowerCase().includes(t)) || (m.emc ?? '').toLowerCase().includes(t))
      .sort((a, b) => b.yearFrom - a.yearFrom);
  }, [models, familyId, q]);
  const selected = models.filter((m) => value.includes(m.id));
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  if (!familyId) return <p className={cn('rounded-xl border border-dashed px-4 py-5 text-center text-sm text-muted', invalid ? 'border-danger' : 'border-line')}>Choose a device family first.</p>;
  return (
    <div className={cn('overflow-hidden rounded-xl border', invalid ? 'border-danger' : 'border-line')}>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b border-line-subtle bg-surface-2/60 p-2.5">
          {selected.map((m) => (
            <span key={m.id} className="inline-flex items-center gap-1 rounded-full bg-accent-soft py-0.5 pl-2.5 pr-1 text-xs font-medium text-accent">
              {m.fullName}
              <button type="button" aria-label={`Remove ${m.fullName}`} onClick={() => toggle(m.id)} className="rounded-full p-0.5 hover:bg-accent/15">
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <label className="flex items-center gap-2 border-b border-line-subtle px-3">
        <Search className="size-4 text-subtle" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by name, A-number or EMC" className="h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-subtle" />
      </label>
      <ul className="max-h-64 overflow-y-auto p-1">
        {list.map((m) => {
          const on = value.includes(m.id);
          return (
            <li key={m.id}>
              <button type="button" onClick={() => toggle(m.id)} className={cn('flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition', on ? 'bg-accent-soft/60' : 'hover:bg-surface-2')}>
                <span className={cn('flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border', on ? 'border-accent bg-accent text-white' : 'border-line')}>{on && <Check className="size-3" />}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{m.fullName}</span>
                  <span className="block truncate text-xs text-muted">
                    {m.aNumbers.join(', ')}
                    {m.emc && ` · EMC ${m.emc}`}
                    {m.chip && ` · ${m.chip}`}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
        {list.length === 0 && <li className="px-3 py-4 text-center text-sm text-muted">No models match.</li>}
      </ul>
    </div>
  );
}

function ImagesField({ images, onChange, tint }: { images: string[]; onChange: (v: string[]) => void; tint?: string }) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [drag, setDrag] = useState(false);
  async function upload(files: FileList | File[]) {
    const list = [...files].slice(0, 12 - images.length);
    if (!list.length) return;
    setUploading(list.length);
    const urls: string[] = [];
    for (const file of list) {
      if (file.size > 8 * 1024 * 1024) {
        toast(`${file.name} is larger than 8 MB`, 'error');
        continue;
      }
      try {
        const r = await adminApi.admin.upload(file, file.name);
        urls.push(r.url);
      } catch (e) {
        toast(errMsg(e), 'error');
      }
      setUploading((n) => n - 1);
    }
    setUploading(0);
    if (urls.length) onChange([...images, ...urls]);
  }
  const move = (i: number, d: -1 | 1) => {
    const n = [...images];
    const j = i + d;
    if (j < 0 || j >= n.length) return;
    [n[i], n[j]] = [n[j], n[i]];
    onChange(n);
  };
  return (
    <div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-5">
        {images.map((src, i) => (
          <div key={src + i} className="group relative">
            <ProductImage src={src} alt={`Photo ${i + 1}`} tint={tint} className="aspect-square" rounded="rounded-xl" />
            {i === 0 && <span className="absolute left-1.5 top-1.5 rounded-full bg-fg/85 px-2 py-0.5 text-[10px] font-semibold text-bg">Cover</span>}
            <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
              <span className="flex gap-1">
                <button type="button" aria-label="Move left" disabled={i === 0} onClick={() => move(i, -1)} className="rounded-full bg-surface/90 p-1 shadow disabled:opacity-40">
                  <ArrowLeft className="size-3.5" />
                </button>
                <button type="button" aria-label="Move right" disabled={i === images.length - 1} onClick={() => move(i, 1)} className="rounded-full bg-surface/90 p-1 shadow disabled:opacity-40">
                  <ArrowRight className="size-3.5" />
                </button>
              </span>
              <button type="button" aria-label="Remove photo" onClick={() => onChange(images.filter((_, j) => j !== i))} className="rounded-full bg-surface/90 p-1 text-danger shadow">
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
        {Array.from({ length: uploading }).map((_, i) => (
          <div key={'u' + i} className="flex aspect-square items-center justify-center rounded-xl bg-surface-2">
            <Loader2 className="size-5 animate-spin text-muted" />
          </div>
        ))}
        {images.length < 12 && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              void upload(e.dataTransfer.files);
            }}
            className={cn('flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed text-xs font-medium text-muted transition hover:border-accent hover:text-accent', drag ? 'border-accent bg-accent-soft text-accent' : 'border-line')}
          >
            <ImagePlus className="size-5" />
            Add photos
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => e.target.files && upload(e.target.files)} />
      <p className="mt-3 text-xs text-muted">JPG, PNG or WebP up to 8 MB. Transparent renders look best on the tinted stage. The first photo is the cover.</p>
    </div>
  );
}
