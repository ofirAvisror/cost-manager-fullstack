const mongoose = require('mongoose');

/**
 * Goal Schema
 * Represents a financial goal for a user (e.g., savings target)
 */
const goalSchema = new mongoose.Schema({
  userid: {
    type: Number,
    required: true,
    description: 'References User.id'
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  target_amount: {
    type: Number,
    required: true,
    min: [0, 'Target amount must be a positive number']
  },
  current_amount: {
    type: Number,
    default: 0,
    min: [0, 'Current amount cannot be negative']
  },
  deadline: {
    type: Date,
    description: 'Optional deadline for the goal'
  },
  category: {
    type: String,
    enum: [
      // Expense categories
      'food', 'health', 'housing', 'sports', 'education',
      // Income categories
      'salary', 'freelance', 'investment', 'business', 'gift', 'other',
      // General
      'savings', 'debt_payment', 'emergency_fund'
    ],
    lowercase: true,
    description: 'Optional category for category-specific goals'
  },
  currency: {
    type: String,
    enum: ['ILS', 'USD', 'EUR'],
    default: 'ILS'
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'paused'],
    default: 'active',
    lowercase: true
  }
}, { timestamps: true });

// Index for efficient queries
goalSchema.index({ userid: 1, status: 1 });
goalSchema.index({ userid: 1, deadline: 1 });

module.exports = mongoose.model('Goal', goalSchema);



