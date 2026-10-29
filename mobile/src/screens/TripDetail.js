// © 2026 Expense Tracker. All rights reserved. Unauthorised copying or redistribution is prohibited.
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { useTheme } from '../theme';
import { Button, Card, Chip, EmptyNote, Field, ProgressBar, Title, num, usePad } from '../components/ui';
import { Donut } from '../components/Charts';
import { CompareSheet, DayItemSheet, ItemSheet, SpendSheet, TravelersSheet, TripSheet, TypePicker } from '../components/TripSheets';
import { newId } from '../store/storage';
import { formatCurrency, formatDayLabel, listDates, weekdayShort } from '../utils/format';
import { ITEM_TYPES, PACKING_ESSENTIALS, itemAmount, settleUp, statusLabel, tripNumbers, tripSummaryText } from '../utils/trip';
import { COPYRIGHT_SHORT } from '../utils/tripText';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'costs', label: 'Costs' },
  { key: 'days', label: 'Days' },
  { key: 'spend', label: 'Spend' },
  { key: 'pack', label: 'Pack' },
];

function Stat({ label, value, color }) {
  const { colors } = useTheme();
  return (
    <Card style={{ flex: 1, padding: 14 }}>
      <Text style={{ fontSize: 11, color: colors.subtext, fontWeight: '600' }}>{label}</Text>
      <Text style={[{ fontSize: 16, fontWeight: '700', marginTop: 6, color: color || colors.text }, num]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </Card>
  );
}

function TypeBadge({ type, size = 40 }) {
  const t = ITEM_TYPES[type] || ITEM_TYPES.other;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: `${t.color}22`, alignItems: 'center', justifyContent: 'center' }}>
      <MaterialCommunityIcons name={t.icon} size={size * 0.5} color={t.color} />
    </View>
  );
}

export default function TripDetail({ tripId, onBack }) {
  const { colors } = useTheme();
  const pad = usePad();
  const { trips, settings, categories, saveTrip, deleteTrip, addExpense, showToast } = useApp();
  const trip = trips.find((t) => t.id === tripId);
  const [tab, setTab] = useState('overview');
  const [editTrip, setEditTrip] = useState(false);
  const [travelersOpen, setTravelersOpen] = useState(false);
  const [picker, setPicker] = useState(false);
  const [compare, setCompare] = useState(false);
  const [itemSheet, setItemSheet] = useState({ open: false, type: 'stay', item: null });
  const [spendSheet, setSpendSheet] = useState({ open: false, spend: null });
  const [daySheet, setDaySheet] = useState({ open: false, entry: null, date: null });
  const [packText, setPackText] = useState('');

  if (!trip) {
    return (
      <View style={[pad, { flex: 1 }]}>
        <Button title="Back to trips" icon="arrow-left" variant="outline" onPress={onBack} />
      </View>
    );
  }

  const cur = settings.currency;
  const money = (v) => formatCurrency(v, cur);
  const nums = tripNumbers(trip);
  const nameOf = (id) => trip.travelers.find((t) => t.id === id)?.name || '?';
  const patch = (changes) => saveTrip({ ...trip, ...changes });

  // ----- planned costs -----
  const saveItem = (item) => {
    const exists = trip.plan.some((i) => i.id === item.id);
    patch({ plan: exists ? trip.plan.map((i) => (i.id === item.id ? item : i)) : [...trip.plan, item] });
    setItemSheet({ open: false, type: 'stay', item: null });
  };
  const deleteItem = (id) => {
    patch({ plan: trip.plan.filter((i) => i.id !== id) });
    setItemSheet({ open: false, type: 'stay', item: null });
  };
  const addFromCompare = (type, d) => {
    const def = ITEM_TYPES[type];
    patch({ plan: [...trip.plan, { id: newId('c'), type, title: def.label, d, amount: itemAmount(type, d), booked: false }] });
    setCompare(false);
    showToast(`${def.label} added to plan.`);
  };

  // ----- actual spending -----
  const saveSpend = (spend, alsoExpense) => {
    const exists = trip.spends.some((s) => s.id === spend.id);
    patch({ spends: exists ? trip.spends.map((s) => (s.id === spend.id ? spend : s)) : [spend, ...trip.spends] });
    setSpendSheet({ open: false, spend: null });
    if (alsoExpense) {
      const cat = categories.find((c) => c.name === 'Travel') || categories.find((c) => c.name === 'Transport') || categories[0];
      if (cat) {
        // only the share that belongs to the person using the app would be "theirs"; log the full amount they paid
        addExpense({ amount: spend.amount, categoryId: cat.id, date: spend.date, note: `${trip.name}: ${spend.title}` });
      }
    }
  };

  // ----- itinerary -----
  const saveDay = (entry) => {
    const list = trip.itinerary || [];
    const exists = list.some((e) => e.id === entry.id);
    patch({ itinerary: exists ? list.map((e) => (e.id === entry.id ? entry : e)) : [...list, entry] });
    setDaySheet({ open: false, entry: null, date: null });
  };

  // ----- packing -----
  const addPack = (text, group = 'Custom') => {
    if (!text.trim()) return;
    patch({ packing: [...(trip.packing || []), { id: newId('k'), text: text.trim(), group, done: false }] });
  };
  const addEssentials = () => {
    const have = new Set((trip.packing || []).map((p) => p.text.toLowerCase()));
    const add = [];
    PACKING_ESSENTIALS.forEach(([group, items]) =>
      items.forEach((text) => !have.has(text.toLowerCase()) && add.push({ id: newId('k'), text, group, done: false }))
    );
    if (add.length) patch({ packing: [...(trip.packing || []), ...add] });
  };

  const confirmDelete = () =>
    Alert.alert('Delete this trip?', 'The plan, itinerary, spending and packing list will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteTrip(trip.id); onBack(); } },
    ]);

  const share = () => Share.share({ message: tripSummaryText(trip, cur), title: trip.name }).catch(() => {});

  // ================= TABS =================
  const overview = (
    <>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
        <Stat label="PLANNED" value={money(nums.plannedTotal)} />
        <Stat label="SPENT" value={money(nums.actual)} color={nums.budget > 0 && nums.actual > nums.budget ? colors.danger : colors.info} />
        <Stat label="BOOKED" value={money(nums.booked)} color={colors.primary} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
        <Stat label="PER PERSON" value={money(nums.perPerson)} />
        <Stat label="PER DAY" value={money(nums.perDay)} />
        <Stat label="TRAVELLERS" value={String(nums.people)} />
      </View>

      {nums.budget > 0 ? (
        <Card style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ fontWeight: '600', color: colors.text }}>Trip budget</Text>
            <Text style={[{ color: colors.subtext, fontSize: 13 }, num]}>{money(nums.budget)}</Text>
          </View>
          <Text style={{ fontSize: 12, color: colors.subtext, marginBottom: 4 }}>Planned</Text>
          <ProgressBar value={nums.plannedTotal} max={nums.budget} height={10} />
          <Text style={{ fontSize: 12, color: colors.subtext, marginTop: 10, marginBottom: 4 }}>Actually spent</Text>
          <ProgressBar value={nums.actual} max={nums.budget} height={10} />
          <Text style={{ marginTop: 10, fontSize: 13, color: nums.planVsBudget < 0 ? colors.danger : colors.primary, fontWeight: '600' }}>
            {nums.planVsBudget < 0 ? `Plan is ${money(-nums.planVsBudget)} over budget` : `Plan fits - ${money(nums.planVsBudget)} to spare`}
          </Text>
          {nums.actual > 0 ? (
            <Text style={{ marginTop: 4, fontSize: 13, color: colors.subtext }}>
              {nums.actualVsBudget < 0 ? `Spending is ${money(-nums.actualVsBudget)} over budget.` : `You can spend about ${money(nums.safePerDay)} per day for the rest of the trip.`}
            </Text>
          ) : null}
        </Card>
      ) : null}

      <Card style={{ marginBottom: 14 }}>
        <Title>Where the money goes</Title>
        {Object.keys(nums.plannedByType).length === 0 ? (
          <EmptyNote text="Add costs in the Costs tab to see the split." />
        ) : (
          <>
            <View style={{ alignItems: 'center', marginBottom: 14 }}>
              <Donut data={Object.entries(nums.plannedByType).map(([k, v]) => ({ value: v, color: ITEM_TYPES[k].color }))}>
                <Text style={{ fontSize: 11, color: colors.subtext }}>Planned</Text>
                <Text style={[{ fontSize: 16, fontWeight: '700', color: colors.text }, num]}>{money(nums.planned)}</Text>
              </Donut>
            </View>
            {Object.entries(nums.plannedByType).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
              <View key={k} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 10 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: ITEM_TYPES[k].color }} />
                <Text style={{ flex: 1, color: colors.text }}>{ITEM_TYPES[k].label}</Text>
                <Text style={[{ color: colors.subtext }, num]}>{money(v)}</Text>
              </View>
            ))}
            {nums.buffer > 0 ? (
              <Text style={{ color: colors.subtext, fontSize: 12, marginTop: 8 }}>
                + {money(nums.buffer)} emergency buffer ({trip.contingencyPct}%) is included in the totals above.
              </Text>
            ) : null}
          </>
        )}
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <Title>Travellers</Title>
        <Text style={{ color: colors.text, marginBottom: 12 }}>{trip.travelers.map((t) => t.name).join(' · ')}</Text>
        <Button title="Edit travellers" variant="outline" icon="users" onPress={() => setTravelersOpen(true)} />
      </Card>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title="Share plan" icon="share-2" onPress={share} style={{ flex: 1 }} />
        <Button title="Edit" variant="outline" icon="edit-2" onPress={() => setEditTrip(true)} style={{ flex: 1 }} />
      </View>
      <Button title="Delete trip" variant="dangerOutline" icon="trash-2" onPress={confirmDelete} style={{ marginTop: 10 }} />
    </>
  );

  const costs = (
    <>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
        <Button title="Add cost" icon="plus" onPress={() => setPicker(true)} style={{ flex: 1 }} />
        <Button title="Compare" icon="shuffle" variant="outline" onPress={() => setCompare(true)} style={{ flex: 1 }} />
      </View>
      {trip.plan.length === 0 ? (
        <Card><EmptyNote text={'Nothing planned yet.\nAdd room, bus, train, food, fuel and more - totals are worked out for you.'} /></Card>
      ) : (
        <Card style={{ paddingVertical: 6 }}>
          {trip.plan.map((i, idx) => {
            const def = ITEM_TYPES[i.type] || ITEM_TYPES.other;
            return (
              <Pressable
                key={i.id}
                onPress={() => setItemSheet({ open: true, type: i.type, item: i })}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: colors.border }}
              >
                <TypeBadge type={i.type} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '600' }} numberOfLines={1}>{i.title}</Text>
                  <Text style={{ color: colors.subtext, fontSize: 12 }} numberOfLines={1}>{def.sub(i.d)}</Text>
                </View>
                <Text style={[{ color: colors.text, fontWeight: '700' }, num]}>{money(i.amount)}</Text>
                <Pressable
                  onPress={() => patch({ plan: trip.plan.map((x) => (x.id === i.id ? { ...x, booked: !x.booked } : x)) })}
                  hitSlop={10}
                  accessibilityLabel="Mark as booked"
                >
                  <Feather name={i.booked ? 'check-circle' : 'circle'} size={22} color={i.booked ? colors.primary : colors.muted} />
                </Pressable>
              </Pressable>
            );
          })}
        </Card>
      )}
      {trip.plan.length > 0 ? (
        <Card style={{ marginTop: 14 }}>
          <Row label="Planned costs" value={money(nums.planned)} />
          <Row label={`Emergency buffer (${trip.contingencyPct}%)`} value={money(nums.buffer)} />
          <Row label="Total" value={money(nums.plannedTotal)} bold />
          <Text style={{ color: colors.subtext, fontSize: 12, marginTop: 8 }}>Tap the circle on a cost once it is booked or paid.</Text>
        </Card>
      ) : null}
    </>
  );

  const dates = listDates(trip.startDate, trip.endDate);
  const days = (
    <>
      <Button title="Add to itinerary" icon="plus" onPress={() => setDaySheet({ open: true, entry: null, date: null })} style={{ marginBottom: 14 }} />
      {dates.map((dt, idx) => {
        const entries = (trip.itinerary || []).filter((e) => e.date === dt).sort((a, b) => String(a.time).localeCompare(String(b.time)));
        return (
          <Card key={dt} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: entries.length ? 8 : 0 }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>Day {idx + 1} · {weekdayShort(dt)}, {formatDayLabel(dt)}</Text>
              <Pressable onPress={() => setDaySheet({ open: true, entry: null, date: dt })} hitSlop={10}>
                <Feather name="plus-circle" size={20} color={colors.primary} />
              </Pressable>
            </View>
            {entries.length === 0 ? <Text style={{ color: colors.subtext, fontSize: 13, marginTop: 6 }}>Nothing planned</Text> : null}
            {entries.map((e) => (
              <Pressable key={e.id} onPress={() => setDaySheet({ open: true, entry: e, date: null })} style={{ flexDirection: 'row', gap: 12, paddingVertical: 8 }}>
                <Pressable onPress={() => patch({ itinerary: trip.itinerary.map((x) => (x.id === e.id ? { ...x, done: !x.done } : x)) })} hitSlop={10}>
                  <Feather name={e.done ? 'check-square' : 'square'} size={20} color={e.done ? colors.primary : colors.muted} />
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, textDecorationLine: e.done ? 'line-through' : 'none' }}>{e.time ? `${e.time} · ` : ''}{e.title}</Text>
                  {e.note ? <Text style={{ color: colors.subtext, fontSize: 12 }}>{e.note}</Text> : null}
                </View>
              </Pressable>
            ))}
          </Card>
        );
      })}
    </>
  );

  const { paid, share: shares, transfers } = settleUp(trip);
  const spend = (
    <>
      <Button title="Log spending" icon="plus" onPress={() => setSpendSheet({ open: true, spend: null })} style={{ marginBottom: 14 }} />
      <Card style={{ marginBottom: 14 }}>
        <Title>Settle up</Title>
        {trip.spends.length === 0 ? (
          <EmptyNote text="Log what you spend and who paid - the app works out who owes whom." />
        ) : transfers.length === 0 ? (
          <Text style={{ color: colors.primary, fontWeight: '600' }}>Everyone is settled up 🎉</Text>
        ) : (
          transfers.map((t, i) => (
            <Text key={i} style={{ color: colors.text, paddingVertical: 5, fontSize: 15 }}>
              <Text style={{ fontWeight: '700' }}>{nameOf(t.from)}</Text> pays <Text style={{ fontWeight: '700' }}>{nameOf(t.to)}</Text>{'  '}
              <Text style={[{ color: colors.primary, fontWeight: '700' }, num]}>{money(t.amount)}</Text>
            </Text>
          ))
        )}
        {trip.spends.length > 0 ? (
          <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 }}>
            {trip.travelers.map((p) => (
              <View key={p.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
                <Text style={{ color: colors.text }}>{p.name}</Text>
                <Text style={[{ color: colors.subtext, fontSize: 13 }, num]}>paid {money(paid[p.id])} · share {money(shares[p.id])}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </Card>
      {trip.spends.length > 0 ? (
        <Card style={{ paddingVertical: 6 }}>
          {trip.spends.map((s, idx) => (
            <Pressable key={s.id} onPress={() => setSpendSheet({ open: true, spend: s })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: colors.border }}>
              <TypeBadge type={s.type} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '600' }} numberOfLines={1}>{s.title}</Text>
                <Text style={{ color: colors.subtext, fontSize: 12 }} numberOfLines={1}>{nameOf(s.paidBy)} paid · {formatDayLabel(s.date)}</Text>
              </View>
              <Text style={[{ color: colors.text, fontWeight: '700' }, num]}>{money(s.amount)}</Text>
            </Pressable>
          ))}
        </Card>
      ) : null}
    </>
  );

  const packing = trip.packing || [];
  const groups = [...new Set(packing.map((p) => p.group))];
  const doneCount = packing.filter((p) => p.done).length;
  const pack = (
    <>
      <Card style={{ marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={{ fontWeight: '600', color: colors.text }}>Packing list</Text>
          <Text style={{ color: colors.subtext }}>{doneCount} / {packing.length}</Text>
        </View>
        <ProgressBar value={doneCount} max={packing.length} />
        <Button title="Add trip essentials" icon="package" variant="outline" onPress={addEssentials} style={{ marginTop: 14 }} />
      </Card>
      <Card style={{ marginBottom: 14 }}>
        <PackInput value={packText} onChange={setPackText} onSubmit={() => { addPack(packText); setPackText(''); }} />
      </Card>
      {groups.map((g) => (
        <Card key={g} style={{ marginBottom: 12 }}>
          <Text style={{ fontWeight: '700', color: colors.text, marginBottom: 6 }}>{g}</Text>
          {packing.filter((p) => p.group === g).map((p) => (
            <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 7 }}>
              <Pressable onPress={() => patch({ packing: packing.map((x) => (x.id === p.id ? { ...x, done: !x.done } : x)) })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <Feather name={p.done ? 'check-square' : 'square'} size={20} color={p.done ? colors.primary : colors.muted} />
                <Text style={{ color: colors.text, flex: 1, textDecorationLine: p.done ? 'line-through' : 'none' }}>{p.text}</Text>
              </Pressable>
              <Pressable onPress={() => patch({ packing: packing.filter((x) => x.id !== p.id) })} hitSlop={10}>
                <Feather name="x" size={16} color={colors.muted} />
              </Pressable>
            </View>
          ))}
        </Card>
      ))}
    </>
  );

  const body = { overview, costs, days, spend, pack }[tab];

  return (
    <>
      <ScrollView contentContainerStyle={pad} keyboardShouldPersistTaps="handled">
        <Pressable onPress={onBack} hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <Feather name="arrow-left" size={18} color={colors.primary} />
          <Text style={{ color: colors.primary, fontWeight: '600' }}>All trips</Text>
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <Text style={{ fontSize: 34 }}>{trip.emoji || '🧳'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text }} numberOfLines={1}>{trip.name}</Text>
            <Text style={{ color: colors.subtext, fontSize: 13 }} numberOfLines={1}>
              {trip.destination ? `${trip.destination} · ` : ''}{formatDayLabel(trip.startDate)} - {formatDayLabel(trip.endDate)} · {statusLabel(nums)}
            </Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 14 }}>
          {TABS.map((t) => (
            <Chip key={t.key} label={t.label} active={tab === t.key} onPress={() => setTab(t.key)} />
          ))}
        </ScrollView>

        {body}
        <Text style={{ textAlign: 'center', color: colors.muted, fontSize: 11, marginTop: 20 }}>{COPYRIGHT_SHORT}</Text>
      </ScrollView>

      <TripSheet visible={editTrip} trip={trip} onClose={() => setEditTrip(false)} onSave={(t) => { saveTrip(t); setEditTrip(false); }} />
      <TravelersSheet visible={travelersOpen} trip={trip} showToast={showToast} onClose={() => setTravelersOpen(false)} onSave={(list) => { patch({ travelers: list }); setTravelersOpen(false); }} />
      <TypePicker visible={picker} onClose={() => setPicker(false)} onPick={(type) => { setPicker(false); setItemSheet({ open: true, type, item: null }); }} />
      <ItemSheet visible={itemSheet.open} trip={trip} type={itemSheet.type} item={itemSheet.item} currency={cur} onClose={() => setItemSheet((s) => ({ ...s, open: false }))} onSave={saveItem} onDelete={deleteItem} />
      <CompareSheet visible={compare} trip={trip} currency={cur} onClose={() => setCompare(false)} onAdd={addFromCompare} />
      <SpendSheet visible={spendSheet.open} trip={trip} spend={spendSheet.spend} currency={cur} onClose={() => setSpendSheet({ open: false, spend: null })} onSave={saveSpend} onDelete={(id) => { patch({ spends: trip.spends.filter((s) => s.id !== id) }); setSpendSheet({ open: false, spend: null }); }} />
      <DayItemSheet visible={daySheet.open} trip={trip} entry={daySheet.entry} defaultDate={daySheet.date} onClose={() => setDaySheet({ open: false, entry: null, date: null })} onSave={saveDay} onDelete={(id) => { patch({ itinerary: trip.itinerary.filter((e) => e.id !== id) }); setDaySheet({ open: false, entry: null, date: null }); }} />
    </>
  );
}

function Row({ label, value, bold }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
      <Text style={{ color: bold ? colors.text : colors.subtext, fontWeight: bold ? '700' : '400' }}>{label}</Text>
      <Text style={[{ color: colors.text, fontWeight: bold ? '700' : '500' }, num]}>{value}</Text>
    </View>
  );
}

function PackInput({ value, onChange, onSubmit }) {
  const { colors } = useTheme();
  return (
    <Field
      value={value}
      onChangeText={onChange}
      onSubmitEditing={onSubmit}
      placeholder="Add your own item"
      returnKeyType="done"
      style={{ marginBottom: 0 }}
      right={
        <Pressable onPress={onSubmit} hitSlop={10}>
          <Feather name="plus" size={20} color={colors.primary} />
        </Pressable>
      }
    />
  );
}
