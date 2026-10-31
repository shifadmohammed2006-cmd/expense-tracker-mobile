// © 2026 Expense Tracker. All rights reserved. Unauthorised copying or redistribution is prohibited.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { api, setApiTimeout } from '../api';
import { isLocalId, load, newId, newLocalId, save } from '../store/storage';
import { DEFAULT_CATEGORIES } from '../utils/constants';
import { currentMonth, round2, toDateStr } from '../utils/format';
import { computeInsights, computeStats } from '../utils/stats';
import { useAuth } from './AuthContext';

/*
  OFFLINE-FIRST DATA LAYER
  - Everything the screens show lives on the phone (AsyncStorage), so the app works with no internet.
  - Every change is applied locally right away and added to a "queue".
  - Whenever the internet is available the queue is sent to the server (Render + MongoDB), then the
    latest server copy is pulled back. A failed network call never loses data - it just waits.
*/

const AppContext = createContext(null);

const EMPTY = {
  categories: [],
  expenses: [],
  settings: { monthlyLimit: 0, currency: 'INR' },
  trips: [],
  queue: [],
  idMap: {}, // local id -> server id, for items created offline
  lastSynced: null,
  migrated: false,
};

const SYNC_EVERY_MS = 30000;
const BACKGROUND_TIMEOUT_MS = 30000;

// A 4xx answer (except these) means the server rejected that one change for good - retrying is pointless.
const RETRYABLE = new Set([401, 408, 429]);

const enqueue = (cur, op) => ({ ...cur, queue: [...cur.queue, { qid: newId('q'), ...op }] });
const sortTrips = (trips) => [...trips].sort((a, b) => String(b.startDate || '').localeCompare(String(a.startDate || '')));

export function AppProvider({ children }) {
  const { user } = useAuth();
  const uid = user?.id || 'anon';
  const KEY = `et:${uid}:data`;

  const [data, setData] = useState(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [month, setMonth] = useState(currentMonth());
  const [syncing, setSyncing] = useState(false);
  const [online, setOnline] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState(null);

  const dataRef = useRef(EMPTY);
  const syncingRef = useRef(false);
  const mountedRef = useRef(true);
  const toastTimer = useRef(null);
  const syncTimer = useRef(null);
  const reuploaded = useRef(new Set());

  const showToast = useCallback((message, type = 'success') => {
    clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const commit = useCallback(
    (next) => {
      dataRef.current = next;
      if (!mountedRef.current) return; // logged out meanwhile - don't write data back to the phone
      setData(next);
      save(KEY, next);
    },
    [KEY]
  );

  // ---------- Sending one queued change to the server ----------
  const runOp = async (op, idMap) => {
    const skip = () => {
      const err = new Error('skip');
      err.skip = true;
      throw err;
    };
    const rid = (id) => (isLocalId(id) ? idMap[id] || null : id);
    const withCategory = (payload) => {
      if (payload.categoryId === undefined) return payload;
      const categoryId = rid(payload.categoryId);
      if (!categoryId) skip();
      return { ...payload, categoryId };
    };

    switch (op.type) {
      case 'expense.add': {
        const created = await api.addExpense(withCategory(op.payload));
        idMap[op.localId] = created.id;
        break;
      }
      case 'expense.update': {
        const id = rid(op.id) || skip();
        await api.updateExpense(id, withCategory(op.payload));
        break;
      }
      case 'expense.delete': {
        const id = rid(op.id) || skip();
        await api.deleteExpense(id);
        break;
      }
      case 'category.add': {
        const created = await api.addCategory(op.payload);
        idMap[op.localId] = created.id;
        break;
      }
      case 'category.update': {
        const id = rid(op.id) || skip();
        await api.updateCategory(id, op.payload);
        break;
      }
      case 'category.delete': {
        const id = rid(op.id) || skip();
        await api.deleteCategory(id);
        break;
      }
      case 'settings.update':
        await api.updateBudget(op.payload);
        break;
      case 'data.reset':
        await api.resetAll();
        break;
      case 'trip.upsert': {
        const trip = dataRef.current.trips.find((t) => t.id === op.id) || skip();
        await api.saveTrip(op.id, trip);
        break;
      }
      case 'trip.delete':
        await api.deleteTrip(op.id);
        break;
      default:
        skip();
    }
  };

  // ---------- Pulling the latest server copy (only when nothing is waiting to be sent) ----------
  const pull = async () => {
    const [categories, expenses, settings] = await Promise.all([api.getCategories(), api.getExpenses(), api.getBudget()]);
    let serverTrips = null;
    try {
      serverTrips = await api.getTrips();
    } catch (e) {
      if (e.status === 0) throw e; // an older server without trip support just keeps trips on the phone
    }

    const cur = dataRef.current;
    if (cur.queue.length) return; // the person changed something while we were fetching - sync again soon

    let { trips } = cur;
    const extraOps = [];
    if (serverTrips) {
      const local = new Map(cur.trips.map((t) => [t.id, t]));
      const seen = new Set();
      const merged = [];
      for (const s of serverTrips) {
        seen.add(s.id);
        const l = local.get(s.id);
        const isMember = s.share?.role === 'member';
        // Joined trips are view-only here, so the host's copy always wins.
        if (!isMember && l && (l.updatedAt || 0) > (s.updatedAt || 0)) {
          merged.push({ ...l, share: s.share });
          if (!reuploaded.current.has(l.id)) extraOps.push({ type: 'trip.upsert', id: l.id });
        } else merged.push(s);
      }
      for (const l of cur.trips) {
        if (seen.has(l.id)) continue;
        if (l.share?.role === 'member') continue; // host deleted the trip or removed you
        merged.push(l);
        if (!reuploaded.current.has(l.id)) extraOps.push({ type: 'trip.upsert', id: l.id });
      }
      extraOps.forEach((o) => reuploaded.current.add(o.id));
      trips = merged;
    }

    let next = { ...cur, categories, expenses, settings, trips, idMap: {}, lastSynced: Date.now() };
    extraOps.forEach((o) => {
      next = enqueue(next, o);
    });
    commit(next);
  };

  // ---------- Full sync: send the queue, then pull ----------
  const sync = useCallback(async () => {
    if (syncingRef.current || !mountedRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    let failed = false;
    let dropped = 0;
    try {
      while (dataRef.current.queue.length) {
        const op = dataRef.current.queue[0];
        const idMap = { ...dataRef.current.idMap };
        try {
          await runOp(op, idMap);
          setOnline(true);
        } catch (e) {
          const rejected = e.skip || (e.status >= 400 && e.status < 500 && !RETRYABLE.has(e.status));
          if (!rejected) {
            failed = true;
            if (e.status === 0) setOnline(false);
            break;
          }
          const quiet = e.skip || (e.status === 404 && /\.delete$/.test(op.type));
          if (!quiet) dropped += 1;
        }
        const cur = dataRef.current;
        commit({ ...cur, idMap, queue: cur.queue.filter((q) => q.qid !== op.qid) });
      }

      if (!failed && !dataRef.current.queue.length) {
        try {
          await pull();
          setOnline(true);
        } catch (e) {
          if (e.status === 0) setOnline(false);
        }
      }
    } finally {
      syncingRef.current = false;
      if (mountedRef.current) setSyncing(false);
    }
    if (dropped) showToast("Some changes couldn't be saved to the server.", 'error');
    if (!failed && dataRef.current.queue.length) setTimeout(() => sync(), 200); // more arrived meanwhile
  }, [commit, showToast]);

  const scheduleSync = useCallback(() => {
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => sync(), 300);
  }, [sync]);

  // ---------- Start-up: load from the phone first, then sync in the background ----------
  useEffect(() => {
    mountedRef.current = true;
    setApiTimeout(BACKGROUND_TIMEOUT_MS);
    let alive = true;
    (async () => {
      const stored = await load(KEY, null);
      let cur = { ...EMPTY, ...(stored || {}) };
      if (!cur.migrated) {
        // One-time: new installs of this version start in rupees.
        cur = enqueue({ ...cur, migrated: true, settings: { ...cur.settings, currency: 'INR' } }, { type: 'settings.update', payload: { currency: 'INR' } });
      }
      if (!alive) return;
      commit(cur);
      setHydrated(true);
      sync();
    })();
    return () => {
      alive = false;
      mountedRef.current = false;
      clearTimeout(syncTimer.current);
      clearTimeout(toastTimer.current);
      setApiTimeout(60000);
    };
  }, [KEY, commit, sync]);

  // Try again whenever the app comes back to the foreground, and every 30s while changes are waiting / offline.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && sync());
    const timer = setInterval(() => {
      if (dataRef.current.queue.length || !online || dataRef.current.trips.some((t) => t.share)) sync();
    }, SYNC_EVERY_MS);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [sync, online]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await sync();
    setRefreshing(false);
  }, [sync]);

  // ---------- Local changes (instant, work offline) ----------
  // `edit(fn, toastMessage)` lets fn(cur) return the next data. Always returns true so forms can close.
  const edit = useCallback(
    (fn, message) => {
      const next = fn(dataRef.current);
      if (!next) return false;
      commit(next);
      if (message) showToast(message);
      scheduleSync();
      return true;
    },
    [commit, scheduleSync, showToast]
  );

  // Patch a record that may still be waiting to be created on the server.
  const patchRecord = (cur, kind, id, payload) => {
    const addIdx = cur.queue.findIndex((q) => q.type === `${kind}.add` && q.localId === id);
    if (addIdx >= 0) {
      return { ...cur, queue: cur.queue.map((q, i) => (i === addIdx ? { ...q, payload: { ...q.payload, ...payload } } : q)) };
    }
    return enqueue(cur, { type: `${kind}.update`, id, payload });
  };

  const removeRecord = (cur, kind, id) => {
    const pendingAdd = cur.queue.some((q) => q.type === `${kind}.add` && q.localId === id);
    if (pendingAdd) {
      // never reached the server - just forget it
      return { ...cur, queue: cur.queue.filter((q) => q.localId !== id && !(q.id === id && q.type.startsWith(`${kind}.`))) };
    }
    return enqueue(cur, { type: `${kind}.delete`, id });
  };

  const addExpense = (p) =>
    edit((cur) => {
      const e = { id: newLocalId(), amount: round2(p.amount), categoryId: p.categoryId, note: p.note || '', date: p.date, createdAt: new Date().toISOString() };
      const next = { ...cur, expenses: [e, ...cur.expenses] };
      return enqueue(next, { type: 'expense.add', localId: e.id, payload: { amount: e.amount, categoryId: e.categoryId, note: e.note, date: e.date } });
    }, 'Expense added.');

  const updateExpense = (id, p) =>
    edit((cur) => {
      const payload = { ...p, ...(p.amount !== undefined ? { amount: round2(p.amount) } : {}) };
      const next = { ...cur, expenses: cur.expenses.map((e) => (e.id === id ? { ...e, ...payload } : e)) };
      return patchRecord(next, 'expense', id, payload);
    }, 'Expense updated.');

  const deleteExpense = (id) =>
    edit((cur) => removeRecord({ ...cur, expenses: cur.expenses.filter((e) => e.id !== id) }, 'expense', id), 'Expense deleted.');

  const addCategory = (p) =>
    edit((cur) => {
      const c = { id: newLocalId(), name: p.name, icon: p.icon || 'Circle', color: p.color || '#8B9490', budget: 0 };
      return enqueue({ ...cur, categories: [...cur.categories, c] }, { type: 'category.add', localId: c.id, payload: { name: c.name, icon: c.icon, color: c.color } });
    }, 'Category added.');

  const patchCategory = (cur, id, p) =>
    patchRecord({ ...cur, categories: cur.categories.map((c) => (c.id === id ? { ...c, ...p } : c)) }, 'category', id, p);

  const updateCategory = (id, p) => edit((cur) => patchCategory(cur, id, p), 'Category updated.');

  // Deleting a category moves its expenses into "Other" so no spending is lost (same rule as the server).
  const deleteCategory = (id) => {
    const cur = dataRef.current;
    const used = cur.expenses.some((e) => e.categoryId === id);
    const fallback = cur.categories.find((c) => c.name === 'Other' && c.id !== id);
    if (used && !fallback) {
      showToast('This category has expenses. Create an "Other" category first so they have somewhere to go.', 'error');
      return false;
    }
    return edit((c) => {
      let next = {
        ...c,
        categories: c.categories.filter((x) => x.id !== id),
        expenses: c.expenses.map((e) => (e.categoryId === id ? { ...e, categoryId: fallback.id } : e)),
      };
      if (!used) next = { ...next, expenses: c.expenses };
      if (isLocalId(id)) {
        // the category never reached the server: point any queued expenses at the fallback instead
        next = {
          ...next,
          queue: next.queue.map((q) => (q.payload?.categoryId === id ? { ...q, payload: { ...q.payload, categoryId: fallback?.id } } : q)),
        };
      }
      return removeRecord(next, 'category', id);
    }, 'Category deleted.');
  };

  const updateSettings = (p, message = 'Saved.') =>
    edit((cur) => enqueue({ ...cur, settings: { ...cur.settings, ...p } }, { type: 'settings.update', payload: p }), message);

  const saveBudgets = (monthlyLimit, categoryChanges) =>
    edit((cur) => {
      let next = enqueue({ ...cur, settings: { ...cur.settings, monthlyLimit } }, { type: 'settings.update', payload: { monthlyLimit } });
      for (const [id, budget] of Object.entries(categoryChanges)) next = patchCategory(next, id, { budget });
      return next;
    }, 'Budget saved.');

  const resetAll = () =>
    edit((cur) => {
      const categories = DEFAULT_CATEGORIES.map((c) => ({ ...c, id: newLocalId(), budget: 0 }));
      const keep = cur.queue.filter((q) => q.type.startsWith('trip.'));
      let next = { ...cur, categories, expenses: [], settings: { monthlyLimit: 0, currency: 'INR' }, queue: keep, idMap: {} };
      next = enqueue(next, { type: 'data.reset' });
      return enqueue(next, { type: 'settings.update', payload: { currency: 'INR', monthlyLimit: 0 } });
    }, 'All data has been reset.');

  // ---------- Trips ----------
  const saveTrip = (trip) =>
    edit((cur) => {
      if (trip.share?.role === 'member') return null; // joined trips are view-only
      const t = { ...trip, updatedAt: Date.now() };
      const exists = cur.trips.some((x) => x.id === t.id);
      const trips = exists ? cur.trips.map((x) => (x.id === t.id ? t : x)) : [t, ...cur.trips];
      const pending = cur.queue.some((q) => q.type === 'trip.upsert' && q.id === t.id);
      const next = { ...cur, trips };
      return pending ? next : enqueue(next, { type: 'trip.upsert', id: t.id });
    });

  // Replace a trip locally with what the server says, without queueing an upload.
  const putServerTrip = (serverTrip) =>
    edit((cur) => {
      const has = cur.trips.some((t) => t.id === serverTrip.id);
      const trips = has ? cur.trips.map((t) => (t.id === serverTrip.id ? serverTrip : t)) : [serverTrip, ...cur.trips];
      return { ...cur, trips };
    });

  // Join a friend's trip with their code. Needs internet. Returns the trip id.
  const joinTrip = async (code) => {
    const trip = await api.joinTrip(code);
    putServerTrip(trip);
    return trip.id;
  };

  // Host: turn on sharing and get the join code. Uploads the latest plan first so friends see it.
  const shareTrip = async (id) => {
    if (dataRef.current.queue.length) await sync();
    const trip = await api.shareTrip(id);
    putServerTrip(trip);
    return trip.share?.code;
  };

  const unshareTrip = async (id) => {
    await api.unshareTrip(id);
    edit((cur) => ({ ...cur, trips: cur.trips.map((t) => (t.id === id ? { ...t, share: undefined } : t)) }), 'Sharing stopped.');
  };

  const deleteTrip = (id) =>
    edit((cur) => {
      const next = { ...cur, trips: cur.trips.filter((t) => t.id !== id), queue: cur.queue.filter((q) => !(q.type === 'trip.upsert' && q.id === id)) };
      return enqueue(next, { type: 'trip.delete', id });
    }, 'Trip deleted.');

  // ---------- Values for the screens ----------
  const expenses = useMemo(
    () =>
      data.expenses
        .filter((e) => e.date >= `${month}-01` && e.date <= `${month}-31`)
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : String(b.createdAt || '').localeCompare(String(a.createdAt || '')))),
    [data.expenses, month]
  );

  const stats = useMemo(
    () => (hydrated ? computeStats({ month, categories: data.categories, expenses: data.expenses, settings: data.settings }) : null),
    [hydrated, month, data.categories, data.expenses, data.settings]
  );

  const insights = useMemo(
    () => (stats ? computeInsights({ month, expenses: data.expenses, totalSpent: stats.totalSpent }) : null),
    [stats, month, data.expenses]
  );

  const trips = useMemo(() => sortTrips(data.trips), [data.trips]);

  const value = {
    categories: data.categories,
    expenses,
    allExpenses: data.expenses,
    settings: data.settings,
    stats,
    insights,
    trips,
    month,
    setMonth,
    loading: !hydrated || (!data.lastSynced && syncing && !data.categories.length),
    refreshing,
    refresh,
    toast,
    showToast,
    pending: data.queue.length,
    online,
    syncing,
    lastSynced: data.lastSynced,
    sync,
    addExpense,
    updateExpense,
    deleteExpense,
    addCategory,
    updateCategory,
    deleteCategory,
    updateSettings,
    saveBudgets,
    resetAll,
    saveTrip,
    deleteTrip,
    joinTrip,
    shareTrip,
    unshareTrip,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
