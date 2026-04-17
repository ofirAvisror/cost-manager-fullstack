const mongoose = require('mongoose');

/**
 * Log Schema
 * Represents log entries stored in MongoDB
 * Logs are created for every HTTP request and endpoint access
 */
const logSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    unique: true,
    description: 'Unique log entry ID'
  },
  message: {
    type: String,
    required: true,
    description: 'Log message content'
  },
  level: {
    type: String,
    required: true,
    enum: ['info', 'error', 'warn', 'debug'],
    lowercase: true
  },
  endpoint: {
    type: String,
    description: 'The endpoint that was accessed'
  },
  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
    description: 'HTTP method used'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  userid: {
    type: mongoose.Schema.Types.Mixed,
    description: 'User ID if applicable to the request (can be Number or String)'
  },
  status_code: {
    type: Number,
    description: 'HTTP status code of the response'
  }
}, { timestamps: true });

// Index for efficient queries
logSchema.index({ timestamp: -1 });
logSchema.index({ endpoint: 1 });
logSchema.index({ id: -1 }); // Index for getNextLogId() performance

module.exports = mongoose.model('Log', logSchema);

