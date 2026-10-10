import React, { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { useTheme } from '../theme';
import { Button, Card, CategoryBadge, Field, ScreenHeader, SheetModal, usePad } from '../components/ui';
import { COLOR_OPTIONS, ICONS, ICON_MAP } from '../utils/constants';

export default function Categories() {
  const { colors } = useTheme();
  const pad = usePad();
  const { categories, refreshing, refresh, addCategory, updateCategory, deleteCategory } = useApp();
  const [editing, setEditing] = useState(null); // null = closed, {} = new, category = edit
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(ICONS[0]);
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const open = (cat) => {
    setEditing(cat || {});
    setName(cat?.name || '');
    setIcon(cat?.icon || ICONS[0]);
    setColor(cat?.color || COLOR_OPTIONS[0]);
    setError('');
  };

  const save = async () => {
    if (!name.trim()) return setError('Give the category a name.');
    setSaving(true);
    const payload = { name: name.trim(), icon, color };
    const ok = editing.id ? await updateCategory(editing.id, payload) : await addCategory(payload);
    setSaving(false);
    if (ok) setEditing(null);
  };

  const confirmDelete = (c) =>
    Alert.alert('Delete category?', `Expenses logged under "${c.name}" will move to "Other".`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteCategory(c.id) },
    ]);

  return (
    <>
      <ScrollView
        contentContainerStyle={pad}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        <ScreenHeader title="Categories" subtitle="Organize your spending your way." />
        <Button title="Add category" icon="plus" onPress={() => open(null)} style={{ marginBottom: 16 }} />

        <Card style={{ paddingVertical: 6 }}>
          {categories.map((c, i) => (
            <View
              key={c.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 12,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: colors.border,
              }}
            >
              <CategoryBadge category={c} />
              <Text style={{ flex: 1, color: colors.text, fontWeight: '600', fontSize: 15 }} numberOfLines={1}>{c.name}</Text>
              <Pressable onPress={() => open(c)} hitSlop={10} style={{ padding: 4 }}>
                <Feather name="edit-2" size={18} color={colors.subtext} />
              </Pressable>
              <Pressable onPress={() => confirmDelete(c)} hitSlop={10} style={{ padding: 4 }}>
                <Feather name="trash-2" size={18} color={colors.danger} />
              </Pressable>
            </View>
          ))}
        </Card>
      </ScrollView>

      <SheetModal visible={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit category' : 'New category'}>
        <Field label="NAME" value={name} onChangeText={setName} placeholder="e.g. Groceries" maxLength={40} />

        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.subtext, marginBottom: 8 }}>ICON</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          {ICONS.map((k) => (
            <Pressable
              key={k}
              onPress={() => setIcon(k)}
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: icon === k ? color : colors.border,
                backgroundColor: icon === k ? `${color}22` : colors.input,
              }}
            >
              <MaterialCommunityIcons name={ICON_MAP[k]} size={24} color={icon === k ? color : colors.subtext} />
            </Pressable>
          ))}
        </View>

        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.subtext, marginBottom: 8 }}>COLOR</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
          {COLOR_OPTIONS.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: c,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: color === c ? 3 : 0,
                borderColor: colors.text,
              }}
            >
              {color === c ? <Feather name="check" size={16} color="#fff" /> : null}
            </Pressable>
          ))}
        </View>

        {error ? <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text> : null}
        <Button title={editing?.id ? 'Save changes' : 'Add category'} onPress={save} loading={saving} />
      </SheetModal>
    </>
  );
}
