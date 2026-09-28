'use client';
import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Eye, EyeOff, Fingerprint, PackageSearch, ShieldAlert, ShieldCheck, Wallet } from 'lucide-react';
import {
  APPROVAL_KIND_LABEL,
  ROLE_LABEL,
  formatINR,
  type AdminRole,
  type ApprovalDTO,
  type ApprovalStatus,
  type AuditVerifyDTO,
  type ReconciliationRowDTO,
  type SecurityAlertDTO,
  type SecuritySettingsDTO,
} from '@unibody/shared';
import { Badge, Button, EmptyState, Field, Input, Modal, Segmented, Skeleton, Switch, Textarea } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { DataTable, ErrorState, KpiCard, LineTabs, PageHeader, Pagination, Panel, PillTabs, SearchInput, StatMini, type Column } from '@/components/admin/ui';
import { NoAccess } from '@/components/admin/no-access';
import { adminApi, errMsg, useApi, useDebounced } from '@/lib/admin/api';
import { useAdmin } from '@/lib/admin/session';
import { fmtDateTime } from '@/lib/format';
import { cn } from '@/lib/cn';

type Tab = 'overview' | 'approvals' | 'alerts' | 'reconciliation' | 'audit' | 'settings';
const SEV_TONE = { HIGH: 'danger', MEDIUM: 'warning', LOW: 'neutral' } as const;
const roleLabel = (r: string) => ROLE_LABEL[r as AdminRole] ?? r;

/** Super Admin's desk: approvals, alerts, reconciliation and the tamper-evident audit log. */
export default function SecurityPage() {
  const { can } = useAdmin();
  const [tab, setTab] = useState<Tab>('overview');
  if (!can('security')) return <NoAccess what="the security desk" />;
  return (
    <>
      <PageHeader title="Security desk" subtitle="Everything staff change is logged. Risky changes wait here for you; nothing is final until you approve it." />
      <LineTabs
        className="mb-5"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'overview', label: 'Overview' },
          { value: 'approvals', label: 'Approvals' },
          { value: 'alerts', label: 'Alerts' },
          { value: 'reconciliation', label: 'Stock reconciliation' },
          { value: 'audit', label: 'Audit log' },
          { value: 'settings', label: 'Settings' },
        ]}
      />
      {tab === 'overview' && <Overview go={setTab} />}
      {tab === 'approvals' && <Approvals />}
      {tab === 'alerts' && <Alerts />}
      {tab === 'reconciliation' && <Reconciliation />}
      {tab === 'audit' && <Audit />}
      {tab === 'settings' && <SettingsTab />}
    </>
  );
}

// ------------------------------------------------------------------ overview
function Overview({ go }: { go: (t: Tab) => void }) {
  const { data: o, error, refetch } = useApi(() => adminApi.admin.securityOverview(), []);
  if (error && !o) return <ErrorState message={error} onRetry={refetch} />;
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <button type="button" onClick={() => go('approvals')} className="text-left">
          <KpiCard label="Waiting for your approval" value={o?.pendingApprovals ?? '—'} icon={<ClipboardCheck />} color="purple" loading={!o} />
        </button>
        <button type="button" onClick={() => go('alerts')} className="text-left">
          <KpiCard label="Open alerts" value={o ? `${o.openAlerts}${o.highAlerts ? ` (${o.highAlerts} high)` : ''}` : '—'} icon={<ShieldAlert />} color="pink" loading={!o} />
        </button>
        <button type="button" onClick={() => go('reconciliation')} className="text-left">
          <KpiCard label="Units written off as missing" value={o?.missingUnits ?? '—'} icon={<PackageSearch />} color="orange" loading={!o} />
        </button>
        <button type="button" onClick={() => go('reconciliation')} className="text-left">
          <KpiCard label="Products with stock issues" value={o?.reconciliationIssues ?? '—'} icon={<AlertTriangle />} color="orange" loading={!o} />
        </button>
        <KpiCard label="COD delivered, not collected > 3 days" value={o ? `${o.codUncollected.orders} · ${formatINR(o.codUncollected.amount)}` : '—'} icon={<Wallet />} color="blue" loading={!o} />
      </div>

      <Panel title="Team activity" padded={false}>
        <DataTable
          className="rounded-none border-0"
          rows={o?.staff}
          loading={!o}
          rowKey={(s) => s.id}
          columns={[
            { key: 'n', header: 'Person', cell: (s) => <span className="font-medium">{s.name}</span> },
            { key: 'r', header: 'Role', cell: (s) => <Badge tone={s.role === 'OWNER' ? 'purple' : s.role === 'MANAGER' ? 'info' : 'neutral'}>{roleLabel(s.role)}</Badge> },
            { key: 'a', header: 'Changes (7 days)', align: 'right', cell: (s) => <span className="tabular-nums">{s.actions7d}</span> },
            { key: 'p', header: 'Waiting', align: 'right', cell: (s) => <span className={cn('tabular-nums', s.pendingApprovals && 'font-semibold text-purple')}>{s.pendingApprovals}</span> },
            { key: 'j', header: 'Rejected (30d)', align: 'right', hide: 'sm', cell: (s) => <span className={cn('tabular-nums', s.rejected30d && 'font-semibold text-danger')}>{s.rejected30d}</span> },
            { key: 'l', header: 'Alerts (30d)', align: 'right', hide: 'sm', cell: (s) => <span className={cn('tabular-nums', s.alerts30d && 'font-semibold text-danger')}>{s.alerts30d}</span> },
            { key: 'o', header: 'Off-hours (30d)', align: 'right', hide: 'md', cell: (s) => <span className={cn('tabular-nums', s.offHours30d && 'font-semibold text-warning')}>{s.offHours30d}</span> },
            { key: 't', header: 'Last change', hide: 'md', cell: (s) => <span className="text-[13px] text-muted">{s.lastActionAt ? fmtDateTime(s.lastActionAt) : '—'}</span> },
          ]}
        />
      </Panel>

      <Panel title="How your stock is protected">
        <ul className="grid gap-3 text-sm sm:grid-cols-2">
          {[
            ['Every piece has a code', 'Each unit gets a printed barcode when it’s received. Packing requires scanning the exact unit, so nothing leaves without being tied to an order and an invoice.'],
            ['Risky changes need you', 'Write-offs, stock adjustments, price changes, deletes, manual invoices and cancelling after packing wait for your approval.'],
            ['Counts find the gaps', 'Staff scan the shelf in a stock count. Any unit the system expects but nobody scans is flagged to you as missing.'],
            ['History can’t be rewritten', 'The audit log is append-only and hash-chained. “Verify integrity” recomputes the chain and tells you if anyone edited it, even directly in the database.'],
          ].map(([t, b]) => (
            <li key={t} className="rounded-2xl bg-surface-2/60 p-4">
              <p className="font-semibold">{t}</p>
              <p className="mt-1 text-[13px] text-muted">{b}</p>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

// ------------------------------------------------------------------ approvals
function Approvals() {
  const toast = useToast();
  const { refreshCounts } = useAdmin();
  const [status, setStatus] = useState<ApprovalStatus | 'ALL'>('PENDING');
  const [page, setPage] = useState(1);
  const [deciding, setDeciding] = useState<{ a: ApprovalDTO; decision: 'APPROVE' | 'REJECT' } | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const { data, error, loading, refetch } = useApi(() => adminApi.admin.approvals({ status, page }), [status, page]);

  const decide = async () => {
    if (!deciding) return;
    setBusy(true);
    try {
      const r = await adminApi.admin.decideApproval(deciding.a.id, deciding.decision, note.trim() || undefined);
      toast(r.status === 'APPROVED' ? `Approved — ${r.result ?? 'applied'}` : r.status === 'FAILED' ? `Could not apply: ${r.result}` : 'Rejected — nothing was changed', r.status === 'FAILED' ? 'error' : 'success');
      setDeciding(null);
      setNote('');
      void refetch();
      refreshCounts();
    } catch (e) {
      toast(errMsg(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (error && !data) return <ErrorState message={error} onRetry={refetch} />;
  return (
    <>
      <PillTabs
        className="mb-4"
        value={status}
        onChange={(v) => (setStatus(v), setPage(1))}
        tabs={[
          { value: 'PENDING', label: 'Waiting' },
          { value: 'APPROVED', label: 'Approved' },
          { value: 'REJECTED', label: 'Rejected' },
          { value: 'ALL', label: 'All' },
        ]}
      />
      {loading && !data ? (
        <Skeleton className="h-40" />
      ) : !data?.items.length ? (
        <EmptyState icon={<CheckCircle2 className="size-6" />} title={status === 'PENDING' ? 'Nothing waiting for you' : 'No requests'} body="Risky changes by your team appear here for approval." />
      ) : (
        <div className="space-y-3">
          {data.items.map((a) => (
            <article key={a.id} className="rounded-[var(--radius-card)] border border-line-subtle bg-surface p-4 sm:p-5" data-testid="approval">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="purple">{APPROVAL_KIND_LABEL[a.kind]}</Badge>
                    {a.status !== 'PENDING' && <Badge tone={a.status === 'APPROVED' ? 'success' : 'danger'}>{a.status.toLowerCase()}</Badge>}
                    {a.discreet && (
                      <Badge tone="warning">
                        <EyeOff className="size-3" /> Shown to them as done
                      </Badge>
                    )}
                  </div>
                  <p className="mt-2 font-semibold">{a.summary}</p>
                  <p className="mt-1 text-[13px] text-muted">
                    Requested by <span className="font-medium text-fg">{a.requestedBy.name}</span> ({roleLabel(a.requestedBy.role)}) · {fmtDateTime(a.requestedAt)}
                  </p>
                  {a.risks.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {a.risks.map((r) => (
                        <Badge key={r} tone="danger">
                          <AlertTriangle className="size-3" /> {r}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {a.reviewedBy && (
                    <p className="mt-2 text-[13px] text-muted">
                      {a.status === 'APPROVED' ? 'Approved' : a.status === 'FAILED' ? 'Failed' : 'Rejected'} by {a.reviewedBy} · {a.reviewedAt && fmtDateTime(a.reviewedAt)}
                      {a.reviewNote && ` — “${a.reviewNote}”`}
                      {a.result && ` · ${a.result}`}
                    </p>
                  )}
                </div>
                {a.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <Button variant="outline" className="text-danger" onClick={() => setDeciding({ a, decision: 'REJECT' })}>
                      Reject
                    </Button>
                    <Button onClick={() => setDeciding({ a, decision: 'APPROVE' })}>Approve</Button>
                  </div>
                )}
              </div>
            </article>
          ))}
          <Pagination page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
        </div>
      )}
      <Modal
        open={!!deciding}
        onClose={() => setDeciding(null)}
        title={deciding?.decision === 'APPROVE' ? 'Approve this change?' : 'Reject this change?'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeciding(null)}>
              Back
            </Button>
            <Button variant={deciding?.decision === 'REJECT' ? 'danger' : 'primary'} loading={busy} onClick={decide}>
              {deciding?.decision === 'APPROVE' ? 'Approve & apply' : 'Reject'}
            </Button>
          </>
        }
      >
        <p className="text-sm">{deciding?.a.summary}</p>
        <p className="mt-2 text-[13px] text-muted">
          {deciding?.decision === 'APPROVE' ? 'It will be applied now, exactly as requested.' : 'Nothing will change. The request and your note stay in the audit log.'}
        </p>
        <Field label="Note (optional, kept in the audit log)" className="mt-4">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} className="min-h-20" />
        </Field>
      </Modal>
    </>
  );
}

// ------------------------------------------------------------------ alerts
function Alerts() {
  const toast = useToast();
  const { refreshCounts } = useAdmin();
  const [status, setStatus] = useState<'OPEN' | 'RESOLVED' | 'ALL'>('OPEN');
  const [page, setPage] = useState(1);
  const [resolving, setResolving] = useState<SecurityAlertDTO | null>(null);
  const [note, setNote] = useState('');
  const { data, error, loading, refetch } = useApi(() => adminApi.admin.securityAlerts({ status, page }), [status, page]);

  const resolve = async () => {
    if (!resolving) return;
    try {
      await adminApi.admin.resolveAlert(resolving.id, note.trim());
      toast('Alert resolved');
      setResolving(null);
      setNote('');
      void refetch();
      refreshCounts();
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  };

  if (error && !data) return <ErrorState message={error} onRetry={refetch} />;
  return (
    <>
      <PillTabs
        className="mb-4"
        value={status}
        onChange={(v) => (setStatus(v), setPage(1))}
        tabs={[
          { value: 'OPEN', label: 'Open' },
          { value: 'RESOLVED', label: 'Resolved' },
          { value: 'ALL', label: 'All' },
        ]}
      />
      {loading && !data ? (
        <Skeleton className="h-40" />
      ) : !data?.items.length ? (
        <EmptyState icon={<ShieldCheck className="size-6" />} title="No alerts" body="Suspicious activity — missing units, off-hours changes, failed logins — shows up here." />
      ) : (
        <div className="space-y-3">
          {data.items.map((a) => (
            <article key={a.id} className="flex flex-wrap items-start gap-3 rounded-[var(--radius-card)] border border-line-subtle bg-surface p-4 sm:p-5" data-testid="alert">
              <Badge tone={SEV_TONE[a.severity]}>{a.severity.toLowerCase()}</Badge>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{a.title}</p>
                {a.detail && <p className="mt-1 whitespace-pre-line text-[13px] text-muted">{a.detail}</p>}
                <p className="mt-1 text-xs text-subtle">
                  {fmtDateTime(a.at)}
                  {a.actorName && ` · ${a.actorName}`}
                  {a.ref && ` · ${a.ref}`}
                  {a.status === 'RESOLVED' && ` · resolved by ${a.resolvedBy}: “${a.resolutionNote}”`}
                </p>
              </div>
              {a.status === 'OPEN' && (
                <Button variant="outline" size="sm" onClick={() => setResolving(a)}>
                  Resolve
                </Button>
              )}
            </article>
          ))}
          <Pagination page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
        </div>
      )}
      <Modal
        open={!!resolving}
        onClose={() => setResolving(null)}
        title="Resolve alert"
        footer={
          <>
            <Button variant="secondary" onClick={() => setResolving(null)}>
              Back
            </Button>
            <Button onClick={resolve} disabled={note.trim().length < 2}>
              Resolve
            </Button>
          </>
        }
      >
        <p className="text-sm font-medium">{resolving?.title}</p>
        <Field label="What did you find?" className="mt-4">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Spoke to Ravi — unit was in the repair bin" className="min-h-20" />
        </Field>
      </Modal>
    </>
  );
}

// ------------------------------------------------------------------ reconciliation
function Reconciliation() {
  const [onlyIssues, setOnlyIssues] = useState(true);
  const { data, error, loading, refetch } = useApi(() => adminApi.admin.reconciliation(), []);
  if (error && !data) return <ErrorState message={error} onRetry={refetch} />;
  const rows = (data?.rows ?? []).filter((r) => !onlyIssues || r.issues.length);
  const num = (k: keyof ReconciliationRowDTO, label: string, hide?: Column<ReconciliationRowDTO>['hide']): Column<ReconciliationRowDTO> => ({
    key: k,
    header: label,
    align: 'right',
    hide,
    cell: (r) => <span className="tabular-nums">{r[k] as number}</span>,
  });
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-5">
        <StatMini label="Products checked" value={data?.summary.products ?? '—'} />
        <StatMini label="Stock ≠ ledger" value={data?.summary.ledgerMismatch ?? '—'} tone={data?.summary.ledgerMismatch ? 'danger' : 'success'} />
        <StatMini label="Stock ≠ scannable units" value={data?.summary.unitMismatch ?? '—'} tone={data?.summary.unitMismatch ? 'danger' : 'success'} />
        <StatMini label="Sold without invoice" value={data?.summary.invoiceMismatch ?? '—'} tone={data?.summary.invoiceMismatch ? 'danger' : 'success'} />
        <StatMini label="Units missing" value={data?.summary.missingUnits ?? '—'} tone={data?.summary.missingUnits ? 'warning' : 'success'} />
      </div>
      <p className="text-[13px] text-muted">
        For every product: <b>received − sold + returned − written off</b> must equal stock on hand, every piece in stock must have a scannable unit, and every sold unit must be on a GST invoice. Anything else is listed here.
      </p>
      <div className="flex items-center gap-2 text-sm">
        <Switch checked={onlyIssues} onChange={setOnlyIssues} label="Only products with issues" />
        <span>Only products with issues</span>
      </div>
      <DataTable
        rows={loading && !data ? undefined : rows}
        loading={loading && !data}
        rowKey={(r) => r.productId}
        empty={<EmptyState icon={<ShieldCheck className="size-6" />} title="Everything reconciles" body="Stock, ledger, units and invoices all match." />}
        columns={[
          {
            key: 't',
            header: 'Product',
            cell: (r) => (
              <div className="min-w-[180px]">
                <p className="font-medium">{r.title}</p>
                <p className="font-mono text-xs text-muted">{r.sku}</p>
              </div>
            ),
          },
          num('onHand', 'On hand'),
          num('ledger', 'Ledger'),
          num('units', 'Units', 'sm'),
          num('received', 'Received', 'lg'),
          num('sold', 'Sold', 'lg'),
          num('returned', 'Returned', 'xl'),
          num('writtenOff', 'Written off', 'xl'),
          num('invoicedQty', 'Invoiced', 'xl'),
          {
            key: 'i',
            header: 'Issues',
            cell: (r) =>
              r.issues.length ? (
                <ul className="min-w-[200px] space-y-0.5 text-[13px] text-danger">
                  {r.issues.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              ) : (
                <span className="text-[13px] text-success">OK</span>
              ),
          },
        ]}
      />
    </div>
  );
}

// ------------------------------------------------------------------ audit log
function Audit() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [verify, setVerify] = useState<AuditVerifyDTO | null>(null);
  const [checking, setChecking] = useState(false);
  const dq = useDebounced(q.trim(), 300);
  const { data, error, loading, refetch } = useApi(() => adminApi.admin.auditLog({ page, action: dq || undefined }), [page, dq]);
  const runVerify = async () => {
    setChecking(true);
    try {
      setVerify(await adminApi.admin.verifyAudit());
    } catch (e) {
      toast(errMsg(e), 'error');
    } finally {
      setChecking(false);
    }
  };
  if (error && !data) return <ErrorState message={error} onRetry={refetch} />;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={(v) => (setQ(v), setPage(1))} placeholder="Filter by action, e.g. stock_adjust, login, scan" className="w-full sm:w-80" />
        <Button variant="outline" onClick={runVerify} loading={checking}>
          <Fingerprint className="size-4" />
          Verify integrity
        </Button>
      </div>
      {verify && (
        <div className={cn('flex items-start gap-3 rounded-2xl p-4 text-sm', verify.ok ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger')} role="status">
          {verify.ok ? <ShieldCheck className="mt-0.5 size-5 shrink-0" /> : <ShieldAlert className="mt-0.5 size-5 shrink-0" />}
          <p>
            {verify.ok
              ? `Intact — all ${verify.checked} entries check out. Nobody has edited or deleted history.`
              : `Tampering detected: the chain breaks at entry #${verify.brokenAt}. Something before or at that point was changed outside the app.`}
          </p>
        </div>
      )}
      <DataTable
        rows={data?.items}
        loading={loading && !data}
        rowKey={(e) => String(e.seq)}
        dense
        columns={[
          { key: 's', header: '#', cell: (e) => <span className="font-mono text-xs text-subtle">{e.seq}</span> },
          { key: 'a', header: 'When', cell: (e) => <span className="whitespace-nowrap text-[13px]">{fmtDateTime(e.at)}</span> },
          { key: 'w', header: 'Who', cell: (e) => <span className="whitespace-nowrap text-[13px]">{e.actorName ? `${e.actorName} · ${roleLabel(e.actorRole ?? '')}` : '—'}</span> },
          { key: 'x', header: 'Action', cell: (e) => <span className="font-mono text-xs">{e.action}</span> },
          {
            key: 'd',
            header: 'Details',
            hide: 'md',
            cell: (e) => (
              <span className="line-clamp-2 max-w-[420px] break-all font-mono text-[11px] text-muted" title={JSON.stringify(e.data)}>
                {e.data ? JSON.stringify(e.data) : ''}
              </span>
            ),
          },
          { key: 'i', header: 'IP', hide: 'lg', cell: (e) => <span className="font-mono text-xs text-muted">{e.ip ?? ''}</span> },
        ]}
      />
      {data && <Pagination page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}
    </div>
  );
}

// ------------------------------------------------------------------ settings
function SettingsTab() {
  const toast = useToast();
  const { data, error, refetch } = useApi(() => adminApi.admin.securityOverview(), []);
  const [s, setS] = useState<SecuritySettingsDTO | null>(null);
  const [saving, setSaving] = useState(false);
  const cur = s ?? data?.settings ?? null;
  if (error && !data) return <ErrorState message={error} onRetry={refetch} />;
  if (!cur) return <Skeleton className="h-64" />;
  const save = async () => {
    setSaving(true);
    try {
      setS(await adminApi.admin.updateSecuritySettings(cur));
      toast('Security settings saved');
    } catch (e) {
      toast(errMsg(e), 'error');
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="max-w-2xl space-y-5">
      <Panel title="When someone makes a risky change">
        <Segmented
          value={cur.approvalMode}
          onChange={(v) => setS({ ...cur, approvalMode: v })}
          options={[
            { value: 'DISCREET', label: <span className="inline-flex items-center gap-1.5"><EyeOff className="size-4" /> Discreet</span> },
            { value: 'VISIBLE', label: <span className="inline-flex items-center gap-1.5"><Eye className="size-4" /> Visible</span> },
          ]}
        />
        <p className="mt-3 text-sm text-muted">
          {cur.approvalMode === 'DISCREET'
            ? 'They see a normal “saved” message and, in their own screens, the change looks applied. In reality nothing changes until you approve it here — rejected requests simply never happen. Use this to see what people try when they think no one is checking.'
            : 'They’re told the change was sent to you for approval. Honest and simple — the usual choice for a trusted team.'}
        </p>
        <p className="mt-2 text-xs text-subtle">Either way the request, who made it and when are kept permanently in the audit log. Physical stock never lies: counts and reconciliation work the same in both modes.</p>
      </Panel>
      <Panel title="Packing">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Require scanning every unit before packing</p>
            <p className="mt-1 text-[13px] text-muted">Recommended. Ties every piece that leaves to an order — the core of theft protection.</p>
          </div>
          <Switch checked={cur.requireScanToPack} onChange={(v) => setS({ ...cur, requireScanToPack: v })} label="Require scan to pack" />
        </div>
      </Panel>
      <Panel title="Business hours (IST)">
        <p className="mb-3 text-[13px] text-muted">Changes by anyone but you outside these hours raise an alert.</p>
        <div className="flex items-end gap-3">
          <Field label="From">
            <Input type="number" min={0} max={23} value={cur.workStartHour} onChange={(e) => setS({ ...cur, workStartHour: Number(e.target.value) })} className="w-24" />
          </Field>
          <Field label="To">
            <Input type="number" min={1} max={24} value={cur.workEndHour} onChange={(e) => setS({ ...cur, workEndHour: Number(e.target.value) })} className="w-24" />
          </Field>
        </div>
      </Panel>
      <Button onClick={save} loading={saving}>
        Save settings
      </Button>
    </div>
  );
}
