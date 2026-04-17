require('dotenv').config();
const express = require('express');
const pinoHttp = require('pino-http');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { connectDB } = require('../config/database');
const User = require('../models/User');
const { logger } = require('../config/logger');
const { mongoLoggingMiddleware, logEndpointAccess } = require('../middleware/logging');
const { authenticate } = require('../middleware/auth');

const app = express();
const PORT = process.env.PORT_USERS || 3000;

// Middleware
app.use(express.json());
app.use(pinoHttp({ logger }));
app.use(mongoLoggingMiddleware);

// Connect to database
connectDB();

/**
 * POST /api/register
 * Register a new user with email and password
 * Body: { id, first_name, last_name, birthday, email, password }
 */
app.post('/api/register', async (req, res) => {
  logEndpointAccess('/api/register', 'POST', req.body?.id);
  
  try {
    const { id, first_name, last_name, birthday, email, password } = req.body;

    // Validate required fields
    if (!id || !first_name || !last_name || !birthday || !email || !password) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'Missing required fields: id, first_name, last_name, birthday, email, and password are required' 
      });
    }

    // Validate id is a number
    if (typeof id !== 'number' || isNaN(id)) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'id must be a number' 
      });
    }

    // Validate email format
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'Invalid email format' 
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Validate birthday is a valid date
    const birthdayDate = new Date(birthday);
    if (isNaN(birthdayDate.getTime())) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'birthday must be a valid date' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = new User({
      id,
      first_name,
      last_name,
      birthday: birthdayDate,
      email: email.toLowerCase(),
      password: hashedPassword
    });

    await user.save();
    logger.info(`User registered: ${user._id}`);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Return user without password
    const userObj = user.toObject();
    delete userObj.password;

    res.status(201).json({
      user: userObj,
      token: token
    });
  } catch (error) {
    logger.error('Error registering user:', error.message);
    
    if (error.code === 11000) {
      if (error.keyPattern.id) {
        return res.status(409).json({ 
          id: 'DUPLICATE_ERROR',
          message: 'User with this ID already exists' 
        });
      }
      if (error.keyPattern.email) {
        return res.status(409).json({ 
          id: 'DUPLICATE_ERROR',
          message: 'User with this email already exists' 
        });
      }
    }

    res.status(500).json({ 
      id: 'SERVER_ERROR',
      message: error.message 
    });
  }
});

/**
 * POST /api/add
 * Create a new user (without authentication - for backward compatibility)
 * Body: { id, first_name, last_name, birthday }
 */
app.post('/api/add', async (req, res) => {
  logEndpointAccess('/api/add', 'POST', req.body?.id);
  
  try {
    const { id, first_name, last_name, birthday } = req.body;

    // Validate required fields
    if (!id || !first_name || !last_name || !birthday) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'Missing required fields: id, first_name, last_name, and birthday are required' 
      });
    }

    // Validate id is a number
    if (typeof id !== 'number' || isNaN(id)) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'id must be a number' 
      });
    }

    // Validate birthday is a valid date
    const birthdayDate = new Date(birthday);
    if (isNaN(birthdayDate.getTime())) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'birthday must be a valid date' 
      });
    }

    // Create new user
    const user = new User({
      id,
      first_name,
      last_name,
      birthday: birthdayDate
    });

    await user.save();
    logger.info(`User created: ${user._id}`);

    res.status(201).json(user);
  } catch (error) {
    logger.error('Error creating user:', error.message);
    
    if (error.code === 11000) {
      return res.status(409).json({ 
        id: 'DUPLICATE_ERROR',
        message: 'User with this ID already exists' 
      });
    }

    res.status(500).json({ 
      id: 'SERVER_ERROR',
      message: error.message 
    });
  }
});

/**
 * POST /api/login
 * Login with email and password
 * Body: { email, password }
 */
app.post('/api/login', async (req, res) => {
  logEndpointAccess('/api/login', 'POST');
  
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'Missing required fields: email and password are required' 
      });
    }

    // Find user by email (include password field)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    
    if (!user) {
      return res.status(401).json({ 
        id: 'UNAUTHORIZED',
        message: 'Invalid email or password' 
      });
    }

    // Check if user has a password (registered user)
    if (!user.password) {
      return res.status(401).json({ 
        id: 'UNAUTHORIZED',
        message: 'User account not set up for authentication. Please register first.' 
      });
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ 
        id: 'UNAUTHORIZED',
        message: 'Invalid email or password' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    logger.info(`User logged in: ${user.id}`);

    // Return user without password
    const userObj = user.toObject();
    delete userObj.password;

    res.json({
      user: userObj,
      token: token
    });
  } catch (error) {
    logger.error('Error logging in user:', error.message);
    res.status(500).json({ 
      id: 'SERVER_ERROR',
      message: error.message 
    });
  }
});

/**
 * GET /api/users
 * Get all users
 */
app.get('/api/users', async (req, res) => {
  logEndpointAccess('/api/users', 'GET');
  
  try {
    const users = await User.find({});
    res.json(users);
  } catch (error) {
    logger.error('Error fetching users:', error.message);
    res.status(500).json({ 
      id: 'SERVER_ERROR',
      message: error.message 
    });
  }
});

/**
 * GET /api/users/me
 * Get current authenticated user's details
 * Requires authentication
 */
app.get('/api/users/me', authenticate, async (req, res) => {
  logEndpointAccess('/api/users/me', 'GET', req.user?.id);
  
  try {
    const user = await User.findOne({ id: req.user.id });

    if (!user) {
      return res.status(404).json({ 
        id: 'NOT_FOUND',
        message: 'User not found' 
      });
    }

    // Get total costs for this user
    const Cost = require('../models/Cost');
    const costs = await Cost.find({ userid: req.user.id });
    
    const totalExpenses = costs
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.sum, 0);
    
    const totalIncome = costs
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.sum, 0);
    
    const balance = totalIncome - totalExpenses;

    // Return user without password
    const userObj = user.toObject();
    delete userObj.password;

    res.json({
      ...userObj,
      total: totalExpenses, // Backward compatibility
      total_income: totalIncome,
      total_expenses: totalExpenses,
      balance: balance
    });
  } catch (error) {
    logger.error('Error fetching user:', error.message);
    res.status(500).json({ 
      id: 'SERVER_ERROR',
      message: error.message 
    });
  }
});

/**
 * GET /api/users/:id
 * Get user by custom ID with total of all their costs
 * Public endpoint (no authentication required for backward compatibility)
 */
app.get('/api/users/:id', async (req, res) => {
  logEndpointAccess('/api/users/:id', 'GET', req.params.id);
  
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'Invalid user ID' 
      });
    }

    const user = await User.findOne({ id: userId });

    if (!user) {
      return res.status(404).json({ 
        id: 'NOT_FOUND',
        message: 'User not found' 
      });
    }

    // Get total costs for this user
    const Cost = require('../models/Cost');
    const costs = await Cost.find({ userid: userId });
    
    const totalExpenses = costs
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.sum, 0);
    
    const totalIncome = costs
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.sum, 0);
    
    const balance = totalIncome - totalExpenses;

    res.json({
      first_name: user.first_name,
      last_name: user.last_name,
      id: user.id,
      total: totalExpenses, // Keep for backward compatibility
      total_income: totalIncome,
      total_expenses: totalExpenses,
      balance: balance
    });
  } catch (error) {
    logger.error('Error fetching user:', error.message);
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
    logger.info(`Users service running on port ${PORT}`);
  });
}

module.exports = app;
