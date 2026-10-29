// © 2026 Expense Tracker. All rights reserved. Unauthorised copying or redistribution is prohibited.
import { Router } from 'express';
import { User, Category, Expense, toSettings, DATE_RE } from '../models.js';
import { wrap } from '../wrap.js';

const router = Router();
const MONTH_RE = /^\d{4}-\d{2}$/;

// GET /api/stats?month=YYYY-MM&today=YYYY-MM-DD
// `today` is the phone's local date, so "daily average" is right in every time zone.
router.get(
  '/',
  wrap(async (req, res) => {
    const today = DATE_RE.test(String(req.query.today || ''))
      ? String(req.query.today)
      : new Date().toISOString().slice(0, 10);
    const month = MONTH_RE.test(String(req.query.month || '')) ? String(req.query.month) : today.slice(0, 7);

    const [user, categories, expenses] = await Promise.all([
      User.findById(req.userId),
      Category.find({ userId: req.userId }).sort({ _id: 1 }),
      Expense.find({ userId: req.userId, date: { $gte: `${month}-01`, $lte: `${month}-31` } }),
    ]);
    const settings = toSettings(user);

    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

    const spentByCat = {};
    const dayMap = {};
    for (const e of expenses) {
      const key = e.categoryId.toString();
      spentByCat[key] = (spentByCat[key] || 0) + e.amount;
      dayMap[e.date] = (dayMap[e.date] || 0) + e.amount;
    }

    const byCategory = categories
      .map((c) => ({
        categoryId: c._id.toString(),
        name: c.name,
        color: c.color,
        icon: c.icon,
        spent: spentByCat[c._id.toString()] || 0,
        budget: c.budget || 0,
      }))
      .filter((c) => c.spent > 0 || c.budget > 0);

    const dailyTrend = Object.keys(dayMap)
      .sort()
      .map((date) => ({ date, total: dayMap[date] }));

    const [y, m] = month.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const daysSoFar = today.slice(0, 7) === month ? Number(today.slice(8, 10)) : daysInMonth;
    const avgPerDay = daysSoFar > 0 ? totalSpent / daysSoFar : 0;

    const topCategory = [...byCategory].sort((a, b) => b.spent - a.spent)[0] || null;

    res.json({
      month,
      totalSpent,
      monthlyLimit: settings.monthlyLimit,
      remaining: settings.monthlyLimit - totalSpent,
      currency: settings.currency,
      byCategory,
      dailyTrend,
      avgPerDay,
      topCategory: topCategory && topCategory.spent > 0 ? topCategory : null,
      transactionCount: expenses.length,
    });
  })
);

export default router;
