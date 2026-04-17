require('dotenv').config();
const express = require('express');
const pinoHttp = require('pino-http');
const { connectDB } = require('../config/database');
const Goal = require('../models/Goal');
const User = require('../models/User');
const { logger } = require('../config/logger');
const { mongoLoggingMiddleware, logEndpointAccess } = require('../middleware/logging');

const app = express();
const PORT = process.env.PORT_GOALS || 3005;

// Middleware
app.use(express.json());
app.use(pinoHttp({ logger }));
app.use(mongoLoggingMiddleware);

// Connect to database
connectDB();

/**
 * POST /api/goals
 * Create a new goal
 * Body: { userid, title, description?, target_amount, current_amount?, deadline?, category?, currency?, status? }
 */
app.post('/api/goals', async (req, res) => {
  logEndpointAccess('/api/goals', 'POST', req.body?.userid);
  
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
    if (typeof target_amount !== 'number' || isNaN(target_amount) || target_amount <= 0) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'target_amount must be a positive number' 
      });
    }

    // Validate current_amount if provided
    if (current_amount !== undefined) {
      if (typeof current_amount !== 'number' || isNaN(current_amount) || current_amount < 0) {
        return res.status(400).json({ 
          id: 'VALIDATION_ERROR',
          message: 'current_amount must be a non-negative number' 
        });
      }
    }

    // Validate deadline if provided
    if (deadline) {
      const deadlineDate = new Date(deadline);
      if (isNaN(deadlineDate.getTime())) {
        return res.status(400).json({ 
          id: 'VALIDATION_ERROR',
          message: 'deadline must be a valid date' 
        });
      }
    }

    // Validate status if provided
    if (status && !['active', 'completed', 'paused'].includes(status.toLowerCase())) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'status must be one of: active, completed, paused' 
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

    // Create goal
    const goal = new Goal({
      userid,
      title: title.trim(),
      description: description ? description.trim() : undefined,
      target_amount,
      current_amount: current_amount || 0,
      deadline: deadline ? new Date(deadline) : undefined,
      category: category ? category.toLowerCase() : undefined,
      currency: currency || 'ILS',
      status: status ? status.toLowerCase() : 'active'
    });

    await goal.save();
    logger.info(`Goal created: ${goal._id} for user: ${userid}`);

    res.status(201).json(goal);
  } catch (error) {
    logger.error('Error creating goal:', error.message);
    res.status(500).json({ 
      id: 'SERVER_ERROR',
      message: error.message 
    });
  }
});

/**
 * GET /api/goals
 * Get goals with optional filters
 * Query params: userid (required), status?
 */
app.get('/api/goals', async (req, res) => {
  logEndpointAccess('/api/goals', 'GET', req.query?.userid);
  
  try {
    const { userid, status } = req.query;

    if (!userid) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'userid query parameter is required' 
      });
    }

    const query = { userid: parseInt(userid) };
    if (status) {
      query.status = status.toLowerCase();
    }

    const goals = await Goal.find(query).sort({ createdAt: -1 });
    res.json(goals);
  } catch (error) {
    logger.error('Error fetching goals:', error.message);
    res.status(500).json({ 
      id: 'SERVER_ERROR',
      message: error.message 
    });
  }
});

/**
 * PUT /api/goals/:id
 * Update a goal
 * Body: { title?, description?, target_amount?, current_amount?, deadline?, category?, currency?, status? }
 */
app.put('/api/goals/:id', async (req, res) => {
  logEndpointAccess('/api/goals/:id', 'PUT', req.params.id);
  
  try {
    const { id } = req.params;
    const { title, description, target_amount, current_amount, deadline, category, currency, status } = req.body;

    const goal = await Goal.findById(id);
    if (!goal) {
      return res.status(404).json({ 
        id: 'NOT_FOUND',
        message: 'Goal not found' 
      });
    }

    if (title !== undefined) goal.title = title.trim();
    if (description !== undefined) goal.description = description ? description.trim() : undefined;
    
    if (target_amount !== undefined) {
      if (typeof target_amount !== 'number' || isNaN(target_amount) || target_amount <= 0) {
        return res.status(400).json({ 
          id: 'VALIDATION_ERROR',
          message: 'target_amount must be a positive number' 
        });
      }
      goal.target_amount = target_amount;
    }

    if (current_amount !== undefined) {
      if (typeof current_amount !== 'number' || isNaN(current_amount) || current_amount < 0) {
        return res.status(400).json({ 
          id: 'VALIDATION_ERROR',
          message: 'current_amount must be a non-negative number' 
        });
      }
      goal.current_amount = current_amount;
    }

    if (deadline !== undefined) {
      if (deadline === null) {
        goal.deadline = undefined;
      } else {
        const deadlineDate = new Date(deadline);
        if (isNaN(deadlineDate.getTime())) {
          return res.status(400).json({ 
            id: 'VALIDATION_ERROR',
            message: 'deadline must be a valid date' 
          });
        }
        goal.deadline = deadlineDate;
      }
    }

    if (category !== undefined) {
      goal.category = category ? category.toLowerCase() : undefined;
    }

    if (currency) {
      if (!['ILS', 'USD', 'EUR'].includes(currency.toUpperCase())) {
        return res.status(400).json({ 
          id: 'VALIDATION_ERROR',
          message: 'currency must be one of: ILS, USD, EUR' 
        });
      }
      goal.currency = currency.toUpperCase();
    }

    if (status) {
      if (!['active', 'completed', 'paused'].includes(status.toLowerCase())) {
        return res.status(400).json({ 
          id: 'VALIDATION_ERROR',
          message: 'status must be one of: active, completed, paused' 
        });
      }
      goal.status = status.toLowerCase();
    }

    await goal.save();
    logger.info(`Goal updated: ${goal._id}`);

    res.json(goal);
  } catch (error) {
    logger.error('Error updating goal:', error.message);
    res.status(500).json({ 
      id: 'SERVER_ERROR',
      message: error.message 
    });
  }
});

/**
 * DELETE /api/goals/:id
 * Delete a goal
 */
app.delete('/api/goals/:id', async (req, res) => {
  logEndpointAccess('/api/goals/:id', 'DELETE', req.params.id);
  
  try {
    const { id } = req.params;

    const goal = await Goal.findByIdAndDelete(id);
    if (!goal) {
      return res.status(404).json({ 
        id: 'NOT_FOUND',
        message: 'Goal not found' 
      });
    }

    logger.info(`Goal deleted: ${id}`);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting goal:', error.message);
    res.status(500).json({ 
      id: 'SERVER_ERROR',
      message: error.message 
    });
  }
});

/**
 * GET /api/goals/:id/progress
 * Get goal progress percentage
 */
app.get('/api/goals/:id/progress', async (req, res) => {
  logEndpointAccess('/api/goals/:id/progress', 'GET', req.params.id);
  
  try {
    const { id } = req.params;

    const goal = await Goal.findById(id);
    if (!goal) {
      return res.status(404).json({ 
        id: 'NOT_FOUND',
        message: 'Goal not found' 
      });
    }

    const progress = goal.target_amount > 0 
      ? Math.min((goal.current_amount / goal.target_amount * 100).toFixed(2), 100)
      : 0;

    const remaining = Math.max(goal.target_amount - goal.current_amount, 0);

    res.json({
      goal_id: id,
      title: goal.title,
      current_amount: goal.current_amount,
      target_amount: goal.target_amount,
      progress_percentage: parseFloat(progress),
      remaining: remaining,
      status: goal.status,
      is_completed: goal.current_amount >= goal.target_amount
    });
  } catch (error) {
    logger.error('Error fetching goal progress:', error.message);
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
    logger.info(`Goals service running on port ${PORT}`);
  });
}

module.exports = app;



