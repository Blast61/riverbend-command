// @vitest-environment jsdom
import { StrictMode } from 'react';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { App } from '../App';
import { api } from '../api';
import { detail, employee, finance, manager } from './fixtures';
import type { RequestDetail, RequestRow } from '../types';
vi.mock('../api', () => ({ api: { users: vi.fn(), list: vi.fn(), detail: vi.fn(), create: vi.fn(), edit: vi.fn(), resubmit: vi.fn(), decide: vi.fn() } }));
beforeEach(() => {
  localStorage.clear(); history.replaceState(null, '', '/');
  vi.mocked(api.users).mockResolvedValue([employee, manager, finance]);
  vi.mocked(api.list).mockImplementation(async user => user === 'manager' ? [] : [detail()]);
  vi.mocked(api.detail).mockResolvedValue(detail());
});
afterEach(() => { cleanup(); vi.resetAllMocks(); });
async function switchTo(name: string) {
  await userEvent.click(await screen.findByRole('combobox', { name: 'Active user' }));
  await userEvent.click(await screen.findByRole('option', { name }));
}
it('loads actual API-derived metrics and changes queues/actions on user switch', async () => {
  render(<App />);
  expect(await screen.findByRole('button', { name: 'View Synthetic Pumps request' })).toBeTruthy();
  expect(within(screen.getByLabelText('Request summary')).getByText('$14,000.00')).toBeTruthy();
  await switchTo('Taylor Brooks · Finance viewer');
  await waitFor(() => expect(api.list).toHaveBeenCalledWith('finance', expect.any(AbortSignal)));
  expect(screen.queryByRole('button', { name: /New request/ })).toBeNull();
  expect(screen.getByRole('heading', { name: 'Company requests' })).toBeTruthy();
  await userEvent.click(await screen.findByRole('button', { name: 'View Synthetic Pumps request' }));
  await screen.findByRole('dialog', { name: 'Synthetic Pumps' });
  expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Edit request' })).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Close request details' }));
  await switchTo('Sam Rivera · Manager');
  expect(await screen.findByText('Your queue is clear')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'View Synthetic Pumps request' })).toBeNull();
});
it('restores demo user/deep link and refetches persisted records after remount', async () => {
  localStorage.setItem('riverbend-demo-user', 'finance'); history.replaceState(null, '', '/?request=request-1');
  const view = render(<App />);
  await screen.findByRole('dialog', { name: 'Synthetic Pumps' });
  expect(api.detail).toHaveBeenCalledWith('finance', 'request-1', expect.any(AbortSignal));
  view.unmount(); render(<App />);
  await screen.findByRole('dialog', { name: 'Synthetic Pumps' });
  expect(vi.mocked(api.list).mock.calls.filter(([id]) => id === 'finance')).toHaveLength(2);
});
it('discards late responses from a previous identity', async () => {
  let resolveOld!: (value: RequestRow[]) => void;
  vi.mocked(api.list).mockImplementation(user => user === 'employee' ? new Promise(resolve => { resolveOld = resolve; }) : Promise.resolve([]));
  render(<App />);
  await screen.findByRole('button', { name: /New request/ });
  await switchTo('Sam Rivera · Manager');
  await screen.findByText('Your queue is clear');
  resolveOld([detail()]);
  await waitFor(() => expect(screen.queryByRole('button', { name: 'View Synthetic Pumps request' })).toBeNull());
});
it('edits a returned request and resubmits using the persisted version', async () => {
  const returned = detail({ status: 'CHANGES_REQUESTED', activeStage: null, activeStageId: null, permissions: { canEdit: true, canResubmit: true, canDecide: false } });
  let current: RequestDetail = returned;
  vi.mocked(api.detail).mockImplementation(async () => current);
  vi.mocked(api.edit).mockImplementation(async (_id, _request, fields) => { current = { ...returned, ...fields }; return current; });
  vi.mocked(api.resubmit).mockResolvedValue(detail({ version: 2 }));
  render(<App />);
  await userEvent.click(await screen.findByRole('button', { name: 'View Synthetic Pumps request' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Edit request' }));
  const input = screen.getByRole('textbox', { name: 'Amount (USD)' });
  await userEvent.clear(input); await userEvent.type(input, '800.00');
  await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(api.edit).toHaveBeenCalledWith('employee', returned, { vendor: 'Synthetic Pumps', amountCents: 80000, reason: 'Demo equipment' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Resubmit for approval' }));
  await waitFor(() => expect(api.resubmit).toHaveBeenCalledWith('employee', expect.objectContaining({ amountCents: 80000, version: 1 })));
});

it('submits a new request and moves focus/context from form into its detail panel', async () => {
  vi.mocked(api.create).mockResolvedValue(detail());
  render(<App />);
  await userEvent.click(await screen.findByRole('button', { name: /New request/ }));
  await userEvent.type(screen.getByRole('textbox', { name: 'Vendor' }), 'Synthetic Pumps');
  await userEvent.type(screen.getByRole('textbox', { name: 'Amount (USD)' }), '14000.00');
  await userEvent.type(screen.getByRole('textbox', { name: 'Business reason' }), 'Demo equipment');
  await userEvent.click(screen.getByRole('button', { name: 'Submit request' }));
  expect(await screen.findByRole('dialog', { name: 'Synthetic Pumps' })).toBeTruthy();
  expect(screen.queryByRole('dialog', { name: 'New purchase exception' })).toBeNull();
  expect(api.create).toHaveBeenCalledWith('employee', { vendor: 'Synthetic Pumps', amountCents: 1400000, reason: 'Demo equipment' });
});
it('exposes API failure with a working retry rather than fake queue data', async () => {
  vi.mocked(api.list).mockRejectedValueOnce(new Error('API unavailable')).mockResolvedValue([detail()]);
  render(<App />);
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('API unavailable'));
  expect(screen.queryByRole('button', { name: 'View Synthetic Pumps request' })).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByRole('button', { name: 'View Synthetic Pumps request' })).toBeTruthy();
});
it('filters persisted records without changing the workspace summary scope', async () => {
  localStorage.setItem('riverbend-demo-user', 'finance');
  vi.mocked(api.list).mockResolvedValue([detail({ delayed: true }), detail({ id: 'approved-2', vendor: 'Approved Parts', status: 'APPROVED', activeStage: null, activeStageId: null, amountCents: 80000 })]);
  render(<App />);
  await screen.findByRole('button', { name: 'View Approved Parts request' });
  await userEvent.type(screen.getByRole('textbox', { name: 'Search vendor or request ID' }), 'Pumps');
  expect(screen.queryByRole('button', { name: 'View Approved Parts request' })).toBeNull();
  expect(within(screen.getByLabelText('Request summary')).getByText('$14,000.00')).toBeTruthy();
  await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  await userEvent.type(screen.getByRole('textbox', { name: 'Search vendor or request ID' }), 'RB-QUEST-1');
  expect(screen.getByRole('button', { name: 'View Synthetic Pumps request' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'View Approved Parts request' })).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  await userEvent.click(screen.getByRole('combobox', { name: 'Status' }));
  await userEvent.click(await screen.findByRole('option', { name: 'Approved' }));
  expect(screen.queryByRole('button', { name: 'View Synthetic Pumps request' })).toBeNull();
  expect(screen.getByRole('button', { name: 'View Approved Parts request' })).toBeTruthy();
  await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  await userEvent.click(screen.getByRole('switch', { name: 'Aging only' }));
  expect(screen.queryByRole('button', { name: 'View Approved Parts request' })).toBeNull();
  expect(screen.getByRole('button', { name: 'View Synthetic Pumps request' })).toBeTruthy();
});
it('hands focus into a dialog and restores its trigger on Escape', async () => {
  render(<StrictMode><App /></StrictMode>);
  const trigger = await screen.findByRole('button', { name: /New request/ });
  await userEvent.click(trigger);
  const dialog = await screen.findByRole('dialog', { name: 'New purchase exception' });
  await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'New purchase exception' })).toBeNull());
  await waitFor(() => expect(document.activeElement).toBe(trigger));
});
it('restores the request trigger when its drawer closes', async () => {
  render(<App />);
  const trigger = await screen.findByRole('button', { name: 'View Synthetic Pumps request' });
  await userEvent.click(trigger);
  const dialog = await screen.findByRole('dialog', { name: 'Synthetic Pumps' });
  await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
  await userEvent.click(screen.getByRole('button', { name: 'Close request details' }));
  await waitFor(() => expect(document.activeElement).toBe(trigger));
});
it('keeps nested editor focus in the drawer after cancellation', async () => {
  vi.mocked(api.detail).mockResolvedValue(detail({ status: 'CHANGES_REQUESTED', permissions: { canEdit: true, canResubmit: true, canDecide: false } }));
  render(<App />);
  await userEvent.click(await screen.findByRole('button', { name: 'View Synthetic Pumps request' }));
  const trigger = await screen.findByRole('button', { name: 'Edit request' });
  await userEvent.click(trigger);
  await screen.findByRole('dialog', { name: 'Edit purchase exception' });
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edit purchase exception' })).toBeNull());
  await waitFor(() => expect(document.activeElement).toBe(trigger));
});
