require('dotenv').config();
const express = require('express');
const pinoHttp = require('pino-http');
const { connectDB } = require('./src/config/database');
const { logger } = require('./src/config/logger');
const { mongoLoggingMiddleware } = require('./src/middleware/logging');
const usersRoutes = require('./src/routes/users.routes');

const app = express();
const PORT = process.env.PORT_USERS || 3000;

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
    service: 'users',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/', usersRoutes);

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
    logger.info(`Users service running on port ${PORT}`);
  });
}

module.exports = app;
