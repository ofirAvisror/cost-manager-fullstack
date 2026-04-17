const mongoose = require('mongoose');

/**
 * Report Schema
 * Stores cached monthly reports using the Computed Design Pattern
 */
const reportSchema = new mongoose.Schema({
  userid: {
    type: Number,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    description: 'Stores the calculated JSON report structure grouped by category'
  },
  saved_at: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Compound index for efficient queries
reportSchema.index({ userid: 1, year: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Report', reportSchema);
