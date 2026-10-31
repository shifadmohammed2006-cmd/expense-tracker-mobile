// © Expense Tracker. All rights reserved.
// Pure functions (no phone APIs) that decide WHAT a notification says and WHEN it is sent.
import { formatCurrency, toDateStr } from './format';

const pad = (n) => String(n).padStart(2, '0');

// ---------- In-app "pop-up" notices (like the banners WhatsApp / LinkedIn slide down) ----------

export function budgetNotice(kind, stats) {
  const cur = stats.currency;
  if (kind === 'over') {
    return {
      id: 'over',
      tone: 'danger',
      title: 'You are over budget',
      body: `You've spent ${formatCurrency(stats.totalSpent, cur)} of ${formatCurrency(stats.monthlyLimit, cur)} this month. Tap to review.`,
      action: 'expenses',
    };
  }
  return {
    id: 'near',
    tone: 'warn',
    title: '80% of your budget is used',
    body: `Only ${formatCurrency(Math.max(stats.remaining, 0), cur)} left${stats.daysLeft ? ` for ${stats.daysLeft === 1 ? 'the last day' : `the next ${stats.daysLeft} days`}` : ''}. Spend wisely!`,
    action: 'budget',
  };
}

// Picks the single most useful thing to tell the person right now. `seen` = ids already shown today.
export function pickNotice({ now = new Date(), stats, insights, allExpenses, seen = {} }) {
  if (!stats) return null;
  const today = toDateStr(now);
  const cur = stats.currency;
  const hasAny = allExpenses.length > 0;
  const loggedToday = allExpenses.some((e) => e.date === today);
  const ratio = stats.monthlyLimit > 0 ? stats.totalSpent / stats.monthlyLimit : 0;
  const fresh = (n) => (n && !seen[`${n.id}|${today}`] ? n : null);

  const list = [];
  if (stats.monthlyLimit > 0 && ratio >= 1) list.push(budgetNotice('over', stats));
  else if (stats.monthlyLimit > 0 && ratio >= 0.8) list.push(budgetNotice('near', stats));

  if (!hasAny) {
    list.push({ id: 'start', tone: 'info', title: 'Start tracking in 5 seconds', body: 'Add your first expense and watch your dashboard come alive.', action: 'add', cta: 'Add expense' });
  } else if (!loggedToday && now.getHours() >= 12) {
    list.push({ id: 'nolog', tone: 'info', title: 'Nothing logged today', body: 'Bought something? Add it now while you still remember.', action: 'add', cta: 'Add expense' });
  }

  if (hasAny && stats.monthlyLimit <= 0) {
    list.push({ id: 'nobudget', tone: 'info', title: 'Set a monthly budget', body: 'Get alerts before you overspend. It takes one tap.', action: 'budget', cta: 'Set budget' });
  }
  if (insights && insights.noSpendStreak >= 2) {
    list.push({ id: 'streak', tone: 'success', title: `${insights.noSpendStreak} no-spend days in a row`, body: 'Great discipline. Keep the streak going!', action: null });
  }
  if (insights && insights.change !== null && Math.abs(insights.change) >= 5) {
    const down = insights.change < 0;
    list.push({
      id: down ? 'down' : 'up',
      tone: down ? 'success' : 'warn',
      title: down ? `Spending is down ${Math.round(Math.abs(insights.change))}%` : `Spending is up ${Math.round(insights.change)}%`,
      body: `Compared with last month so far. ${down ? 'Nice work!' : 'Worth a look.'}`,
      action: 'expenses',
    });
  }
  if (stats.topCategory) {
    list.push({ id: 'top', tone: 'info', title: `Top category: ${stats.topCategory.name}`, body: `${formatCurrency(stats.topCategory.spent, cur)} this month. Tap to see the details.`, action: 'expenses' });
  }
  list.push({ id: 'check', tone: 'info', title: 'Check your expenses', body: 'Take a quick look at how this month is going.', action: 'dashboard' });

  for (const n of list) if (fresh(n)) return n;
  return null;
}

// ---------- Phone (system) notifications, scheduled ahead on the device ----------

const DAILY_COPY = [
  ['Log today\'s spending', 'A quick 10-second check keeps your budget honest.'],
  ['Check your expenses', 'See where your money went today.'],
  ['Don\'t let it pile up', 'Add today\'s expenses before you forget them.'],
  ['Your budget is waiting', 'How are you doing this month? Take a look.'],
  ['Small spends add up', 'Log that chai, ride or snack right now.'],
  ['Money check-in', 'Open your dashboard for today\'s snapshot.'],
  ['Any expenses today?', 'Add them in seconds - even offline.'],
  ['Stay on track', 'A minute now saves a surprise at month-end.'],
];

const atTime = (base, dayOffset, hour, minute) => {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + dayOffset, hour, minute, 0, 0);
  return d;
};

// Returns the next ~week of notifications. The app calls this on every open and whenever data changes,
// so the schedule always reflects what the person did last (e.g. no reminder today if they already logged).
// If the app is not opened for a week the notifications simply stop - no endless nagging.
export function buildSchedule({ now = new Date(), prefs, loggedToday }) {
  const out = [];
  const soon = now.getTime() + 60 * 1000;
  const doy = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);

  if (prefs.daily) {
    for (let i = 0; i < 7; i++) {
      const when = atTime(now, i, prefs.hour, prefs.minute);
      if (when.getTime() < soon) continue;
      if (i === 0 && loggedToday) continue;
      const [title, body] = DAILY_COPY[(doy + i) % DAILY_COPY.length];
      out.push({ key: `daily-${pad(when.getMonth() + 1)}${pad(when.getDate())}`, when, title, body, action: 'add' });
    }
  }

  if (prefs.weekly) {
    for (let i = 0; i < 7; i++) {
      const when = atTime(now, i, 10, 0);
      if (when.getDay() !== 0 || when.getTime() < soon) continue;
      out.push({ key: 'weekly', when, title: 'Your weekly recap is ready', body: 'See how this week\'s spending compares. Tap to open.', action: 'dashboard' });
    }
  }

  if (prefs.budget) {
    for (let i = 0; i < 7; i++) {
      const when = atTime(now, i, 18, 0);
      const daysToMonthEnd = new Date(when.getFullYear(), when.getMonth() + 1, 0).getDate() - when.getDate();
      if (daysToMonthEnd === 2 && when.getTime() >= soon) {
        out.push({ key: 'monthend', when, title: 'The month ends in 2 days', body: 'Check your budget and see how much is left.', action: 'budget' });
      }
    }
  }

  return out.sort((a, b) => a.when - b.when);
}

export const REMINDER_TIMES = [
  { label: '9 AM', hour: 9, minute: 0 },
  { label: '1 PM', hour: 13, minute: 0 },
  { label: '8 PM', hour: 20, minute: 0 },
  { label: '10 PM', hour: 22, minute: 0 },
];
