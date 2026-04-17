const mongoose = require('mongoose');

/**
 * Category Schema
 * User-defined categories for frontend management.
 */
const categorySchema = new mongoose.Schema({
  userid: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  color: {
    type: String,
    default: '#6366f1',
  },
}, { timestamps: true });

categorySchema.index({ userid: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
