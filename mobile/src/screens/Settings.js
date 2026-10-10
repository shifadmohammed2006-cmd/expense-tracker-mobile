import React, { useState } from 'react';
import { Alert, ScrollView, Share, Switch, Text, View } from 'react-native';
import { api } from '../api';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme';
import { Button, Card, Chip, Field, ScreenHeader, SheetModal, Title, usePad } from '../components/ui';
import { CURRENCIES } from '../utils/constants';

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export default function Settings() {
  const { colors, isDark, setDark } = useTheme();
  const pad = usePad();
  const { settings, categories, updateSettings, resetAll, showToast } = useApp();
  const { user, logout, deleteAccount } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Exports every expense (all months) through the phone's share sheet.
  const exportData = async (kind) => {
    setExporting(true);
    try {
      const all = await api.getExpenses();
      const nameOf = (id) => categories.find((c) => c.id === id)?.name || 'Uncategorized';
      const message =
        kind === 'csv'
          ? ['Date,Category,Amount,Note']
              .concat(all.map((e) => [e.date, csvCell(nameOf(e.categoryId)), e.amount, csvCell(e.note)].join(',')))
              .join('\n')
          : JSON.stringify({ expenses: all, categories, settings }, null, 2);
      await Share.share({ message, title: kind === 'csv' ? 'expenses.csv' : 'expense-tracker-backup.json' });
    } catch (e) {
      showToast(e.message || 'Could not export.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const confirmLogout = () =>
    Alert.alert('Log out?', 'You can log back in any time with your email and password.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', onPress: logout },
    ]);

  const confirmReset = () =>
    Alert.alert('Reset all data?', 'This permanently deletes all your expenses, categories and budgets. Your account stays.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: resetAll },
    ]);

  const submitDelete = async () => {
    if (!password) return setDeleteError('Enter your password to confirm.');
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteAccount(password); // on success the app returns to the login screen
    } catch (e) {
      setDeleteError(e.message);
      setDeleting(false);
    }
  };

  return (
    <>
      <ScrollView contentContainerStyle={pad}>
        <ScreenHeader title="Settings" subtitle="Tune the app to how you like to work." />

        <Card style={{ marginBottom: 14 }}>
          <Title>Account</Title>
          <Text style={{ color: colors.subtext, marginBottom: 14 }}>{user?.email}</Text>
          <Button title="Log out" variant="outline" icon="log-out" onPress={confirmLogout} />
        </Card>

        <Card style={{ marginBottom: 14 }}>
          <Title>Appearance</Title>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.text, fontSize: 15 }}>Dark mode</Text>
            <Switch value={isDark} onValueChange={setDark} trackColor={{ true: colors.primary }} />
          </View>
        </Card>

        <Card style={{ marginBottom: 14 }}>
          <Title>Currency</Title>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CURRENCIES.map((c) => (
              <Chip
                key={c}
                label={c}
                active={settings.currency === c}
                onPress={() => settings.currency !== c && updateSettings({ currency: c }, 'Currency updated.')}
              />
            ))}
          </View>
        </Card>

        <Card style={{ marginBottom: 14 }}>
          <Title>Export your data</Title>
          <Text style={{ color: colors.subtext, fontSize: 13, marginBottom: 14 }}>
            Opens your phone's share sheet so you can save or send the file.
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="CSV" variant="outline" icon="download" loading={exporting} onPress={() => exportData('csv')} style={{ flex: 1 }} />
            <Button title="JSON" variant="outline" icon="download" loading={exporting} onPress={() => exportData('json')} style={{ flex: 1 }} />
          </View>
        </Card>

        <Card style={{ marginBottom: 14 }}>
          <Title style={{ color: colors.danger }}>Danger zone</Title>
          <Button title="Reset all data" variant="dangerOutline" icon="trash-2" onPress={confirmReset} style={{ marginBottom: 10 }} />
          <Button
            title="Delete account"
            variant="dangerOutline"
            icon="user-x"
            onPress={() => {
              setPassword('');
              setDeleteError('');
              setDeleteOpen(true);
            }}
          />
        </Card>

        <Text style={{ textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: 8 }}>Expense Tracker · Made by Shifad</Text>
      </ScrollView>

      <SheetModal visible={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete account?">
        <Text style={{ color: colors.subtext, marginBottom: 16 }}>
          This permanently deletes your account and all of your data. It cannot be undone.
        </Text>
        <Field
          label="PASSWORD"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Enter your password"
          error={deleteError}
        />
        <Button title="Delete my account" variant="danger" onPress={submitDelete} loading={deleting} />
      </SheetModal>
    </>
  );
}
