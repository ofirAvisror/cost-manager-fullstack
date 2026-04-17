require('dotenv').config();
const express = require('express');
const pinoHttp = require('pino-http');
const { connectDB } = require('../config/database');
const { logger } = require('../config/logger');
const { mongoLoggingMiddleware, logEndpointAccess } = require('../middleware/logging');

const app = express();
const PORT = process.env.PORT_ADMIN || 3003;

// Middleware
app.use(express.json());
app.use(pinoHttp({ logger }));
app.use(mongoLoggingMiddleware);

// Connect to database
connectDB();

/**
 * Team members data
 * Each team member should have first_name and last_name properties
 * matching the format used in the users collection
 */
const teamMembers = [
  {
    first_name: 'Gal',
    last_name: 'Aviv'
  },
  {
    first_name: 'Bar',
    last_name: 'Bibi'
  },
  {
    first_name: 'Ofir',
    last_name: 'Avisror'
  }
];

/**
 * GET /api/about
 * Returns team members list
 * Returns only first_name and last_name for each team member
 */
app.get('/api/about', (req, res) => {
  logEndpointAccess('/api/about', 'GET');
  
  try {
    logger.info('About endpoint accessed');
    res.json(teamMembers);
  } catch (error) {
    logger.error('Error in about endpoint:', error.message);
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
    logger.info(`Admin service running on port ${PORT}`);
  });
}

module.exports = app;
