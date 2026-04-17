const reportService = require('../services/report.service');
const userService = require('../services/user.service');
const { validateMonth, validateYear } = require('../utils/validators');
const { logger } = require('../config/logger');

/**
 * Get report for a specific month/year
 */
async function getReport(req, res) {
  try {
    const { id, year, month } = req.query;

    // Validate required params
    if (!id || !year || !month) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'Missing required query parameters: id, year, and month are required' 
      });
    }

    const userIdNum = parseInt(id);
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    // Validate ranges
    if (isNaN(userIdNum) || isNaN(yearNum) || !validateMonth(monthNum)) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'Invalid query parameters: id, year, and month must be valid numbers' 
      });
    }

    if (!validateMonth(monthNum)) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'Month must be between 1 and 12' 
      });
    }

    // Verify user exists
    await userService.getUserById(userIdNum);

    const reportData = await reportService.getReport(userIdNum, yearNum, monthNum);
    res.json(reportData);
  } catch (error) {
    logger.error('Error fetching report:', error.message);
    
    if (error.message === 'User not found') {
      return res.status(404).json({ 
        id: 'NOT_FOUND',
        message: error.message 
      });
    }

    res.status(500).json({ 
      id: 'SERVER_ERROR',
      message: error.message 
    });
  }
}

module.exports = {
  getReport
};



