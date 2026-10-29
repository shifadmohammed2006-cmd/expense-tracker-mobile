// © 2026 Expense Tracker. All rights reserved. Unauthorised copying or redistribution is prohibited.
import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { useTheme } from '../theme';
import { Button, Card, EmptyNote, ProgressBar, ScreenHeader, num, usePad } from '../components/ui';
import { TripSheet } from '../components/TripSheets';
import { formatCurrency, formatDayLabel } from '../utils/format';
import { statusLabel, tripNumbers } from '../utils/trip';

export default function Trips({ onOpen }) {
  const { colors } = useTheme();
  const pad = usePad();
  const { trips, settings, saveTrip, refreshing, refresh } = useApp();
  const [creating, setCreating] = useState(false);
  const cur = settings.currency;

  const create = (trip) => {
    saveTrip(trip);
    setCreating(false);
    onOpen(trip.id);
  };

  return (
    <>
      <ScrollView contentContainerStyle={pad} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}>
        <ScreenHeader title="Trips" subtitle="Plan every rupee before you pack." />
        <Button title="Plan a new trip" icon="plus" onPress={() => setCreating(true)} style={{ marginBottom: 16 }} />

        {trips.length === 0 ? (
          <Card>
            <Text style={{ fontSize: 40, textAlign: 'center' }}>🧳</Text>
            <EmptyNote text={'No trips yet.\nPlan stay, bus, train, food, fuel and split costs with friends - all in one place, even offline.'} />
          </Card>
        ) : (
          trips.map((t) => {
            const nums = tripNumbers(t);
            const tint = nums.status === 'ongoing' ? colors.primary : nums.status === 'completed' ? colors.muted : colors.info;
            return (
              <Pressable key={t.id} onPress={() => onOpen(t.id)} style={{ marginBottom: 12 }}>
                <Card>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: `${tint}18`, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 26 }}>{t.emoji || '🧳'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }} numberOfLines={1}>{t.name}</Text>
                      <Text style={{ fontSize: 12, color: colors.subtext }} numberOfLines={1}>
                        {t.destination ? `${t.destination} · ` : ''}{formatDayLabel(t.startDate)} - {formatDayLabel(t.endDate)}
                      </Text>
                    </View>
                    <View style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: `${tint}18` }}>
                      <Text style={{ color: tint, fontSize: 11, fontWeight: '700' }}>{statusLabel(nums)}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, marginBottom: 8 }}>
                    <Text style={[{ color: colors.text, fontWeight: '600' }, num]}>{formatCurrency(nums.plannedTotal, cur)} planned</Text>
                    <Text style={[{ color: colors.subtext, fontSize: 13 }, num]}>
                      {nums.budget > 0 ? `of ${formatCurrency(nums.budget, cur)}` : `${formatCurrency(nums.perPerson, cur)} / person`}
                    </Text>
                  </View>
                  {nums.budget > 0 ? <ProgressBar value={nums.plannedTotal} max={nums.budget} /> : null}
                </Card>
              </Pressable>
            );
          })
        )}
      </ScrollView>
      <TripSheet visible={creating} trip={null} onClose={() => setCreating(false)} onSave={create} />
    </>
  );
}
