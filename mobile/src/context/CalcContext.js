// © Expense Tracker. All rights reserved.
// Keeps the calculator's numbers alive when you switch tabs, and saves them on the phone
// so they are still there after you close and reopen the app. Cleared on logout with the rest of the account data.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { load, save } from '../store/storage';
import { EMPTY_CALC, fromHistory, press } from '../utils/calcLogic';
import { useAuth } from './AuthContext';

const Ctx = createContext(null);

export function CalcProvider({ children }) {
  const { user } = useAuth();
  const KEY = `et:${user?.id || 'anon'}:calc`;
  const [state, setState] = useState(EMPTY_CALC);
  const loaded = useRef(false);

  useEffect(() => {
    let alive = true;
    load(KEY, null).then((s) => {
      if (!alive) return;
      if (s && typeof s.expr === 'string') setState((cur) => (cur.expr || cur.history.length ? cur : { ...EMPTY_CALC, ...s }));
      loaded.current = true;
    });
    return () => {
      alive = false;
    };
  }, [KEY]);

  useEffect(() => {
    if (loaded.current) save(KEY, state);
  }, [state, KEY]);

  const key = useCallback((k) => setState((s) => press(s, k)), []);
  const pick = useCallback((item) => setState((s) => fromHistory(s, item)), []);
  const clearHistory = useCallback(() => setState((s) => ({ ...s, history: [] })), []);

  const value = useMemo(() => ({ state, key, pick, clearHistory }), [state, key, pick, clearHistory]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCalc() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCalc must be used within CalcProvider');
  return ctx;
}
