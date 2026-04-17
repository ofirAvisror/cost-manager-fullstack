require('dotenv').config();
const express = require('express');
const pinoHttp = require('pino-http');
const { connectDB } = require('../config/database');
const Cost = require('../models/Cost');
const User = require('../models/User');
const { logger } = require('../config/logger');
const { mongoLoggingMiddleware, logEndpointAccess } = require('../middleware/logging');

const app = express();
const PORT = process.env.PORT_ANALYTICS || 3006;

// Middleware
app.use(express.json());
app.use(pinoHttp({ logger }));
app.use(mongoLoggingMiddleware);

// Connect to database
connectDB();

/**
 * GET /api/analytics/summary
 * Get overall financial summary for a user
 * Query params: userid (required)
 */
app.get('/api/analytics/summary', async (req, res) => {
  logEndpointAccess('/api/analytics/summary', 'GET', req.query?.userid);
  
  try {
    const { userid } = req.query;

    if (!userid) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'userid query parameter is required' 
      });
    }

    const user = await User.findOne({ id: parseInt(userid) });
    if (!user) {
      return res.status(404).json({ 
        id: 'NOT_FOUND',
        message: 'User not found' 
      });
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

    res.json({
      userid: parseInt(userid),
      total_income: totalIncome,
      total_expenses: totalExpenses,
      balance: balance,
      cost_count: costCount,
      income_count: incomeCount,
      expense_count: expenseCount,
      average_income_per_cost: incomeCount > 0 ? (totalIncome / incomeCount).toFixed(2) : 0,
      average_expense_per_cost: expenseCount > 0 ? (totalExpenses / expenseCount).toFixed(2) : 0
    });
  } catch (error) {
    logger.error('Error fetching analytics summary:', error.message);
    res.status(500).json({ 
      id: 'SERVER_ERROR',
      message: error.message 
    });
  }
});

/**
 * GET /api/analytics/trends
 * Get monthly trends (income/expense over time)
 * Query params: userid (required), year? (default: current year)
 */
app.get('/api/analytics/trends', async (req, res) => {
  logEndpointAccess('/api/analytics/trends', 'GET', req.query?.userid);
  
  try {
    const { userid, year } = req.query;

    if (!userid) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'userid query parameter is required' 
      });
    }

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

    res.json({
      userid: parseInt(userid),
      year: targetYear,
      trends: trends
    });
  } catch (error) {
    logger.error('Error fetching analytics trends:', error.message);
    res.status(500).json({ 
      id: 'SERVER_ERROR',
      message: error.message 
    });
  }
});

/**
 * GET /api/analytics/categories
 * Get category breakdown
 * Query params: userid (required), type? (income/expense), year?, month?
 */
app.get('/api/analytics/categories', async (req, res) => {
  logEndpointAccess('/api/analytics/categories', 'GET', req.query?.userid);
  
  try {
    const { userid, type, year, month } = req.query;

    if (!userid) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'userid query parameter is required' 
      });
    }

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

    res.json({
      userid: parseInt(userid),
      type: type || 'all',
      total: total,
      breakdown: breakdown
    });
  } catch (error) {
    logger.error('Error fetching analytics categories:', error.message);
    res.status(500).json({ 
      id: 'SERVER_ERROR',
      message: error.message 
    });
  }
});

/**
 * GET /api/analytics/comparison
 * Get month-over-month comparison
 * Query params: userid (required), year (required), month (required)
 */
app.get('/api/analytics/comparison', async (req, res) => {
  logEndpointAccess('/api/analytics/comparison', 'GET', req.query?.userid);
  
  try {
    const { userid, year, month } = req.query;

    if (!userid || !year || !month) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'Missing required query parameters: userid, year, and month are required' 
      });
    }

    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'Invalid year or month' 
      });
    }

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

    res.json({
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
    });
  } catch (error) {
    logger.error('Error fetching analytics comparison:', error.message);
    res.status(500).json({ 
      id: 'SERVER_ERROR',
      message: error.message 
    });
  }
});

/**
 * GET /api/analytics/yearly
 * Get yearly report
 * Query params: userid (required), year (required)
 */
app.get('/api/analytics/yearly', async (req, res) => {
  logEndpointAccess('/api/analytics/yearly', 'GET', req.query?.userid);
  
  try {
    const { userid, year } = req.query;

    if (!userid || !year) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'Missing required query parameters: userid and year are required' 
      });
    }

    const yearNum = parseInt(year);
    if (isNaN(yearNum)) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'year must be a valid number' 
      });
    }

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

    res.json({
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
    });
  } catch (error) {
    logger.error('Error fetching yearly analytics:', error.message);
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
    logger.info(`Analytics service running on port ${PORT}`);
  });
}

module.exports = app;



