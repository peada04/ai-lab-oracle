import { LabSpec, FeedItem, AnalysisResult, ImplementationPlan, OracleExperiment } from './types';

export interface LocalUser {
  id: number;
  username: string;
  displayName: string;
  geminiApiKey: string;
}

function getToken(): string | null {
  return localStorage.getItem('oracle_token');
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export async function apiLogin(username: string, password: string): Promise<LocalUser> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Login failed');
  const data = await res.json();
  localStorage.setItem('oracle_token', data.token);
  return data.user;
}

export async function apiRegister(username: string, password: string, displayName?: string): Promise<LocalUser> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, displayName }),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Registration failed');
  const data = await res.json();
  localStorage.setItem('oracle_token', data.token);
  return data.user;
}

export async function apiMe(): Promise<LocalUser | null> {
  if (!getToken()) return null;
  const res = await fetch('/api/auth/me', { headers: authHeaders() });
  if (!res.ok) { localStorage.removeItem('oracle_token'); return null; }
  return res.json();
}

export function apiLogout(): void {
  localStorage.removeItem('oracle_token');
}

export async function apiGetSpecs(): Promise<LabSpec[]> {
  const res = await fetch('/api/specs', { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch specs');
  return res.json();
}

export async function apiAddSpec(label: string, value: string, icon = 'Cpu'): Promise<LabSpec> {
  const res = await fetch('/api/specs', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ label, value, icon }),
  });
  if (!res.ok) throw new Error('Failed to add spec');
  return res.json();
}

export async function apiRemoveSpec(id: string): Promise<void> {
  const res = await fetch(`/api/specs/${id}`, { method: 'DELETE', headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to remove spec');
}

export async function apiSeedSpecs(specs: LabSpec[]): Promise<void> {
  await fetch('/api/specs/seed', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ specs }),
  });
}

export async function apiGetResearch(): Promise<FeedItem[]> {
  const res = await fetch('/api/research', { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch research');
  return res.json();
}

export async function apiSaveResearch(item: FeedItem): Promise<void> {
  const res = await fetch('/api/research', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(item),
  });
  if (!res.ok) throw new Error('Failed to save research');
}

export async function apiRemoveResearch(link: string): Promise<void> {
  const res = await fetch('/api/research', {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ link }),
  });
  if (!res.ok) throw new Error('Failed to remove research');
}

export async function apiGetExperiments(): Promise<OracleExperiment[]> {
  const res = await fetch('/api/experiments', { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch experiments');
  return res.json();
}

export async function apiSaveExperiment(data: {
  title: string;
  sourceLink: string | null;
  ideaText: string;
  analysis: AnalysisResult;
}): Promise<number> {
  const res = await fetch('/api/experiments', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to save experiment');
  const body = await res.json();
  return body.id;
}

export async function apiUpdateExperimentPlan(id: number, plan: ImplementationPlan): Promise<void> {
  const res = await fetch(`/api/experiments/${id}/plan`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ plan }),
  });
  if (!res.ok) throw new Error('Failed to update experiment plan');
}

export async function apiSaveGeminiKey(key: string): Promise<void> {
  const res = await fetch('/api/user/settings', {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ geminiApiKey: key }),
  });
  if (!res.ok) throw new Error('Failed to save API key');
}
