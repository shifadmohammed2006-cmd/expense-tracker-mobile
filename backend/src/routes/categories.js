// © 2026 Expense Tracker. All rights reserved. Unauthorised copying or redistribution is prohibited.
import { Router } from 'express';
import { Category, Expense, toCategory, isValidId, COLOR_RE } from '../models.js';
import { wrap } from '../wrap.js';

const router = Router();
const MAX_CATEGORIES = 50;

router.get(
  '/',
  wrap(async (req, res) => {
    const categories = await Category.find({ userId: req.userId }).sort({ _id: 1 });
    res.json(categories.map(toCategory));
  })
);

router.post(
  '/',
  wrap(async (req, res) => {
    const name = String(req.body.name || '').trim();
    const { icon, color, budget } = req.body;

    if (!name) return res.status(400).json({ error: 'Category name is required.' });
    if (name.length > 40) return res.status(400).json({ error: 'Category name is too long.' });
    if (color !== undefined && !COLOR_RE.test(String(color))) {
      return res.status(400).json({ error: 'Color must look like #RRGGBB.' });
    }
    if ((await Category.countDocuments({ userId: req.userId })) >= MAX_CATEGORIES) {
      return res.status(400).json({ error: `You can have up to ${MAX_CATEGORIES} categories.` });
    }

    const category = await Category.create({
      userId: req.userId,
      name,
      icon: icon ? String(icon).slice(0, 30) : 'Circle',
      color: color || '#8B9490',
      budget: Math.max(0, Number(budget) || 0),
    });
    res.status(201).json(toCategory(category));
  })
);

router.put(
  '/:id',
  wrap(async (req, res) => {
    if (!isValidId(req.params.id)) return res.status(404).json({ error: 'Category not found.' });
    const category = await Category.findOne({ _id: req.params.id, userId: req.userId });
    if (!category) return res.status(404).json({ error: 'Category not found.' });

    const { name, icon, color, budget } = req.body;
    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed || trimmed.length > 40) return res.status(400).json({ error: 'Enter a category name (40 characters max).' });
      category.name = trimmed;
    }
    if (icon !== undefined) category.icon = String(icon).slice(0, 30);
    if (color !== undefined) {
      if (!COLOR_RE.test(String(color))) return res.status(400).json({ error: 'Color must look like #RRGGBB.' });
      category.color = color;
    }
    if (budget !== undefined) category.budget = Math.max(0, Number(budget) || 0);

    await category.save();
    res.json(toCategory(category));
  })
);

// Deleting a category moves its expenses into "Other" so no spending is lost.
router.delete(
  '/:id',
  wrap(async (req, res) => {
    if (!isValidId(req.params.id)) return res.status(404).json({ error: 'Category not found.' });
    const category = await Category.findOne({ _id: req.params.id, userId: req.userId });
    if (!category) return res.status(404).json({ error: 'Category not found.' });

    const used = await Expense.countDocuments({ userId: req.userId, categoryId: category._id });
    if (used > 0) {
      const fallback = await Category.findOne({
        userId: req.userId,
        name: 'Other',
        _id: { $ne: category._id },
      });
      if (!fallback) {
        return res.status(409).json({ error: 'This category has expenses. Create an "Other" category first so they have somewhere to go.' });
      }
      await Expense.updateMany(
        { userId: req.userId, categoryId: category._id },
        { $set: { categoryId: fallback._id } }
      );
    }

    await category.deleteOne();
    res.json({ success: true });
  })
);

export default router;
