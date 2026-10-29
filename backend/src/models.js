// © 2026 Expense Tracker. All rights reserved. Unauthorised copying or redistribution is prohibited.
import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    salt: { type: String, required: true },
    hash: { type: String, required: true },
    settings: {
      monthlyLimit: { type: Number, default: 0 },
      currency: { type: String, default: 'INR' },
    },
  },
  { timestamps: true }
);

const categorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    icon: { type: String, default: 'Circle', maxlength: 30 },
    color: { type: String, default: '#8B9490' },
    budget: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const expenseSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    amount: { type: Number, required: true },
    note: { type: String, default: '', maxlength: 200 },
    date: { type: String, required: true }, // YYYY-MM-DD
  },
  { timestamps: true }
);
expenseSchema.index({ userId: 1, date: -1 });

// One document per trip. The whole trip (costs, itinerary, split spends, packing list) lives in `data`,
// which keeps offline syncing simple: the phone sends the full trip and the newest edit wins.
const tripSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tripId: { type: String, required: true, maxlength: 64 },
    data: { type: Schema.Types.Mixed, required: true },
    updatedAtClient: { type: Number, default: 0 },
  },
  { timestamps: true }
);
tripSchema.index({ userId: 1, tripId: 1 }, { unique: true });

export const User = model('User', userSchema);
export const Trip = model('Trip', tripSchema);
export const Category = model('Category', categorySchema);
export const Expense = model('Expense', expenseSchema);

// ---- Shared helpers ----

export const DEFAULT_CATEGORIES = [
  { name: 'Food & Dining', icon: 'Utensils', color: '#2F6F4E' },
  { name: 'Transport', icon: 'Car', color: '#3A6EA5' },
  { name: 'Shopping', icon: 'ShoppingBag', color: '#D6A317' },
  { name: 'Bills & Utilities', icon: 'Receipt', color: '#8B5CF6' },
  { name: 'Health', icon: 'HeartPulse', color: '#C1443B' },
  { name: 'Entertainment', icon: 'Film', color: '#EC4899' },
  { name: 'Other', icon: 'MoreHorizontal', color: '#8B9490' },
];

export async function seedDefaultCategories(userId) {
  await Category.insertMany(DEFAULT_CATEGORIES.map((c) => ({ ...c, userId, budget: 0 })));
}

export const isValidId = (id) => mongoose.isValidObjectId(id);
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export const toCategory = (c) => ({
  id: c._id.toString(),
  name: c.name,
  icon: c.icon,
  color: c.color,
  budget: c.budget || 0,
});

export const toExpense = (e) => ({
  id: e._id.toString(),
  amount: e.amount,
  categoryId: e.categoryId.toString(),
  note: e.note || '',
  date: e.date,
  createdAt: e.createdAt,
});

export const toSettings = (u) => ({
  monthlyLimit: u.settings?.monthlyLimit || 0,
  currency: u.settings?.currency || 'INR',
});
