// © Expense Tracker. All rights reserved.
// Thin, crash-proof wrapper around expo-notifications (local notifications - no server needed).
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const CHANNEL = 'reminders';
const ACCENT = '#E5324B';
let ready = false;

export function setupNotifications() {
  if (ready) return;
  ready = true;
  try {
    // If a scheduled notification fires while the app is open, still show it.
    Notifications.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
    });
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync(CHANNEL, {
        name: 'Reminders & alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 200, 100, 200],
        lightColor: ACCENT,
      }).catch(() => {});
    }
  } catch {
    // notifications unavailable on this device - the app still works
  }
}

export async function getPermission() {
  try {
    const p = await Notifications.getPermissionsAsync();
    if (p.granted) return 'granted';
    return p.canAskAgain === false ? 'denied' : p.status === 'denied' ? 'denied' : 'undetermined';
  } catch {
    return 'denied';
  }
}

export async function requestPermission() {
  try {
    const p = await Notifications.requestPermissionsAsync();
    return p.granted ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

export async function cancelAll() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // nothing scheduled
  }
}

// Replaces everything scheduled with this list: [{ when: Date, title, body, action }]
export async function scheduleList(list) {
  await cancelAll();
  for (const n of list) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: { title: n.title, body: n.body, color: ACCENT, data: { action: n.action || 'dashboard' } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.when, channelId: CHANNEL },
      });
    } catch {
      // skip one bad entry, keep the rest
    }
  }
}

// A real system notification a few seconds from now (used by the "Send a test" button).
export async function scheduleSoon(title, body, action, seconds = 5) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, color: ACCENT, data: { action } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, channelId: CHANNEL },
    });
  } catch {
    // ignore
  }
}

// Called when the person taps a system notification. Returns an unsubscribe function.
export function onNotificationTap(cb) {
  try {
    const sub = Notifications.addNotificationResponseReceivedListener((r) => cb(r?.notification?.request?.content?.data?.action));
    return () => sub.remove();
  } catch {
    return () => {};
  }
}

// App was closed and opened by tapping a notification.
export async function launchedByNotification() {
  try {
    const r = await Notifications.getLastNotificationResponseAsync();
    return r?.notification?.request?.content?.data?.action || null;
  } catch {
    return null;
  }
}
