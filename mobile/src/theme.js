// © 2026 Expense Tracker. All rights reserved. Unauthorised copying or redistribution is prohibited.
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

const THEME_KEY = 'et-theme';

// DigiCampus-style palette: black surfaces with a signature red as the accent.
const dark = {
  bg: '#0A0A0C',
  card: '#17171B',
  input: '#1F1F24',
  text: '#F5F5F7',
  subtext: 'rgba(245,245,247,0.55)',
  border: 'rgba(255,255,255,0.08)',
  outline: 'rgba(255,255,255,0.18)',
  track: 'rgba(255,255,255,0.1)',
  primary: '#E5324B',
  glow: 'rgba(229,50,75,0.35)',
  warn: '#FFB020',
  danger: '#FF3B30',
  info: '#4E8FFF',
  muted: '#8E8E93',
  overlay: 'rgba(0,0,0,0.65)',
};

const light = {
  bg: '#F7F6F6',
  card: '#FFFFFF',
  input: '#F1F0F0',
  text: '#17171B',
  subtext: 'rgba(23,23,27,0.55)',
  border: 'rgba(0,0,0,0.07)',
  outline: 'rgba(0,0,0,0.16)',
  track: 'rgba(23,23,27,0.08)',
  primary: '#D22B45',
  glow: 'rgba(210,43,69,0.22)',
  warn: '#D6A317',
  danger: '#C0392B',
  info: '#3A6EA5',
  muted: '#8E8E93',
  overlay: 'rgba(0,0,0,0.45)',
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // Dark (red & black) is the default after install; the person can switch to light in Settings.
  const [mode, setModeState] = useState('dark');

  useEffect(() => {
    SecureStore.getItemAsync(THEME_KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark') setModeState(v);
      })
      .catch(() => {});
  }, []);

  const isDark = mode === 'dark';
  const value = useMemo(
    () => ({
      isDark,
      colors: isDark ? dark : light,
      setDark: (on) => {
        const next = on ? 'dark' : 'light';
        setModeState(next);
        SecureStore.setItemAsync(THEME_KEY, next).catch(() => {});
      },
    }),
    [isDark]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
