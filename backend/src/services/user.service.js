const User = require('../models/User');
const Cost = require('../models/Cost');
const { logger } = require('../config/logger');

/**
 * Create a new user (without authentication - for backward compatibility)
 */
async function createUser(userData) {
  const { id, first_name, last_name, birthday } = userData;

  const user = new User({
    id,
    first_name,
    last_name,
    birthday: new Date(birthday)
  });

  await user.save();
  logger.info(`User created: ${user._id}`);
  return user;
}

/**
 * Get all users
 */
async function getAllUsers() {
  return await User.find({});
}

/**
 * Get user by ID
 */
async function getUserById(userId) {
  const user = await User.findOne({ id: userId });
  if (!user) {
    throw new Error('User not found');
  }
  return user;
}

/**
 * Get user by ID with cost totals
 */
async function getUserWithTotals(userId) {
  const user = await getUserById(userId);

  // Get total costs for this user
  const costs = await Cost.find({ userid: userId });
  
  const totalExpenses = costs
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.sum, 0);
  
  const totalIncome = costs
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.sum, 0);
  
  const balance = totalIncome - totalExpenses;

  return {
    first_name: user.first_name,
    last_name: user.last_name,
    id: user.id,
    total: totalExpenses, // Keep for backward compatibility
    total_income: totalIncome,
    total_expenses: totalExpenses,
    balance: balance
  };
}

/**
 * Get current authenticated user with cost totals
 */
async function getCurrentUserWithTotals(userId) {
  const user = await getUserById(userId);

  // Get total costs for this user
  const costs = await Cost.find({ userid: userId });
  
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

  return {
    ...userObj,
    total: totalExpenses, // Backward compatibility
    total_income: totalIncome,
    total_expenses: totalExpenses,
    balance: balance
  };
}

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  getUserWithTotals,
  getCurrentUserWithTotals
};



