// © 2026 Expense Tracker. All rights reserved. Unauthorised copying or redistribution is prohibited.
import React, { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme';
import Logo from '../components/Logo';
import { COPYRIGHT, MADE_BY } from '../branding';
import { Button, Field } from '../components/ui';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthScreen() {
  const { colors } = useTheme();
  const { login, signup } = useAuth();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const isSignup = mode === 'signup';

  const submit = async () => {
    if (!EMAIL_RE.test(email.trim())) return setError('Enter a valid email address.');
    if (!password) return setError('Enter your password.');
    if (isSignup) {
      if (password.length < 8) return setError('Password must be at least 8 characters.');
      if (password !== confirm) return setError('Passwords do not match.');
    }
    setError('');
    setBusy(true);
    try {
      await (isSignup ? signup(email, password) : login(email, password));
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
    // on success the app switches screens, so there's nothing to reset
  };

  const switchMode = () => {
    setMode(isSignup ? 'login' : 'signup');
    setError('');
    setConfirm('');
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
      >
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <Logo size={72} />
          <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text, marginTop: 16 }}>
            {isSignup ? 'Create your account' : 'Welcome back'}
          </Text>
          <Text style={{ fontSize: 14, color: colors.subtext, marginTop: 4, textAlign: 'center' }}>
            {isSignup ? 'Track every expense and stay on budget.' : 'Log in to see where your money went.'}
          </Text>
        </View>

        <Field
          label="EMAIL"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
        />
        <Field
          label="PASSWORD"
          value={password}
          onChangeText={setPassword}
          placeholder={isSignup ? 'At least 8 characters' : 'Your password'}
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          right={
            <Pressable onPress={() => setShow((s) => !s)} hitSlop={10}>
              <Feather name={show ? 'eye-off' : 'eye'} size={19} color={colors.muted} />
            </Pressable>
          }
        />
        {isSignup ? (
          <Field
            label="CONFIRM PASSWORD"
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Repeat your password"
            secureTextEntry={!show}
            autoCapitalize="none"
            autoCorrect={false}
          />
        ) : null}

        {error ? <Text style={{ color: colors.danger, marginBottom: 12, fontSize: 14 }}>{error}</Text> : null}

        <Button title={isSignup ? 'Create account' : 'Log in'} onPress={submit} loading={busy} />

        <Pressable onPress={switchMode} style={{ marginTop: 22, alignItems: 'center' }} hitSlop={10}>
          <Text style={{ color: colors.subtext, fontSize: 14 }}>
            {isSignup ? 'Already have an account? ' : "Don't have an account? "}
            <Text style={{ color: colors.primary, fontWeight: '700' }}>{isSignup ? 'Log in' : 'Create one'}</Text>
          </Text>
        </Pressable>

        <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 36 }}>{COPYRIGHT}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
