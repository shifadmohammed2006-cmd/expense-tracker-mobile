// © 2026 Expense Tracker. All rights reserved. Unauthorised copying or redistribution is prohibited.
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { useTheme } from '../theme';
import { BarChart, Donut } from '../components/Charts';
import { Card, CategoryBadge, EmptyNote, MonthSwitcher, ProgressBar, ScreenHeader, Title, num, usePad } from '../components/ui';
import SyncPill from '../components/SyncPill';
import { formatCurrency, formatDate, formatDayLabel } from '../utils/format';

function Stat({ label, value, color }) {
  const { colors } = useTheme();
  return (
    <Card style={{ flex: 1, padding: 14 }}>
      <Text style={{ fontSize: 11, color: colors.subtext, fontWeight: '600' }}>{label}</Text>
      <Text style={[{ fontSize: 17, fontWeight: '700', marginTop: 6, color: color || colors.text }, num]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </Card>
  );
}

export default function Dashboard({ onEdit }) {
  const { colors } = useTheme();
  const pad = usePad();
  const { stats, insights, expenses, categories, loading, refreshing, refresh, month, setMonth } = useApp();
  const [selected, setSelected] = useState(null);

  const refreshControl = <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />;

  if (loading || !stats) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const cur = stats.currency;
  const hasLimit = stats.monthlyLimit > 0;
  const pctLeft = hasLimit ? Math.max(0, 100 - (stats.totalSpent / stats.monthlyLimit) * 100) : 0;
  const donutData = stats.byCategory.filter((c) => c.spent > 0).map((c) => ({ value: c.spent, color: c.color }));
  const bars = stats.dailyTrend.map((d) => ({ key: d.date, label: d.date.slice(8), value: d.total, date: d.date }));
  const picked = selected != null && bars[selected] ? bars[selected] : null;

  return (
    <ScrollView contentContainerStyle={pad} refreshControl={refreshControl}>
      <ScreenHeader title="Overview" subtitle="Here's where your money went." right={<SyncPill />} />
      <MonthSwitcher month={month} onChange={(m) => { setSelected(null); setMonth(m); }} />

      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
        <Stat label="SPENT" value={formatCurrency(stats.totalSpent, cur)} />
        <Stat
          label="REMAINING"
          value={hasLimit ? formatCurrency(stats.remaining, cur) : 'No budget'}
          color={hasLimit ? (stats.remaining < 0 ? colors.danger : colors.primary) : colors.muted}
        />
        <Stat label="DAILY AVG" value={formatCurrency(stats.avgPerDay, cur)} color={colors.info} />
      </View>

      {hasLimit ? (
        <Card style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ fontWeight: '600', color: colors.text }}>Monthly budget</Text>
            <Text style={[{ color: colors.subtext, fontSize: 13 }, num]}>
              {formatCurrency(stats.totalSpent, cur)} / {formatCurrency(stats.monthlyLimit, cur)}
            </Text>
          </View>
          <ProgressBar value={stats.totalSpent} max={stats.monthlyLimit} height={10} />
          <Text style={{ marginTop: 8, fontSize: 12, color: colors.subtext }}>
            {stats.totalSpent > stats.monthlyLimit
              ? "You've gone over budget this month."
              : `${pctLeft.toFixed(0)}% of your budget is left.`}
          </Text>
        </Card>
      ) : null}

      {insights && stats.isCurrent && stats.transactionCount > 0 ? (
        <Card style={{ marginBottom: 14 }}>
          <Title style={{ marginBottom: 8 }}>Insights</Title>
          {hasLimit && stats.remaining > 0 && stats.daysLeft > 0 ? (
            <Text style={{ color: colors.text, marginBottom: 6 }}>
              💡 Safe to spend about <Text style={{ fontWeight: '700' }}>{formatCurrency(stats.remaining / stats.daysLeft, cur)}</Text> a day for the rest of the month.
            </Text>
          ) : null}
          {insights.change !== null ? (
            <Text style={{ color: colors.text, marginBottom: 6 }}>
              {insights.change <= 0 ? '📉' : '📈'} {Math.abs(insights.change).toFixed(0)}% {insights.change <= 0 ? 'less' : 'more'} than last month so far.
            </Text>
          ) : null}
          {insights.noSpendStreak > 0 ? (
            <Text style={{ color: colors.text }}>
              🔥 {insights.noSpendStreak} no-spend day{insights.noSpendStreak === 1 ? '' : 's'} in a row. Keep it going!
            </Text>
          ) : null}
        </Card>
      ) : null}

      <Card style={{ marginBottom: 14 }}>
        <Title>By category</Title>
        {donutData.length === 0 ? (
          <EmptyNote text="Add an expense to see the breakdown." />
        ) : (
          <>
            <View style={{ alignItems: 'center', marginBottom: 14 }}>
              <Donut data={donutData}>
                <Text style={{ fontSize: 11, color: colors.subtext }}>Total</Text>
                <Text style={[{ fontSize: 17, fontWeight: '700', color: colors.text }, num]}>{formatCurrency(stats.totalSpent, cur)}</Text>
              </Donut>
            </View>
            {stats.byCategory.filter((c) => c.spent > 0).map((c) => (
              <View key={c.categoryId} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.color }} />
                  <Text style={{ color: colors.text, fontSize: 14 }} numberOfLines={1}>{c.name}</Text>
                </View>
                <Text style={[{ color: colors.subtext, fontSize: 14 }, num]}>{formatCurrency(c.spent, cur)}</Text>
              </View>
            ))}
          </>
        )}
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <Title style={{ marginBottom: 4 }}>Daily spending</Title>
        {bars.length === 0 ? (
          <EmptyNote text="Your daily trend will show up here." />
        ) : (
          <>
            <Text style={[{ fontSize: 13, color: colors.subtext, marginBottom: 8, minHeight: 18 }, num]}>
              {picked ? `${formatDayLabel(picked.date)}: ${formatCurrency(picked.value, cur)}` : 'Tap a bar for details'}
            </Text>
            <BarChart
              data={bars}
              color={colors.primary}
              labelColor={colors.subtext}
              gridColor={colors.border}
              selected={selected}
              onSelect={(i) => setSelected(i === selected ? null : i)}
            />
          </>
        )}
      </Card>

      <Card>
        <Title>Recent transactions</Title>
        {expenses.length === 0 ? (
          <EmptyNote text="Nothing logged yet. Tap + to add your first expense." />
        ) : (
          expenses.slice(0, 6).map((e, i) => {
            const cat = categories.find((c) => c.id === e.categoryId);
            return (
              <Pressable
                key={e.id}
                onPress={() => onEdit(e)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 11,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: colors.border,
                }}
              >
                <CategoryBadge category={cat} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '600' }} numberOfLines={1}>{e.note || cat?.name || 'Expense'}</Text>
                  <Text style={{ color: colors.subtext, fontSize: 12 }}>{formatDate(e.date)}</Text>
                </View>
                <Text style={[{ color: colors.text, fontWeight: '700' }, num]}>-{formatCurrency(e.amount, cur)}</Text>
              </Pressable>
            );
          })
        )}
      </Card>
    </ScrollView>
  );
}
