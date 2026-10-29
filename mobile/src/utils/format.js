// © 2026 Expense Tracker. All rights reserved. Unauthorised copying or redistribution is prohibited.
// Indian digit grouping: 1234567 -> 12,34,567
function groupIndian(intStr) {
  const last3 = intStr.slice(-3);
  const rest = intStr.slice(0, -3);
  return rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}` : last3;
}

export function formatCurrency(amount, currency = 'INR') {
  const n = Number(amount) || 0;
  if (currency === 'INR') {
    const rounded = Math.round(Math.abs(n) * 100) / 100;
    const [i, d] = rounded.toFixed(Number.isInteger(rounded) ? 0 : 2).split('.');
    return `${n < 0 && rounded !== 0 ? '-' : ''}₹${groupIndian(i)}${d ? `.${d}` : ''}`;
  }
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

// Local (phone) date as YYYY-MM-DD - avoids the UTC off-by-one that toISOString() causes at night.
export function toDateStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const currentMonth = () => toDateStr().slice(0, 7);

export function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  return toDateStr(new Date(y, m - 1 + delta, 1)).slice(0, 7);
}

export function addDays(dateStr, delta) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return toDateStr(d);
}

export function isValidDateStr(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00`);
  return !Number.isNaN(d.getTime()) && toDateStr(d) === s;
}

export function formatDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDayLabel(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

export function weekdayShort(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' });
}

export function monthLabel(monthStr) {
  const [y, m] = monthStr.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

// Whole days from a to b (b - a). Negative if b is earlier.
export function diffDays(a, b) {
  const ms = new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`);
  return Math.round(ms / 86400000);
}

// Inclusive number of days in a trip (same day = 1).
export const inclusiveDays = (start, end) => Math.max(diffDays(start, end) + 1, 1);

export function listDates(start, end) {
  const out = [];
  const n = inclusiveDays(start, end);
  for (let i = 0; i < Math.min(n, 120); i++) out.push(addDays(start, i));
  return out;
}

export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
