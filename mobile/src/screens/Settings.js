// © 2026 Expense Tracker. All rights reserved. Unauthorised copying or redistribution is prohibited.
import React, { useState } from 'react';
import { Alert, ScrollView, Share, Switch, Text, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { REMINDER_TIMES } from '../utils/notifyContent';
import { useTheme } from '../theme';
import { Button, Card, Chip, Field, ScreenHeader, SheetModal, Title, usePad } from '../components/ui';
import { CURRENCIES } from '../utils/constants';
import { APP_NAME, BRAND_LINE, COPYRIGHT, EXPORT_HEADER, NOTICE, VERSION } from '../branding';
import Logo from '../components/Logo';
import ShxBrand from '../components/ShxBrand';
import SyncPill from '../components/SyncPill';

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export default function Settings() {
  const { colors, isDark, setDark } = useTheme();
  const pad = usePad();
  const { settings, categories, allExpenses, pending, updateSettings, resetAll, showToast } = useApp();
  const { user, logout, deleteAccount } = useAuth();
  const notif = useNotifications();
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Exports every expense (all months) through the phone's share sheet. Works offline - data is on the phone.
  const exportData = async (kind) => {
    setExporting(true);
    try {
      const all = [...allExpenses].sort((a, b) => (a.date < b.date ? 1 : -1));
      const nameOf = (id) => categories.find((c) => c.id === id)?.name || 'Uncategorized';
      const message =
        kind === 'csv'
          ? [`# ${EXPORT_HEADER}`, 'Date,Category,Amount,Note']
              .concat(all.map((e) => [e.date, csvCell(nameOf(e.categoryId)), e.amount, csvCell(e.note)].join(',')))
              .join('\n')
          : JSON.stringify({ _copyright: EXPORT_HEADER, expenses: all, categories, settings }, null, 2);
      await Share.share({ message, title: kind === 'csv' ? 'expenses.csv' : 'expense-tracker-backup.json' });
    } catch (e) {
      showToast(e.message || 'Could not export.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const confirmLogout = () =>
    Alert.alert(
      'Log out?',
      pending
        ? `${pending} change${pending === 1 ? ' is' : 's are'} not synced yet and will be lost if you log out. Connect to the internet first to keep them.`
        : 'You can log back in any time with your email and password. Data saved on this phone is cleared.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log out', style: 'destructive', onPress: logout },
      ]
    );

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
          <Text style={{ color: colors.subtext, marginBottom: 10 }}>{user?.email}</Text>
          <View style={{ marginBottom: 14 }}><SyncPill /></View>
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
          <Title>Notifications</Title>
          <Text style={{ color: colors.subtext, fontSize: 13, marginBottom: 14 }}>
            Friendly nudges to log expenses, plus alerts when you get close to your budget.
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.text, fontSize: 15 }}>Reminders & alerts</Text>
            <Switch value={notif.prefs.enabled} onValueChange={notif.setEnabled} trackColor={{ true: colors.primary }} />
          </View>
          {notif.perm === 'denied' ? (
            <Text style={{ color: colors.warn, fontSize: 12, marginTop: 8 }}>
              Phone notifications are blocked. Allow them in your phone's app settings to get reminders when the app is closed.
            </Text>
          ) : null}
          {notif.prefs.enabled ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
                <Text style={{ color: colors.text, fontSize: 15 }}>Daily reminder</Text>
                <Switch value={notif.prefs.daily} onValueChange={(v) => notif.updatePrefs({ daily: v })} trackColor={{ true: colors.primary }} />
              </View>
              {notif.prefs.daily ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                  {REMINDER_TIMES.map((t) => (
                    <Chip
                      key={t.label}
                      label={t.label}
                      active={notif.prefs.hour === t.hour && notif.prefs.minute === t.minute}
                      onPress={() => notif.updatePrefs({ hour: t.hour, minute: t.minute })}
                    />
                  ))}
                </View>
              ) : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
                <Text style={{ color: colors.text, fontSize: 15 }}>Weekly recap (Sundays)</Text>
                <Switch value={notif.prefs.weekly} onValueChange={(v) => notif.updatePrefs({ weekly: v })} trackColor={{ true: colors.primary }} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
                <Text style={{ color: colors.text, fontSize: 15 }}>Budget alerts</Text>
                <Switch value={notif.prefs.budget} onValueChange={(v) => notif.updatePrefs({ budget: v })} trackColor={{ true: colors.primary }} />
              </View>
              <Button title="Send a test notification" variant="outline" icon="bell" onPress={notif.sendTest} style={{ marginTop: 16 }} />
            </>
          ) : null}
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

        <Card style={{ alignItems: 'center', marginTop: 6 }}>
          <Logo size={72} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 12 }}>{APP_NAME}</Text>
          {BRAND_LINE ? <Text style={{ color: colors.primary, fontWeight: '600', marginTop: 2 }}>{BRAND_LINE}</Text> : null}
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>Version {VERSION}</Text>
          <View style={{ marginTop: 16 }}>
            <ShxBrand animated={false} compact onDark={isDark} mutedColor={colors.muted} />
          </View>
          <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600', marginTop: 14 }}>{COPYRIGHT}</Text>
          <Text style={{ color: colors.subtext, fontSize: 11, textAlign: 'center', marginTop: 6, lineHeight: 16 }}>{NOTICE}</Text>
        </Card>
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
