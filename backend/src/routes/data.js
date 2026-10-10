import { Router } from 'express';
import { User, Category, Expense, seedDefaultCategories } from '../models.js';
import { wrap } from '../wrap.js';

const router = Router();

// POST /api/data/reset - wipes the current user's expenses, categories and budget back to defaults
router.post(
  '/reset',
  wrap(async (req, res) => {
    await Promise.all([
      Expense.deleteMany({ userId: req.userId }),
      Category.deleteMany({ userId: req.userId }),
    ]);
    await seedDefaultCategories(req.userId);
    await User.updateOne(
      { _id: req.userId },
      { $set: { 'settings.monthlyLimit': 0, 'settings.currency': 'USD' } }
    );
    res.json({ success: true });
  })
);

export default router;
