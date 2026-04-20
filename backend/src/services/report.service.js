const Cost = require('../models/Cost');
const Report = require('../models/Report');
const User = require('../models/User');
const { logger } = require('../config/logger');
const { normalizeViewScope, costOwnerMatchForView } = require('../utils/household');

/** Bump when report shape / bucketing logic changes (invalidates Mongo cache). */
const REPORT_DATA_VERSION = 4;

function totalLineItemsInBuckets(buckets) {
  if (!Array.isArray(buckets)) return 0;
  let n = 0;
  for (const bucket of buckets) {
    if (!bucket || typeof bucket !== 'object') continue;
    for (const key of Object.keys(bucket)) {
      const arr = bucket[key];
      if (Array.isArray(arr)) n += arr.length;
    }
  }
  return n;
}

function cachedReportDataIsStale(data) {
  if (!data || typeof data !== 'object') return true;
  if (data.schemaVersion !== REPORT_DATA_VERSION) return true;
  const te = Number(data.summary?.total_expenses) || 0;
  const ti = Number(data.summary?.total_income) || 0;
  const expN = totalLineItemsInBuckets(data.expenses || data.costs);
  const incN = totalLineItemsInBuckets(data.income);
  if (te > 0 && expN === 0) return true;
  if (ti > 0 && incN === 0) return true;
  return false;
}

function bucketCostsByCategory(rows) {
  const groups = {};
  rows.forEach((t) => {
    const cat = (t.category && String(t.category).trim()) || 'other';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push({
      _id: t._id,
      sum: t.sum,
      description: t.description,
      day: new Date(t.created_at).getDate(),
      currency: t.currency || 'ILS',
      is_shared: !!t.is_shared,
      owner_userid: t.owner_userid,
      shared_with_userid: t.shared_with_userid,
      shared_split: t.shared_split
        ? {
            self_percentage: t.shared_split.self_percentage,
            partner_percentage: t.shared_split.partner_percentage,
          }
        : undefined,
      paid_by_userid: t.paid_by_userid,
    });
  });
  return Object.keys(groups)
    .sort()
    .map((category) => ({ [category]: groups[category] }));
}

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
async function generateReport(userid, year, month, viewScope = 'household') {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const user = await User.findOne({ id: parseInt(userid, 10) });
  if (!user) {
    throw new Error('User not found');
  }
  const scope = normalizeViewScope(viewScope);
  const ownerMatch = costOwnerMatchForView(user, scope);

  const costs = await Cost.find({
    ...ownerMatch,
    created_at: { $gte: startDate, $lte: endDate },
    schedule_only: { $ne: true },
  });

  // Separate income and expenses
  const expenses = costs.filter(t => t.type === 'expense');
  const incomes = costs.filter(t => t.type === 'income');

  const expensesArray = bucketCostsByCategory(expenses);
  const incomeArray = bucketCostsByCategory(incomes);

  // Calculate totals
  const totalExpenses = expenses.reduce((sum, e) => sum + e.sum, 0);
  const totalIncome = incomes.reduce((sum, i) => sum + i.sum, 0);
  const balance = totalIncome - totalExpenses;

  return {
    userid: userid,
    year: year,
    month: month,
    schemaVersion: REPORT_DATA_VERSION,
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
async function getReport(userid, year, month, viewScope = 'household') {
  const scope = normalizeViewScope(viewScope);
  const current = isCurrentMonth(year, month);

  if (!current && scope === 'household') {
    let cachedReport = await Report.findOne({
      userid,
      year,
      month
    });

    if (cachedReport && cachedReportDataIsStale(cachedReport.data)) {
      await Report.deleteOne({ _id: cachedReport._id });
      logger.info(`Invalidated stale cached report for user ${userid}, ${year}-${month}`);
      cachedReport = null;
    }

    if (cachedReport) {
      logger.info(`Returning cached report for user ${userid}, ${year}-${month}`);
      return cachedReport.data;
    }

    logger.info(`Generating and caching report for user ${userid}, ${year}-${month}`);
    const reportData = await generateReport(userid, year, month, 'household');

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
    if (scope === 'household') {
      logger.info(`Generating on-the-fly report for current month, user ${userid}`);
    } else {
      logger.info(`Generating on-the-fly report (scope=${scope}) for user ${userid}, ${year}-${month}`);
    }
    return await generateReport(userid, year, month, scope);
  }
}

module.exports = {
  getReport,
  generateReport,
  isCurrentMonth,
  REPORT_DATA_VERSION,
  cachedReportDataIsStale,
};



