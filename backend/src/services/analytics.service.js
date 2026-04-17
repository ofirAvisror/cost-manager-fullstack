const Cost = require('../models/Cost');
const User = require('../models/User');
const { logger } = require('../config/logger');

/**
 * Get overall financial summary for a user
 */
async function getSummary(userid) {
  const user = await User.findOne({ id: parseInt(userid) });
  if (!user) {
    throw new Error('User not found');
  }

  const costs = await Cost.find({ userid: parseInt(userid) });

  const totalIncome = costs
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.sum, 0);

  const totalExpenses = costs
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.sum, 0);

  const balance = totalIncome - totalExpenses;

  const costCount = costs.length;
  const incomeCount = costs.filter(t => t.type === 'income').length;
  const expenseCount = costs.filter(t => t.type === 'expense').length;

  return {
    userid: parseInt(userid),
    total_income: totalIncome,
    total_expenses: totalExpenses,
    balance: balance,
    cost_count: costCount,
    income_count: incomeCount,
    expense_count: expenseCount,
    average_income_per_cost: incomeCount > 0 ? (totalIncome / incomeCount).toFixed(2) : 0,
    average_expense_per_cost: expenseCount > 0 ? (totalExpenses / expenseCount).toFixed(2) : 0
  };
}

/**
 * Get monthly trends (income/expense over time)
 */
async function getTrends(userid, year) {
  const targetYear = year ? parseInt(year) : new Date().getFullYear();
  const startDate = new Date(targetYear, 0, 1);
  const endDate = new Date(targetYear, 11, 31, 23, 59, 59);

  const costs = await Cost.find({
    userid: parseInt(userid),
    created_at: { $gte: startDate, $lte: endDate }
  });

  // Group by month
  const monthlyData = {};
  for (let month = 1; month <= 12; month++) {
    monthlyData[month] = { income: 0, expenses: 0 };
  }

  costs.forEach(t => {
    const month = new Date(t.created_at).getMonth() + 1;
    if (t.type === 'income') {
      monthlyData[month].income += t.sum;
    } else {
      monthlyData[month].expenses += t.sum;
    }
  });

  const trends = Object.keys(monthlyData).map(month => ({
    month: parseInt(month),
    year: targetYear,
    income: monthlyData[month].income,
    expenses: monthlyData[month].expenses,
    balance: monthlyData[month].income - monthlyData[month].expenses
  }));

  return {
    userid: parseInt(userid),
    year: targetYear,
    trends: trends
  };
}

/**
 * Get category breakdown
 */
async function getCategories(userid, type, year, month) {
  const query = { userid: parseInt(userid) };
  if (type) {
    query.type = type.toLowerCase();
  }

  if (year && month) {
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59);
    query.created_at = { $gte: startDate, $lte: endDate };
  }

  const costs = await Cost.find(query);

  // Group by category
  const categoryData = {};
  let total = 0;

  costs.forEach(t => {
    if (!categoryData[t.category]) {
      categoryData[t.category] = { sum: 0, count: 0 };
    }
    categoryData[t.category].sum += t.sum;
    categoryData[t.category].count += 1;
    total += t.sum;
  });

  const breakdown = Object.keys(categoryData).map(category => ({
    category,
    sum: categoryData[category].sum,
    count: categoryData[category].count,
    percentage: total > 0 ? ((categoryData[category].sum / total) * 100).toFixed(2) : 0
  })).sort((a, b) => b.sum - a.sum);

  return {
    userid: parseInt(userid),
    type: type || 'all',
    total: total,
    breakdown: breakdown
  };
}

/**
 * Get month-over-month comparison
 */
async function getComparison(userid, year, month) {
  const yearNum = parseInt(year);
  const monthNum = parseInt(month);

  // Current month
  const currentStart = new Date(yearNum, monthNum - 1, 1);
  const currentEnd = new Date(yearNum, monthNum, 0, 23, 59, 59);

  // Previous month
  const prevMonth = monthNum === 1 ? 12 : monthNum - 1;
  const prevYear = monthNum === 1 ? yearNum - 1 : yearNum;
  const prevStart = new Date(prevYear, prevMonth - 1, 1);
  const prevEnd = new Date(prevYear, prevMonth, 0, 23, 59, 59);

  const currentCosts = await Cost.find({
    userid: parseInt(userid),
    created_at: { $gte: currentStart, $lte: currentEnd }
  });

  const prevCosts = await Cost.find({
    userid: parseInt(userid),
    created_at: { $gte: prevStart, $lte: prevEnd }
  });

  const calculateTotals = (costs) => {
    const income = costs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.sum, 0);
    const expenses = costs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.sum, 0);
    return { income, expenses, balance: income - expenses };
  };

  const current = calculateTotals(currentCosts);
  const previous = calculateTotals(prevCosts);

  const incomeChange = previous.income > 0 
    ? ((current.income - previous.income) / previous.income * 100).toFixed(2)
    : (current.income > 0 ? 100 : 0);

  const expenseChange = previous.expenses > 0
    ? ((current.expenses - previous.expenses) / previous.expenses * 100).toFixed(2)
    : (current.expenses > 0 ? 100 : 0);

  const balanceChange = previous.balance !== 0
    ? ((current.balance - previous.balance) / Math.abs(previous.balance) * 100).toFixed(2)
    : (current.balance !== 0 ? (current.balance > 0 ? 100 : -100) : 0);

  return {
    userid: parseInt(userid),
    current_month: {
      year: yearNum,
      month: monthNum,
      ...current
    },
    previous_month: {
      year: prevYear,
      month: prevMonth,
      ...previous
    },
    changes: {
      income_change_percentage: parseFloat(incomeChange),
      expense_change_percentage: parseFloat(expenseChange),
      balance_change_percentage: parseFloat(balanceChange)
    }
  };
}

/**
 * Get yearly report
 */
async function getYearly(userid, year) {
  const yearNum = parseInt(year);
  const startDate = new Date(yearNum, 0, 1);
  const endDate = new Date(yearNum, 11, 31, 23, 59, 59);

  const costs = await Cost.find({
    userid: parseInt(userid),
    created_at: { $gte: startDate, $lte: endDate }
  });

  const totalIncome = costs
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.sum, 0);

  const totalExpenses = costs
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.sum, 0);

  // Monthly breakdown
  const monthlyBreakdown = {};
  for (let month = 1; month <= 12; month++) {
    monthlyBreakdown[month] = { income: 0, expenses: 0, costs: 0 };
  }

  costs.forEach(t => {
    const month = new Date(t.created_at).getMonth() + 1;
    if (t.type === 'income') {
      monthlyBreakdown[month].income += t.sum;
    } else {
      monthlyBreakdown[month].expenses += t.sum;
    }
    monthlyBreakdown[month].costs += 1;
  });

  // Category breakdown
  const categoryBreakdown = {};
  costs.forEach(t => {
    if (!categoryBreakdown[t.category]) {
      categoryBreakdown[t.category] = { income: 0, expenses: 0 };
    }
    if (t.type === 'income') {
      categoryBreakdown[t.category].income += t.sum;
    } else {
      categoryBreakdown[t.category].expenses += t.sum;
    }
  });

  return {
    userid: parseInt(userid),
    year: yearNum,
    summary: {
      total_income: totalIncome,
      total_expenses: totalExpenses,
      balance: totalIncome - totalExpenses,
      cost_count: costs.length
    },
    monthly_breakdown: Object.keys(monthlyBreakdown).map(month => ({
      month: parseInt(month),
      ...monthlyBreakdown[month],
      balance: monthlyBreakdown[month].income - monthlyBreakdown[month].expenses
    })),
    category_breakdown: categoryBreakdown
  };
}

module.exports = {
  getSummary,
  getTrends,
  getCategories,
  getComparison,
  getYearly
};



