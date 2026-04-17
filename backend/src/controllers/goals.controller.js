const goalService = require('../services/goal.service');
const { validateDate, validatePositiveNumber } = require('../utils/validators');
const { logger } = require('../config/logger');

/**
 * Create a new goal
 */
async function createGoal(req, res) {
  try {
    const { userid, title, description, target_amount, current_amount, deadline, category, currency, status } = req.body;

    // Validate required fields
    if (!userid || !title || target_amount === undefined) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'Missing required fields: userid, title, and target_amount are required' 
      });
    }

    // Validate target_amount
    if (!validatePositiveNumber(target_amount) || target_amount <= 0) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'target_amount must be a positive number' 
      });
    }

    // Validate current_amount if provided
    if (current_amount !== undefined && !validatePositiveNumber(current_amount)) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'current_amount must be a non-negative number' 
      });
    }

    // Validate deadline if provided
    if (deadline && !validateDate(deadline)) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'deadline must be a valid date' 
      });
    }

    // Validate status if provided
    if (status && !['active', 'completed', 'paused'].includes(status.toLowerCase())) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'status must be one of: active, completed, paused' 
      });
    }

    const goal = await goalService.createGoal(req.body);
    res.status(201).json(goal);
  } catch (error) {
    logger.error('Error creating goal:', error.message);
    
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
 * Get goals
 */
async function getGoals(req, res) {
  try {
    const { userid, status } = req.query;

    if (!userid) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'userid query parameter is required' 
      });
    }

    const goals = await goalService.getGoals({ userid, status });
    res.json(goals);
  } catch (error) {
    logger.error('Error fetching goals:', error.message);
    res.status(500).json({ 
      id: 'SERVER_ERROR',
      message: error.message 
    });
  }
}

/**
 * Get goal by ID
 */
async function getGoalById(req, res) {
  try {
    const { id } = req.params;
    const goal = await goalService.getGoalById(id);
    res.json(goal);
  } catch (error) {
    logger.error('Error fetching goal:', error.message);
    
    if (error.message === 'Goal not found') {
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
 * Update a goal
 */
async function updateGoal(req, res) {
  try {
    const { id } = req.params;
    const { target_amount, current_amount, deadline, status, currency } = req.body;

    if (target_amount !== undefined && (!validatePositiveNumber(target_amount) || target_amount <= 0)) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'target_amount must be a positive number' 
      });
    }

    if (current_amount !== undefined && !validatePositiveNumber(current_amount)) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'current_amount must be a non-negative number' 
      });
    }

    if (deadline !== undefined && deadline !== null && !validateDate(deadline)) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'deadline must be a valid date' 
      });
    }

    if (status && !['active', 'completed', 'paused'].includes(status.toLowerCase())) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'status must be one of: active, completed, paused' 
      });
    }

    if (currency && !['ILS', 'USD', 'EUR'].includes(currency.toUpperCase())) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'currency must be one of: ILS, USD, EUR' 
      });
    }

    const goal = await goalService.updateGoal(id, req.body);
    res.json(goal);
  } catch (error) {
    logger.error('Error updating goal:', error.message);
    
    if (error.message === 'Goal not found') {
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
 * Delete a goal
 */
async function deleteGoal(req, res) {
  try {
    const { id } = req.params;
    await goalService.deleteGoal(id);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting goal:', error.message);
    
    if (error.message === 'Goal not found') {
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
 * Get goal progress
 */
async function getGoalProgress(req, res) {
  try {
    const { id } = req.params;
    const progress = await goalService.getGoalProgress(id);
    res.json(progress);
  } catch (error) {
    logger.error('Error fetching goal progress:', error.message);
    
    if (error.message === 'Goal not found') {
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
  createGoal,
  getGoals,
  getGoalById,
  updateGoal,
  deleteGoal,
  getGoalProgress
};

