import { captureOverlayTrigger, restoreOverlayTrigger } from './overlayFocus';
import { useMemo, useState, useRef } from 'react';
import { Alert, Avatar, Box, Button, Chip, FormControl, FormControlLabel, IconButton, InputLabel, LinearProgress, MenuItem, Paper, Select, Snackbar, Switch, TextField, Typography } from '@mui/material';
import { api } from './api';
import { errorMessage, money, words, shortId } from './format';
import type { Decision, PurchaseFields, RequestDetail, RequestStatus } from './types';
import { useWorkspace } from './useWorkspace';
import { PurchaseForm } from './components/PurchaseForm';
import { DecisionForm } from './components/DecisionForm';
import { RequestPanel } from './components/RequestPanel';
import { RequestQueue } from './components/RequestQueue';
type View = 'own' | 'assigned' | 'all';
const statuses: RequestStatus[] = ['DRAFT', 'PENDING_APPROVAL', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED'];
export function App() {
  const panelTrigger = useRef<HTMLElement | null>(null);
  const formTrigger = useRef<HTMLElement | null>(null);
  const decisionTrigger = useRef<HTMLElement | null>(null);
  const workspace = useWorkspace();
  const { user, users, rows, detail, loading } = workspace;
  const [viewOverride, setView] = useState<View | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [approverId, setApproverId] = useState('');
  const [aging, setAging] = useState(false);
  const [form, setForm] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<RequestDetail | undefined>();
  const [decision, setDecision] = useState<Decision | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const view: View = viewOverride || (user?.permissions.canViewAll ? 'all' : user?.permissions.canReview ? 'assigned' : 'own');
  const baseRows = useMemo(() => rows.filter(row => view === 'all' || (view === 'own' ? row.requesterId === user?.id : row.activeStage?.assigneeId === user?.id)), [rows, view, user?.id]);
  const filteredRows = baseRows.filter(row => (!status || row.status === status) && (!approverId || row.activeStage?.assigneeId === approverId) && (!aging || row.delayed) &&
    (!search.trim() || `${row.vendor} ${row.id} ${shortId(row.id)}`.toLowerCase().includes(search.trim().toLowerCase())));
  const pending = baseRows.filter(row => row.status === 'PENDING_APPROVAL');
  const metrics = [
    { label: 'Awaiting approval', value: String(pending.length), note: 'In the review chain', symbol: '↗', kind: 'green' },
    { label: 'Changes requested', value: String(baseRows.filter(row => row.status === 'CHANGES_REQUESTED').length), note: 'With the requester', symbol: '↩', kind: 'amber' },
    { label: 'Aging approvals', value: String(baseRows.filter(row => row.delayed).length), note: 'Pending over 72 hours', symbol: '◷', kind: 'rose' },
    { label: 'Pending purchase value', value: money(pending.reduce((total, row) => total + row.amountCents, 0)), note: 'Awaiting a final decision', symbol: '$', kind: 'green' },
  ];
  function clearFilters() { setSearch(''); setStatus(''); setApproverId(''); setAging(false); }
  function changeView(next: View) { setView(next); clearFilters(); setMobileNav(false); }
  function switchUser(id: string) { workspace.switchUser(id); setView(null); clearFilters(); setActionError(''); setNotice(''); setForm(null); setDecision(null); }
  function newRequest() { formTrigger.current = captureOverlayTrigger(); setEditing(undefined); setForm('create'); }
  async function save(fields: PurchaseFields) {
    if (!user) return;
    setBusy(true);
    try {
      const result = form === 'edit' && editing ? await api.edit(user.id, editing, fields) : await api.create(user.id, fields);
      if (form === 'create') panelTrigger.current = formTrigger.current;
      setForm(null); setEditing(undefined); setView('own'); clearFilters(); workspace.select(result.id); workspace.reload();
      setNotice(form === 'edit' ? 'Changes saved. Resubmit when ready for a new review.' : 'Purchase exception submitted.');
    } finally { setBusy(false); }
  }
  async function decide(comment: string) {
    if (!user || !detail || !decision) return;
    setBusy(true);
    try {
      await api.decide(user.id, detail, decision, comment);
      setDecision(null); workspace.select(null); workspace.reload(); setNotice('Decision recorded. Your queue has been updated.');
    } finally { setBusy(false); }
  }
  async function resubmit() {
    if (!user || !detail) return;
    setBusy(true); setActionError('');
    try { await api.resubmit(user.id, detail); workspace.reload(); setNotice('New revision submitted for approval.'); }
    catch (e) { setActionError(errorMessage(e)); }
    finally { setBusy(false); }
  }
  const viewName = view === 'all' ? 'Company requests' : view === 'assigned' ? 'Assigned approvals' : 'My requests';
  const locked = busy || Boolean(form) || Boolean(decision);
  const hasFilters = Boolean(search || status || approverId || aging);
  return <Box className="app-shell">
    <a className="skip-link" href="#workspace">Skip to workspace</a>
    <aside className={`sidebar ${mobileNav ? 'is-open' : ''}`} id="workspace-navigation" aria-label="Workspace navigation">
      <div className="brand"><span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M5 23 15 6h5L10 23Zm10 0 6-10 6 10Z" fill="currentColor" /></svg></span><div>RIVERBEND<span>COMMAND</span></div></div>
      <div className="workspace-label">OPERATIONS WORKSPACE</div>
      <nav aria-label="Request views">
        {user?.permissions.canCreate && <Button className={`nav-button ${view === 'own' ? 'active' : ''}`} onClick={() => changeView('own')} aria-current={view === 'own' ? 'page' : undefined}><span aria-hidden="true">▤</span> My requests <span className="nav-count">{rows.filter(r => r.requesterId === user.id).length}</span></Button>}
        {user?.permissions.canReview && <Button className={`nav-button ${view === 'assigned' ? 'active' : ''}`} onClick={() => changeView('assigned')} aria-current={view === 'assigned' ? 'page' : undefined}><span aria-hidden="true">✓</span> Assigned approvals <span className="nav-count">{rows.filter(r => r.activeStage?.assigneeId === user.id).length}</span></Button>}
        {user?.permissions.canViewAll && <Button className="nav-button active" onClick={() => changeView('all')} aria-current="page"><span aria-hidden="true">▤</span> Company requests <span className="nav-count">{rows.length}</span></Button>}
      </nav>
      <div className="sidebar-note"><span className="sidebar-dot" /> Every decision, accounted for.<p>One workspace for exceptions,<br />approvals, and a clear audit trail.</p></div>
      <div className="sidebar-footer"><span className="version-label">RIVERBEND SUPPLY CO.</span><span>Synthetic demo environment</span></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumb"><IconButton className="nav-toggle" aria-label="Toggle navigation" aria-controls="workspace-navigation" aria-expanded={mobileNav} onClick={() => setMobileNav(!mobileNav)}>☰</IconButton><span>Operations</span><span aria-hidden="true">/</span><strong>Purchase exceptions</strong></div>
        <div className="identity"><Chip label="DEMO MODE" size="small" className="demo-chip" /><Avatar className="user-avatar">{user?.name.split(' ').map(n => n[0]).join('') || '…'}</Avatar><FormControl size="small" className="user-select"><InputLabel id="demo-user-label">Active user</InputLabel><Select labelId="demo-user-label" label="Active user" value={user?.id || ''} onChange={e => switchUser(e.target.value)} disabled={locked || !users.length}>{users.map(person => <MenuItem key={person.id} value={person.id}>{person.name} · {words(person.role)}</MenuItem>)}</Select></FormControl></div>
      </header>
      <main id="workspace" className="workspace" tabIndex={-1}>
        <div className="page-heading"><div><div className="eyebrow">PURCHASE EXCEPTIONS</div><Typography variant="h4" component="h1">Clarity at every approval.</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>Track the request. See the owner. Keep the history.</Typography></div>{user?.permissions.canCreate && <Button variant="contained" onClick={newRequest} disabled={locked} startIcon={<span aria-hidden="true">＋</span>}>New request</Button>}</div>
        <div className="demo-notice"><span aria-hidden="true">ⓘ</span> Demo identity only · You are viewing as <strong>{user?.name || '…'}</strong>{user && <> · {words(user.role)}</>}. No real purchases or production sign-in.</div>
        <div className="scope-caption">{viewName} <span>Summary before search and filters</span></div>
        <div className="metrics" aria-label="Request summary">{metrics.map(metric => <Paper className="metric" key={metric.label} variant="outlined"><div className="metric-top"><Typography variant="body2" color="text.secondary">{metric.label}</Typography><span className={`metric-symbol ${metric.kind}`} aria-hidden="true">{metric.symbol}</span></div><Typography className="metric-value" component="p">{loading || workspace.error ? '—' : metric.value}</Typography><Typography variant="caption" color="text.secondary">{metric.note}</Typography></Paper>)}</div>
        {workspace.error && <Alert severity="error" action={<Button onClick={workspace.reload}>Retry</Button>} sx={{ mb: 2 }}>{workspace.error}</Alert>}
        <Paper className="queue-panel" variant="outlined">
          <div className="queue-heading"><div><Typography variant="h6" component="h2">{viewName}</Typography><Typography variant="caption" color="text.secondary">{loading ? 'Loading persisted requests…' : `${filteredRows.length} ${filteredRows.length === 1 ? 'request' : 'requests'} · ${user?.permissions.canViewAll ? 'Company-wide visibility' : 'Your permitted records only'}`}</Typography></div><Button size="small" onClick={workspace.reload} disabled={locked || loading} startIcon={<span aria-hidden="true">↻</span>}>Refresh</Button></div>
          <div className="filters"><TextField label="Search vendor or request ID" size="small" value={search} onChange={e => setSearch(e.target.value)} className="search-field" />
            <FormControl size="small"><InputLabel id="status-label">Status</InputLabel><Select labelId="status-label" label="Status" value={status} onChange={e => setStatus(e.target.value)}><MenuItem value="">All statuses</MenuItem>{statuses.map(value => <MenuItem key={value} value={value}>{words(value)}</MenuItem>)}</Select></FormControl>
            <FormControl size="small"><InputLabel id="approver-label">Current approver</InputLabel><Select labelId="approver-label" label="Current approver" value={approverId} onChange={e => setApproverId(e.target.value)}><MenuItem value="">All approvers</MenuItem>{users.filter(person => person.permissions.canReview).map(person => <MenuItem key={person.id} value={person.id}>{person.name}</MenuItem>)}</Select></FormControl>
            <FormControlLabel control={<Switch size="small" checked={aging} onChange={e => setAging(e.target.checked)} />} label={<Typography variant="body2">Aging only</Typography>} />
            {hasFilters && <Button size="small" onClick={clearFilters}>Clear filters</Button>}
          </div>
          {loading ? <div className="queue-loading"><LinearProgress aria-label="Loading request queue" /><Typography variant="body2" color="text.secondary">Loading your workspace…</Typography></div> : !workspace.error && <RequestQueue rows={filteredRows} filtered={hasFilters} onSelect={id => { panelTrigger.current = captureOverlayTrigger(); setActionError(''); workspace.select(id); }} onCreate={user?.permissions.canCreate ? newRequest : undefined} />}
          <div className="queue-footer"><span className="legend-dot" /> Connected to persisted API data <span>USD · elapsed hours include weekends</span></div>
        </Paper>
        <Typography variant="caption" className="workspace-footnote">Built for a clear handoff between requesters, approvers, and finance. All records are synthetic.</Typography>
      </main>
    </div>
    <RequestPanel open={Boolean(workspace.selectedId)} request={detail} loading={workspace.detailLoading} error={workspace.detailError} busy={busy} onClose={() => { workspace.select(null); setActionError(''); }} onAfterClose={() => restoreOverlayTrigger(panelTrigger.current)} onReload={workspace.reload} onEdit={() => { if (detail) { formTrigger.current = captureOverlayTrigger(); setEditing(detail); setForm('edit'); } }} onResubmit={resubmit} onDecide={value => { decisionTrigger.current = captureOverlayTrigger(); setDecision(value); }} />
    {actionError && <Snackbar open anchorOrigin={{ vertical: 'top', horizontal: 'center' }}><Alert severity="error" onClose={() => setActionError('')}>{actionError} Reload the request before retrying.</Alert></Snackbar>}
    {form && <PurchaseForm key={`${form}-${editing?.id || 'new'}`} request={editing} returnFocus={formTrigger.current} busy={busy} onClose={() => setForm(null)} onSubmit={save} />}
    {decision && <DecisionForm key={decision} decision={decision} returnFocus={decisionTrigger.current} busy={busy} onClose={() => setDecision(null)} onSubmit={decide} />}
    <Snackbar open={Boolean(notice)} autoHideDuration={6500} onClose={() => setNotice('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}><Alert severity="success" onClose={() => setNotice('')}>{notice}</Alert></Snackbar>
  </Box>;
}
