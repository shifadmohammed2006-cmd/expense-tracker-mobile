// © 2026 Expense Tracker. All rights reserved. Unauthorised copying or redistribution is prohibited.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState, Easing, Linking, ScrollView, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_URL } from '../config';
import { APP_NAME, COPYRIGHT, VERSION } from '../branding';
import { useTheme } from '../theme';
import Logo from './Logo';
import { Button, Reveal } from './ui';

const INSTALLED = Constants.expoConfig?.version || VERSION;

// 1.10.0 > 1.9.0 (numbers, not text). Returns <0, 0 or >0.
function compareVersions(a, b) {
  const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

async function fetchVersionInfo() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${API_URL}/api/app-version`, { signal: controller.signal, headers: { 'X-App-Version': VERSION } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null; // offline or server asleep - never block someone because the check failed
  } finally {
    clearTimeout(timer);
  }
}

// Wraps the whole app. If this phone's version is older than the server's "minimum", the app is
// replaced by a full-screen "Update required" page with a download button.
export default function UpdateGate({ children }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [info, setInfo] = useState(null);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);

  const check = useCallback(async () => {
    const data = await fetchVersionInfo();
    if (data) setInfo(data);
  }, []);

  useEffect(() => {
    check();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => sub.remove();
  }, [check]);

  const required = info && compareVersions(INSTALLED, info.minimum) < 0;
  if (!required) return children;

  const openDownload = () => {
    if (info.apkUrl) Linking.openURL(info.apkUrl).catch(() => {});
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
        <View>
          {/* Soft red glow that breathes behind the logo */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: -30,
              left: -30,
              width: 144,
              height: 144,
              borderRadius: 72,
              backgroundColor: colors.glow,
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.5] }),
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.18] }) }],
            }}
          />
          <Logo size={84} />
        </View>
        <Reveal style={{ alignSelf: 'stretch', alignItems: 'center' }}>
          <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text, marginTop: 22, textAlign: 'center' }}>Update required</Text>
          <Text style={{ color: colors.subtext, textAlign: 'center', marginTop: 8, lineHeight: 21 }}>
            A new version of {APP_NAME} is available. Please update to keep using the app.
          </Text>
          <Text style={{ color: colors.muted, marginTop: 14, fontSize: 13 }}>
            Your version {INSTALLED}  →  New version {info.latest}
          </Text>
          {info.notes ? (
            <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, marginTop: 18, alignSelf: 'stretch', borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 6 }}>What's new</Text>
              <Text style={{ color: colors.subtext, lineHeight: 20 }}>{info.notes}</Text>
            </View>
          ) : null}
          {info.apkUrl ? (
            <>
              <Button title="Update now" icon="download" onPress={openDownload} style={{ alignSelf: 'stretch', marginTop: 24 }} />
              <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 14, lineHeight: 18 }}>
                The new version downloads in your browser. When it finishes, open the file and tap Install. If Android asks, allow
                installing from this source. Your data stays safe.
              </Text>
            </>
          ) : (
            <Text style={{ color: colors.danger, textAlign: 'center', marginTop: 24 }}>
              The download link is not ready yet. Please ask the developer for the latest version.
            </Text>
          )}
          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 30 }}>{COPYRIGHT}</Text>
        </Reveal>
      </ScrollView>
    </View>
  );
}
