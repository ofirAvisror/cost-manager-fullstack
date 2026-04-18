const Budget = require('../models/Budget');
const Cost = require('../models/Cost');
const User = require('../models/User');
const { logger } = require('../config/logger');

/**
 * Create a new budget
 */
async function createBudget(budgetData) {
  const { userid, year, month, type, category, amount, currency } = budgetData;

  const normalizedType = type.toLowerCase();

  // Validate user exists
  const user = await User.findOne({ id: userid });
  if (!user) {
    throw new Error('User not found');
  }

  const budgetDataToSave = {
    userid,
    year: parseInt(year),
    type: normalizedType,
    amount,
    currency: currency || 'ILS'
  };

  if (normalizedType === 'monthly') {
    budgetDataToSave.month = parseInt(month);
  }

  if (normalizedType === 'category') {
    budgetDataToSave.category = category.toLowerCase();
  }

  const budget = new Budget(budgetDataToSave);
  await budget.save();
  
  logger.info(`Budget created: ${budget._id} for user: ${userid}`);
  return budget;
}

/**
 * Get budgets with filters
 */
async function getBudgets(filters) {
  const { userid, userids, year, month, type, category } = filters;

  let useridClause;
  if (Array.isArray(userids) && userids.length > 0) {
    useridClause = { $in: userids.map((id) => parseInt(id, 10)) };
  } else {
    useridClause = parseInt(userid, 10);
  }

  const query = { userid: useridClause };

  if (year) query.year = parseInt(year);
  if (month) query.month = parseInt(month);
  if (type) query.type = type.toLowerCase();
  if (category) query.category = category.toLowerCase();

  return await Budget.find(query).sort({ year: -1, month: -1, type: 1, category: 1 });
}

/**
 * Update a budget
 */
async function updateBudget(budgetId, updateData) {
  const { amount, currency, category } = updateData;

  const budget = await Budget.findById(budgetId);
  if (!budget) {
    throw new Error('Budget not found');
  }

  if (amount !== undefined) {
    budget.amount = amount;
  }

  if (currency) {
    budget.currency = currency.toUpperCase();
  }

  if (category && budget.type === 'category') {
    budget.category = category.toLowerCase();
  }

  await budget.save();
  logger.info(`Budget updated: ${budget._id}`);
  return budget;
}

/**
 * Delete a budget
 */
async function deleteBudget(budgetId) {
  const budget = await Budget.findByIdAndDelete(budgetId);
  if (!budget) {
    throw new Error('Budget not found');
  }
  logger.info(`Budget deleted: ${budgetId}`);
  return budget;
}

/**
 * Get budget status (spent vs allocated)
 */
async function getBudgetStatus(userid, year, month) {
  const userIdNum = parseInt(userid);
  const yearNum = parseInt(year);
  const monthNum = parseInt(month);

  // Get budgets for this month
  const budgets = await Budget.find({
    userid: userIdNum,
    year: yearNum,
    month: monthNum
  });

  // Get expenses for this month
  const startDate = new Date(yearNum, monthNum - 1, 1);
  const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59);
  
  const expenses = await Cost.find({
    userid: userIdNum,
    type: 'expense',
    schedule_only: { $ne: true },
    created_at: { $gte: startDate, $lte: endDate }
  });

  // Calculate total budget and spent
  const totalBudget = budgets.find(b => b.type === 'monthly');
  const totalSpent = expenses.reduce((sum, e) => sum + e.sum, 0);

  // Calculate category budgets and spent
  const categoryBudgets = budgets.filter(b => b.type === 'category');
  const categoryStatus = categoryBudgets.map(budget => {
    const categorySpent = expenses
      .filter(e => e.category === budget.category)
      .reduce((sum, e) => sum + e.sum, 0);
    
    return {
      category: budget.category,
      allocated: budget.amount,
      spent: categorySpent,
      remaining: budget.amount - categorySpent,
      percentage_used: budget.amount > 0 ? (categorySpent / budget.amount * 100).toFixed(2) : 0
    };
  });

  return {
    userid: userIdNum,
    year: yearNum,
    month: monthNum,
    total: totalBudget ? {
      allocated: totalBudget.amount,
      spent: totalSpent,
      remaining: totalBudget.amount - totalSpent,
      percentage_used: totalBudget.amount > 0 ? (totalSpent / totalBudget.amount * 100).toFixed(2) : 0
    } : null,
    categories: categoryStatus
  };
}

module.exports = {
  createBudget,
  getBudgets,
  updateBudget,
  deleteBudget,
  getBudgetStatus
};



