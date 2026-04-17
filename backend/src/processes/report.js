require('dotenv').config();
const express = require('express');
const pinoHttp = require('pino-http');
const { connectDB } = require('../config/database');
const Cost = require('../models/Cost');
const Report = require('../models/Report');
const User = require('../models/User');
const { logger } = require('../config/logger');
const { mongoLoggingMiddleware, logEndpointAccess } = require('../middleware/logging');
const { optionalAuth } = require('../middleware/auth');

const app = express();
const PORT = process.env.PORT_REPORT || 3002;

// Middleware
app.use(express.json());
app.use(pinoHttp({ logger }));
app.use(mongoLoggingMiddleware);

// Connect to database
connectDB();

/**
 * Helper function to check if a date is in the past or current month
 */
function isCurrentMonth(year, month) {
  const now = new Date();
  return year === now.getFullYear() && month === (now.getMonth() + 1);
}

/**
 * Helper function to generate report from costs
 * This function implements the Computed Design Pattern by generating
 * reports that can be cached for past months
 */
async function generateReport(userid, year, month) {
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const costs = await Cost.find({
      userid,
      created_at: { $gte: startDate, $lte: endDate }
    });

    // Separate income and expenses
    const expenses = costs.filter(t => t.type === 'expense');
    const incomes = costs.filter(t => t.type === 'income');

    // Expense categories
    const expenseCategories = ['food', 'education', 'health', 'housing', 'sports'];
    const expensesArray = [];

    expenseCategories.forEach(category => {
      const categoryExpenses = expenses.filter(e => e.category === category);
      const categoryData = categoryExpenses.map(e => {
        const day = new Date(e.created_at).getDate();
        return {
          sum: e.sum,
          description: e.description,
          day: day
        };
      });
      
      const categoryObject = {};
      categoryObject[category] = categoryData;
      expensesArray.push(categoryObject);
    });

    // Income categories
    const incomeCategories = ['salary', 'freelance', 'investment', 'business', 'gift', 'other'];
    const incomeArray = [];

    incomeCategories.forEach(category => {
      const categoryIncomes = incomes.filter(i => i.category === category);
      const categoryData = categoryIncomes.map(i => {
        const day = new Date(i.created_at).getDate();
        return {
          sum: i.sum,
          description: i.description,
          day: day
        };
      });
      
      const categoryObject = {};
      categoryObject[category] = categoryData;
      incomeArray.push(categoryObject);
    });

    // Calculate totals
    const totalExpenses = expenses.reduce((sum, e) => sum + e.sum, 0);
    const totalIncome = incomes.reduce((sum, i) => sum + i.sum, 0);
    const balance = totalIncome - totalExpenses;

    return {
      userid: userid,
      year: year,
      month: month,
      expenses: expensesArray, // Keep 'expenses' for backward compatibility
      costs: expensesArray, // Keep 'costs' for backward compatibility
      income: incomeArray,
      summary: {
        total_income: totalIncome,
        total_expenses: totalExpenses,
        balance: balance
      }
    };
  } catch (error) {
    logger.error('Error generating report:', error.message);
    throw error;
  }
}

/**
 * GET /api/report
 * Get report for a specific month/year
 * Query params: id (userid), year, month
 * Implements Computed Design Pattern with caching
 * For past months, reports are cached and retrieved from cache
 * For current month, reports are always calculated fresh
 */
app.get('/api/report', async (req, res) => {
  logEndpointAccess('/api/report', 'GET', req.query?.id);
  
  try {
    const { id, year, month } = req.query;

    // Validate required params
    if (!id || !year || !month) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'Missing required query parameters: id, year, and month are required' 
      });
    }

    const userIdNum = parseInt(id);
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    // Validate ranges
    if (isNaN(userIdNum) || isNaN(yearNum) || isNaN(monthNum)) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'Invalid query parameters: id, year, and month must be numbers' 
      });
    }

    if (monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'Month must be between 1 and 12' 
      });
    }

    // Verify user exists
    const user = await User.findOne({ id: userIdNum });
    if (!user) {
      return res.status(404).json({ 
        id: 'NOT_FOUND',
        message: 'User not found' 
      });
    }

    // Check if requesting current month or past month
    const current = isCurrentMonth(yearNum, monthNum);

    if (!current) {
      /**
       * Computed Design Pattern Implementation:
       * For past months, we check if a cached report exists in the database.
       * If it exists, we return it immediately without recalculating.
       * If it doesn't exist, we generate the report, save it to the cache,
       * and then return it. This ensures that past month reports are computed
       * only once and reused for subsequent requests.
       */
      let cachedReport = await Report.findOne({
        userid: userIdNum,
        year: yearNum,
        month: monthNum
      });

      if (cachedReport) {
        logger.info(`Returning cached report for user ${userIdNum}, ${yearNum}-${monthNum}`);
        return res.json(cachedReport.data);
      }

      // Not in cache - generate, save, and return
      logger.info(`Generating and caching report for user ${userIdNum}, ${yearNum}-${monthNum}`);
      const reportData = await generateReport(userIdNum, yearNum, monthNum);

      const newReport = new Report({
        userid: userIdNum,
        year: yearNum,
        month: monthNum,
        data: reportData,
        saved_at: new Date()
      });

      await newReport.save();
      return res.json(reportData);
    } else {
      // Current month - always calculate from scratch (don't cache)
      logger.info(`Generating on-the-fly report for current month, user ${userIdNum}`);
      const reportData = await generateReport(userIdNum, yearNum, monthNum);
      return res.json(reportData);
    }
  } catch (error) {
    logger.error('Error fetching report:', error.message);
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
    logger.info(`Report service running on port ${PORT}`);
  });
}

module.exports = app;
