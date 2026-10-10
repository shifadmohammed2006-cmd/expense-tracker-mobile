import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';

export const TABS = [
  { key: 'dashboard', label: 'Home', icon: 'home' },
  { key: 'expenses', label: 'Expenses', icon: 'list' },
  { key: 'budget', label: 'Budget', icon: 'target' },
  { key: 'categories', label: 'Categories', icon: 'tag' },
  { key: 'settings', label: 'Settings', icon: 'settings' },
];

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
      {TABS.map((t) => {
        const on = t.key === active;
        const color = on ? colors.primary : colors.muted;
        return (
          <Pressable key={t.key} onPress={() => onChange(t.key)} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
            <Feather name={t.icon} size={21} color={color} />
            <Text style={{ fontSize: 11, fontWeight: on ? '700' : '500', color }}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
