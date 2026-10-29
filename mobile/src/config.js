// Expo inlines EXPO_PUBLIC_* variables at build time (from .env locally, or eas.json for builds).
const raw = process.env.EXPO_PUBLIC_API_URL || 'https://expense-tracker-api-s6yg.onrender.com';
export const API_URL = raw.replace(/\/+$/, '');
