import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AppProvider, useApp } from './src/context/AppContext';
import SplashScreen from './src/components/SplashScreen';
import TabBar from './src/components/TabBar';
import ExpenseForm from './src/components/ExpenseForm';
import { Button, ToastHost } from './src/components/ui';
import AuthScreen from './src/screens/AuthScreen';
import Dashboard from './src/screens/Dashboard';
import Expenses from './src/screens/Expenses';
import Budget from './src/screens/Budget';
import Categories from './src/screens/Categories';
import Settings from './src/screens/Settings';

const MIN_SPLASH_MS = 1800;
const SLOW_HINT_MS = 6000;

function MainShell() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { toast } = useApp();
  const [tab, setTab] = useState('dashboard');
  const [form, setForm] = useState({ open: false, expense: null });

  const openForm = (expense = null) => setForm({ open: true, expense });
  const closeForm = () => setForm((f) => ({ ...f, open: false }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {tab === 'dashboard' && <Dashboard onEdit={openForm} />}
      {tab === 'expenses' && <Expenses onEdit={openForm} />}
      {tab === 'budget' && <Budget />}
      {tab === 'categories' && <Categories />}
      {tab === 'settings' && <Settings />}

      {(tab === 'dashboard' || tab === 'expenses') && (
        <Pressable
          onPress={() => openForm(null)}
          accessibilityLabel="Add expense"
          style={({ pressed }) => ({
            position: 'absolute',
            right: 20,
            bottom: insets.bottom + 84,
            width: 58,
            height: 58,
            borderRadius: 29,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.85 : 1,
            elevation: 6,
            shadowColor: '#000',
            shadowOpacity: 0.25,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
          })}
        >
          <Feather name="plus" size={28} color="#fff" />
        </Pressable>
      )}

      <TabBar active={tab} onChange={setTab} />
      <ExpenseForm visible={form.open} expense={form.expense} onClose={closeForm} />
      <ToastHost toast={toast} />
    </View>
  );
}

function Root() {
  const { colors } = useTheme();
  const { status, retry } = useAuth();
  const [minElapsed, setMinElapsed] = useState(false);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const a = setTimeout(() => setMinElapsed(true), MIN_SPLASH_MS);
    const b = setTimeout(() => setSlow(true), SLOW_HINT_MS);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);

  if (status === 'loading' || !minElapsed) return <SplashScreen slow={slow && status === 'loading'} />;

  if (status === 'offline') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Feather name="wifi-off" size={40} color={colors.muted} />
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 16 }}>Can't reach the server</Text>
        <Text style={{ color: colors.subtext, textAlign: 'center', marginTop: 8, marginBottom: 24 }}>
          Check your internet connection and try again. You're still signed in.
        </Text>
        <Button title="Try again" onPress={retry} icon="refresh-cw" />
      </View>
    );
  }

  if (status === 'anon') return <AuthScreen />;

  return (
    <AppProvider>
      <MainShell />
    </AppProvider>
  );
}

function Themed() {
  const { isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AuthProvider>
        <Root />
      </AuthProvider>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Themed />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
