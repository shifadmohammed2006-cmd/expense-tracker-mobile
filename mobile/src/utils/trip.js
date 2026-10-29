// © 2026 Expense Tracker. All rights reserved. Unauthorised copying or redistribution is prohibited.
import { diffDays, formatCurrency, formatDayLabel, inclusiveDays, round2, toDateStr } from './format';
import { COPYRIGHT_SHORT } from './tripText';

const n = (x) => Number(x) || 0;

export const TRIP_EMOJIS = ['🏖️', '⛰️', '🏕️', '🚆', '✈️', '🏙️', '🛕', '🌴', '🚗', '🎉'];
export const TRAIN_CLASSES = ['SL', '3A', '2A', '1A', 'CC', '2S'];

// Each cost type describes its own form fields and how the total is worked out.
// kind: money | int | text | bool | choice.  def(ctx) gives a smart default from the trip.
export const ITEM_TYPES = {
  stay: {
    label: 'Stay / Room',
    icon: 'bed',
    color: '#8B5CF6',
    fields: [
      { k: 'place', label: 'HOTEL / PLACE', kind: 'text', placeholder: 'Hotel name' },
      { k: 'nights', label: 'NIGHTS', kind: 'int', def: (c) => c.nights || 1 },
      { k: 'rooms', label: 'ROOMS', kind: 'int', def: (c) => Math.max(Math.ceil(c.people / 2), 1) },
      { k: 'rate', label: 'PRICE PER ROOM PER NIGHT', kind: 'money' },
    ],
    calc: (d) => n(d.nights) * n(d.rooms) * n(d.rate),
    sub: (d) => `${n(d.nights)} night${n(d.nights) === 1 ? '' : 's'} × ${n(d.rooms)} room${n(d.rooms) === 1 ? '' : 's'}${d.place ? ` · ${d.place}` : ''}`,
  },
  bus: {
    label: 'Bus',
    icon: 'bus',
    color: '#3A6EA5',
    fields: [
      { k: 'from', label: 'FROM', kind: 'text', placeholder: 'Kochi' },
      { k: 'to', label: 'TO', kind: 'text', placeholder: 'Goa' },
      { k: 'fare', label: 'FARE PER PERSON', kind: 'money' },
      { k: 'pax', label: 'PASSENGERS', kind: 'int', def: (c) => c.people },
      { k: 'round', label: 'ROUND TRIP (×2)', kind: 'bool', def: () => true },
    ],
    calc: (d) => n(d.fare) * n(d.pax) * (d.round ? 2 : 1),
    sub: (d) => `${d.from || '?'} → ${d.to || '?'} · ${n(d.pax)} pax${d.round ? ' · return' : ''}`,
  },
  train: {
    label: 'Train',
    icon: 'train',
    color: '#0EA5E9',
    fields: [
      { k: 'from', label: 'FROM', kind: 'text', placeholder: 'Ernakulam' },
      { k: 'to', label: 'TO', kind: 'text', placeholder: 'Madgaon' },
      { k: 'cls', label: 'CLASS', kind: 'choice', options: TRAIN_CLASSES, def: () => 'SL' },
      { k: 'fare', label: 'FARE PER PERSON', kind: 'money' },
      { k: 'pax', label: 'PASSENGERS', kind: 'int', def: (c) => c.people },
      { k: 'round', label: 'ROUND TRIP (×2)', kind: 'bool', def: () => true },
    ],
    calc: (d) => n(d.fare) * n(d.pax) * (d.round ? 2 : 1),
    sub: (d) => `${d.from || '?'} → ${d.to || '?'} · ${d.cls || ''} · ${n(d.pax)} pax${d.round ? ' · return' : ''}`,
  },
  flight: {
    label: 'Flight',
    icon: 'airplane',
    color: '#EC4899',
    fields: [
      { k: 'from', label: 'FROM', kind: 'text', placeholder: 'Kochi' },
      { k: 'to', label: 'TO', kind: 'text', placeholder: 'Delhi' },
      { k: 'fare', label: 'FARE PER PERSON', kind: 'money' },
      { k: 'pax', label: 'PASSENGERS', kind: 'int', def: (c) => c.people },
      { k: 'round', label: 'ROUND TRIP (×2)', kind: 'bool', def: () => true },
      { k: 'bags', label: 'EXTRA BAGGAGE (TOTAL)', kind: 'money' },
    ],
    calc: (d) => n(d.fare) * n(d.pax) * (d.round ? 2 : 1) + n(d.bags),
    sub: (d) => `${d.from || '?'} → ${d.to || '?'} · ${n(d.pax)} pax${d.round ? ' · return' : ''}`,
  },
  cab: {
    label: 'Cab / Taxi',
    icon: 'taxi',
    color: '#D6A317',
    fields: [
      { k: 'route', label: 'ROUTE', kind: 'text', placeholder: 'Airport → Hotel' },
      { k: 'fare', label: 'FARE PER RIDE', kind: 'money' },
      { k: 'rides', label: 'NUMBER OF RIDES', kind: 'int', def: () => 2 },
    ],
    calc: (d) => n(d.fare) * n(d.rides),
    sub: (d) => `${d.route || 'Cab'} · ${n(d.rides)} ride${n(d.rides) === 1 ? '' : 's'}`,
  },
  local: {
    label: 'Local travel (auto/metro)',
    icon: 'rickshaw',
    color: '#14B8A6',
    fields: [
      { k: 'perDay', label: 'PER DAY (ALL TRAVELLERS)', kind: 'money' },
      { k: 'days', label: 'DAYS', kind: 'int', def: (c) => c.days || 1 },
    ],
    calc: (d) => n(d.perDay) * n(d.days),
    sub: (d) => `${n(d.days)} days of local travel`,
  },
  fuel: {
    label: 'Fuel + tolls (own vehicle)',
    icon: 'gas-station',
    color: '#C1443B',
    fields: [
      { k: 'km', label: 'DISTANCE ONE WAY (KM)', kind: 'int' },
      { k: 'mileage', label: 'MILEAGE (KM PER LITRE)', kind: 'int', def: () => 15 },
      { k: 'price', label: 'FUEL PRICE PER LITRE', kind: 'money' },
      { k: 'tolls', label: 'TOLLS + PARKING (TOTAL)', kind: 'money' },
      { k: 'round', label: 'ROUND TRIP (×2)', kind: 'bool', def: () => true },
    ],
    calc: (d) => (n(d.mileage) > 0 ? (n(d.km) * (d.round ? 2 : 1) * n(d.price)) / n(d.mileage) : 0) + n(d.tolls),
    sub: (d) => `${n(d.km) * (d.round ? 2 : 1)} km · ${n(d.mileage)} km/l`,
  },
  food: {
    label: 'Food',
    icon: 'silverware-fork-knife',
    color: '#2F6F4E',
    fields: [
      { k: 'perDay', label: 'PER PERSON PER DAY', kind: 'money' },
      { k: 'people', label: 'PEOPLE', kind: 'int', def: (c) => c.people },
      { k: 'days', label: 'DAYS', kind: 'int', def: (c) => c.days || 1 },
    ],
    calc: (d) => n(d.perDay) * n(d.people) * n(d.days),
    sub: (d) => `${n(d.people)} people × ${n(d.days)} days`,
  },
  activity: {
    label: 'Tickets & activities',
    icon: 'ticket-confirmation',
    color: '#F97316',
    fields: [
      { k: 'what', label: 'WHAT', kind: 'text', placeholder: 'Scuba, museum, park entry…' },
      { k: 'price', label: 'PRICE PER PERSON', kind: 'money' },
      { k: 'people', label: 'PEOPLE', kind: 'int', def: (c) => c.people },
    ],
    calc: (d) => n(d.price) * n(d.people),
    sub: (d) => `${d.what || 'Activity'} · ${n(d.people)} people`,
  },
  shopping: {
    label: 'Shopping & gifts',
    icon: 'shopping',
    color: '#8B9490',
    fields: [{ k: 'amount', label: 'BUDGET', kind: 'money' }],
    calc: (d) => n(d.amount),
    sub: () => 'Budget',
  },
  other: {
    label: 'Other',
    icon: 'dots-horizontal-circle',
    color: '#64748B',
    fields: [{ k: 'amount', label: 'AMOUNT', kind: 'money' }],
    calc: (d) => n(d.amount),
    sub: () => '',
  },
};
export const ITEM_KEYS = Object.keys(ITEM_TYPES);

export function tripContext(trip) {
  const days = trip.startDate && trip.endDate ? inclusiveDays(trip.startDate, trip.endDate) : 1;
  return { people: Math.max(trip.travelers?.length || 1, 1), days, nights: Math.max(days - 1, 0) };
}

export function newItemDefaults(type, trip) {
  const ctx = tripContext(trip);
  const d = {};
  ITEM_TYPES[type].fields.forEach((f) => {
    if (f.def) d[f.k] = f.def(ctx);
    else if (f.kind === 'bool') d[f.k] = false;
    else d[f.k] = '';
  });
  return d;
}

export const itemAmount = (type, d) => round2(ITEM_TYPES[type].calc(d));

// Everything the overview needs, in one pass.
export function tripNumbers(trip) {
  const ctx = tripContext(trip);
  const plan = trip.plan || [];
  const spends = trip.spends || [];
  const planned = plan.reduce((s, i) => s + n(i.amount), 0);
  const buffer = (planned * n(trip.contingencyPct)) / 100;
  const plannedTotal = planned + buffer;
  const actual = spends.reduce((s, x) => s + n(x.amount), 0);
  const booked = plan.filter((i) => i.booked).reduce((s, i) => s + n(i.amount), 0);

  const plannedByType = {};
  plan.forEach((i) => {
    plannedByType[i.type] = (plannedByType[i.type] || 0) + n(i.amount);
  });
  const actualByType = {};
  spends.forEach((x) => {
    const k = x.type || 'other';
    actualByType[k] = (actualByType[k] || 0) + n(x.amount);
  });

  const today = toDateStr();
  const toStart = trip.startDate ? diffDays(today, trip.startDate) : 0;
  const toEnd = trip.endDate ? diffDays(today, trip.endDate) : 0;
  let status = 'upcoming';
  if (trip.startDate && toStart > 0) status = 'upcoming';
  else if (trip.endDate && toEnd < 0) status = 'completed';
  else status = 'ongoing';

  const budget = n(trip.budget);
  const daysLeftInTrip = status === 'ongoing' ? Math.max(toEnd + 1, 1) : ctx.days;
  return {
    ...ctx,
    planned,
    buffer,
    plannedTotal,
    actual,
    booked,
    plannedByType,
    actualByType,
    perPerson: plannedTotal / ctx.people,
    perDay: plannedTotal / ctx.days,
    budget,
    planVsBudget: budget > 0 ? budget - plannedTotal : null,
    actualVsBudget: budget > 0 ? budget - actual : null,
    safePerDay: budget > 0 ? Math.max(budget - actual, 0) / daysLeftInTrip : null,
    status,
    toStart,
    toEnd,
  };
}

export function statusLabel(nums) {
  if (nums.status === 'upcoming') return nums.toStart === 0 ? 'Starts today' : `In ${nums.toStart} day${nums.toStart === 1 ? '' : 's'}`;
  if (nums.status === 'ongoing') return `Day ${Math.min(nums.days - nums.toEnd, nums.days)} of ${nums.days}`;
  return 'Completed';
}

// Who paid what, who owes what, and the fewest payments that settle everyone up.
export function settleUp(trip) {
  const people = trip.travelers || [];
  const ids = people.map((p) => p.id);
  const paid = {};
  const share = {};
  ids.forEach((id) => {
    paid[id] = 0;
    share[id] = 0;
  });
  (trip.spends || []).forEach((s) => {
    const among = (s.splitAmong?.length ? s.splitAmong : ids).filter((id) => id in share);
    if (!among.length) return;
    if (s.paidBy in paid) paid[s.paidBy] += n(s.amount);
    among.forEach((id) => {
      share[id] += n(s.amount) / among.length;
    });
  });
  const bal = ids.map((id) => ({ id, v: round2(paid[id] - share[id]) }));
  const creditors = bal.filter((b) => b.v > 0.009).sort((a, b) => b.v - a.v);
  const debtors = bal.filter((b) => b.v < -0.009).map((b) => ({ id: b.id, v: -b.v })).sort((a, b) => b.v - a.v);
  const transfers = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amt = round2(Math.min(debtors[i].v, creditors[j].v));
    if (amt > 0) transfers.push({ from: debtors[i].id, to: creditors[j].id, amount: amt });
    debtors[i].v = round2(debtors[i].v - amt);
    creditors[j].v = round2(creditors[j].v - amt);
    if (debtors[i].v <= 0.009) i++;
    if (creditors[j].v <= 0.009) j++;
  }
  return { paid, share, transfers };
}

export const PACKING_ESSENTIALS = [
  ['Documents', ['ID proof (Aadhaar / licence)', 'Tickets & booking printouts', 'Hotel booking details', 'Cash + cards']],
  ['Clothes', ['Day clothes', 'Night wear', 'Undergarments & socks', 'Comfortable footwear', 'Light jacket / raincoat']],
  ['Toiletries', ['Toothbrush & paste', 'Soap / face wash', 'Sunscreen', 'Deodorant', 'Towel']],
  ['Electronics', ['Phone charger', 'Power bank', 'Earphones', 'Camera']],
  ['Health', ['First-aid kit', 'Regular medicines', 'Hand sanitizer', 'Mosquito repellent']],
  ['Misc', ['Water bottle', 'Snacks', 'Umbrella', 'Lock for bags']],
];

export function tripSummaryText(trip, currency) {
  const nums = tripNumbers(trip);
  const money = (v) => formatCurrency(v, currency);
  const lines = [];
  lines.push(`${trip.emoji || '🧳'} ${trip.name}${trip.destination ? ` - ${trip.destination}` : ''}`);
  if (trip.startDate) lines.push(`${formatDayLabel(trip.startDate)} to ${formatDayLabel(trip.endDate)} (${nums.days} days, ${nums.people} traveller${nums.people === 1 ? '' : 's'})`);
  lines.push('');
  lines.push('PLANNED COSTS');
  (trip.plan || []).forEach((i) => lines.push(`• ${i.title || ITEM_TYPES[i.type].label}: ${money(i.amount)}`));
  if (nums.buffer > 0) lines.push(`• Emergency buffer (${trip.contingencyPct}%): ${money(nums.buffer)}`);
  lines.push(`Total: ${money(nums.plannedTotal)}  |  Per person: ${money(nums.perPerson)}  |  Per day: ${money(nums.perDay)}`);
  if (nums.budget > 0) lines.push(`Budget: ${money(nums.budget)}`);
  if ((trip.spends || []).length) {
    lines.push('');
    lines.push(`SPENT SO FAR: ${money(nums.actual)}`);
    const { transfers } = settleUp(trip);
    const name = (id) => trip.travelers.find((t) => t.id === id)?.name || '?';
    transfers.forEach((t) => lines.push(`• ${name(t.from)} pays ${name(t.to)} ${money(t.amount)}`));
  }
  lines.push('');
  lines.push(COPYRIGHT_SHORT);
  return lines.join('\n');
}
