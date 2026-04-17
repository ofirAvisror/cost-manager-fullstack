const Goal = require('../models/Goal');
const User = require('../models/User');
const { logger } = require('../config/logger');

/**
 * Create a new goal
 */
async function createGoal(goalData) {
  const { userid, title, description, target_amount, current_amount, deadline, category, currency, status } = goalData;

  // Validate user exists
  const user = await User.findOne({ id: userid });
  if (!user) {
    throw new Error('User not found');
  }

  const goal = new Goal({
    userid,
    title: title.trim(),
    description: description ? description.trim() : undefined,
    target_amount,
    current_amount: current_amount || 0,
    deadline: deadline ? new Date(deadline) : undefined,
    category: category ? category.toLowerCase() : undefined,
    currency: currency || 'ILS',
    status: status ? status.toLowerCase() : 'active'
  });

  await goal.save();
  logger.info(`Goal created: ${goal._id} for user: ${userid}`);
  return goal;
}

/**
 * Get goals with filters
 */
async function getGoals(filters) {
  const { userid, status } = filters;

  const query = { userid: parseInt(userid) };
  if (status) {
    query.status = status.toLowerCase();
  }

  return await Goal.find(query).sort({ createdAt: -1 });
}

/**
 * Update a goal
 */
async function updateGoal(goalId, updateData) {
  const { title, description, target_amount, current_amount, deadline, category, currency, status } = updateData;

  const goal = await Goal.findById(goalId);
  if (!goal) {
    throw new Error('Goal not found');
  }

  if (title !== undefined) goal.title = title.trim();
  if (description !== undefined) goal.description = description ? description.trim() : undefined;
  
  if (target_amount !== undefined) {
    goal.target_amount = target_amount;
  }

  if (current_amount !== undefined) {
    goal.current_amount = current_amount;
  }

  if (deadline !== undefined) {
    if (deadline === null) {
      goal.deadline = undefined;
    } else {
      goal.deadline = new Date(deadline);
    }
  }

  if (category !== undefined) {
    goal.category = category ? category.toLowerCase() : undefined;
  }

  if (currency) {
    goal.currency = currency.toUpperCase();
  }

  if (status) {
    goal.status = status.toLowerCase();
  }

  await goal.save();
  logger.info(`Goal updated: ${goal._id}`);
  return goal;
}

/**
 * Delete a goal
 */
async function deleteGoal(goalId) {
  const goal = await Goal.findByIdAndDelete(goalId);
  if (!goal) {
    throw new Error('Goal not found');
  }
  logger.info(`Goal deleted: ${goalId}`);
  return goal;
}

/**
 * Get goal by ID
 */
async function getGoalById(goalId) {
  const goal = await Goal.findById(goalId);
  if (!goal) {
    throw new Error('Goal not found');
  }
  return goal;
}

/**
 * Get goal progress
 */
async function getGoalProgress(goalId) {
  const goal = await Goal.findById(goalId);
  if (!goal) {
    throw new Error('Goal not found');
  }

  const progress = goal.target_amount > 0 
    ? Math.min((goal.current_amount / goal.target_amount * 100).toFixed(2), 100)
    : 0;

  const remaining = Math.max(goal.target_amount - goal.current_amount, 0);

  return {
    goal_id: goalId,
    title: goal.title,
    current_amount: goal.current_amount,
    target_amount: goal.target_amount,
    progress_percentage: parseFloat(progress),
    remaining: remaining,
    status: goal.status,
    is_completed: goal.current_amount >= goal.target_amount
  };
}

module.exports = {
  createGoal,
  getGoals,
  getGoalById,
  updateGoal,
  deleteGoal,
  getGoalProgress
};



