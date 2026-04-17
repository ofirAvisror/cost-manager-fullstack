const userService = require('../services/user.service');
const { validateDate, validatePositiveNumber } = require('../utils/validators');
const { logger } = require('../config/logger');

/**
 * Create a new user (backward compatibility)
 */
async function createUser(req, res) {
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

    // Validate birthday
    if (!validateDate(birthday)) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'birthday must be a valid date' 
      });
    }

    const user = await userService.createUser({
      id,
      first_name,
      last_name,
      birthday
    });

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
}

/**
 * Get all users
 */
async function getAllUsers(req, res) {
  try {
    const users = await userService.getAllUsers();
    res.json(users);
  } catch (error) {
    logger.error('Error fetching users:', error.message);
    res.status(500).json({ 
      id: 'SERVER_ERROR',
      message: error.message 
    });
  }
}

/**
 * Get current user (authenticated)
 */
async function getCurrentUser(req, res) {
  try {
    const user = await userService.getCurrentUserWithTotals(req.user.id);
    res.json(user);
  } catch (error) {
    logger.error('Error fetching user:', error.message);
    
    if (error.message === 'User not found') {
      return res.status(404).json({ 
        id: 'NOT_FOUND',
        message: error.message 
      });
    }

    res.status(500).json({ 
      id: 'SERVER_ERROR',
      message: error.message 
    });
  }
}

/**
 * Get user by ID
 */
async function getUserById(req, res) {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'Invalid user ID' 
      });
    }

    const result = await userService.getUserWithTotals(userId);
    res.json(result);
  } catch (error) {
    logger.error('Error fetching user:', error.message);
    
    if (error.message === 'User not found') {
      return res.status(404).json({ 
        id: 'NOT_FOUND',
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
  createUser,
  getAllUsers,
  getCurrentUser,
  getUserById
};



