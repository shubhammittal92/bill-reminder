export interface Subscription {
  id: number;
  name: string;
  amount: number;
  currency: string;
  cycle: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: string;
  reminderDays: number;
  active: boolean;
  nextRenewal: string;
  daysUntil: number;
}

export interface NewSubscription {
  name: string;
  amount: number;
  currency: string;
  cycle: string;
  startDate: string;
  reminderDays: number;
}

export interface Summary {
  activeCount: number;
  estimatedMonthlySpend: number;
}

export interface AuthUser {
  id: number;
  email: string;
}

// In production, VITE_API_URL points at the deployed backend (e.g.
// https://bill-reminder-api.onrender.com/api). In local dev it is unset, so we
// use the relative /api path which Vite proxies to the local backend.
const base = (import.meta.env.VITE_API_URL as string | undefined) || '/api';
const TOKEN_KEY = 'bill-reminder-token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle(res: Response): Promise<any> {
  if (res.status === 401) {
    clearToken();
    throw new Error('Your session expired — please log in again.');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `request failed (${res.status})`);
  }
  return res.status === 204 ? undefined : res.json();
}

// --- Auth ---

export async function signup(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const res = await fetch(`${base}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handle(res);
}

export async function login(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handle(res);
}

export async function me(): Promise<AuthUser> {
  const res = await fetch(`${base}/auth/me`, { headers: { ...authHeaders() } });
  return handle(res);
}

// --- Subscriptions ---

export async function listSubscriptions(): Promise<Subscription[]> {
  return handle(await fetch(`${base}/subscriptions`, { headers: { ...authHeaders() } }));
}

export async function createSubscription(sub: NewSubscription): Promise<Subscription> {
  return handle(
    await fetch(`${base}/subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(sub),
    })
  );
}

export async function deleteSubscription(id: number): Promise<void> {
  return handle(await fetch(`${base}/subscriptions/${id}`, { method: 'DELETE', headers: { ...authHeaders() } }));
}

export async function getSummary(): Promise<Summary> {
  return handle(await fetch(`${base}/summary`, { headers: { ...authHeaders() } }));
}

export async function sendDigest(): Promise<any> {
  return handle(await fetch(`${base}/digest/send`, { method: 'POST', headers: { ...authHeaders() } }));
}
