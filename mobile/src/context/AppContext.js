import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { currentMonth, toDateStr } from '../utils/format';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [settings, setSettings] = useState({ monthlyLimit: 0, currency: 'USD' });
  const [stats, setStats] = useState(null);
  const [month, setMonthState] = useState(currentMonth());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState(null);

  const monthRef = useRef(month);
  const requestId = useRef(0);
  const toastTimer = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // One call reloads everything the screens need. Only the newest request may update state,
  // so quickly flipping between months can't show stale numbers.
  const refreshAll = useCallback(
    async (m = monthRef.current, { silent = false } = {}) => {
      const id = ++requestId.current;
      if (!silent) setLoading(true);
      try {
        const [cats, exps, budget, st] = await Promise.all([
          api.getCategories(),
          api.getExpenses({ month: m }),
          api.getBudget(),
          api.getStats(m, toDateStr()),
        ]);
        if (id !== requestId.current) return;
        setCategories(cats);
        setExpenses(exps);
        setSettings(budget);
        setStats(st);
      } catch (e) {
        if (id === requestId.current) showToast(e.message, 'error');
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    monthRef.current = month;
    refreshAll(month);
  }, [month, refreshAll]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await refreshAll(monthRef.current, { silent: true });
    setRefreshing(false);
  }, [refreshAll]);

  // Runs an API change, reloads, toasts. Returns true/false so forms know whether to close.
  const mutate = useCallback(
    async (fn, message) => {
      try {
        await fn();
        await refreshAll(monthRef.current, { silent: true });
        if (message) showToast(message);
        return true;
      } catch (e) {
        showToast(e.message, 'error');
        return false;
      }
    },
    [refreshAll, showToast]
  );

  const value = {
    categories,
    expenses,
    settings,
    stats,
    month,
    setMonth: setMonthState,
    loading,
    refreshing,
    refresh,
    toast,
    showToast,
    addExpense: (p) => mutate(() => api.addExpense(p), 'Expense added.'),
    updateExpense: (id, p) => mutate(() => api.updateExpense(id, p), 'Expense updated.'),
    deleteExpense: (id) => mutate(() => api.deleteExpense(id), 'Expense deleted.'),
    addCategory: (p) => mutate(() => api.addCategory(p), 'Category added.'),
    updateCategory: (id, p) => mutate(() => api.updateCategory(id, p), 'Category updated.'),
    deleteCategory: (id) => mutate(() => api.deleteCategory(id), 'Category deleted.'),
    updateSettings: (p, message = 'Saved.') => mutate(() => api.updateBudget(p), message),
    saveBudgets: (monthlyLimit, categoryChanges) =>
      mutate(async () => {
        await api.updateBudget({ monthlyLimit });
        for (const [id, budget] of Object.entries(categoryChanges)) {
          await api.updateCategory(id, { budget });
        }
      }, 'Budget saved.'),
    resetAll: () => mutate(() => api.resetAll(), 'All data has been reset.'),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
