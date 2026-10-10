import { Router } from 'express';
import { User, toSettings } from '../models.js';
import { wrap } from '../wrap.js';

const router = Router();
const CURRENCY_RE = /^[A-Z]{3}$/;

router.get(
  '/',
  wrap(async (req, res) => {
    const user = await User.findById(req.userId);
    res.json(toSettings(user));
  })
);

router.put(
  '/',
  wrap(async (req, res) => {
    const { monthlyLimit, currency } = req.body;
    const user = await User.findById(req.userId);

    if (monthlyLimit !== undefined) {
      const n = Number(monthlyLimit);
      if (!Number.isFinite(n) || n < 0 || n > 1_000_000_000) {
        return res.status(400).json({ error: 'Enter a valid monthly limit.' });
      }
      user.settings.monthlyLimit = n;
    }
    if (currency !== undefined) {
      if (!CURRENCY_RE.test(String(currency))) return res.status(400).json({ error: 'Invalid currency.' });
      user.settings.currency = currency;
    }

    await user.save();
    res.json(toSettings(user));
  })
);

export default router;
