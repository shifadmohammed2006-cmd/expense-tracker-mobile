// Expo inlines EXPO_PUBLIC_* variables at build time (from .env locally, or eas.json for builds).
const raw = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';
export const API_URL = raw.replace(/\/+$/, '');
