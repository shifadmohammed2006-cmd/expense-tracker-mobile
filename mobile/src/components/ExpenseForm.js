// © 2026 Expense Tracker. All rights reserved. Unauthorised copying or redistribution is prohibited.
import React, { useEffect, useState } from 'react';
import { Feather, Pressable, Text, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { useTheme } from '../theme';
import { addDays, isValidDateStr, toDateStr } from '../utils/format';
import { evaluateExpression } from '../utils/evaluate';
import { Button, CategoryBadge, Chip, Field, SheetModal } from './ui';

const QUICK = [50, 100, 200, 500, 1000];

// Add a new expense, or edit one when `expense` is provided.
export default function ExpenseForm({ visible, expense, onClose }) {
  const { colors } = useTheme();
  const { categories, settings, addExpense, updateExpense } = useApp();
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState(null);
  const [date, setDate] = useState(toDateStr());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  // Maths mode: type sums like 120+80 or 45*3 straight into the amount field.
  const [mathMode, setMathMode] = useState(false);

  // Reset the fields every time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    setError('');
    setSaving(false);
    if (expense) {
      setAmount(String(expense.amount));
      setCategoryId(expense.categoryId);
      setDate(expense.date);
      setNote(expense.note || '');
    } else {
      setAmount('');
      setCategoryId(categories[0]?.id || null);
      setDate(toDateStr());
      setNote('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, expense]);

  const submit = async () => {
    const value = mathMode ? evaluateExpression(amount) : Number(amount.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) {
      return setError(mathMode ? 'That maths did not work - try like 120+80.' : 'Enter an amount greater than 0.');
    }
    if (!categoryId) return setError('Pick a category.');
    if (!isValidDateStr(date)) return setError('Date must look like 2026-10-31.');

    setError('');
    setSaving(true);
    const payload = { amount: value, categoryId, date, note: note.trim() };
    const ok = expense ? await updateExpense(expense.id, payload) : await addExpense(payload);
    setSaving(false);
    if (ok) onClose();
  };

  const today = toDateStr();
  const yesterday = addDays(today, -1);
  const preview = mathMode ? evaluateExpression(amount) : NaN;

  return (
    <SheetModal visible={visible} onClose={onClose} title={expense ? 'Edit expense' : 'Add expense'}>
      <Field
        label={`AMOUNT (${settings.currency})`}
        value={amount}
        onChangeText={setAmount}
        placeholder="0.00"
        keyboardType={mathMode ? 'numbers-and-punctuation' : 'decimal-pad'}
        inputStyle={{ fontSize: 26, fontWeight: '700' }}
        right={
          <Pressable
            onPress={() => setMathMode((m) => !m)}
            hitSlop={8}
            style={{ paddingHorizontal: 6, paddingVertical: 8 }}
            accessibilityLabel="Toggle maths mode"
          >
            <Feather name="plus-square" size={22} color={mathMode ? colors.primary : colors.muted} />
          </Pressable>
        }
      />
      {mathMode && /[+\-*/(]/.test(amount) ? (
        <Text
          style={{
            color: Number.isFinite(preview) ? colors.primary : colors.danger,
            fontSize: 13,
            fontWeight: '600',
            marginTop: -10,
            marginBottom: 10,
          }}
        >
          {Number.isFinite(preview) ? `= ${preview}` : '= …'}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -6, marginBottom: 16 }}>
        {QUICK.map((q) => (
          <Chip
            key={q}
            label={`+${q}`}
            onPress={() =>
              mathMode
                ? setAmount((a) => `${a}${/[+\-*/(]\s*$/.test(a) ? '' : '+'}${q}`)
                : setAmount(String((Number(amount) || 0) + q))
            }
          />
        ))}
      </View>

      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.subtext, marginBottom: 8 }}>CATEGORY</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {categories.map((c) => (
          <Chip
            key={c.id}
            label={c.name}
            color={c.color}
            active={categoryId === c.id}
            onPress={() => setCategoryId(c.id)}
            icon={<CategoryBadge category={c} size={20} />}
          />
        ))}
      </View>

      <Field
        label="DATE (YYYY-MM-DD)"
        value={date}
        onChangeText={setDate}
        placeholder="2026-10-31"
        keyboardType="numbers-and-punctuation"
        maxLength={10}
        autoCorrect={false}
      />
      <View style={{ flexDirection: 'row', gap: 8, marginTop: -6, marginBottom: 16 }}>
        <Chip label="Today" active={date === today} onPress={() => setDate(today)} />
        <Chip label="Yesterday" active={date === yesterday} onPress={() => setDate(yesterday)} />
      </View>

      <Field label="NOTE (OPTIONAL)" value={note} onChangeText={setNote} placeholder="Lunch with friends" maxLength={200} />

      {error ? <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text> : null}
      <Button title={expense ? 'Save changes' : 'Add expense'} onPress={submit} loading={saving} />
    </SheetModal>
  );
}
