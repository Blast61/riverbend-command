import type { Decision, PurchaseFields, RequestDetail, RequestRow, User } from './types';
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
async function call<T>(path: string, userId?: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api${path}`, { method, signal, headers: {
    ...(userId ? { 'X-Demo-User-Id': userId } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
  }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  let data;
  try { data = await response.json(); }
  catch { throw new ApiError(response.status, 'The API returned an unreadable response. Check the server and try again.'); }
  if (!response.ok) {
    const issues = data.issues?.map((i: { path: string[]; message: string }) => `${i.path.join('.') || 'Input'}: ${i.message}`).join('. ');
    throw new ApiError(response.status, issues || data.error || 'Request failed');
  }
  return data as T;
}
const pathFor = (id: string) => `/requests/${encodeURIComponent(id)}`;
export const api = {
  users: (signal?: AbortSignal) => call<User[]>('/demo-users', undefined, 'GET', undefined, signal),
  list: (userId: string, signal?: AbortSignal) => call<RequestRow[]>('/requests', userId, 'GET', undefined, signal),
  detail: (userId: string, id: string, signal?: AbortSignal) => call<RequestDetail>(pathFor(id), userId, 'GET', undefined, signal),
  create: (userId: string, input: PurchaseFields) => call<RequestDetail>('/requests', userId, 'POST', input),
  edit: (userId: string, request: RequestDetail, input: PurchaseFields) => call<RequestDetail>(pathFor(request.id), userId, 'PATCH', { ...input, version: request.version }),
  resubmit: (userId: string, request: RequestDetail) => call<RequestDetail>(`${pathFor(request.id)}/submissions`, userId, 'POST', { version: request.version }),
  decide: (userId: string, request: RequestDetail, decision: Decision, comment: string) => call<RequestDetail>(`${pathFor(request.id)}/approvals`, userId, 'POST', { stageId: request.activeStageId, decision, comment }),
};
