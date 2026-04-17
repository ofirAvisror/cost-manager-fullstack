require('dotenv').config();
const express = require('express');
const pinoHttp = require('pino-http');
const { connectDB } = require('./src/config/database');
const { logger } = require('./src/config/logger');
const { mongoLoggingMiddleware } = require('./src/middleware/logging');

// Import all routes
const usersRoutes = require('./src/routes/users.routes');
const goalsRoutes = require('./src/routes/goals.routes');
const budgetsRoutes = require('./src/routes/budgets.routes');
const costsRoutes = require('./src/routes/costs.routes');
const analyticsRoutes = require('./src/routes/analytics.routes');
const reportsRoutes = require('./src/routes/reports.routes');
const adminRoutes = require('./src/routes/admin.routes');
const logsRoutes = require('./src/routes/logs.routes');
const categoriesRoutes = require('./src/routes/categories.routes');

const app = express();
const PORT = process.env.PORT || process.env.PORT_USERS || 3000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', CLIENT_URL);
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});
app.use(express.json());
app.use(pinoHttp({ logger }));
app.use(mongoLoggingMiddleware);

// Connect to database
connectDB();

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'cost-manager-all-in-one',
    services: ['users', 'goals', 'budgets', 'costs', 'analytics', 'reports', 'admin', 'logs'],
    timestamp: new Date().toISOString()
  });
});

// Mount all routes
app.use('/', usersRoutes);
app.use('/', goalsRoutes);
app.use('/', budgetsRoutes);
app.use('/', costsRoutes);
app.use('/', analyticsRoutes);
app.use('/', reportsRoutes);
app.use('/', adminRoutes);
app.use('/', logsRoutes);
app.use('/', categoriesRoutes);

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
    logger.info(`Cost Manager All-in-One service running on port ${PORT}`);
  });
}

module.exports = app;

