const Cost = require('../models/Cost');
const Report = require('../models/Report');
const { logger } = require('../config/logger');

/**
 * Check if a date is in the current month
 */
function isCurrentMonth(year, month) {
  const now = new Date();
  return year === now.getFullYear() && month === (now.getMonth() + 1);
}

/**
 * Generate report from costs
 * This function implements the Computed Design Pattern by generating
 * reports that can be cached for past or future months
 */
async function generateReport(userid, year, month) {
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
}

/**
 * Get report for a specific month/year
 * Implements Computed Design Pattern with caching
 */
async function getReport(userid, year, month) {
  const current = isCurrentMonth(year, month);

  if (!current) {
    // Past or future month - check cache first
    let cachedReport = await Report.findOne({
      userid,
      year,
      month
    });

    if (cachedReport) {
      logger.info(`Returning cached report for user ${userid}, ${year}-${month}`);
      return cachedReport.data;
    }

    // Not in cache - generate, save, and return
    logger.info(`Generating and caching report for user ${userid}, ${year}-${month}`);
    const reportData = await generateReport(userid, year, month);

    const newReport = new Report({
      userid,
      year,
      month,
      data: reportData,
      saved_at: new Date()
    });

    await newReport.save();
    return reportData;
  } else {
    // Current month - always calculate from scratch (don't cache)
    logger.info(`Generating on-the-fly report for current month, user ${userid}`);
    return await generateReport(userid, year, month);
  }
}

module.exports = {
  getReport,
  generateReport,
  isCurrentMonth
};



