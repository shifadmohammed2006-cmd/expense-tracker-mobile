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
  '#2F6F4E',
  '#3A6EA5',
  '#D6A317',
  '#C1443B',
  '#8B5CF6',
  '#EC4899',
  '#8B9490',
  '#0EA5E9',
];

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'PKR', 'AUD', 'CAD', 'JPY'];
