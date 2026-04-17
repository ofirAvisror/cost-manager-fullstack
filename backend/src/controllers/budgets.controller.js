const budgetService = require('../services/budget.service');
const { validateMonth, validateYear, validatePositiveNumber } = require('../utils/validators');
const { logger } = require('../config/logger');

/**
 * Create a new budget
 */
async function createBudget(req, res) {
  try {
    const { userid, year, month, type, category, amount, currency } = req.body;

    // Validate required fields
    if (!userid || !year || !type || amount === undefined) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'Missing required fields: userid, year, type, and amount are required' 
      });
    }

    // Validate type
    const normalizedType = type.toLowerCase();
    if (!['monthly', 'yearly', 'category'].includes(normalizedType)) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'Invalid type. Must be one of: monthly, yearly, category' 
      });
    }

    if (normalizedType === 'monthly' && !month) {
      return res.status(400).json({
        id: 'VALIDATION_ERROR',
        message: 'month is required when type is "monthly"',
      });
    }

    // Validate category if type is category
    if (normalizedType === 'category') {
      if (!category) {
        return res.status(400).json({ 
          id: 'VALIDATION_ERROR',
          message: 'category is required when type is "category"' 
        });
      }
    }

    // Validate year and month
    if (!validateYear(year) || (month !== undefined && !validateMonth(month))) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'year must be between 2000-2100 and month (if provided) must be between 1-12' 
      });
    }

    // Validate amount
    if (!validatePositiveNumber(amount)) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'amount must be a positive number' 
      });
    }

    const budget = await budgetService.createBudget(req.body);
    res.status(201).json(budget);
  } catch (error) {
    logger.error('Error creating budget:', error.message);
    
    if (error.message === 'User not found') {
      return res.status(404).json({ 
        id: 'NOT_FOUND',
        message: error.message 
      });
    }
    
    if (error.code === 11000) {
      return res.status(409).json({ 
        id: 'DUPLICATE_ERROR',
        message: 'Budget already exists for this user, month, and type/category' 
      });
    }

    res.status(500).json({ 
      id: 'SERVER_ERROR',
      message: error.message 
    });
  }
}

/**
 * Get budgets
 */
async function getBudgets(req, res) {
  try {
    const { userid, year, month, type, category } = req.query;

    if (!userid) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'userid query parameter is required' 
      });
    }

    const budgets = await budgetService.getBudgets({ userid, year, month, type, category });
    res.json(budgets);
  } catch (error) {
    logger.error('Error fetching budgets:', error.message);
    res.status(500).json({ 
      id: 'SERVER_ERROR',
      message: error.message 
    });
  }
}

/**
 * Update a budget
 */
async function updateBudget(req, res) {
  try {
    const { id } = req.params;
    const { amount, currency, category } = req.body;

    if (amount !== undefined && !validatePositiveNumber(amount)) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'amount must be a positive number' 
      });
    }

    if (currency && !['ILS', 'USD', 'EUR', 'EURO'].includes(currency.toUpperCase())) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'currency must be one of: ILS, USD, EUR, EURO' 
      });
    }

    const budget = await budgetService.updateBudget(id, req.body);
    res.json(budget);
  } catch (error) {
    logger.error('Error updating budget:', error.message);
    
    if (error.message === 'Budget not found') {
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
 * Delete a budget
 */
async function deleteBudget(req, res) {
  try {
    const { id } = req.params;
    await budgetService.deleteBudget(id);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting budget:', error.message);
    
    if (error.message === 'Budget not found') {
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
 * Get budget status
 */
async function getBudgetStatus(req, res) {
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
        message: 'Invalid query parameters' 
      });
    }

    const status = await budgetService.getBudgetStatus(userid, year, month);
    res.json(status);
  } catch (error) {
    logger.error('Error fetching budget status:', error.message);
    res.status(500).json({ 
      id: 'SERVER_ERROR',
      message: error.message 
    });
  }
}

module.exports = {
  createBudget,
  getBudgets,
  updateBudget,
  deleteBudget,
  getBudgetStatus
};



