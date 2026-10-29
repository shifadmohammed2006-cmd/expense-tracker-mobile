// © 2026 Expense Tracker. All rights reserved. Unauthorised copying or redistribution is prohibited.
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { useTheme } from '../theme';
import { Card, CategoryBadge, Chip, EmptyNote, Field, MonthSwitcher, ScreenHeader, num, usePad } from '../components/ui';
import { formatCurrency, formatDate } from '../utils/format';

export default function Expenses({ onEdit }) {
  const { colors } = useTheme();
  const pad = usePad();
  const { expenses, categories, settings, loading, refreshing, refresh, month, setMonth, deleteExpense } = useApp();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(null);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return expenses.filter(
      (e) => (!filter || e.categoryId === filter) && (!q || (e.note || '').toLowerCase().includes(q))
    );
  }, [expenses, search, filter]);

  const total = visible.reduce((s, e) => s + e.amount, 0);

  const confirmDelete = (e) =>
    Alert.alert('Delete expense?', `This will permanently remove this ${formatCurrency(e.amount, settings.currency)} expense.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteExpense(e.id) },
    ]);

  const header = (
    <View>
      <ScreenHeader title="Expenses" subtitle={`${visible.length} transaction${visible.length === 1 ? '' : 's'} · ${formatCurrency(total, settings.currency)}`} />
      <MonthSwitcher month={month} onChange={setMonth} />
      <Field
        value={search}
        onChangeText={setSearch}
        placeholder="Search notes"
        autoCorrect={false}
        style={{ marginBottom: 10 }}
        right={search ? (
          <Pressable onPress={() => setSearch('')} hitSlop={10}>
            <Feather name="x" size={18} color={colors.muted} />
          </Pressable>
        ) : <Feather name="search" size={18} color={colors.muted} />}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 14 }}>
        <Chip label="All" active={!filter} onPress={() => setFilter(null)} />
        {categories.map((c) => (
          <Chip key={c.id} label={c.name} color={c.color} active={filter === c.id} onPress={() => setFilter(filter === c.id ? null : c.id)} />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <FlatList
      data={visible}
      keyExtractor={(e) => e.id}
      contentContainerStyle={pad}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      ListHeaderComponent={header}
      ListEmptyComponent={
        loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} /> : <Card><EmptyNote text={expenses.length ? 'No expenses match your filters.' : 'No expenses this month yet.'} /></Card>
      }
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      renderItem={({ item: e }) => {
        const cat = categories.find((c) => c.id === e.categoryId);
        return (
          <Pressable onPress={() => onEdit(e)}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
              <CategoryBadge category={cat} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '600' }} numberOfLines={1}>{e.note || cat?.name || 'Expense'}</Text>
                <Text style={{ color: colors.subtext, fontSize: 12 }} numberOfLines={1}>{cat?.name || 'Uncategorized'} · {formatDate(e.date)}</Text>
              </View>
              <Text style={[{ color: colors.text, fontWeight: '700' }, num]}>-{formatCurrency(e.amount, settings.currency)}</Text>
              <Pressable onPress={() => confirmDelete(e)} hitSlop={10}>
                <Feather name="trash-2" size={18} color={colors.danger} />
              </Pressable>
            </Card>
          </Pressable>
        );
      }}
    />
  );
}
