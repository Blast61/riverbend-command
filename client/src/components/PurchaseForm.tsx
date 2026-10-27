import { useOverlayReturnFocus } from '../overlayFocus';
import { useRef, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import type { PurchaseFields, RequestDetail } from '../types';
import { decimalToCents, errorMessage } from '../format';
export function PurchaseForm({ request, busy, onClose, onSubmit, returnFocus }: {
  returnFocus?: HTMLElement | null; request?: RequestDetail; busy: boolean; onClose: () => void; onSubmit: (fields: PurchaseFields) => Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  useOverlayReturnFocus(formRef, returnFocus);
  const [vendor, setVendor] = useState(request?.vendor || '');
  const [amount, setAmount] = useState(request ? (request.amountCents / 100).toFixed(2) : '');
  const [reason, setReason] = useState(request?.reason || '');
  const [error, setError] = useState('');
  const title = request ? 'Edit purchase exception' : 'New purchase exception';
  async function save(event: React.FormEvent) {
    event.preventDefault(); setError('');
    const amountCents = decimalToCents(amount);
    if (amountCents === null) { setError('Enter a positive dollar amount with at most two decimal places.'); return; }
    try { await onSubmit({ vendor: vendor.trim(), amountCents, reason: reason.trim() }); }
    catch (e) { setError(errorMessage(e)); }
  }
  return <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby="purchase-form-title">
    <form ref={formRef} data-rb-overlay-active="true" onSubmit={save}>
      <DialogTitle id="purchase-form-title">{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{request ? 'Save your changes, then resubmit from the request panel. Previous submitted versions remain in history.' : 'Give your approvers the context they need. The server will assign the approval route.'}</Typography>
        <Stack spacing={2.5}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField autoFocus label="Vendor" value={vendor} onChange={e => setVendor(e.target.value)} required fullWidth disabled={busy} slotProps={{ htmlInput: { maxLength: 200 } }} />
          <TextField label="Amount (USD)" value={amount} onChange={e => setAmount(e.target.value)} required fullWidth disabled={busy} placeholder="0.00" slotProps={{ htmlInput: { inputMode: 'decimal' } }} helperText="Dollars and cents, for example 14000.00" />
          <TextField label="Business reason" value={reason} onChange={e => setReason(e.target.value)} required multiline minRows={4} fullWidth disabled={busy} slotProps={{ htmlInput: { maxLength: 4000 } }} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}><Button onClick={onClose} disabled={busy}>Cancel</Button><Button type="submit" variant="contained" disabled={busy || !vendor.trim() || !reason.trim()}>{busy ? 'Saving…' : request ? 'Save changes' : 'Submit request'}</Button></DialogActions>
    </form>
  </Dialog>;
}
