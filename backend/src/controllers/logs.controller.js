const logsService = require('../services/logs.service');
const { logger } = require('../config/logger');

/**
 * Get all logs
 */
async function getLogs(req, res) {
  try {
    const logs = await logsService.getAllLogs();
    res.json(logs);
  } catch (error) {
    logger.error('Error fetching logs:', error.message);
    res.status(500).json({ 
      id: 'SERVER_ERROR',
      message: error.message 
    });
  }
}

module.exports = {
  getLogs
};

