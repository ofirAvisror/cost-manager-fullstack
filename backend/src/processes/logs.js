require('dotenv').config();
const express = require('express');
const pinoHttp = require('pino-http');
const { connectDB } = require('../config/database');
const Log = require('../models/Log');
const { logger } = require('../config/logger');
const { mongoLoggingMiddleware, logEndpointAccess } = require('../middleware/logging');

const app = express();
const PORT = process.env.PORT_LOGS || 3007;

// Middleware
app.use(express.json());
app.use(pinoHttp({ logger }));
app.use(mongoLoggingMiddleware);

// Connect to database
connectDB();

/**
 * GET /api/logs
 * Get all logs from the logs collection
 */
app.get('/api/logs', async (req, res) => {
  logEndpointAccess('/api/logs', 'GET');
  
  try {
    const logs = await Log.find({}).sort({ timestamp: -1 }).limit(1000);
    res.json(logs);
  } catch (error) {
    logger.error('Error fetching logs:', error.message);
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
    logger.info(`Logs service running on port ${PORT}`);
  });
}

module.exports = app;

