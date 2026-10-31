// © 2026 Expense Tracker. All rights reserved. Unauthorised copying or redistribution is prohibited.
import crypto from 'crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { Trip, User } from '../models.js';
import { wrap } from '../wrap.js';

const router = Router();
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_TRIPS = 200;
const MAX_MEMBERS = 30;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I so codes are easy to read out

// Removes keys that start with "$" or contain "." so stored JSON can never act as a database operator.
function clean(value, depth = 0) {
  if (depth > 8) return null;
  if (Array.isArray(value)) return value.slice(0, 500).map((v) => clean(v, depth + 1));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k.startsWith('$') || k.includes('.')) continue;
      out[k] = clean(v, depth + 1);
    }
    return out;
  }
  return value;
}

const makeCode = () => Array.from(crypto.randomBytes(6), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');

// Adds the read-only `share` block the app uses to show host / members / join code.
async function withShare(trips, userId) {
  const ids = new Set();
  trips.forEach((t) => {
    if (!t.joinCode) return;
    ids.add(String(t.userId));
    t.memberIds.forEach((m) => ids.add(String(m)));
  });
  const users = ids.size ? await User.find({ _id: { $in: [...ids] } }).select('email') : [];
  const email = new Map(users.map((u) => [String(u._id), u.email]));
  return trips.map((t) => {
    const isHost = String(t.userId) === String(userId);
    const data = { ...t.data };
    delete data.share;
    if (t.joinCode || !isHost) {
      data.share = {
        role: isHost ? 'host' : 'member',
        code: isHost ? t.joinCode || null : null,
        host: email.get(String(t.userId)) || 'host',
        members: t.memberIds.map((m) => email.get(String(m)) || 'member'),
      };
    }
    return data;
  });
}

const joinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in a few minutes.' },
});

// GET /api/trips - trips you host plus trips you joined
router.get(
  '/',
  wrap(async (req, res) => {
    const trips = await Trip.find({ $or: [{ userId: req.userId }, { memberIds: req.userId }] })
      .sort({ updatedAtClient: -1 })
      .limit(MAX_TRIPS);
    res.json(await withShare(trips, req.userId));
  })
);

// POST /api/trips/join - { code } adds you as a member of the host's trip
router.post(
  '/join',
  joinLimiter,
  wrap(async (req, res) => {
    const code = String(req.body?.code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length < 4) return res.status(400).json({ error: 'Enter the join code your host shared.' });
    const trip = await Trip.findOne({ joinCode: code });
    if (!trip) return res.status(404).json({ error: 'No trip found for that code. Check it with your host.' });
    if (String(trip.userId) === String(req.userId)) return res.status(400).json({ error: 'This is your own trip - you are the host.' });
    if (!trip.memberIds.some((m) => String(m) === String(req.userId))) {
      if (trip.memberIds.length >= MAX_MEMBERS) return res.status(400).json({ error: 'This trip is full.' });
      trip.memberIds.push(req.userId);
      await trip.save();
    }
    const [shared] = await withShare([trip], req.userId);
    res.json(shared);
  })
);

// POST /api/trips/:tripId/share - host turns on sharing (idempotent) and gets the join code
router.post(
  '/:tripId/share',
  wrap(async (req, res) => {
    const trip = await Trip.findOne({ userId: req.userId, tripId: req.params.tripId });
    if (!trip) return res.status(404).json({ error: 'Trip not found. Let it sync first, then try again.' });
    if (!trip.joinCode) {
      for (let i = 0; i < 5 && !trip.joinCode; i++) {
        const code = makeCode();
        if (!(await Trip.exists({ joinCode: code }))) trip.joinCode = code;
      }
      if (!trip.joinCode) return res.status(500).json({ error: 'Could not create a code. Try again.' });
      await trip.save();
    }
    const [shared] = await withShare([trip], req.userId);
    res.json(shared);
  })
);

// POST /api/trips/:tripId/unshare - host stops sharing; the code stops working and members are removed
router.post(
  '/:tripId/unshare',
  wrap(async (req, res) => {
    const result = await Trip.updateOne(
      { userId: req.userId, tripId: req.params.tripId },
      { $unset: { joinCode: 1 }, $set: { memberIds: [] } }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Trip not found.' });
    res.json({ success: true });
  })
);

// PUT /api/trips/:tripId - create or replace one trip (host only; members have view access)
router.put(
  '/:tripId',
  wrap(async (req, res) => {
    const { tripId } = req.params;
    if (!ID_RE.test(tripId)) return res.status(400).json({ error: 'Invalid trip id.' });
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ error: 'Trip data is required.' });
    }

    const exists = await Trip.exists({ userId: req.userId, tripId });
    if (!exists && (await Trip.countDocuments({ userId: req.userId })) >= MAX_TRIPS) {
      return res.status(400).json({ error: `You can have up to ${MAX_TRIPS} trips.` });
    }

    const data = clean({ ...req.body, id: tripId });
    delete data.share; // computed by the server, never trusted from the phone
    await Trip.updateOne(
      { userId: req.userId, tripId },
      { $set: { data, updatedAtClient: Number(data.updatedAt) || Date.now() } },
      { upsert: true }
    );
    res.json(data);
  })
);

// DELETE /api/trips/:tripId - host deletes the trip; a member just leaves it
router.delete(
  '/:tripId',
  wrap(async (req, res) => {
    const { tripId } = req.params;
    const result = await Trip.deleteOne({ userId: req.userId, tripId });
    if (result.deletedCount > 0) return res.json({ success: true });
    const left = await Trip.updateOne({ tripId, memberIds: req.userId }, { $pull: { memberIds: req.userId } });
    if (left.modifiedCount === 0) return res.status(404).json({ error: 'Trip not found.' });
    res.json({ success: true });
  })
);

export default router;
