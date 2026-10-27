import { Chip } from '@mui/material';
import { words } from '../format';
const colors: Record<string, string> = {
  APPROVED: 'approved', PENDING_APPROVAL: 'pending', PENDING: 'pending', CHANGES_REQUESTED: 'returned', REJECTED: 'rejected',
  WAITING: 'waiting', SUPERSEDED: 'waiting', DRAFT: 'waiting',
};
export function Status({ value }: { value: string }) {
  return <Chip size="small" label={words(value)} className={`status ${colors[value] || 'waiting'}`} />;
}
