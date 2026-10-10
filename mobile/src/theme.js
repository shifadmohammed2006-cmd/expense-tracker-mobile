import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const THEME_KEY = 'et-theme';

const light = {
  bg: '#F1F3F0',
  card: '#FFFFFF',
  input: '#F6F8F6',
  text: '#14231F',
  subtext: 'rgba(20,35,31,0.55)',
  border: 'rgba(0,0,0,0.07)',
  outline: 'rgba(0,0,0,0.16)',
  track: 'rgba(20,35,31,0.08)',
  primary: '#2F6F4E',
  warn: '#D6A317',
  danger: '#C1443B',
  info: '#3A6EA5',
  muted: '#8B9490',
  overlay: 'rgba(0,0,0,0.45)',
};

const dark = {
  bg: '#0F1613',
  card: '#1A2622',
  input: '#22312B',
  text: '#F1F3F0',
  subtext: 'rgba(241,243,240,0.55)',
  border: 'rgba(255,255,255,0.08)',
  outline: 'rgba(255,255,255,0.18)',
  track: 'rgba(255,255,255,0.1)',
  primary: '#3F9068',
  warn: '#D6A317',
  danger: '#E0584E',
  info: '#5B93CC',
  muted: '#8B9490',
  overlay: 'rgba(0,0,0,0.65)',
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState(null); // null = follow the phone's setting

  useEffect(() => {
    SecureStore.getItemAsync(THEME_KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark') setModeState(v);
      })
      .catch(() => {});
  }, []);

  const isDark = (mode || system) === 'dark';
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
