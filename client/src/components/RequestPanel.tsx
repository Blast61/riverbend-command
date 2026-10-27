import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Divider, Drawer, IconButton, LinearProgress, Stack, Typography } from '@mui/material';
import { dateTime, money, shortId, words } from '../format';
import type { Decision, RequestDetail } from '../types';
import { Status } from './Status';
import { Timeline } from './Timeline';
function eventComment(details: string) {
  try { const data = JSON.parse(details); return typeof data.comment === 'string' ? data.comment : null; } catch { return null; }
}
export function RequestPanel({ open, request, loading, error, busy, onClose, onReload, onEdit, onResubmit, onDecide, onAfterClose }: {
  open: boolean; request: RequestDetail | null; loading: boolean; error: string; busy: boolean;
  onAfterClose?: () => void; onClose: () => void; onReload: () => void; onEdit: () => void; onResubmit: () => void; onDecide: (decision: Decision) => void;
}) {
  return <Drawer anchor="right" open={open} onClose={busy ? undefined : onClose} slotProps={{ transition: { onExited: onAfterClose }, paper: { className: 'detail-panel', role: 'dialog', 'aria-modal': true, 'aria-labelledby': 'request-panel-title' } }}>
    <div className="panel-top"><Typography variant="overline">Purchase exception</Typography><IconButton aria-label="Close request details" onClick={onClose} disabled={busy}>×</IconButton></div>
    {loading && <LinearProgress aria-label="Loading request details" />}
    <Box className="panel-body" data-rb-overlay-active={open ? 'true' : 'false'}>
      {error && <><Typography id="request-panel-title" variant="h5" component="h2" sx={{ mb: 2 }}>Request details unavailable</Typography><Alert severity="error">{error}</Alert><Button onClick={onReload}>Retry</Button></>}
      {!request && !error && <Typography id="request-panel-title">Loading request…</Typography>}
      {request && <>
        <Typography variant="caption" className="request-ref" title={request.id}>{shortId(request.id)} · Revision {request.version}</Typography>
        <Typography id="request-panel-title" variant="h5" component="h2" sx={{ mt: 1, mb: 1.5, overflowWrap: 'anywhere' }}>{request.vendor}</Typography>
        <Status value={request.status} />
        <Typography variant="h4" component="p" sx={{ mt: 3, mb: .5, fontVariantNumeric: 'tabular-nums' }}>{money(request.amountCents)}</Typography>
        <Typography variant="caption" color="text.secondary">Submitted {dateTime(request.submittedAt)}</Typography>
        {request.blockedAssignment && <Alert severity="error" sx={{ mt: 2 }}>Self-assignment conflict. Administrative resolution is required; approval is blocked.</Alert>}
        {request.delayed && <Alert severity="warning" sx={{ mt: 2 }}>This approval has been pending for more than 72 hours.</Alert>}
        <Box className="reason-box"><Typography variant="overline">Business reason</Typography><Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{request.reason}</Typography></Box>
        <Typography variant="h6" component="h3" sx={{ mb: 2 }}>Approval progress</Typography>
        <Timeline stages={request.stages.filter(stage => stage.requestVersion === request.version)} />
        {!request.activeStage && <Typography variant="caption" color="text.secondary">{request.permissions.canResubmit ? 'With requester · save changes, then resubmit for a new review.' : 'No active approval stage.'}</Typography>}
        {request.activeStage && <Typography variant="caption" color="text.secondary">Current owner: {request.activeStage.assignee.name}</Typography>}
        {(request.permissions.canEdit || request.permissions.canResubmit || request.permissions.canDecide) && <Box className="action-box">
          <Typography variant="overline">Available actions</Typography>
          <Stack direction="row" sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
            {request.permissions.canEdit && <Button variant="outlined" onClick={onEdit} disabled={busy}>Edit request</Button>}
            {request.permissions.canResubmit && <Button variant="contained" onClick={onResubmit} disabled={busy}>Resubmit for approval</Button>}
            {request.permissions.canDecide && <><Button variant="contained" onClick={() => onDecide('APPROVED')} disabled={busy}>Approve</Button><Button variant="outlined" onClick={() => onDecide('CHANGES_REQUESTED')} disabled={busy}>Request changes</Button><Button color="error" onClick={() => onDecide('REJECTED')} disabled={busy}>Reject</Button></>}
          </Stack>
        </Box>}
        <Divider sx={{ my: 3 }} />
        {request.revisions.map(revision => <Accordion key={revision.version} disableGutters className="revision-accordion">
          <AccordionSummary expandIcon={<span aria-hidden="true">⌄</span>}><Typography variant="body2" sx={{ fontWeight: 600 }}>Revision {revision.version} {revision.version === request.version ? '· latest submitted' : '· historical'} <span className="revision-amount">{money(revision.amountCents)}</span></Typography></AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{revision.vendor}</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>{revision.reason}</Typography>
            {revision.version !== request.version && <Timeline historical stages={request.stages.filter(stage => stage.requestVersion === revision.version)} />}
            <Typography variant="caption" color="text.secondary">Submitted {dateTime(revision.submittedAt)}</Typography>
          </AccordionDetails>
        </Accordion>)}
        <Typography variant="h6" component="h3" sx={{ mt: 3, mb: 2 }}>Audit history</Typography>
        <ol className="audit-list">{request.events.map(event => <li key={event.id}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{words(event.action)} <span className="audit-version">v{event.version}</span></Typography>
          <Typography variant="body2" color="text.secondary">{event.actor.name}</Typography>
          {eventComment(event.details) && <Typography variant="body2" className="audit-comment">{eventComment(event.details)}</Typography>}
          <Typography variant="caption" color="text.secondary">{dateTime(event.occurredAt)} · {words(event.nextState)}</Typography>
        </li>)}</ol>
        <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere', display: 'block', mt: 3 }}>Full request ID: {request.id}</Typography>
      </>}
    </Box>
  </Drawer>;
}
