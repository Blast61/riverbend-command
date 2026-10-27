import { Box, Button, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { age, money, shortId } from '../format';
import type { RequestRow } from '../types';
import { Status } from './Status';
export function RequestQueue({ rows, filtered, onSelect, onCreate }: { rows: RequestRow[]; filtered: boolean; onSelect: (id: string) => void; onCreate?: () => void }) {
  if (!rows.length) return <Box className="empty-state">
    <div className="empty-mark" aria-hidden="true">≡</div>
    <Typography variant="h6">{filtered ? 'No matching requests' : 'Your queue is clear'}</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>{filtered ? 'Try a different search or clear your filters.' : 'New purchase exceptions and assigned reviews will appear here.'}</Typography>
    {!filtered && onCreate && <Button variant="outlined" onClick={onCreate}>Create a purchase exception</Button>}
  </Box>;
  return <TableContainer className="queue-scroll"><Table aria-label="Purchase exception requests" sx={{ minWidth: 850 }}>
    <TableHead><TableRow><TableCell>Request / vendor</TableCell><TableCell align="right">Amount</TableCell><TableCell>Status</TableCell><TableCell>Current owner</TableCell><TableCell>Time pending</TableCell><TableCell align="right">Details</TableCell></TableRow></TableHead>
    <TableBody>{rows.map(row => <TableRow key={row.id} hover>
      <TableCell><Typography variant="caption" className="request-ref" title={row.id}>{shortId(row.id)}</Typography><Typography variant="body2" sx={{ fontWeight: 600, maxWidth: 245, overflowWrap: 'anywhere', mt: .35 }}>{row.vendor}</Typography></TableCell>
      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 650, whiteSpace: 'nowrap' }}>{money(row.amountCents)}</TableCell>
      <TableCell><Status value={row.status} /></TableCell>
      <TableCell><Typography variant="body2">{row.activeStage?.assignee.name || '—'}</Typography>{row.blockedAssignment && <Typography variant="caption" color="error">Assignment blocked</Typography>}</TableCell>
      <TableCell>{row.activeStage?.activatedAt ? <><Typography variant="body2">{age(row.activeStage.activatedAt)}</Typography>{row.delayed && <Chip size="small" label="Over 72h" className="status returned" />}</> : <Typography variant="caption" color="text.secondary">No active review</Typography>}</TableCell>
      <TableCell align="right"><Button size="small" onClick={() => onSelect(row.id)} aria-label={`View ${row.vendor} request`}>View <span aria-hidden="true" style={{ marginLeft: 8 }}>↗</span></Button></TableCell>
    </TableRow>)}</TableBody>
  </Table></TableContainer>;
}
