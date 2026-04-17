require('dotenv').config();
const express = require('express');
const pinoHttp = require('pino-http');
const { connectDB } = require('../config/database');
const Cost = require('../models/Cost');
const { logger } = require('../config/logger');
const { mongoLoggingMiddleware, logEndpointAccess } = require('../middleware/logging');

const app = express();
const PORT = process.env.PORT_COSTS || 3001;

// Middleware
app.use(express.json());
app.use(pinoHttp({ logger }));
app.use(mongoLoggingMiddleware);

// Connect to database
connectDB();

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'costs',
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/add
 * Create a new cost entry
 * Body: { description, category, userid, sum }
 */
app.post('/api/add', async (req, res) => {
  logEndpointAccess('/api/add', 'POST', req.body?.userid);
  
  try {
    const { description, category, userid, sum } = req.body;

    // Validate required fields
    if (!description || !category || !userid || sum === undefined) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'Missing required fields: description, category, userid, and sum are required' 
      });
    }

    // Validate category
    const validCategories = ['food', 'health', 'housing', 'sports', 'education'];
    if (!validCategories.includes(category.toLowerCase())) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: `Invalid category. Must be one of: ${validCategories.join(', ')}` 
      });
    }

    // Validate sum is a number
    if (typeof sum !== 'number' || isNaN(sum) || sum < 0) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'sum must be a positive number' 
      });
    }

    // Validate user exists
    const User = require('../models/User');
    const user = await User.findOne({ id: userid });
    if (!user) {
      return res.status(404).json({ 
        id: 'NOT_FOUND',
        message: 'User not found' 
      });
    }

    // Validate date if provided - server doesn't allow adding costs with dates in the past
    let created_at = new Date();
    if (req.body.created_at) {
      created_at = new Date(req.body.created_at);
      if (isNaN(created_at.getTime())) {
        return res.status(400).json({ 
          id: 'VALIDATION_ERROR',
          message: 'created_at must be a valid date' 
        });
      }
      // Check if date is in the past
      const now = new Date();
      if (created_at < now) {
        return res.status(400).json({ 
          id: 'VALIDATION_ERROR',
          message: 'Cannot add costs with dates in the past' 
        });
      }
    }

    // Create new cost
    const cost = new Cost({
      description,
      category: category.toLowerCase(),
      userid,
      sum,
      created_at
    });

    await cost.save();
    logger.info(`Cost created: ${cost._id} for user: ${userid}`);

    res.status(201).json(cost);
  } catch (error) {
    logger.error('Error creating cost:', error.message);
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
    logger.info(`Costs service running on port ${PORT}`);
  });
}

module.exports = app;
