// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { RequestPanel } from '../components/RequestPanel';
import { detail, stage } from './fixtures';
const actions = { onClose: vi.fn(), onReload: vi.fn(), onEdit: vi.fn(), onResubmit: vi.fn(), onDecide: vi.fn() };
afterEach(cleanup);
it('renders persisted current and historical stage decisions without finance action controls', async () => {
  const request = detail({ version: 2, status: 'REJECTED', activeStage: null, activeStageId: null,
    stages: [stage({ decision: 'APPROVED', status: 'APPROVED' }), stage({ id: 'new', requestVersion: 2, decision: 'REJECTED', status: 'SUPERSEDED', decisionComment: 'Not justified' })],
    revisions: [...detail().revisions, { ...detail().revisions[0], version: 2, amountCents: 80000 }],
  });
  render(<RequestPanel open request={request} loading={false} error="" busy={false} {...actions} />);
  expect(within(screen.getByRole('list', { name: 'Current approval stages' })).getByText('Rejected')).toBeTruthy();
  expect(screen.getByText('“Not justified”')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Edit request' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Resubmit for approval' })).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: /Revision 1.*historical/ }));
  expect(within(await screen.findByRole('list', { name: 'Historical approval stages' })).getByText('Approved')).toBeTruthy();
});
it('uses server capabilities to expose editable returned-request actions', () => {
  const request = detail({ status: 'CHANGES_REQUESTED', activeStageId: null, activeStage: null, permissions: { canEdit: true, canResubmit: true, canDecide: false } });
  render(<RequestPanel open request={request} loading={false} error="" busy={false} {...actions} />);
  expect(screen.getByRole('button', { name: 'Edit request' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Resubmit for approval' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
});
