// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { api, ApiError } from '../api';
import { detail } from './fixtures';
afterEach(() => vi.unstubAllGlobals());
it('sends the selected demo actor and persisted stage/version to the resource endpoints', async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => detail() });
  vi.stubGlobal('fetch', fetcher);
  await api.decide('manager', detail(), 'CHANGES_REQUESTED', 'Clarify');
  expect(fetcher).toHaveBeenCalledWith('/api/requests/request-1/approvals', expect.objectContaining({
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Demo-User-Id': 'manager' },
    body: JSON.stringify({ stageId: 'stage-1', decision: 'CHANGES_REQUESTED', comment: 'Clarify' }),
  }));
  await api.resubmit('employee', detail());
  expect(fetcher).toHaveBeenLastCalledWith('/api/requests/request-1/submissions', expect.objectContaining({ body: JSON.stringify({ version: 1 }) }));
});
it('preserves backend validation and conflict errors', async () => {
  const fetcher = vi.fn().mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: 'Invalid request', issues: [{ path: ['reason'], message: 'Required' }] }) })
    .mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ error: 'Stage is not active' }) });
  vi.stubGlobal('fetch', fetcher);
  await expect(api.create('employee', { vendor: 'Demo', amountCents: 100, reason: '' })).rejects.toThrow('reason: Required');
  await expect(api.decide('manager', detail(), 'APPROVED', '')).rejects.toEqual(new ApiError(409, 'Stage is not active'));
});
