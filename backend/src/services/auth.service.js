const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logger } = require('../config/logger');

/**
 * Register a new user
 */
async function registerUser(userData) {
  const { id, first_name, last_name, birthday, email, password } = userData;

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create new user
  const user = new User({
    id,
    first_name,
    last_name,
    birthday: new Date(birthday),
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

  return {
    user: userObj,
    token: token
  };
}

/**
 * Login user with email and password
 */
async function loginUser(email, password) {
  // Find user by email (include password field)
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  
  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Check if user has a password (registered user)
  if (!user.password) {
    throw new Error('User account not set up for authentication. Please register first.');
  }

  // Compare passwords
  const isPasswordValid = await bcrypt.compare(password, user.password);
  
  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
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

  return {
    user: userObj,
    token: token
  };
}

module.exports = {
  registerUser,
  loginUser
};



