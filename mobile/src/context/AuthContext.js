import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, loadToken, saveToken, clearToken, setUnauthorizedHandler } from '../api';

const AuthContext = createContext(null);

// status: 'loading' | 'authed' | 'anon' | 'offline'
export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading');
  const [user, setUser] = useState(null);

  const boot = useCallback(async () => {
    setStatus('loading');
    try {
      const token = await loadToken();
      if (!token) {
        setStatus('anon');
        return;
      }
      const data = await api.getMe();
      setUser(data.user);
      setStatus('authed');
    } catch (e) {
      if (e.status === 401) {
        await clearToken();
        setUser(null);
        setStatus('anon');
      } else {
        setStatus('offline'); // server unreachable - keep the saved login and let them retry
      }
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setStatus('anon');
    });
    boot();
  }, [boot]);

  const finishAuth = async (data) => {
    await saveToken(data.token);
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
        await clearToken();
        setUser(null);
        setStatus('anon');
      },
      deleteAccount: async (password) => {
        await api.deleteAccount(password);
        await clearToken();
        setUser(null);
        setStatus('anon');
      },
    }),
    [status, user, boot]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
