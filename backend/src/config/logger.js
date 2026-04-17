const pino = require('pino');

/**
 * Create Pino logger instance
 * This is the main logger configuration for the application
 */
const logger = pino({
  level: process.env.LOG_LEVEL || 'info'
});

module.exports = {
  logger
};

