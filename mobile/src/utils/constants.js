// © 2026 Expense Tracker. All rights reserved. Unauthorised copying or redistribution is prohibited.
// Category icon names (kept identical to the web version) mapped to MaterialCommunityIcons.
export const ICON_MAP = {
  Utensils: 'silverware-fork-knife',
  Car: 'car',
  ShoppingBag: 'shopping',
  Receipt: 'receipt',
  HeartPulse: 'heart-pulse',
  Film: 'movie-open',
  MoreHorizontal: 'dots-horizontal',
  Home: 'home',
  Plane: 'airplane',
  GraduationCap: 'school',
  Gift: 'gift',
  Coffee: 'coffee',
  Fuel: 'gas-station',
  Dumbbell: 'dumbbell',
  PawPrint: 'paw',
  Smartphone: 'cellphone',
  Circle: 'circle-outline',
};

export const ICONS = Object.keys(ICON_MAP).filter((k) => k !== 'Circle');

export const COLOR_OPTIONS = [
  '#E5324B',
  '#3A6EA5',
  '#FFB020',
  '#8E8E93',
  '#8B5CF6',
  '#EC4899',
  '#0EA5E9',
  '#14B8A6',
];

export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'PKR', 'AUD', 'CAD', 'JPY'];

// Local copy of the starter categories (the server seeds the same ones for new accounts).
export const DEFAULT_CATEGORIES = [
  { name: 'Food & Dining', icon: 'Utensils', color: '#E5324B' },
  { name: 'Transport', icon: 'Car', color: '#3A6EA5' },
  { name: 'Shopping', icon: 'ShoppingBag', color: '#FFB020' },
  { name: 'Bills & Utilities', icon: 'Receipt', color: '#8B5CF6' },
  { name: 'Health', icon: 'HeartPulse', color: '#C0392B' },
  { name: 'Entertainment', icon: 'Film', color: '#EC4899' },
  { name: 'Other', icon: 'MoreHorizontal', color: '#8E8E93' },
];
