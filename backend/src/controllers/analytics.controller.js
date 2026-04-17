const analyticsService = require('../services/analytics.service');
const { validateMonth, validateYear } = require('../utils/validators');
const { logger } = require('../config/logger');

/**
 * Get analytics summary
 */
async function getSummary(req, res) {
  try {
    const { userid } = req.query;

    if (!userid) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'userid query parameter is required' 
      });
    }

    const summary = await analyticsService.getSummary(userid);
    res.json(summary);
  } catch (error) {
    logger.error('Error fetching analytics summary:', error.message);
    
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

/**
 * Get analytics trends
 */
async function getTrends(req, res) {
  try {
    const { userid, year } = req.query;

    if (!userid) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'userid query parameter is required' 
      });
    }

    const trends = await analyticsService.getTrends(userid, year);
    res.json(trends);
  } catch (error) {
    logger.error('Error fetching analytics trends:', error.message);
    res.status(500).json({ 
      id: 'SERVER_ERROR',
      message: error.message 
    });
  }
}

/**
 * Get analytics categories
 */
async function getCategories(req, res) {
  try {
    const { userid, type, year, month } = req.query;

    if (!userid) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'userid query parameter is required' 
      });
    }

    const categories = await analyticsService.getCategories(userid, type, year, month);
    res.json(categories);
  } catch (error) {
    logger.error('Error fetching analytics categories:', error.message);
    res.status(500).json({ 
      id: 'SERVER_ERROR',
      message: error.message 
    });
  }
}

/**
 * Get analytics comparison
 */
async function getComparison(req, res) {
  try {
    const { userid, year, month } = req.query;

    if (!userid || !year || !month) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'Missing required query parameters: userid, year, and month are required' 
      });
    }

    if (!validateMonth(month)) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'Invalid year or month' 
      });
    }

    const comparison = await analyticsService.getComparison(userid, year, month);
    res.json(comparison);
  } catch (error) {
    logger.error('Error fetching analytics comparison:', error.message);
    res.status(500).json({ 
      id: 'SERVER_ERROR',
      message: error.message 
    });
  }
}

/**
 * Get yearly analytics
 */
async function getYearly(req, res) {
  try {
    const { userid, year } = req.query;

    if (!userid || !year) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'Missing required query parameters: userid and year are required' 
      });
    }

    if (!validateYear(year)) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'year must be a valid number' 
      });
    }

    const yearly = await analyticsService.getYearly(userid, year);
    res.json(yearly);
  } catch (error) {
    logger.error('Error fetching yearly analytics:', error.message);
    res.status(500).json({ 
      id: 'SERVER_ERROR',
      message: error.message 
    });
  }
}

module.exports = {
  getSummary,
  getTrends,
  getCategories,
  getComparison,
  getYearly
};



