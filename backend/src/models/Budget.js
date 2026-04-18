const mongoose = require('mongoose');

/**
 * Budget Schema
 * Represents a budget allocation for a user.
 * Supports monthly, yearly, and category budgets.
 */
const budgetSchema = new mongoose.Schema({
  userid: {
    type: Number,
    required: true,
    description: 'References User.id'
  },
  year: {
    type: Number,
    required: true,
    min: 2000,
    max: 2100
  },
  month: {
    type: Number,
    required: function() {
      return this.type === 'monthly';
    },
    min: 1,
    max: 12
  },
  type: {
    type: String,
    required: true,
    enum: ['monthly', 'yearly', 'category'],
    lowercase: true,
    description: 'Budget type: monthly, yearly, or category-specific'
  },
  category: {
    type: String,
    required: function() {
      return this.type === 'category';
    },
    lowercase: true,
    description: 'Category for category-specific budgets (required if type is category)'
  },
  amount: {
    type: Number,
    required: true,
    min: [0, 'Budget amount must be a positive number']
  },
  currency: {
    type: String,
    enum: ['ILS', 'USD', 'EUR'],
    default: 'ILS'
  },
  /** personal: attributed share (like report "self"); couple_shared: only shared expenses, full joint amounts */
  spent_basis: {
    type: String,
    enum: ['personal', 'couple_shared'],
    default: 'personal',
    lowercase: true,
  },
}, { timestamps: true });

budgetSchema.index(
  { userid: 1, year: 1, month: 1, type: 1, spent_basis: 1 },
  { unique: true, partialFilterExpression: { type: 'monthly' } }
);

budgetSchema.index(
  { userid: 1, year: 1, type: 1, spent_basis: 1 },
  { unique: true, partialFilterExpression: { type: 'yearly' } }
);

budgetSchema.index(
  { userid: 1, year: 1, type: 1, category: 1, spent_basis: 1 },
  { unique: true, partialFilterExpression: { type: 'category' } }
);

module.exports = mongoose.model('Budget', budgetSchema);



