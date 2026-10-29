// © 2026 Expense Tracker. All rights reserved. Unauthorised copying or redistribution is prohibited.
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';

export const TABS = [
  { key: 'dashboard', label: 'Home', icon: 'home' },
  { key: 'expenses', label: 'Expenses', icon: 'list' },
  { key: 'calculator', label: 'Calc', icon: 'plus-square' },
  { key: 'trips', label: 'Trips', icon: 'map' },
  { key: 'budget', label: 'Budget', icon: 'target' },
  { key: 'categories', label: 'Categories', icon: 'tag' },
  { key: 'settings', label: 'Settings', icon: 'settings' },
];

function TabItem({ tab, active, onChange, color }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.spring(scale, { toValue: active ? 1.2 : 1, speed: 28, bounciness: 7, useNativeDriver: true }).start();
  }, [active, scale]);
  return (
    <Pressable key={tab.key} onPress={() => onChange(tab.key)} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Feather name={tab.icon} size={21} color={color} />
      </Animated.View>
      <Text style={{ fontSize: 10, fontWeight: active ? '700' : '500', color }}>{tab.label}</Text>
    </Pressable>
  );
}

export default function TabBar({ active, onChange }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: 'row',
        backgroundColor: colors.card,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border,
        paddingTop: 8,
        paddingBottom: insets.bottom + 6,
      }}
    >
      {TABS.map((t) => (
        <TabItem
          key={t.key}
          tab={t}
          active={t.key === active}
          onChange={onChange}
          color={t.key === active ? colors.primary : colors.muted}
        />
      ))}
    </View>
  );
}
