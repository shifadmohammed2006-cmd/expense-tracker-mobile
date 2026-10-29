// © 2026 Expense Tracker. All rights reserved. Unauthorised copying or redistribution is prohibited.
import React from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { useTheme } from '../theme';

// Small status badge: works offline, shows when changes are waiting, tap to sync now.
export default function SyncPill() {
  const { colors } = useTheme();
  const { online, syncing, pending, sync } = useApp();

  let tint = colors.primary;
  let text = 'Synced';
  let icon = 'check-circle';
  if (syncing) {
    tint = colors.info;
    text = 'Syncing…';
  } else if (!online) {
    tint = colors.warn;
    text = pending ? `Offline · ${pending} to sync` : 'Offline';
    icon = 'cloud-off';
  } else if (pending) {
    tint = colors.info;
    text = `${pending} to sync`;
    icon = 'upload-cloud';
  }

  return (
    <Pressable
      onPress={() => sync()}
      hitSlop={8}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, backgroundColor: `${tint}1F` }}
    >
      {syncing ? <ActivityIndicator size="small" color={tint} /> : <Feather name={icon} size={13} color={tint} />}
      <Text style={{ color: tint, fontSize: 12, fontWeight: '600' }}>{text}</Text>
    </Pressable>
  );
}
