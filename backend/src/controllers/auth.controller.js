const authService = require('../services/auth.service');
const { validateEmail, validateDate, validatePositiveNumber } = require('../utils/validators');
const { logger } = require('../config/logger');

/**
 * Register a new user
 */
async function register(req, res) {
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
    if (!validateEmail(email)) {
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

    // Validate birthday
    if (!validateDate(birthday)) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'birthday must be a valid date' 
      });
    }

    const result = await authService.registerUser({
      id,
      first_name,
      last_name,
      birthday,
      email,
      password
    });

    res.status(201).json(result);
  } catch (error) {
    logger.error('Error registering user:', error.message);
    
    if (error.code === 11000) {
      if (error.keyPattern?.id) {
        return res.status(409).json({ 
          id: 'DUPLICATE_ERROR',
          message: 'User with this ID already exists' 
        });
      }
      if (error.keyPattern?.email) {
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
}

/**
 * Login user
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'Missing required fields: email and password are required' 
      });
    }

    const result = await authService.loginUser(email, password);
    res.json(result);
  } catch (error) {
    logger.error('Error logging in user:', error.message);
    
    if (error.message.includes('Invalid email or password') || error.message.includes('not set up for authentication')) {
      return res.status(401).json({ 
        id: 'UNAUTHORIZED',
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
  register,
  login
};



