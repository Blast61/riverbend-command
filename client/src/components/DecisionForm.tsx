import { useOverlayReturnFocus } from '../overlayFocus';
import { useRef, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';
import type { Decision } from '../types';
import { errorMessage } from '../format';
const labels: Record<Decision, string> = { APPROVED: 'Approve request', REJECTED: 'Reject request', CHANGES_REQUESTED: 'Request changes' };
export function DecisionForm({ decision, busy, onClose, onSubmit, returnFocus }: { returnFocus?: HTMLElement | null; decision: Decision; busy: boolean; onClose: () => void; onSubmit: (comment: string) => Promise<void> }) {
  const formRef = useRef<HTMLFormElement>(null);
  useOverlayReturnFocus(formRef, returnFocus);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const required = decision !== 'APPROVED';
  async function save(event: React.FormEvent) {
    event.preventDefault(); setError('');
    if (required && !comment.trim()) { setError('An explanation is required.'); return; }
    try { await onSubmit(comment.trim()); } catch (e) { setError(errorMessage(e)); }
  }
  return <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby="decision-form-title"><form ref={formRef} data-rb-overlay-active="true" onSubmit={save}>
    <DialogTitle id="decision-form-title">{labels[decision]}</DialogTitle>
    <DialogContent>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{decision === 'APPROVED' ? 'Your decision applies to this submitted revision and will be recorded in the audit history.' : 'Explain your decision so the requester has a clear next step. This comment will remain in the audit history.'}</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <TextField autoFocus label={required ? 'Explanation' : 'Comment (optional)'} required={required} fullWidth multiline minRows={4} value={comment} onChange={e => setComment(e.target.value)} disabled={busy} slotProps={{ htmlInput: { maxLength: 4000 } }} />
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 3 }}><Button disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" variant="contained" color={decision === 'REJECTED' ? 'error' : 'primary'} disabled={busy || (required && !comment.trim())}>{busy ? 'Recording…' : labels[decision]}</Button></DialogActions>
  </form></Dialog>;
}
