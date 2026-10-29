// © 2026 Expense Tracker. All rights reserved. Unauthorised copying or redistribution is prohibited.
import { toDateStr } from './format';

// Same numbers the server used to calculate - now done on the phone so it works offline.
export function computeStats({ month, today = toDateStr(), categories, expenses, settings }) {
  const inMonth = expenses.filter((e) => e.date >= `${month}-01` && e.date <= `${month}-31`);
  const totalSpent = inMonth.reduce((s, e) => s + e.amount, 0);

  const spentByCat = {};
  const dayMap = {};
  for (const e of inMonth) {
    spentByCat[e.categoryId] = (spentByCat[e.categoryId] || 0) + e.amount;
    dayMap[e.date] = (dayMap[e.date] || 0) + e.amount;
  }

  const byCategory = categories
    .map((c) => ({
      categoryId: c.id,
      name: c.name,
      color: c.color,
      icon: c.icon,
      spent: spentByCat[c.id] || 0,
      budget: c.budget || 0,
    }))
    .filter((c) => c.spent > 0 || c.budget > 0);

  const dailyTrend = Object.keys(dayMap)
    .sort()
    .map((date) => ({ date, total: dayMap[date] }));

  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const isCurrent = today.slice(0, 7) === month;
  const daysSoFar = isCurrent ? Number(today.slice(8, 10)) : daysInMonth;
  const avgPerDay = daysSoFar > 0 ? totalSpent / daysSoFar : 0;
  const topCategory = [...byCategory].sort((a, b) => b.spent - a.spent)[0] || null;

  return {
    month,
    totalSpent,
    monthlyLimit: settings.monthlyLimit,
    remaining: settings.monthlyLimit - totalSpent,
    currency: settings.currency,
    byCategory,
    dailyTrend,
    avgPerDay,
    topCategory: topCategory && topCategory.spent > 0 ? topCategory : null,
    transactionCount: inMonth.length,
    daysInMonth,
    daysLeft: isCurrent ? daysInMonth - daysSoFar + 1 : 0,
    isCurrent,
  };
}

// Friendly extras for the dashboard: month-over-month change and a no-spend-day streak.
export function computeInsights({ month, today = toDateStr(), expenses, totalSpent }) {
  const [y, m] = month.split('-').map(Number);
  const prev = toDateStr(new Date(y, m - 2, 1)).slice(0, 7);
  const prevTotal = expenses
    .filter((e) => e.date >= `${prev}-01` && e.date <= `${prev}-31`)
    .reduce((s, e) => s + e.amount, 0);
  const change = prevTotal > 0 ? ((totalSpent - prevTotal) / prevTotal) * 100 : null;

  const spendDays = new Set(expenses.map((e) => e.date));
  let streak = 0;
  const d = new Date(`${today}T00:00:00`);
  // Today only counts once it has passed without spending, so start from today and walk back.
  for (let i = 0; i < 365; i++) {
    const key = toDateStr(d);
    if (spendDays.has(key)) break;
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  const hasAny = expenses.length > 0;
  return { prevTotal, change, noSpendStreak: hasAny ? streak : 0 };
}
