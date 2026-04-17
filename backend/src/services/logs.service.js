const Log = require('../models/Log');
const { logger } = require('../config/logger');

/**
 * Get all logs
 * Returns all logs from the logs collection, sorted by timestamp (newest first)
 */
async function getAllLogs() {
  return await Log.find({}).sort({ timestamp: -1 }).limit(1000);
}

module.exports = {
  getAllLogs
};

