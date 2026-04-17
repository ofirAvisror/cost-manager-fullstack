const mongoose = require('mongoose');
const pino = require('pino');

const logger = pino();

/**
 * Database Connection
 * Connects to MongoDB Atlas using Mongoose
 */
async function connectDB() {
  try {
    const mongoUri = process.env.MONGO_URI;
    
    if (!mongoUri) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    logger.info('MongoDB connection successful');
  } catch (error) {
    logger.error('MongoDB connection failed:', error.message);
    // Don't exit in test environment
    if (process.env.NODE_ENV !== 'test' && !process.env.JEST_WORKER_ID) {
      process.exit(1);
    }
    throw error;
  }
}

// Handle connection events
mongoose.connection.on('connected', () => {
  logger.info('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (error) => {
  logger.error('Mongoose connection error:', error);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('Mongoose disconnected from MongoDB');
});

module.exports = { connectDB, mongoose };
