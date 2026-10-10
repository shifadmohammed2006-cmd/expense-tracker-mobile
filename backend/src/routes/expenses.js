import { Router } from 'express';
import { Expense, Category, toExpense, isValidId, DATE_RE } from '../models.js';
import { wrap } from '../wrap.js';

const router = Router();

const MONTH_RE = /^\d{4}-\d{2}$/;
const MAX_AMOUNT = 1_000_000_000;
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function validAmount(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 && n <= MAX_AMOUNT ? Math.round(n * 100) / 100 : null;
}

// GET /api/expenses?month=YYYY-MM&categoryId=xxx&search=text
router.get(
  '/',
  wrap(async (req, res) => {
    const { month, categoryId, search } = req.query;
    const filter = { userId: req.userId };

    if (month) {
      if (!MONTH_RE.test(String(month))) return res.status(400).json({ error: 'Invalid month.' });
      filter.date = { $gte: `${month}-01`, $lte: `${month}-31` };
    }
    if (categoryId) {
      if (!isValidId(categoryId)) return res.json([]);
      filter.categoryId = categoryId;
    }
    if (search) {
      filter.note = { $regex: escapeRegex(String(search).slice(0, 100)), $options: 'i' };
    }

    const expenses = await Expense.find(filter).sort({ date: -1, createdAt: -1 }).limit(5000);
    res.json(expenses.map(toExpense));
  })
);

router.post(
  '/',
  wrap(async (req, res) => {
    const { amount, categoryId, note, date } = req.body;

    const value = validAmount(amount);
    if (value === null) {
      return res.status(400).json({ error: 'A valid amount greater than 0 is required.' });
    }
    if (!categoryId || !isValidId(categoryId) || !(await Category.exists({ _id: categoryId, userId: req.userId }))) {
      return res.status(400).json({ error: 'A valid category is required.' });
    }
    if (date !== undefined && !DATE_RE.test(String(date))) {
      return res.status(400).json({ error: 'Date must look like YYYY-MM-DD.' });
    }

    const expense = await Expense.create({
      userId: req.userId,
      amount: value,
      categoryId,
      note: note ? String(note).slice(0, 200) : '',
      date: date || new Date().toISOString().slice(0, 10),
    });
    res.status(201).json(toExpense(expense));
  })
);

router.put(
  '/:id',
  wrap(async (req, res) => {
    if (!isValidId(req.params.id)) return res.status(404).json({ error: 'Expense not found.' });
    const expense = await Expense.findOne({ _id: req.params.id, userId: req.userId });
    if (!expense) return res.status(404).json({ error: 'Expense not found.' });

    const { amount, categoryId, note, date } = req.body;
    if (amount !== undefined) {
      const value = validAmount(amount);
      if (value === null) return res.status(400).json({ error: 'A valid amount greater than 0 is required.' });
      expense.amount = value;
    }
    if (categoryId !== undefined) {
      if (!isValidId(categoryId) || !(await Category.exists({ _id: categoryId, userId: req.userId }))) {
        return res.status(400).json({ error: 'A valid category is required.' });
      }
      expense.categoryId = categoryId;
    }
    if (note !== undefined) expense.note = String(note || '').slice(0, 200);
    if (date !== undefined) {
      if (!DATE_RE.test(String(date))) return res.status(400).json({ error: 'Date must look like YYYY-MM-DD.' });
      expense.date = date;
    }

    await expense.save();
    res.json(toExpense(expense));
  })
);

router.delete(
  '/:id',
  wrap(async (req, res) => {
    if (!isValidId(req.params.id)) return res.status(404).json({ error: 'Expense not found.' });
    const result = await Expense.deleteOne({ _id: req.params.id, userId: req.userId });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Expense not found.' });
    res.json({ success: true });
  })
);

export default router;
