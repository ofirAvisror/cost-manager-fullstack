require('dotenv').config();
const express = require('express');
const pinoHttp = require('pino-http');
const { connectDB } = require('../config/database');
const Budget = require('../models/Budget');
const Cost = require('../models/Cost');
const User = require('../models/User');
const { logger } = require('../config/logger');
const { mongoLoggingMiddleware, logEndpointAccess } = require('../middleware/logging');

const app = express();
const PORT = process.env.PORT_BUDGETS || 3004;

// Middleware
app.use(express.json());
app.use(pinoHttp({ logger }));
app.use(mongoLoggingMiddleware);

// Connect to database
connectDB();

const EXPENSE_CATEGORIES = ['food', 'health', 'housing', 'sports', 'education'];

/**
 * POST /api/budgets
 * Create a new budget
 * Body: { userid, year, month, type, category?, amount, currency? }
 */
app.post('/api/budgets', async (req, res) => {
  logEndpointAccess('/api/budgets', 'POST', req.body?.userid);
  
  try {
    const { userid, year, month, type, category, amount, currency } = req.body;

    // Validate required fields
    if (!userid || !year || !month || !type || amount === undefined) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'Missing required fields: userid, year, month, type, and amount are required' 
      });
    }

    // Validate type
    const normalizedType = type.toLowerCase();
    if (!['total', 'category'].includes(normalizedType)) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'Invalid type. Must be either "total" or "category"' 
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
      const normalizedCategory = category.toLowerCase();
      if (!EXPENSE_CATEGORIES.includes(normalizedCategory)) {
        return res.status(400).json({ 
          id: 'VALIDATION_ERROR',
          message: `Invalid category. Must be one of: ${EXPENSE_CATEGORIES.join(', ')}` 
        });
      }
    }

    // Validate year and month
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'year must be a valid number between 2000 and 2100' 
      });
    }
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'month must be a number between 1 and 12' 
      });
    }

    // Validate amount
    if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'amount must be a positive number' 
      });
    }

    // Validate user exists
    const user = await User.findOne({ id: userid });
    if (!user) {
      return res.status(404).json({ 
        id: 'NOT_FOUND',
        message: 'User not found' 
      });
    }

    // Create budget
    const budgetData = {
      userid,
      year: yearNum,
      month: monthNum,
      type: normalizedType,
      amount,
      currency: currency || 'ILS'
    };

    if (normalizedType === 'category') {
      budgetData.category = category.toLowerCase();
    }

    const budget = new Budget(budgetData);
    await budget.save();
    
    logger.info(`Budget created: ${budget._id} for user: ${userid}`);

    res.status(201).json(budget);
  } catch (error) {
    logger.error('Error creating budget:', error.message);
    
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
});

/**
 * GET /api/budgets
 * Get budgets with optional filters
 * Query params: userid (required), year?, month?, type?, category?
 */
app.get('/api/budgets', async (req, res) => {
  logEndpointAccess('/api/budgets', 'GET', req.query?.userid);
  
  try {
    const { userid, year, month, type, category } = req.query;

    if (!userid) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'userid query parameter is required' 
      });
    }

    const query = { userid: parseInt(userid) };

    if (year) query.year = parseInt(year);
    if (month) query.month = parseInt(month);
    if (type) query.type = type.toLowerCase();
    if (category) query.category = category.toLowerCase();

    const budgets = await Budget.find(query).sort({ year: -1, month: -1, type: 1, category: 1 });
    res.json(budgets);
  } catch (error) {
    logger.error('Error fetching budgets:', error.message);
    res.status(500).json({ 
      id: 'SERVER_ERROR',
      message: error.message 
    });
  }
});

/**
 * PUT /api/budgets/:id
 * Update a budget
 * Body: { amount?, currency?, category? }
 */
app.put('/api/budgets/:id', async (req, res) => {
  logEndpointAccess('/api/budgets/:id', 'PUT', req.params.id);
  
  try {
    const { id } = req.params;
    const { amount, currency, category } = req.body;

    const budget = await Budget.findById(id);
    if (!budget) {
      return res.status(404).json({ 
        id: 'NOT_FOUND',
        message: 'Budget not found' 
      });
    }

    if (amount !== undefined) {
      if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
        return res.status(400).json({ 
          id: 'VALIDATION_ERROR',
          message: 'amount must be a positive number' 
        });
      }
      budget.amount = amount;
    }

    if (currency) {
      if (!['ILS', 'USD', 'EUR'].includes(currency.toUpperCase())) {
        return res.status(400).json({ 
          id: 'VALIDATION_ERROR',
          message: 'currency must be one of: ILS, USD, EUR' 
        });
      }
      budget.currency = currency.toUpperCase();
    }

    if (category && budget.type === 'category') {
      const normalizedCategory = category.toLowerCase();
      if (!EXPENSE_CATEGORIES.includes(normalizedCategory)) {
        return res.status(400).json({ 
          id: 'VALIDATION_ERROR',
          message: `Invalid category. Must be one of: ${EXPENSE_CATEGORIES.join(', ')}` 
        });
      }
      budget.category = normalizedCategory;
    }

    await budget.save();
    logger.info(`Budget updated: ${budget._id}`);

    res.json(budget);
  } catch (error) {
    logger.error('Error updating budget:', error.message);
    res.status(500).json({ 
      id: 'SERVER_ERROR',
      message: error.message 
    });
  }
});

/**
 * DELETE /api/budgets/:id
 * Delete a budget
 */
app.delete('/api/budgets/:id', async (req, res) => {
  logEndpointAccess('/api/budgets/:id', 'DELETE', req.params.id);
  
  try {
    const { id } = req.params;

    const budget = await Budget.findByIdAndDelete(id);
    if (!budget) {
      return res.status(404).json({ 
        id: 'NOT_FOUND',
        message: 'Budget not found' 
      });
    }

    logger.info(`Budget deleted: ${id}`);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting budget:', error.message);
    res.status(500).json({ 
      id: 'SERVER_ERROR',
      message: error.message 
    });
  }
});

/**
 * GET /api/budgets/status
 * Get budget status (spent vs allocated)
 * Query params: userid (required), year (required), month (required)
 */
app.get('/api/budgets/status', async (req, res) => {
  logEndpointAccess('/api/budgets/status', 'GET', req.query?.userid);
  
  try {
    const { userid, year, month } = req.query;

    if (!userid || !year || !month) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'Missing required query parameters: userid, year, and month are required' 
      });
    }

    const userIdNum = parseInt(userid);
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    if (isNaN(userIdNum) || isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'Invalid query parameters' 
      });
    }

    // Get budgets for this month
    const budgets = await Budget.find({
      userid: userIdNum,
      year: yearNum,
      month: monthNum
    });

    // Get expenses for this month
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59);
    
    const expenses = await Cost.find({
      userid: userIdNum,
      type: 'expense',
      created_at: { $gte: startDate, $lte: endDate }
    });

    // Calculate total budget and spent
    const totalBudget = budgets.find(b => b.type === 'total');
    const totalSpent = expenses.reduce((sum, e) => sum + e.sum, 0);

    // Calculate category budgets and spent
    const categoryBudgets = budgets.filter(b => b.type === 'category');
    const categoryStatus = categoryBudgets.map(budget => {
      const categorySpent = expenses
        .filter(e => e.category === budget.category)
        .reduce((sum, e) => sum + e.sum, 0);
      
      return {
        category: budget.category,
        allocated: budget.amount,
        spent: categorySpent,
        remaining: budget.amount - categorySpent,
        percentage_used: budget.amount > 0 ? (categorySpent / budget.amount * 100).toFixed(2) : 0
      };
    });

    const result = {
      userid: userIdNum,
      year: yearNum,
      month: monthNum,
      total: totalBudget ? {
        allocated: totalBudget.amount,
        spent: totalSpent,
        remaining: totalBudget.amount - totalSpent,
        percentage_used: totalBudget.amount > 0 ? (totalSpent / totalBudget.amount * 100).toFixed(2) : 0
      } : null,
      categories: categoryStatus
    };

    res.json(result);
  } catch (error) {
    logger.error('Error fetching budget status:', error.message);
    res.status(500).json({ 
      id: 'SERVER_ERROR',
      message: error.message 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ 
    id: 'SERVER_ERROR',
    message: 'Internal server error' 
  });
});

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test' && !process.env.JEST_WORKER_ID) {
  app.listen(PORT, () => {
    logger.info(`Budgets service running on port ${PORT}`);
  });
}

module.exports = app;



