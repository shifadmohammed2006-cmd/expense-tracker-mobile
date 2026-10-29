// © 2026 Expense Tracker. All rights reserved. Unauthorised copying or redistribution is prohibited.
import { Router } from 'express';
import { Trip } from '../models.js';
import { wrap } from '../wrap.js';

const router = Router();
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_TRIPS = 200;

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

// GET /api/trips - every trip of the signed-in user
router.get(
  '/',
  wrap(async (req, res) => {
    const trips = await Trip.find({ userId: req.userId }).sort({ updatedAtClient: -1 }).limit(MAX_TRIPS);
    res.json(trips.map((t) => t.data));
  })
);

// PUT /api/trips/:tripId - create or replace one trip (the phone sends the whole trip)
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
    await Trip.updateOne(
      { userId: req.userId, tripId },
      { $set: { data, updatedAtClient: Number(data.updatedAt) || Date.now() } },
      { upsert: true }
    );
    res.json(data);
  })
);

router.delete(
  '/:tripId',
  wrap(async (req, res) => {
    const result = await Trip.deleteOne({ userId: req.userId, tripId: req.params.tripId });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Trip not found.' });
    res.json({ success: true });
  })
);

export default router;
