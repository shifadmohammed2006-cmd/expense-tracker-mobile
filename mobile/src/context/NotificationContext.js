// © Expense Tracker. All rights reserved.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { load, save } from '../store/storage';
import { currentMonth, toDateStr } from '../utils/format';
import { computeInsights, computeStats } from '../utils/stats';
import { budgetNotice, buildSchedule, pickNotice } from '../utils/notifyContent';
import {
  cancelAll,
  getPermission,
  launchedByNotification,
  onNotificationTap,
  requestPermission,
  scheduleList,
  scheduleSoon,
  setupNotifications,
} from '../utils/notifications';
import { useApp } from './AppContext';
import { useAuth } from './AuthContext';

/*
  NOTIFICATIONS
  1. In-app pop-ups: a banner slides down from the top (like WhatsApp / LinkedIn) with a useful, personal message -
     budget alerts the moment you cross 80% / 100%, "nothing logged today", streaks, month-over-month changes...
  2. Phone notifications: reminders scheduled on the device for the coming week, so they arrive even when the app
     is closed and work offline. They are re-planned on every open, so they always match what you did last.
*/

const Ctx = createContext(null);

export const DEFAULT_PREFS = { enabled: true, asked: false, daily: true, hour: 20, minute: 0, weekly: true, budget: true, shown: {}, lastAt: 0 };
const GAP_MS = 20 * 60 * 1000; // never pop up more often than this (except live budget alerts)
const SHOW_MS = 6500;

export function NotificationProvider({ children, onAction }) {
  const { user } = useAuth();
  const { allExpenses, categories, settings, loading, showToast } = useApp();
  const KEY = `et:${user?.id || 'anon'}:notif`;

  const [prefs, setPrefsState] = useState(null);
  const prefsRef = useRef(DEFAULT_PREFS);
  const [perm, setPerm] = useState('undetermined');
  const [banner, setBanner] = useState(null);
  const [tick, setTick] = useState(0); // bumped when the app returns to the foreground (new day, new numbers)
  const timer = useRef(null);
  const prevSpent = useRef(null);
  const opened = useRef(false);
  const dataRef = useRef({});

  const today = toDateStr();
  const stats = useMemo(
    () => (loading ? null : computeStats({ month: currentMonth(), categories, expenses: allExpenses, settings })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loading, categories, allExpenses, settings, tick]
  );
  const insights = useMemo(
    () => (stats ? computeInsights({ month: currentMonth(), expenses: allExpenses, totalSpent: stats.totalSpent }) : null),
    [stats, allExpenses]
  );
  dataRef.current = { stats, insights, allExpenses };

  const updatePrefs = useCallback(
    (patch) => {
      const next = { ...prefsRef.current, ...patch };
      prefsRef.current = next;
      setPrefsState(next);
      save(KEY, next);
    },
    [KEY]
  );

  // ---------- load saved choices + current phone permission ----------
  useEffect(() => {
    setupNotifications();
    let alive = true;
    load(KEY, null).then((p) => {
      if (!alive) return;
      const merged = { ...DEFAULT_PREFS, ...(p || {}) };
      prefsRef.current = merged;
      setPrefsState(merged);
    });
    getPermission().then((p) => alive && setPerm(p));
    return () => {
      alive = false;
      clearTimeout(timer.current);
    };
  }, [KEY]);

  // ---------- the banner ----------
  const dismiss = useCallback(() => {
    clearTimeout(timer.current);
    setBanner(null);
  }, []);

  const present = useCallback((notice, { force = false } = {}) => {
    const p = prefsRef.current;
    if (!p.enabled && notice.id !== 'enable') return false;
    const stamp = `${notice.id}|${toDateStr()}`;
    if (!force && p.shown[stamp]) return false;
    // keep only today's "already shown" markers so the list never grows
    const shown = Object.fromEntries(Object.entries(p.shown).filter(([k]) => k.endsWith(`|${toDateStr()}`)));
    const next = { ...p, shown: { ...shown, [stamp]: 1 }, lastAt: Date.now() };
    prefsRef.current = next;
    setPrefsState(next);
    save(KEY, next);
    clearTimeout(timer.current);
    setBanner({ ...notice, key: Date.now() });
    timer.current = setTimeout(() => setBanner(null), SHOW_MS);
    return true;
  }, [KEY]);

  const enableSystem = useCallback(async () => {
    const r = await requestPermission();
    setPerm(r);
    updatePrefs({ enabled: true, asked: true });
    if (r === 'granted') showToast('Reminders are on. We will keep you on track!');
    else showToast('Notifications are blocked. Turn them on in your phone settings.', 'error');
    return r;
  }, [showToast, updatePrefs]);

  const smart = useCallback(
    (respectGap = true) => {
      const p = prefsRef.current;
      if (!p.enabled) return;
      if (respectGap && Date.now() - p.lastAt < GAP_MS) return;
      const d = dataRef.current;
      const n = pickNotice({ stats: d.stats, insights: d.insights, allExpenses: d.allExpenses, seen: p.shown });
      if (n) present(n);
    },
    [present]
  );

  // ---------- on app open: ask nicely the first time, otherwise show one useful notice ----------
  const ready = !!prefs && !loading && !!stats;
  useEffect(() => {
    if (!ready || opened.current) return undefined;
    opened.current = true;
    const t = setTimeout(() => {
      const p = prefsRef.current;
      if (perm === 'undetermined' && !p.asked && p.enabled) {
        updatePrefs({ asked: true });
        present({ id: 'enable', tone: 'info', title: 'Never forget an expense', body: 'Turn on reminders and budget alerts. We will only nudge you when it helps.', action: 'enable', cta: 'Turn on' }, { force: true });
      } else {
        smart(true);
      }
    }, 2800);
    launchedByNotification().then((a) => a && a !== 'enable' && onAction?.(a));
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // tapping a system notification
  useEffect(() => onNotificationTap((a) => a && onAction?.(a)), [onAction]);

  // back to the foreground: refresh numbers + permission, maybe show a notice
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') return;
      setTick((t) => t + 1);
      getPermission().then(setPerm);
      setTimeout(() => smart(true), 1200);
    });
    return () => sub.remove();
  }, [smart]);

  // live budget alerts: the moment an expense pushes you past 80% or 100%
  const spent = stats?.totalSpent ?? null;
  const limit = stats?.monthlyLimit ?? 0;
  useEffect(() => {
    if (spent === null) {
      prevSpent.current = null;
      return;
    }
    const prev = prevSpent.current;
    prevSpent.current = spent;
    if (prev === null || !prefsRef.current.budget || limit <= 0 || spent <= prev) return;
    const [r0, r1] = [prev / limit, spent / limit];
    if (r0 < 1 && r1 >= 1) present(budgetNotice('over', stats), { force: true });
    else if (r0 < 0.8 && r1 >= 0.8) present(budgetNotice('near', stats), { force: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spent, limit]);

  // ---------- keep the phone's schedule in sync with choices + data ----------
  const loggedToday = allExpenses.some((e) => e.date === today);
  const p = prefs || DEFAULT_PREFS;
  useEffect(() => {
    if (!prefs) return undefined;
    const t = setTimeout(() => {
      if (perm !== 'granted' || !p.enabled) cancelAll();
      else scheduleList(buildSchedule({ prefs: p, loggedToday }));
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs ? 1 : 0, perm, p.enabled, p.daily, p.hour, p.minute, p.weekly, p.budget, loggedToday, tick]);

  // ---------- what screens use ----------
  const press = useCallback(
    async (n) => {
      dismiss();
      if (!n) return;
      if (n.action === 'enable') return enableSystem();
      if (n.action) onAction?.(n.action);
      return undefined;
    },
    [dismiss, enableSystem, onAction]
  );

  const setEnabled = useCallback(
    async (on) => {
      if (on && perm !== 'granted') {
        const r = await enableSystem();
        if (r !== 'granted') updatePrefs({ enabled: true }); // in-app pop-ups still work without phone permission
        return;
      }
      updatePrefs({ enabled: on });
      if (!on) dismiss();
    },
    [dismiss, enableSystem, perm, updatePrefs]
  );

  const sendTest = useCallback(() => {
    present({ id: 'test', tone: 'info', title: 'Check your expenses', body: 'This is how reminders look. Tap me to open your dashboard.', action: 'dashboard' }, { force: true });
    if (perm === 'granted') {
      scheduleSoon('Check your expenses', 'This is how a phone reminder looks. Tap to open the app.', 'dashboard', 6);
      showToast('Lock your phone to see the phone notification in 6 seconds.');
    }
  }, [perm, present, showToast]);

  const value = { prefs: p, perm, banner, dismiss, press, updatePrefs, setEnabled, sendTest, enableSystem };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNotifications() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
