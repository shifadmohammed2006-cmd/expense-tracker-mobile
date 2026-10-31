// © 2026 Expense Tracker. All rights reserved. Unauthorised copying or redistribution is prohibited.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, loadToken, saveToken, clearToken, setUnauthorizedHandler } from '../api';
import { load, remove, save, wipeUser } from '../store/storage';
import { cancelAll } from '../utils/notifications';

const AuthContext = createContext(null);
const SESSION_KEY = 'et:session';

// status: 'loading' | 'authed' | 'anon' | 'offline'
// Once you have signed in on this phone, the app opens straight away - even with no internet.
export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading');
  const [user, setUser] = useState(null);

  const dropSession = useCallback(async () => {
    cancelAll(); // no reminders for someone who is logged out of a shared phone
    await clearToken();
    await remove(SESSION_KEY);
    setUser(null);
    setStatus('anon');
  }, []);

  const boot = useCallback(async () => {
    setStatus('loading');
    const token = await loadToken();
    if (!token) {
      setStatus('anon');
      return;
    }

    const cached = await load(SESSION_KEY, null);
    if (cached?.user) {
      // Offline-first: trust the saved login now, double-check with the server quietly in the background.
      setUser(cached.user);
      setStatus('authed');
      api
        .getMe()
        .then((data) => {
          setUser(data.user);
          save(SESSION_KEY, { user: data.user });
        })
        .catch((e) => {
          if (e.status === 401) dropSession();
          // any other error just means we're offline - nothing to do
        });
      return;
    }

    // Logged in before this version (nothing cached yet): one online check is needed.
    try {
      const data = await api.getMe();
      await save(SESSION_KEY, { user: data.user });
      setUser(data.user);
      setStatus('authed');
    } catch (e) {
      if (e.status === 401) await dropSession();
      else setStatus('offline');
    }
  }, [dropSession]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      remove(SESSION_KEY);
      setUser(null);
      setStatus('anon');
    });
    boot();
  }, [boot]);

  const finishAuth = async (data) => {
    await saveToken(data.token);
    await save(SESSION_KEY, { user: data.user });
    setUser(data.user);
    setStatus('authed');
  };

  const value = useMemo(
    () => ({
      status,
      user,
      retry: boot,
      login: async (email, password) => finishAuth(await api.login(email.trim(), password)),
      signup: async (email, password) => finishAuth(await api.signup(email.trim(), password)),
      logout: async () => {
        if (user?.id) await wipeUser(user.id); // keep a shared phone private
        await dropSession();
      },
      deleteAccount: async (password) => {
        await api.deleteAccount(password);
        if (user?.id) await wipeUser(user.id);
        await dropSession();
      },
    }),
    [status, user, boot, dropSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
