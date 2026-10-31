// © 2026 Expense Tracker. All rights reserved. Unauthorised copying or redistribution is prohibited.
import React, { useState } from 'react';
import { Alert, Share, Text, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { useTheme } from '../theme';
import { Button, Card, Field, SheetModal, Title } from './ui';

// Friends type the host's code here to join a trip.
export function JoinTripSheet({ visible, onClose, onJoined }) {
  const { colors } = useTheme();
  const { joinTrip } = useApp();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const id = await joinTrip(code);
      setCode('');
      onJoined(id);
    } catch (e) {
      setError(e.message || 'Could not join. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SheetModal visible={visible} onClose={onClose} title="Join a trip">
      <Text style={{ color: colors.subtext, marginBottom: 14 }}>Ask your trip host for the join code, then enter it here. You will see the plan, costs and spending on your own phone.</Text>
      <Field label="JOIN CODE" value={code} onChangeText={(v) => setCode(v.toUpperCase())} placeholder="K7M2QX" autoCapitalize="characters" autoCorrect={false} maxLength={12} error={error} />
      <Button title="Join trip" icon="log-in" onPress={submit} loading={busy} disabled={code.trim().length < 4} />
    </SheetModal>
  );
}

// Host: create / show the code and see who joined. Member: see the host and the group.
export function TripShareCard({ trip, onLeft }) {
  const { colors } = useTheme();
  const { shareTrip, unshareTrip, deleteTrip, showToast } = useApp();
  const [busy, setBusy] = useState(false);
  const info = trip.share;
  const isMember = info?.role === 'member';

  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      showToast(e.message || 'Something went wrong.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const sendCode = () =>
    Share.share({ message: `Join my trip "${trip.name}" on Expense Tracker!\nOpen Trips > Join a trip and enter the code: ${info.code}` }).catch(() => {});

  const stop = () =>
    Alert.alert('Stop sharing?', 'The code will stop working and friends will lose access to this trip.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Stop sharing', style: 'destructive', onPress: () => run(() => unshareTrip(trip.id)) },
    ]);

  const leave = () =>
    Alert.alert('Leave this trip?', 'It will disappear from your phone. You can rejoin with the code.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => { deleteTrip(trip.id); onLeft(); } },
    ]);

  const row = (label, sub) => (
    <View key={label} style={{ paddingVertical: 4 }}>
      <Text style={{ color: colors.text }}>{label}{sub ? <Text style={{ color: colors.subtext }}>  {sub}</Text> : null}</Text>
    </View>
  );

  if (isMember) {
    return (
      <Card style={{ marginBottom: 14 }}>
        <Title>Group trip</Title>
        <Text style={{ color: colors.subtext, marginBottom: 8 }}>View only. Your host keeps this plan up to date - pull down on Trips to refresh.</Text>
        {row(info.host, '(host)')}
        {info.members.map((m) => row(m))}
        <Button title="Leave trip" variant="dangerOutline" icon="log-out" onPress={leave} style={{ marginTop: 12 }} />
      </Card>
    );
  }

  return (
    <Card style={{ marginBottom: 14 }}>
      <Title>Share with friends</Title>
      {info?.code ? (
        <>
          <Text style={{ color: colors.subtext, fontSize: 12, marginBottom: 6 }}>JOIN CODE</Text>
          <Text selectable style={{ fontSize: 32, fontWeight: '800', letterSpacing: 6, color: colors.primary, marginBottom: 12 }}>{info.code}</Text>
          <Button title="Send code to friends" icon="share-2" onPress={sendCode} style={{ marginBottom: 12 }} />
          <Text style={{ color: colors.subtext, fontSize: 12, marginBottom: 4 }}>JOINED ({info.members.length})</Text>
          {info.members.length === 0 ? <Text style={{ color: colors.subtext }}>Nobody yet. Friends see changes you make on their own phones.</Text> : info.members.map((m) => row(m))}
          <Button title="Stop sharing" variant="dangerOutline" icon="slash" onPress={stop} loading={busy} style={{ marginTop: 12 }} />
        </>
      ) : (
        <>
          <Text style={{ color: colors.subtext, marginBottom: 12 }}>Get a join code so friends can see this trip's plan, costs and spending on their own phones. Only you can edit it.</Text>
          <Button title="Create join code" icon="users" onPress={() => run(() => shareTrip(trip.id))} loading={busy} />
        </>
      )}
    </Card>
  );
}
