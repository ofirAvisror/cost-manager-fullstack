const mongoose = require('mongoose');

/**
 * Cost Schema
 * Represents a unified income/expense cost entry
 * Supports both income and expenses with type field
 */
const costSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['income', 'expense'],
    lowercase: true,
    description: 'Type of cost: income or expense'
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    maxlength: [64, 'Category is too long']
  },
  userid: {
    type: Number,
    required: true,
    description: 'References User.id'
  },
  owner_userid: {
    type: Number,
    required: true,
    description: 'Logical owner of this cost record'
  },
  paid_by_userid: {
    type: Number,
    required: true,
    description: 'User who actually paid this expense'
  },
  is_shared: {
    type: Boolean,
    default: false
  },
  shared_with_userid: {
    type: Number,
    default: null
  },
  shared_split_mode: {
    type: String,
    enum: ['half_half', 'manual'],
    default: 'half_half'
  },
  shared_split: {
    self_percentage: {
      type: Number,
      default: 50
    },
    partner_percentage: {
      type: Number,
      default: 50
    }
  },
  sum: {
    type: Number,
    required: true,
    min: [0, 'Cost sum must be a positive number']
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  currency: {
    type: String,
    enum: ['ILS', 'USD', 'EUR'],
    default: 'ILS'
  },
  payment_method: {
    type: String,
    enum: ['credit_card', 'cash', 'bit', 'check'],
    lowercase: true
  },
  tags: {
    type: [String],
    default: [],
    description: 'Optional tags for categorization and filtering'
  },
  schedule_only: {
    type: Boolean,
    default: false,
    description: 'When true, this row is only a recurring template (not a real transaction)'
  },
  recurring: {
    enabled: {
      type: Boolean,
      default: false
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly'],
      lowercase: true
    },
    next_date: {
      type: Date,
      description: 'Next occurrence date for recurring costs'
    }
  }
}, { timestamps: true });

// Index for efficient queries
costSchema.index({ userid: 1, type: 1, created_at: -1 });
costSchema.index({ userid: 1, category: 1 });
costSchema.index({ userid: 1, 'recurring.enabled': 1 });
costSchema.index({ owner_userid: 1, created_at: -1 });
costSchema.index({ paid_by_userid: 1, created_at: -1 });
costSchema.index({ is_shared: 1, shared_with_userid: 1, created_at: -1 });

module.exports = mongoose.model('Cost', costSchema);
