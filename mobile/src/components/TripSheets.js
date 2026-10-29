// © 2026 Expense Tracker. All rights reserved. Unauthorised copying or redistribution is prohibited.
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { newId } from '../store/storage';
import { addDays, formatCurrency, isValidDateStr, listDates, toDateStr, weekdayShort, formatDayLabel } from '../utils/format';
import { ITEM_KEYS, ITEM_TYPES, TRIP_EMOJIS, itemAmount, newItemDefaults, tripContext } from '../utils/trip';
import { Button, Chip, Field, SheetModal } from './ui';

const label = (colors, text) => (
  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.subtext, marginBottom: 8 }}>{text}</Text>
);

// Text date box with one-tap shortcuts, so nobody has to type a whole date.
function DateField({ title, value, onChange, shortcuts }) {
  return (
    <View>
      <Field label={title} value={value} onChangeText={onChange} placeholder="2026-12-25" keyboardType="numbers-and-punctuation" maxLength={10} autoCorrect={false} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: -6, marginBottom: 14 }}>
        {shortcuts.map((s) => (
          <Chip key={s.label} label={s.label} active={value === s.value} onPress={() => onChange(s.value)} />
        ))}
      </ScrollView>
    </View>
  );
}

// ---------- Create / edit a trip ----------
export function TripSheet({ visible, trip, onClose, onSave }) {
  const { colors } = useTheme();
  const today = toDateStr();
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [emoji, setEmoji] = useState(TRIP_EMOJIS[0]);
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [budget, setBudget] = useState('');
  const [people, setPeople] = useState('2');
  const [buffer, setBuffer] = useState('10');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setError('');
    setName(trip?.name || '');
    setDestination(trip?.destination || '');
    setEmoji(trip?.emoji || TRIP_EMOJIS[0]);
    setStart(trip?.startDate || addDays(today, 7));
    setEnd(trip?.endDate || addDays(today, 10));
    setBudget(trip?.budget ? String(trip.budget) : '');
    setPeople(String(trip?.travelers?.length || 2));
    setBuffer(String(trip?.contingencyPct ?? 10));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, trip]);

  const submit = () => {
    if (!name.trim()) return setError('Give your trip a name.');
    if (!isValidDateStr(start) || !isValidDateStr(end)) return setError('Dates must look like 2026-12-25.');
    if (end < start) return setError('The end date is before the start date.');
    const count = Math.min(Math.max(parseInt(people, 10) || 1, 1), 30);
    let travelers = trip?.travelers;
    if (!travelers) {
      travelers = Array.from({ length: count }, (_, i) => ({ id: newId('p'), name: i === 0 ? 'Me' : `Traveller ${i + 1}` }));
    }
    onSave({
      ...(trip || { id: newId('trip'), plan: [], spends: [], itinerary: [], packing: [], notes: '', createdAt: Date.now() }),
      name: name.trim(),
      destination: destination.trim(),
      emoji,
      startDate: start,
      endDate: end,
      budget: Number(budget) || 0,
      contingencyPct: Math.min(Math.max(Number(buffer) || 0, 0), 100),
      travelers,
    });
  };

  const shortcuts = (base) => [
    { label: 'Today', value: today },
    { label: 'Next week', value: addDays(today, 7) },
    { label: '+1 day', value: addDays(base, 1) },
    { label: '+2 days', value: addDays(base, 2) },
    { label: '+3 days', value: addDays(base, 3) },
  ];

  return (
    <SheetModal visible={visible} onClose={onClose} title={trip ? 'Edit trip' : 'Plan a new trip'}>
      {label(colors, 'PICK A MOOD')}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {TRIP_EMOJIS.map((e) => (
          <Pressable key={e} onPress={() => setEmoji(e)} style={{ width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: emoji === e ? `${colors.primary}22` : colors.input, borderWidth: 1, borderColor: emoji === e ? colors.primary : colors.border }}>
            <Text style={{ fontSize: 22 }}>{e}</Text>
          </Pressable>
        ))}
      </View>
      <Field label="TRIP NAME" value={name} onChangeText={setName} placeholder="Goa with friends" maxLength={60} />
      <Field label="DESTINATION" value={destination} onChangeText={setDestination} placeholder="Goa" maxLength={60} />
      <DateField title="START DATE (YYYY-MM-DD)" value={start} onChange={setStart} shortcuts={shortcuts(today).slice(0, 2)} />
      <DateField title="END DATE (YYYY-MM-DD)" value={end} onChange={setEnd} shortcuts={shortcuts(isValidDateStr(start) ? start : today).slice(2)} />
      <Field label="TOTAL TRIP BUDGET (OPTIONAL)" value={budget} onChangeText={setBudget} placeholder="0" keyboardType="decimal-pad" />
      {!trip ? <Field label="HOW MANY TRAVELLERS (INCLUDING YOU)" value={people} onChangeText={setPeople} keyboardType="number-pad" maxLength={2} /> : null}
      <Field label="EMERGENCY BUFFER % (ADDED ON TOP OF PLANNED COSTS)" value={buffer} onChangeText={setBuffer} keyboardType="decimal-pad" maxLength={3} />
      {error ? <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text> : null}
      <Button title={trip ? 'Save trip' : 'Create trip'} onPress={submit} />
    </SheetModal>
  );
}

// ---------- Pick which kind of cost to add ----------
export function TypePicker({ visible, onClose, onPick }) {
  const { colors } = useTheme();
  return (
    <SheetModal visible={visible} onClose={onClose} title="What are you planning?">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {ITEM_KEYS.map((k) => {
          const t = ITEM_TYPES[k];
          return (
            <Pressable key={k} onPress={() => onPick(k)} style={{ width: '47.5%', padding: 14, borderRadius: 16, backgroundColor: `${t.color}14`, borderWidth: 1, borderColor: `${t.color}40` }}>
              <MaterialCommunityIcons name={t.icon} size={24} color={t.color} />
              <Text style={{ marginTop: 8, color: colors.text, fontWeight: '600', fontSize: 14 }}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </SheetModal>
  );
}

// ---------- Add / edit one planned cost (form is built from ITEM_TYPES) ----------
export function ItemSheet({ visible, trip, type, item, currency, onClose, onSave, onDelete }) {
  const { colors } = useTheme();
  const [title, setTitle] = useState('');
  const [d, setD] = useState({});
  const [error, setError] = useState('');
  const def = ITEM_TYPES[type] || ITEM_TYPES.other;

  useEffect(() => {
    if (!visible) return;
    setError('');
    if (item) {
      setTitle(item.title || '');
      setD({ ...item.d });
    } else {
      setTitle('');
      setD(newItemDefaults(type, trip));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, item, type]);

  const set = (k, v) => setD((s) => ({ ...s, [k]: v }));
  const total = itemAmount(type, d);

  const submit = () => {
    if (!(total > 0)) return setError('Fill in the numbers so the total is more than 0.');
    onSave({
      id: item?.id || newId('c'),
      type,
      title: title.trim() || def.label,
      d,
      amount: total,
      booked: item?.booked || false,
    });
  };

  return (
    <SheetModal visible={visible} onClose={onClose} title={item ? `Edit ${def.label}` : `Add ${def.label}`}>
      <Field label="TITLE (OPTIONAL)" value={title} onChangeText={setTitle} placeholder={def.label} maxLength={60} />
      {def.fields.map((f) => {
        if (f.kind === 'bool') {
          return (
            <View key={f.k} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.subtext }}>{f.label}</Text>
              <Switch value={!!d[f.k]} onValueChange={(v) => set(f.k, v)} trackColor={{ true: colors.primary }} />
            </View>
          );
        }
        if (f.kind === 'choice') {
          return (
            <View key={f.k} style={{ marginBottom: 14 }}>
              {label(colors, f.label)}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {f.options.map((o) => (
                  <Chip key={o} label={o} active={d[f.k] === o} onPress={() => set(f.k, o)} />
                ))}
              </View>
            </View>
          );
        }
        return (
          <Field
            key={f.k}
            label={f.label}
            value={d[f.k] === undefined || d[f.k] === null ? '' : String(d[f.k])}
            onChangeText={(v) => set(f.k, v)}
            placeholder={f.placeholder || '0'}
            keyboardType={f.kind === 'text' ? 'default' : f.kind === 'int' ? 'number-pad' : 'decimal-pad'}
          />
        );
      })}
      <View style={{ backgroundColor: `${def.color}14`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <Text style={{ color: colors.subtext, fontSize: 12, fontWeight: '600' }}>PLANNED TOTAL</Text>
        <Text style={{ color: def.color, fontSize: 24, fontWeight: '700', marginTop: 2 }}>{formatCurrency(total, currency)}</Text>
        <Text style={{ color: colors.subtext, fontSize: 12, marginTop: 2 }}>{def.sub(d)}</Text>
      </View>
      {error ? <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text> : null}
      <Button title={item ? 'Save changes' : 'Add to plan'} onPress={submit} />
      {item ? <Button title="Delete" variant="dangerOutline" icon="trash-2" onPress={() => onDelete(item.id)} style={{ marginTop: 10 }} /> : null}
    </SheetModal>
  );
}

// ---------- Log what was actually spent, and who it is split with ----------
export function SpendSheet({ visible, trip, spend, currency, onClose, onSave, onDelete }) {
  const { colors } = useTheme();
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('food');
  const [date, setDate] = useState(toDateStr());
  const [paidBy, setPaidBy] = useState(null);
  const [split, setSplit] = useState([]);
  const [alsoExpense, setAlsoExpense] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setError('');
    setAlsoExpense(false);
    const ids = trip.travelers.map((t) => t.id);
    setTitle(spend?.title || '');
    setAmount(spend ? String(spend.amount) : '');
    setType(spend?.type || 'food');
    setDate(spend?.date || toDateStr());
    setPaidBy(spend?.paidBy || ids[0]);
    setSplit(spend?.splitAmong?.length ? spend.splitAmong : ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, spend]);

  const toggle = (id) => setSplit((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const submit = () => {
    const value = Number(String(amount).replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) return setError('Enter an amount greater than 0.');
    if (!isValidDateStr(date)) return setError('Date must look like 2026-12-25.');
    if (!split.length) return setError('Pick at least one person to split with.');
    onSave({ id: spend?.id || newId('s'), title: title.trim() || ITEM_TYPES[type].label, amount: value, type, date, paidBy, splitAmong: split }, alsoExpense && !spend);
  };

  const each = split.length ? (Number(amount) || 0) / split.length : 0;

  return (
    <SheetModal visible={visible} onClose={onClose} title={spend ? 'Edit spending' : 'Log spending'}>
      <Field label={`AMOUNT (${currency})`} value={amount} onChangeText={setAmount} placeholder="0" keyboardType="decimal-pad" inputStyle={{ fontSize: 26, fontWeight: '700' }} />
      <Field label="WHAT FOR" value={title} onChangeText={setTitle} placeholder="Dinner at the beach shack" maxLength={60} />
      {label(colors, 'TYPE')}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
        {ITEM_KEYS.map((k) => (
          <Chip key={k} label={ITEM_TYPES[k].label.split(' ')[0]} color={ITEM_TYPES[k].color} active={type === k} onPress={() => setType(k)} />
        ))}
      </ScrollView>
      <Field label="DATE (YYYY-MM-DD)" value={date} onChangeText={setDate} keyboardType="numbers-and-punctuation" maxLength={10} autoCorrect={false} />
      {label(colors, 'PAID BY')}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {trip.travelers.map((t) => (
          <Chip key={t.id} label={t.name} active={paidBy === t.id} onPress={() => setPaidBy(t.id)} />
        ))}
      </View>
      {label(colors, 'SPLIT BETWEEN')}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        {trip.travelers.map((t) => (
          <Chip key={t.id} label={t.name} active={split.includes(t.id)} onPress={() => toggle(t.id)} />
        ))}
      </View>
      {split.length > 0 && each > 0 ? (
        <Text style={{ color: colors.subtext, fontSize: 12, marginBottom: 14 }}>{formatCurrency(each, currency)} each</Text>
      ) : null}
      {!spend ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 8 }}>
          <Text style={{ color: colors.text, flex: 1, paddingRight: 12 }}>Also add to my own expenses</Text>
          <Switch value={alsoExpense} onValueChange={setAlsoExpense} trackColor={{ true: colors.primary }} />
        </View>
      ) : null}
      {error ? <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text> : null}
      <Button title={spend ? 'Save changes' : 'Add spending'} onPress={submit} />
      {spend ? <Button title="Delete" variant="dangerOutline" icon="trash-2" onPress={() => onDelete(spend.id)} style={{ marginTop: 10 }} /> : null}
    </SheetModal>
  );
}

// ---------- Itinerary entry ----------
export function DayItemSheet({ visible, trip, entry, defaultDate, onClose, onSave, onDelete }) {
  const { colors } = useTheme();
  const dates = useMemo(() => listDates(trip.startDate, trip.endDate), [trip.startDate, trip.endDate]);
  const [date, setDate] = useState(dates[0]);
  const [time, setTime] = useState('');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setError('');
    setDate(entry?.date || defaultDate || dates[0]);
    setTime(entry?.time || '');
    setTitle(entry?.title || '');
    setNote(entry?.note || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, entry]);

  const submit = () => {
    if (!title.trim()) return setError('What is the plan?');
    onSave({ id: entry?.id || newId('d'), date, time: time.trim(), title: title.trim(), note: note.trim(), done: entry?.done || false });
  };

  return (
    <SheetModal visible={visible} onClose={onClose} title={entry ? 'Edit plan' : 'Add to itinerary'}>
      {label(colors, 'DAY')}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
        {dates.map((dt, i) => (
          <Chip key={dt} label={`Day ${i + 1} · ${formatDayLabel(dt)}`} active={date === dt} onPress={() => setDate(dt)} />
        ))}
      </ScrollView>
      <Field label="TIME (OPTIONAL)" value={time} onChangeText={setTime} placeholder="9:30 AM" maxLength={12} />
      <Field label="PLAN" value={title} onChangeText={setTitle} placeholder="Visit Fort Aguada" maxLength={80} />
      <Field label="NOTE (OPTIONAL)" value={note} onChangeText={setNote} placeholder="Book tickets online first" maxLength={200} />
      {error ? <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text> : null}
      <Button title={entry ? 'Save changes' : 'Add'} onPress={submit} />
      {entry ? <Button title="Delete" variant="dangerOutline" icon="trash-2" onPress={() => onDelete(entry.id)} style={{ marginTop: 10 }} /> : null}
    </SheetModal>
  );
}

// ---------- Bus vs Train vs Flight vs Cab ----------
const MODES = [
  { key: 'bus', label: 'Bus' },
  { key: 'train', label: 'Train' },
  { key: 'flight', label: 'Flight' },
  { key: 'cab', label: 'Cab (whole car)' },
];

export function CompareSheet({ visible, trip, currency, onClose, onAdd }) {
  const { colors } = useTheme();
  const ctx = tripContext(trip);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [round, setRound] = useState(true);
  const [fares, setFares] = useState({});
  const [hours, setHours] = useState({});

  useEffect(() => {
    if (visible) {
      setFrom('');
      setTo('');
      setRound(true);
      setFares({});
      setHours({});
    }
  }, [visible]);

  const rows = MODES.map((m) => {
    const fare = Number(fares[m.key]) || 0;
    const total = m.key === 'cab' ? fare * (round ? 2 : 1) : fare * ctx.people * (round ? 2 : 1);
    return { ...m, fare, total, h: Number(hours[m.key]) || 0 };
  }).filter((r) => r.fare > 0);
  const cheapest = rows.length > 1 ? [...rows].sort((a, b) => a.total - b.total)[0].key : null;
  const fastestRows = rows.filter((r) => r.h > 0);
  const fastest = fastestRows.length > 1 ? [...fastestRows].sort((a, b) => a.h - b.h)[0].key : null;

  const add = (r) => {
    const route = { from: from.trim(), to: to.trim() };
    const d =
      r.key === 'cab'
        ? { route: `${route.from || '?'} → ${route.to || '?'}`, fare: r.fare, rides: round ? 2 : 1 }
        : { ...route, fare: r.fare, pax: ctx.people, round, ...(r.key === 'train' ? { cls: 'SL' } : {}), ...(r.key === 'flight' ? { bags: 0 } : {}) };
    onAdd(r.key, d);
  };

  return (
    <SheetModal visible={visible} onClose={onClose} title="Compare transport">
      <Text style={{ color: colors.subtext, marginBottom: 14 }}>
        Enter the fare for each option for {ctx.people} traveller{ctx.people === 1 ? '' : 's'} and see which is cheapest and fastest.
      </Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Field label="FROM" value={from} onChangeText={setFrom} placeholder="Kochi" style={{ flex: 1 }} />
        <Field label="TO" value={to} onChangeText={setTo} placeholder="Goa" style={{ flex: 1 }} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.subtext }}>ROUND TRIP</Text>
        <Switch value={round} onValueChange={setRound} trackColor={{ true: colors.primary }} />
      </View>
      {MODES.map((m) => (
        <View key={m.key} style={{ flexDirection: 'row', gap: 10 }}>
          <Field label={`${m.label.toUpperCase()} ${m.key === 'cab' ? 'FARE PER RIDE' : 'FARE / PERSON'}`} value={fares[m.key] || ''} onChangeText={(v) => setFares((s) => ({ ...s, [m.key]: v }))} placeholder="0" keyboardType="decimal-pad" style={{ flex: 2 }} />
          <Field label="HOURS" value={hours[m.key] || ''} onChangeText={(v) => setHours((s) => ({ ...s, [m.key]: v }))} placeholder="0" keyboardType="decimal-pad" style={{ flex: 1 }} />
        </View>
      ))}
      {rows.map((r) => (
        <View key={r.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>
              {r.label.split(' ')[0]} · {formatCurrency(r.total, currency)}
            </Text>
            <Text style={{ color: colors.subtext, fontSize: 12 }}>
              {[r.key === cheapest ? '💰 Cheapest' : '', r.key === fastest ? '⚡ Fastest' : '', r.h ? `${r.h} h` : ''].filter(Boolean).join('  ·  ')}
            </Text>
          </View>
          <Button title="Add" variant="outline" onPress={() => add(r)} style={{ paddingVertical: 8 }} />
        </View>
      ))}
    </SheetModal>
  );
}

// ---------- Who is travelling ----------
export function TravelersSheet({ visible, trip, onClose, onSave, showToast }) {
  const { colors } = useTheme();
  const [list, setList] = useState([]);

  useEffect(() => {
    if (visible) setList(trip.travelers.map((t) => ({ ...t })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const used = (id) => (trip.spends || []).some((s) => s.paidBy === id || (s.splitAmong || []).includes(id));
  const remove = (id) => {
    if (list.length <= 1) return showToast("A trip needs at least one traveller.", 'error');
    if (used(id)) return showToast('This person is part of logged spending, so they can’t be removed.', 'error');
    setList((l) => l.filter((x) => x.id !== id));
  };

  return (
    <SheetModal visible={visible} onClose={onClose} title="Travellers">
      {list.map((t, i) => (
        <Field
          key={t.id}
          value={t.name}
          onChangeText={(v) => setList((l) => l.map((x) => (x.id === t.id ? { ...x, name: v } : x)))}
          maxLength={30}
          right={
            <Pressable onPress={() => remove(t.id)} hitSlop={10}>
              <MaterialCommunityIcons name="close-circle-outline" size={20} color={colors.muted} />
            </Pressable>
          }
          style={{ marginBottom: 10 }}
        />
      ))}
      <Button title="Add traveller" icon="plus" variant="outline" onPress={() => setList((l) => [...l, { id: newId('p'), name: `Traveller ${l.length + 1}` }])} style={{ marginVertical: 10 }} />
      <Button title="Save" onPress={() => onSave(list.map((t) => ({ ...t, name: t.name.trim() || 'Traveller' })))} />
    </SheetModal>
  );
}
