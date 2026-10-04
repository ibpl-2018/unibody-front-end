'use client';
import { useCallback, useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Copy, HelpCircle, XCircle } from 'lucide-react';
import { isHeld, type StockCountDTO, type StockCountScanDTO } from '@unibody/shared';
import { Badge, Button, Checkbox, Field, Skeleton, Textarea } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { ErrorState, PageHeader, Panel, StatMini, useConfirm } from '@/components/admin/ui';
import { beep, ScanInput } from '@/components/admin/scan-input';
import { adminApi, errMsg, useApi } from '@/lib/admin/api';
import { useAdmin } from '@/lib/admin/session';
import { fmtDateTime } from '@/lib/format';
import { cn } from '@/lib/cn';

const OUTCOME: Record<StockCountScanDTO['outcome'], { label: string; tone: 'success' | 'danger' | 'warning' | 'neutral'; icon: typeof CheckCircle2 }> = {
  OK: { label: 'Counted', tone: 'success', icon: CheckCircle2 },
  DUPLICATE: { label: 'Already scanned', tone: 'neutral', icon: Copy },
  UNKNOWN: { label: 'Unknown code', tone: 'danger', icon: HelpCircle },
  OUT_OF_SCOPE: { label: 'Not part of this count', tone: 'warning', icon: AlertTriangle },
  NOT_ON_SHELF: { label: 'Recorded as sold / written off!', tone: 'danger', icon: XCircle },
};

export default function StockCountPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const confirm = useConfirm();
  const { can } = useAdmin();
  const { data, error, refetch, setData } = useApi(() => adminApi.admin.stockCount(id), [id]);
  const [last, setLast] = useState<{ code: string; outcome: StockCountScanDTO['outcome'] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [writeOff, setWriteOff] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');

  const scan = useCallback(
    async (code: string) => {
      try {
        const r = await adminApi.admin.scanStockCount(id, code);
        setData(r.count);
        setLast({ code, outcome: r.outcome });
        beep(r.outcome === 'OK');
      } catch (e) {
        beep(false);
        toast(errMsg(e), 'error');
      }
    },
    [id, setData, toast],
  );

  const submit = async () => {
    if (!(await confirm({ title: 'Finish counting?', body: 'Anything not scanned will be reported as missing. You can’t add scans after this.', confirmLabel: 'Finish & report' }))) return;
    setBusy(true);
    try {
      setData(await adminApi.admin.submitStockCount(id));
      toast('Count submitted');
    } catch (e) {
      toast(errMsg(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const close = async (c: StockCountDTO) => {
    setBusy(true);
    try {
      const r = await adminApi.admin.closeStockCount(c.id, { writeOffUnitIds: [...writeOff], note: note.trim() || undefined });
      if (isHeld(r)) {
        toast(r.message);
        void refetch();
      } else {
        setData(r);
        toast(writeOff.size ? `${writeOff.size} unit(s) written off` : 'Count closed');
      }
    } catch (e) {
      toast(errMsg(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (error && !data) return <ErrorState message={error} onRetry={refetch} />;
  if (!data) return <Skeleton className="h-96" />;
  const c = data;
  const L = last ? OUTCOME[last.outcome] : null;

  return (
    <>
      <PageHeader
        back={{ href: '/admin/stock-counts', label: 'Stock counts' }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {c.code}
            <Badge tone={c.status === 'OPEN' ? 'info' : c.status === 'SUBMITTED' ? 'warning' : 'success'}>{c.status.toLowerCase()}</Badge>
          </span>
        }
        subtitle={`${c.scopeLabel} · started by ${c.startedBy} · ${fmtDateTime(c.startedAt)}${c.note ? ` · ${c.note}` : ''}`}
        actions={
          c.status === 'OPEN' && (
            <Button onClick={submit} loading={busy} disabled={!c.scanned}>
              Finish count
            </Button>
          )
        }
      />

      {c.status === 'OPEN' && (
        <Panel className="mb-5">
          <ScanInput onScan={scan} />
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <p className="text-3xl font-bold tabular-nums" data-testid="scanned-count">
              {c.scanned}
              <span className="ml-2 text-sm font-normal text-muted">units counted</span>
            </p>
            {L && last && (
              <p className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold', L.tone === 'success' ? 'bg-success-soft text-success' : L.tone === 'danger' ? 'bg-danger-soft text-danger' : L.tone === 'warning' ? 'bg-warning-soft text-warning' : 'bg-surface-2 text-muted')} role="status" data-testid="last-scan">
                <L.icon className="size-4" /> {last.code} · {L.label}
              </p>
            )}
          </div>
        </Panel>
      )}

      {c.result && (
        <div className="mb-5 space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatMini label="Expected on the shelf" value={c.result.expected} />
            <StatMini label="Found" value={c.result.found} tone="success" />
            <StatMini label="Missing" value={c.result.missing.length} tone={c.result.missing.length ? 'danger' : 'success'} />
          </div>
          {c.result.missing.length > 0 && (
            <Panel title={`Missing units · ${c.result.missing.length}`}>
              {c.status === 'SUBMITTED' && (
                <p className="mb-3 text-[13px] text-muted">
                  {can('security') ? 'Search once more. Tick the units that are really gone to write them off — stock goes down and each unit is marked missing, permanently in the ledger.' : 'The Super Admin has been alerted and will review these.'}
                </p>
              )}
              <ul className="divide-y divide-line-subtle">
                {c.result.missing.map((m) => (
                  <li key={m.unitId} className="flex items-center gap-3 py-2 text-sm">
                    {c.status === 'SUBMITTED' && can('security') && (
                      <Checkbox
                        aria-label={`Write off ${m.code}`}
                        checked={writeOff.has(m.unitId)}
                        onChange={() => setWriteOff((s) => { const n = new Set(s); if (!n.delete(m.unitId)) n.add(m.unitId); return n; })}
                      />
                    )}
                    <span className="font-mono font-semibold">{m.code}</span>
                    <span className="min-w-0 flex-1 truncate text-muted">{m.productTitle}</span>
                    {m.status === 'RESERVED' && <Badge tone="warning">on packing desk</Badge>}
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          {c.result.unexpected.length > 0 && (
            <Panel title="Unexpected scans">
              <ul className="space-y-1 text-sm">
                {c.result.unexpected.map((u) => (
                  <li key={u.code}>
                    <span className="font-mono font-semibold">{u.code}</span> · {OUTCOME[u.outcome as StockCountScanDTO['outcome']]?.label ?? u.outcome}
                    {u.productTitle && <span className="text-muted"> · {u.productTitle}</span>}
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          {c.status === 'SUBMITTED' && can('security') && (
            <Panel title="Close the count">
              <Field label="Note (kept in the audit log)">
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} className="min-h-16" placeholder="e.g. Searched shelf B and the repair bin" />
              </Field>
              <Button className="mt-3" variant={writeOff.size ? 'danger' : 'primary'} onClick={() => close(c)} loading={busy}>
                {writeOff.size ? `Write off ${writeOff.size} unit(s) & close` : 'Close — nothing to write off'}
              </Button>
            </Panel>
          )}
          {c.status === 'CLOSED' && <p className="text-sm text-muted">Closed by {c.closedBy} · {c.closedAt && fmtDateTime(c.closedAt)}</p>}
        </div>
      )}

      <Panel title={`Scans · ${c.scans.length}`} padded={false}>
        <ul className="max-h-[420px] divide-y divide-line-subtle overflow-y-auto">
          {c.scans.map((s) => {
            const o = OUTCOME[s.outcome];
            return (
              <li key={s.code} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                <o.icon className={cn('size-4 shrink-0', o.tone === 'success' ? 'text-success' : o.tone === 'danger' ? 'text-danger' : o.tone === 'warning' ? 'text-warning' : 'text-subtle')} />
                <span className="font-mono font-semibold">{s.code}</span>
                <span className="min-w-0 flex-1 truncate text-muted">{s.productTitle ?? o.label}</span>
                <span className="hidden text-xs text-subtle sm:inline">
                  {s.by} · {fmtDateTime(s.at)}
                </span>
              </li>
            );
          })}
          {!c.scans.length && <li className="px-5 py-6 text-center text-sm text-muted">No scans yet.</li>}
        </ul>
      </Panel>
    </>
  );
}
