// © 2026 Expense Tracker. All rights reserved. Unauthorised copying or redistribution is prohibited.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AppProvider, useApp } from './src/context/AppContext';
import SplashScreen from './src/components/SplashScreen';
import UpdateGate from './src/components/UpdateGate';
import TabBar from './src/components/TabBar';
import ExpenseForm from './src/components/ExpenseForm';
import { Button, Reveal, ToastHost } from './src/components/ui';
import AuthScreen from './src/screens/AuthScreen';
import Dashboard from './src/screens/Dashboard';
import Expenses from './src/screens/Expenses';
import Budget from './src/screens/Budget';
import Categories from './src/screens/Categories';
import Settings from './src/screens/Settings';
import Trips from './src/screens/Trips';
import TripDetail from './src/screens/TripDetail';
import Calculator from './src/screens/Calculator';

const MIN_SPLASH_MS = 1800;
const SLOW_HINT_MS = 6000;

function MainShell() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { toast } = useApp();
  const [tab, setTab] = useState('dashboard');
  const [form, setForm] = useState({ open: false, expense: null });
  const [tripId, setTripId] = useState(null);

  // Android back button: close a trip, then go back to Home, then exit.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (tab === 'trips' && tripId) {
        setTripId(null);
        return true;
      }
      if (tab !== 'dashboard') {
        setTab('dashboard');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [tab, tripId]);

  const openForm = (expense = null) => setForm({ open: true, expense });
  const closeForm = () => setForm((f) => ({ ...f, open: false }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Every tab slides and fades in when you switch to it. */}
      <Reveal key={tab} style={{ flex: 1 }} from={12}>
        {tab === 'dashboard' && <Dashboard onEdit={openForm} />}
        {tab === 'expenses' && <Expenses onEdit={openForm} />}
        {tab === 'calculator' && <Calculator />}
        {tab === 'trips' && (tripId ? <TripDetail tripId={tripId} onBack={() => setTripId(null)} /> : <Trips onOpen={setTripId} />)}
        {tab === 'budget' && <Budget />}
        {tab === 'categories' && <Categories />}
        {tab === 'settings' && <Settings />}
      </Reveal>

      {(tab === 'dashboard' || tab === 'expenses') && (
        <FabPlus colors={colors} insetsBottom={insets.bottom} onPress={() => openForm(null)} />
      )}

      <TabBar active={tab} onChange={setTab} />
      <ExpenseForm visible={form.open} expense={form.expense} onClose={closeForm} />
      <ToastHost toast={toast} />
    </View>
  );
}

// Floating add-expense button with a springy press.
function FabPlus({ colors, insetsBottom, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;
  const spring = (v, b) => Animated.spring(scale, { toValue: v, speed: 40, bounciness: b, useNativeDriver: true }).start();
  return (
    <Animated.View style={{ position: 'absolute', right: 20, bottom: insetsBottom + 84, transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => spring(0.88, 0)}
        onPressOut={() => spring(1, 6)}
        accessibilityLabel="Add expense"
        style={{
          width: 58,
          height: 58,
          borderRadius: 29,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          elevation: 8,
          shadowColor: colors.glow,
          shadowOpacity: 1,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
        }}
      >
        <Feather name="plus" size={28} color="#fff" />
      </Pressable>
    </Animated.View>
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
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 16 }}>Connect once to continue</Text>
        <Text style={{ color: colors.subtext, textAlign: 'center', marginTop: 8, marginBottom: 24 }}>
          This update needs to go online one time. After that the app opens and works fully offline.
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
      <UpdateGate>
        <AuthProvider>
          <Root />
        </AuthProvider>
      </UpdateGate>
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
