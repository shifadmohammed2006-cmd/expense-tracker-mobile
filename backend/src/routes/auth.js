import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { User, Category, Expense, seedDefaultCategories } from '../models.js';
import { hashPassword, verifyPassword, fakeVerify, signToken, requireAuth } from '../auth.js';
import { wrap } from '../wrap.js';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Slows down password guessing and mass signups from one IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
});

const publicUser = (u) => ({ id: u._id.toString(), email: u.email });
const normalizeEmail = (e) => String(e || '').trim().toLowerCase();

// POST /api/auth/signup
router.post(
  '/signup',
  authLimiter,
  wrap(async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const password = req.body.password;

    if (!EMAIL_RE.test(email) || email.length > 254) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      return res.status(400).json({ error: 'Password must be 8-128 characters.' });
    }
    if (await User.exists({ email })) {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }

    const { salt, hash } = await hashPassword(password);
    let user;
    try {
      user = await User.create({ email, salt, hash });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ error: 'An account with that email already exists.' });
      }
      throw err;
    }
    await seedDefaultCategories(user._id);

    const token = signToken({ sub: user._id.toString(), email: user.email });
    res.status(201).json({ token, user: publicUser(user) });
  })
);

// POST /api/auth/login
router.post(
  '/login',
  authLimiter,
  wrap(async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const password = req.body.password;
    if (!email || typeof password !== 'string' || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      await fakeVerify(password);
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }
    if (!(await verifyPassword(password, user.salt, user.hash))) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    const token = signToken({ sub: user._id.toString(), email: user.email });
    res.json({ token, user: publicUser(user) });
  })
);

// GET /api/auth/me - validates the token and returns the account
router.get(
  '/me',
  requireAuth,
  wrap(async (req, res) => {
    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ error: 'Account no longer exists.' });
    res.json({ user: publicUser(user) });
  })
);

// DELETE /api/auth/account - permanently deletes the account and all its data (needs the password)
router.delete(
  '/account',
  requireAuth,
  authLimiter,
  wrap(async (req, res) => {
    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ error: 'Account no longer exists.' });

    const password = req.body?.password;
    if (typeof password !== 'string' || !(await verifyPassword(password, user.salt, user.hash))) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }

    await Promise.all([
      Expense.deleteMany({ userId: user._id }),
      Category.deleteMany({ userId: user._id }),
    ]);
    await user.deleteOne();
    res.json({ success: true });
  })
);

export default router;
