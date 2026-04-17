const costService = require('../services/cost.service');
const { validateCostType, validateCategory, validateDate, validatePositiveNumber } = require('../utils/validators');
const { logger } = require('../config/logger');

/**
 * Create a new cost
 */
async function createCost(req, res) {
  try {
    const { type, description, category, userid, sum, tags, recurring, created_at, currency, payment_method } = req.body;

    // Validate required fields
    if (!type || !description || !category || (userid === undefined && !req.user) || sum === undefined) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'Missing required fields: type, description, category, userid, and sum are required' 
      });
    }

    // Validate type
    if (!validateCostType(type)) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'Invalid type. Must be either "income" or "expense"' 
      });
    }

    // Validate category
    if (!validateCategory(category, type, costService.EXPENSE_CATEGORIES, costService.INCOME_CATEGORIES)) {
      const validCategories = type.toLowerCase() === 'income' 
        ? costService.INCOME_CATEGORIES 
        : costService.EXPENSE_CATEGORIES;
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: `Invalid category for ${type}. Must be one of: ${validCategories.join(', ')}` 
      });
    }

    // Validate sum
    if (!validatePositiveNumber(sum)) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'sum must be a positive number' 
      });
    }

    // Validate payment_method only for expenses
    if (type.toLowerCase() === 'income' && payment_method) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'payment_method is only allowed for expense costs' 
      });
    }

    const cost = await costService.createCost(req.body, req.user?.id);
    res.status(201).json(cost);
  } catch (error) {
    logger.error('Error creating cost:', error.message);
    
    if (error.message === 'User not found') {
      return res.status(404).json({ 
        id: 'NOT_FOUND',
        message: error.message 
      });
    }
    
    if (error.code === 11000) {
      return res.status(409).json({ 
        id: 'DUPLICATE_ERROR',
        message: 'Cost already exists' 
      });
    }

    res.status(400).json({ 
      id: 'VALIDATION_ERROR',
      message: error.message 
    });
  }
}

/**
 * Get costs with filters
 */
async function getCosts(req, res) {
  try {
    // Support both userId and userid query parameters
    const { userId, userid, type, category, startDate, endDate, tags, recurring, limit, skip } = req.query;
    
    // If user is authenticated, use their userid from token
    const userIdToUse = req.user?.id || userId || userid;
    
    if (!userIdToUse) {
      return res.status(400).json({
        id: 'VALIDATION_ERROR',
        message: 'userid is required (or use authentication token)'
      });
    }
    
    const costs = await costService.getCosts({
      userid: userIdToUse,
      type,
      category,
      startDate,
      endDate,
      tags: tags ? tags.split(',') : undefined,
      recurring,
      limit,
      skip
    });
    
    res.status(200).json(costs);
  } catch (error) {
    logger.error('Error fetching costs:', error.message);
    res.status(500).json({
      id: 'SERVER_ERROR',
      message: error.message
    });
  }
}

/**
 * Get cost by ID
 */
async function getCostById(req, res) {
  try {
    const { id } = req.params;
    const cost = await costService.getCostById(id);
    res.status(200).json(cost);
  } catch (error) {
    logger.error('Error fetching cost:', error.message);
    
    if (error.message === 'Cost not found') {
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
  createCost,
  getCosts,
  getCostById
};



