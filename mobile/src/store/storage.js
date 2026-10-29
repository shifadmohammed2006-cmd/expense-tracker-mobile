// © 2026 Expense Tracker. All rights reserved. Unauthorised copying or redistribution is prohibited.
import AsyncStorage from '@react-native-async-storage/async-storage';

// Small JSON helpers around AsyncStorage. Failures never crash the app.
export async function load(key, fallback = null) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export async function save(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full / unavailable - the in-memory copy still works
  }
}

export async function remove(key) {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // nothing to remove
  }
}

// Wipes everything this app stored for one account (used on logout so a shared phone stays private).
export async function wipeUser(uid) {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const mine = keys.filter((k) => k.startsWith(`et:${uid}:`));
    if (mine.length) await AsyncStorage.multiRemove(mine);
  } catch {
    // ignore
  }
}

export const newId = (prefix = 'id') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
export const newLocalId = () => newId('local');
export const isLocalId = (id) => typeof id === 'string' && id.startsWith('local-');
