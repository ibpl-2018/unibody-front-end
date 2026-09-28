'use client';
import { useState } from 'react';
import { Plus, Recycle, Trash2 } from 'lucide-react';
import { formatINR, type PurchaseDTO, type PurchaseLineDTO } from '@unibody/shared';
import { Button, Field, Input } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { MoneyInput } from '@/components/admin/ui';
import { ProductPicker, type PickedProduct } from '@/components/admin/product-picker';
import { adminApi, errMsg, inputToPaise } from '@/lib/admin/api';
import { cn } from '@/lib/cn';

interface HPart {
  key: number;
  product: PickedProduct | null;
  qty: string;
  cost: string;
  serial: string;
}
let hk = 0;
const blank = (): HPart => ({ key: ++hk, product: null, qty: '1', cost: '', serial: '' });

/**
 * Record the parts pulled from ONE unit of a donor-device line and spread its cost across them.
 * `compact` stacks the fields for the narrow side panel on the Purchases list.
 */
export function HarvestForm({ p, line, onCancel, onSaved, compact }: { p: PurchaseDTO; line: PurchaseLineDTO; onCancel: () => void; onSaved: (p: PurchaseDTO) => void; compact?: boolean }) {
  const toast = useToast();
  const [label, setLabel] = useState(`Unit ${line.harvested + 1} of ${line.qty} — ${line.description}`);
  const [parts, setParts] = useState<HPart[]>([blank()]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const upd = (key: number, patch: Partial<HPart>) => setParts((ps) => ps.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const allocated = parts.reduce((a, x) => a + (Number(x.qty) || 0) * (inputToPaise(x.cost) ?? 0), 0);
  const unitCost = line.unitCost;
  const splitEvenly = () => {
    const units = parts.reduce((a, x) => a + (Number(x.qty) || 0), 0) || 1;
    const each = Math.floor(unitCost / units / 100);
    setParts((ps) => ps.map((x) => ({ ...x, cost: String(each) })));
  };
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (parts.some((x) => !x.product)) return setErr('Pick a product for every harvested part');
    setBusy(true);
    setErr(null);
    try {
      const np = await adminApi.admin.harvest(p.id, {
        lineId: line.id,
        label: label.trim() || undefined,
        parts: parts.map((x) => ({ productId: x.product!.id, qty: Math.max(1, Math.round(Number(x.qty) || 1)), cost: inputToPaise(x.cost) ?? 0, serial: x.serial.trim() || null })),
      });
      toast(`${parts.length} part${parts.length > 1 ? 's' : ''} added to stock`);
      setParts([blank()]);
      setBusy(false);
      onSaved(np);
    } catch (e2) {
      setErr(errMsg(e2));
      setBusy(false);
    }
  }
  const grid = compact ? '' : 'sm:grid-cols-[minmax(0,1fr)_70px_120px_150px_36px]';
  return (
    <form onSubmit={submit} className="space-y-4" aria-label={`Harvest ${line.description}`}>
      {!compact && (
        <p className="-mt-2 text-sm text-muted">
          Record every usable part you pulled from one unit of <span className="font-medium text-fg">{line.description}</span>. Assign cost so the donor price ({formatINR(unitCost)}) is spread across the parts.
        </p>
      )}
      <Field label="Label">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} />
      </Field>
      <div className="space-y-2.5">
        <p className={cn('px-1 text-xs font-medium text-muted', !compact && 'hidden')}>Parts extracted from this unit</p>
        {!compact && (
          <div className={cn('hidden gap-2 px-1 text-xs font-medium text-muted sm:grid', grid)}>
            <span>Part produced</span>
            <span>Qty</span>
            <span>Cost each</span>
            <span>Serial (optional)</span>
            <span />
          </div>
        )}
        {parts.map((x) => (
          <div key={x.key} className={cn('grid gap-2 rounded-xl border border-line-subtle p-2.5', !compact && 'sm:border-0 sm:p-0', grid)}>
            <ProductPicker value={x.product} onChange={(pp) => upd(x.key, { product: pp })} placeholder="Search the part you pulled" />
            <div className={cn(compact ? 'grid grid-cols-[64px_minmax(0,1fr)_36px] gap-2' : 'contents')}>
              <Input aria-label="Quantity" value={x.qty} onChange={(e) => upd(x.key, { qty: e.target.value.replace(/\D/g, '') })} inputMode="numeric" />
              <MoneyInput value={x.cost} onChange={(v) => upd(x.key, { cost: v })} />
              {!compact && <Input aria-label="Serial" value={x.serial} onChange={(e) => upd(x.key, { serial: e.target.value.toUpperCase() })} placeholder="Serial" className="font-mono" />}
              <button type="button" aria-label="Remove part" disabled={parts.length === 1} onClick={() => setParts((ps) => ps.filter((y) => y.key !== x.key))} className="flex h-11 items-center justify-center rounded-full text-muted hover:text-danger disabled:opacity-30">
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setParts((ps) => [...ps, blank()])}>
          <Plus className="size-4" />
          Add part
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={splitEvenly}>
          Split cost evenly
        </Button>
      </div>
      <p className="flex items-center justify-between border-t border-line-subtle pt-3 text-sm font-semibold">
        Allocated cost
        <span data-testid="allocated" className={cn('tabular-nums', allocated === unitCost ? 'text-success' : allocated > unitCost ? 'text-warning' : 'text-muted')}>
          {formatINR(allocated)} / {formatINR(unitCost)}
        </span>
      </p>
      {err && <p className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{err}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={busy}>
          <Recycle className="size-4" />
          Add to stock
        </Button>
      </div>
    </form>
  );
}
