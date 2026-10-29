// © 2026 Expense Tracker. All rights reserved. Unauthorised copying or redistribution is prohibited.
import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { ICON_MAP } from '../utils/constants';
import { monthLabel, shiftMonth } from '../utils/format';

// Padding that keeps screen content clear of the notch and the bottom tab bar.
export function usePad() {
  const insets = useSafeAreaInsets();
  return { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 150, paddingHorizontal: 20 };
}

export const num = { fontVariant: ['tabular-nums'] };

export function Card({ children, style }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: 20,
          padding: 18,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Title({ children, style }) {
  const { colors } = useTheme();
  return <Text style={[{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 }, style]}>{children}</Text>;
}

export function ScreenHeader({ title, subtitle, right }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text }}>{title}</Text>
        {subtitle ? <Text style={{ fontSize: 14, color: colors.subtext, marginTop: 2 }}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function Button({ title, onPress, variant = 'primary', loading, disabled, icon, style }) {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const spring = (v, b) => Animated.spring(scale, { toValue: v, speed: 40, bounciness: b, useNativeDriver: true }).start();
  const filled = variant === 'primary' || variant === 'danger';
  const bg = variant === 'primary' ? colors.primary : variant === 'danger' ? colors.danger : 'transparent';
  const fg = filled ? '#FFFFFF' : variant === 'dangerOutline' ? colors.danger : colors.text;
  const borderColor = variant === 'outline' ? colors.outline : variant === 'dangerOutline' ? colors.danger : 'transparent';
  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => !disabled && !loading && spring(0.96, 0)}
        onPressOut={() => spring(1, 5)}
        disabled={disabled || loading}
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingVertical: 14,
            paddingHorizontal: 18,
            borderRadius: 14,
            borderWidth: 1,
            borderColor,
            backgroundColor: bg,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={fg} />
        ) : (
          <>
            {icon ? <Feather name={icon} size={17} color={fg} /> : null}
            <Text style={{ color: fg, fontSize: 15, fontWeight: '600' }}>{title}</Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

// Fades and slides content in on mount - the smooth entrance every screen uses.
export function Reveal({ children, style, delay = 0, from = 16 }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(from)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 420, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(y, { toValue: 0, speed: 26, bounciness: 5, delay, useNativeDriver: true }),
    ]).start();
  }, [opacity, y, delay]);
  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY: y }] }]}>{children}</Animated.View>
  );
}

export function Field({ label, error, style, inputStyle, right, ...props }) {
  const { colors } = useTheme();
  return (
    <View style={[{ marginBottom: 14 }, style]}>
      {label ? (
        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.subtext, marginBottom: 6 }}>{label}</Text>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.input,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: error ? colors.danger : colors.border,
          paddingHorizontal: 14,
        }}
      >
        <TextInput
          placeholderTextColor={colors.muted}
          style={[{ flex: 1, color: colors.text, fontSize: 16, paddingVertical: 13 }, inputStyle]}
          {...props}
        />
        {right}
      </View>
      {error ? <Text style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}>{error}</Text> : null}
    </View>
  );
}

export function Chip({ label, active, onPress, color, icon }) {
  const { colors } = useTheme();
  const tint = color || colors.primary;
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? tint : colors.border,
        backgroundColor: active ? `${tint}22` : colors.card,
      }}
    >
      {icon}
      <Text style={{ fontSize: 13, fontWeight: '600', color: active ? tint : colors.text }}>{label}</Text>
    </Pressable>
  );
}

export function CategoryBadge({ category, size = 40 }) {
  const color = category?.color || '#8B9490';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: `${color}26`,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <MaterialCommunityIcons name={ICON_MAP[category?.icon] || 'circle-outline'} size={size * 0.5} color={color} />
    </View>
  );
}

export function EmptyNote({ text }) {
  const { colors } = useTheme();
  return <Text style={{ color: colors.subtext, fontSize: 14, textAlign: 'center', paddingVertical: 22 }}>{text}</Text>;
}

export function ProgressBar({ value, max, height = 8 }) {
  const { colors } = useTheme();
  const ratio = max > 0 ? value / max : 0;
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: Math.min(ratio, 1), duration: 600, useNativeDriver: false }).start();
  }, [ratio, anim]);
  const color = ratio >= 1 ? colors.danger : ratio >= 0.8 ? colors.warn : colors.primary;
  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: colors.track, overflow: 'hidden' }}>
      <Animated.View style={{ height: '100%', width, backgroundColor: color, borderRadius: height / 2 }} />
    </View>
  );
}

export function MonthSwitcher({ month, onChange }) {
  const { colors } = useTheme();
  const arrow = (name, delta) => (
    <Pressable
      onPress={() => onChange(shiftMonth(month, delta))}
      hitSlop={10}
      style={{ padding: 8, borderRadius: 999, backgroundColor: colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }}
    >
      <Feather name={name} size={18} color={colors.text} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      {arrow('chevron-left', -1)}
      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{monthLabel(month)}</Text>
      {arrow('chevron-right', 1)}
    </View>
  );
}

// Bottom sheet that rises above the keyboard.
export function SheetModal({ visible, onClose, title, children }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay }}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            maxHeight: '92%',
            paddingBottom: insets.bottom + 8,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 8 }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Feather name="x" size={22} color={colors.subtext} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingTop: 8 }}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function ToastHost({ toast }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (toast) {
      opacity.setValue(0);
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  }, [toast, opacity]);
  if (!toast) return null;
  const bg = toast.type === 'error' ? colors.danger : colors.primary;
  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: 'absolute', top: insets.top + 8, left: 20, right: 20, opacity, zIndex: 100 }}
    >
      <View style={{ backgroundColor: bg, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16 }}>
        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>{toast.message}</Text>
      </View>
    </Animated.View>
  );
}
