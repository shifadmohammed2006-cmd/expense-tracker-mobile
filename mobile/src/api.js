// © 2026 Expense Tracker. All rights reserved. Unauthorised copying or redistribution is prohibited.
import * as SecureStore from 'expo-secure-store';
import { API_URL } from './config';
import { VERSION } from './branding';

const TOKEN_KEY = 'et-token';
let timeoutMs = 60000; // free hosting can take ~30-60s to wake up after being idle

// Background syncing uses a shorter wait so the app never feels stuck.
export function setApiTimeout(ms) {
  timeoutMs = ms;
}

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.status = status; // 0 = network problem / timeout
  }
}

let token = null;
let unauthorizedHandler = null;

// Lets AuthContext log the user out from anywhere when a session expires.
export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn;
}

export async function loadToken() {
  try {
    token = await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    token = null;
  }
  return token;
}

export async function saveToken(value) {
  token = value;
  await SecureStore.setItemAsync(TOKEN_KEY, value);
}

export async function clearToken() {
  token = null;
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // nothing to clear
  }
}

// A 401 from these just means "wrong credentials/password", not an expired session.
const AUTH_ATTEMPTS = ['/auth/login', '/auth/signup', '/auth/account'];

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', 'X-App-Version': VERSION };
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(`${API_URL}/api${path}`, { ...options, headers, signal: controller.signal });
  } catch (e) {
    throw new ApiError(
      e?.name === 'AbortError'
        ? 'The server took too long to respond. Please try again.'
        : 'Cannot reach the server. Check your internet connection.'
    );
  } finally {
    clearTimeout(timer);
  }

  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && !AUTH_ATTEMPTS.includes(path)) {
    await clearToken();
    unauthorizedHandler?.();
  }
  if (!res.ok) throw new ApiError(data.error || 'Something went wrong.', res.status);
  return data;
}

const json = (method, body) => ({ method, body: JSON.stringify(body) });

export const api = {
  signup: (email, password) => request('/auth/signup', json('POST', { email, password })),
  login: (email, password) => request('/auth/login', json('POST', { email, password })),
  getMe: () => request('/auth/me'),
  deleteAccount: (password) => request('/auth/account', json('DELETE', { password })),

  getCategories: () => request('/categories'),
  addCategory: (payload) => request('/categories', json('POST', payload)),
  updateCategory: (id, payload) => request(`/categories/${id}`, json('PUT', payload)),
  deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),

  getExpenses: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/expenses${query ? `?${query}` : ''}`);
  },
  addExpense: (payload) => request('/expenses', json('POST', payload)),
  updateExpense: (id, payload) => request(`/expenses/${id}`, json('PUT', payload)),
  deleteExpense: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),

  getBudget: () => request('/budget'),
  updateBudget: (payload) => request('/budget', json('PUT', payload)),

  getStats: (month, today) => request(`/stats?month=${month}&today=${today}`),
  resetAll: () => request('/data/reset', { method: 'POST' }),

  getTrips: () => request('/trips'),
  saveTrip: (id, trip) => request(`/trips/${encodeURIComponent(id)}`, json('PUT', trip)),
  joinTrip: (code) => request('/trips/join', json('POST', { code })),
  shareTrip: (id) => request(`/trips/${encodeURIComponent(id)}/share`, { method: 'POST' }),
  unshareTrip: (id) => request(`/trips/${encodeURIComponent(id)}/unshare`, { method: 'POST' }),
  deleteTrip: (id) => request(`/trips/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
