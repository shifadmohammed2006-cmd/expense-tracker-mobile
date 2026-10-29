// © 2026 Expense Tracker. All rights reserved. Unauthorised copying or redistribution is prohibited.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { useTheme } from '../theme';
import { Button, Card, CategoryBadge, Field, MonthSwitcher, ProgressBar, ScreenHeader, Title, num, usePad } from '../components/ui';
import { formatCurrency } from '../utils/format';

export default function Budget() {
  const { colors } = useTheme();
  const pad = usePad();
  const { categories, stats, settings, loading, refreshing, refresh, month, setMonth, saveBudgets } = useApp();
  const [limit, setLimit] = useState('');
  const [catBudgets, setCatBudgets] = useState({});
  const [saving, setSaving] = useState(false);

  // Fill the inputs whenever fresh data arrives from the server.
  useEffect(() => {
    setLimit(settings.monthlyLimit ? String(settings.monthlyLimit) : '');
    setCatBudgets(Object.fromEntries(categories.map((c) => [c.id, c.budget ? String(c.budget) : ''])));
  }, [settings, categories]);

  const parse = (s) => {
    const n = Number(String(s).replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  const save = async () => {
    const changes = {};
    for (const c of categories) {
      const next = parse(catBudgets[c.id]);
      if (next !== (c.budget || 0)) changes[c.id] = next;
    }
    setSaving(true);
    await saveBudgets(parse(limit), changes);
    setSaving(false);
  };

  if (loading || !stats) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.primary} /></View>;
  }

  const cur = settings.currency;
  const spentBy = Object.fromEntries(stats.byCategory.map((c) => [c.categoryId, c.spent]));
  const monthLimit = parse(limit);

  return (
    <ScrollView
      contentContainerStyle={pad}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
    >
      <ScreenHeader title="Budget" subtitle="Set limits and watch your progress." />
      <MonthSwitcher month={month} onChange={setMonth} />

      <Card style={{ marginBottom: 14 }}>
        <Title>Monthly limit</Title>
        <Field value={limit} onChangeText={setLimit} placeholder="0 (no limit)" keyboardType="decimal-pad" label={`OVERALL LIMIT (${cur})`} />
        {monthLimit > 0 ? (
          <>
            <ProgressBar value={stats.totalSpent} max={monthLimit} height={10} />
            <Text style={[{ marginTop: 8, fontSize: 12, color: colors.subtext }, num]}>
              {formatCurrency(stats.totalSpent, cur)} spent of {formatCurrency(monthLimit, cur)}
            </Text>
          </>
        ) : null}
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Title>Category limits</Title>
        {categories.map((c, i) => {
          const spent = spentBy[c.id] || 0;
          const b = parse(catBudgets[c.id]);
          return (
            <View key={c.id} style={{ paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <CategoryBadge category={c} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '600' }} numberOfLines={1}>{c.name}</Text>
                  <Text style={[{ color: spent > b && b > 0 ? colors.danger : colors.subtext, fontSize: 12 }, num]}>
                    {formatCurrency(spent, cur)} spent
                  </Text>
                </View>
                <Field
                  value={catBudgets[c.id] ?? ''}
                  onChangeText={(t) => setCatBudgets((s) => ({ ...s, [c.id]: t }))}
                  placeholder="No limit"
                  keyboardType="decimal-pad"
                  style={{ width: 118, marginBottom: 0 }}
                  inputStyle={{ fontSize: 15, paddingVertical: 9, textAlign: 'right' }}
                />
              </View>
              {b > 0 ? <View style={{ marginTop: 10 }}><ProgressBar value={spent} max={b} /></View> : null}
            </View>
          );
        })}
      </Card>

      <Button title="Save budgets" onPress={save} loading={saving} />
    </ScrollView>
  );
}
