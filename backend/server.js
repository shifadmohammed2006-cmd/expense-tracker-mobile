import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRouter from './src/routes/auth.js';
import expensesRouter from './src/routes/expenses.js';
import categoriesRouter from './src/routes/categories.js';
import budgetRouter from './src/routes/budget.js';
import statsRouter from './src/routes/stats.js';
import dataRouter from './src/routes/data.js';
import { requireAuth } from './src/auth.js';

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const app = express();
// Hosts like Render sit behind a proxy; this makes rate limiting see real client IPs.
app.set('trust proxy', 1);

// The mobile app is not a browser, so CORS only matters for web clients.
app.use(cors());
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'connected' : 'connecting' });
});

app.use('/api/auth', authRouter);
app.use('/api/expenses', requireAuth, expensesRouter);
app.use('/api/categories', requireAuth, categoriesRouter);
app.use('/api/budget', requireAuth, budgetRouter);
app.use('/api/stats', requireAuth, statsRouter);
app.use('/api/data', requireAuth, dataRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

try {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB.');
} catch (err) {
  console.error('Could not connect to MongoDB:', err.message);
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`Expense Tracker API listening on port ${PORT}`);
});
