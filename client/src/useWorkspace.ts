import { useEffect, useState } from 'react';
import { api } from './api';
import { errorMessage } from './format';
import type { RequestDetail, RequestRow, User } from './types';
const initialUser = () => { try { return localStorage.getItem('riverbend-demo-user') || 'employee'; } catch { return 'employee'; } };
export function useWorkspace() {
  const [users, setUsers] = useState<User[]>([]);
  const [userId, setUserId] = useState(initialUser);
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [detail, setDetail] = useState<RequestDetail | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(() => new URLSearchParams(location.search).get('request'));
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const user = users.find(u => u.id === userId);
  useEffect(() => {
    const controller = new AbortController();
    api.users(controller.signal).then(value => {
      if (controller.signal.aborted) return;
      setUsers(value);
      setUserId(current => value.some(u => u.id === current) ? current : value[0]?.id || '');
    }).catch(e => { if (!controller.signal.aborted) { setError(errorMessage(e)); setLoading(false); } });
    return () => controller.abort();
  }, [refresh]);
  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    setRows([]); setLoading(true); setError('');
    api.list(userId, controller.signal).then(value => { if (!controller.signal.aborted) setRows(value); }).catch(e => {
      if (!controller.signal.aborted) setError(errorMessage(e));
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [userId, Boolean(user), refresh]);
  useEffect(() => {
    if (!selectedId || !user) { setDetail(null); setDetailError(''); setDetailLoading(false); return; }
    const controller = new AbortController();
    setDetail(null); setDetailError(''); setDetailLoading(true);
    api.detail(userId, selectedId, controller.signal).then(value => { if (!controller.signal.aborted) setDetail(value); }).catch(e => {
      if (!controller.signal.aborted) setDetailError(errorMessage(e));
    }).finally(() => { if (!controller.signal.aborted) setDetailLoading(false); });
    return () => controller.abort();
  }, [selectedId, userId, Boolean(user), refresh]);
  function select(id: string | null) {
    setSelectedId(id);
    const url = new URL(location.href);
    if (id) url.searchParams.set('request', id); else url.searchParams.delete('request');
    history.replaceState(null, '', url);
  }
  function switchUser(id: string) {
    select(null); setDetail(null); setRows([]); setError(''); setUserId(id);
    try { localStorage.setItem('riverbend-demo-user', id); } catch { /* Selection persistence is optional. */ }
  }
  return { users, user, userId, rows, detail, selectedId, loading, detailLoading, error, detailError,
    select, switchUser, reload: () => setRefresh(n => n + 1) };
}
