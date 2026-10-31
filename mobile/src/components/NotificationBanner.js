// © Expense Tracker. All rights reserved.
// The pop-up that slides down from the top: tap to act, swipe up to dismiss, or it hides itself.
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, PanResponder, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { useNotifications } from '../context/NotificationContext';
import Logo from './Logo';

const ICONS = { danger: 'alert-triangle', warn: 'alert-circle', success: 'trending-down', info: 'bell' };

export default function NotificationBanner({ offset = 0 }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { banner, press, dismiss } = useNotifications();
  const y = useRef(new Animated.Value(-220)).current;
  const bannerRef = useRef(null);
  bannerRef.current = banner;

  // slide in whenever a new banner arrives, slide out when it is cleared
  useEffect(() => {
    if (banner) {
      y.setValue(-220);
      Animated.spring(y, { toValue: 0, speed: 16, bounciness: 7, useNativeDriver: true }).start();
    }
  }, [banner?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => y.setValue(Math.min(g.dy, 12)),
        onPanResponderRelease: (_, g) => {
          if (g.dy < -24 || g.vy < -0.6) {
            Animated.timing(y, { toValue: -220, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(dismiss);
          } else {
            Animated.spring(y, { toValue: 0, useNativeDriver: true }).start();
          }
        },
      }),
    [y, dismiss]
  );

  if (!banner) return null;
  const tint = banner.tone === 'danger' ? colors.danger : banner.tone === 'warn' ? colors.warn : banner.tone === 'success' ? '#30D158' : colors.primary;

  return (
    <Animated.View
      {...pan.panHandlers}
      style={{
        position: 'absolute',
        top: insets.top + 8 + offset,
        left: 12,
        right: 12,
        zIndex: 120,
        elevation: 14,
        transform: [{ translateY: y }],
      }}
    >
      <Pressable
        onPress={() => press(bannerRef.current)}
        accessibilityRole="alert"
        accessibilityLabel={`${banner.title}. ${banner.body}`}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          backgroundColor: colors.card,
          borderRadius: 18,
          paddingVertical: 12,
          paddingHorizontal: 12,
          borderWidth: 1,
          borderColor: colors.outline,
          shadowColor: '#000',
          shadowOpacity: 0.35,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
        }}
      >
        <View>
          <Logo size={42} bg={colors.input} />
          <View
            style={{
              position: 'absolute',
              right: -5,
              bottom: -5,
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: tint,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: colors.card,
            }}
          >
            <Feather name={ICONS[banner.tone] || 'bell'} size={10} color="#fff" />
          </View>
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text numberOfLines={1} style={{ flex: 1, color: colors.text, fontSize: 14, fontWeight: '700' }}>
              {banner.title}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 11, marginLeft: 8 }}>now</Text>
          </View>
          <Text numberOfLines={2} style={{ color: colors.subtext, fontSize: 13, marginTop: 2, lineHeight: 18 }}>
            {banner.body}
          </Text>
          {banner.cta ? (
            <View style={{ alignSelf: 'flex-start', marginTop: 8, paddingVertical: 5, paddingHorizontal: 12, borderRadius: 999, backgroundColor: colors.primary }}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{banner.cta}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}
