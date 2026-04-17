const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logger } = require('../config/logger');

/**
 * JWT Authentication Middleware
 * Verifies JWT token from Authorization header
 * Adds user info to req.user
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        id: 'UNAUTHORIZED',
        message: 'No token provided. Please provide a valid JWT token in Authorization header (Bearer token)'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');

    // Get user from database
    const user = await User.findOne({ id: decoded.userId });
    
    if (!user) {
      return res.status(401).json({
        id: 'UNAUTHORIZED',
        message: 'Invalid token. User not found'
      });
    }

    // Add user info to request
    req.user = {
      id: user.id,
      userId: user.id,
      email: user.email
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        id: 'UNAUTHORIZED',
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        id: 'UNAUTHORIZED',
        message: 'Token expired'
      });
    }

    res.status(500).json({
      id: 'SERVER_ERROR',
      message: 'Authentication failed'
    });
  }
};

/**
 * Optional authentication middleware
 * Adds user info if token is present, but doesn't fail if missing
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
      const user = await User.findOne({ id: decoded.userId });
      
      if (user) {
        req.user = {
          id: user.id,
          userId: user.id,
          email: user.email
        };
      }
    }
    
    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
};

module.exports = {
  authenticate,
  optionalAuth
};



