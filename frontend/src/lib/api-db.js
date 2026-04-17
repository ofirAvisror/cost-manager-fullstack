/**
 * api-db.js - Backend API wrapper with idb-react-compatible interface.
 */
const DEFAULT_API_BASE_URL = 'http://localhost:4000';
const DEFAULT_USER_ID = 1;
const AUTH_STORAGE_KEY = 'cm_auth';

const EXPENSE_CATEGORIES = new Set(['food', 'health', 'housing', 'sports', 'education']);
const INCOME_CATEGORIES = new Set(['salary', 'freelance', 'investment', 'business', 'gift', 'other']);

function getApiBaseUrl() {
  return process.env.REACT_APP_API_BASE_URL || DEFAULT_API_BASE_URL;
}

function getUserId() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) {
      const auth = JSON.parse(raw);
      const userId = parseInt(auth?.user?.id, 10);
      if (Number.isFinite(userId)) return userId;
    }
  } catch (error) {
    // Ignore malformed auth data.
  }
  const userIdRaw = process.env.REACT_APP_USER_ID;
  const parsed = parseInt(userIdRaw || '', 10);
  return Number.isFinite(parsed) ? parsed : DEFAULT_USER_ID;
}

function getAuthToken() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return '';
    const auth = JSON.parse(raw);
    return auth?.token || '';
  } catch (error) {
    return '';
  }
}

function toBackendCurrency(currency) {
  if (currency === 'EURO') return 'EUR';
  return currency;
}

function toFrontendCurrency(currency) {
  if (currency === 'EUR') return 'EURO';
  return currency;
}

function toFrontendDate(dateValue) {
  const date = new Date(dateValue);
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

async function apiRequest(path, options = {}) {
  const token = getAuthToken();
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (body && body.message) {
        message = body.message;
      }
    } catch (error) {
      // Keep fallback message.
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

function serializeCost(cost) {
  const originalType = cost.type || 'expense';
  const category = (cost.category || '').toLowerCase();

  let backendType = 'expense';
  if (originalType === 'income' || originalType === 'savings_deposit') {
    backendType = 'income';
  }

  let backendCategory = category;
  const customTags = [];
  if (
    (backendType === 'expense' && !EXPENSE_CATEGORIES.has(backendCategory)) ||
    (backendType === 'income' && !INCOME_CATEGORIES.has(backendCategory))
  ) {
    customTags.push(`cm_category:${category}`);
    backendCategory = 'other';
  }

  if (originalType === 'savings_deposit' || originalType === 'savings_withdrawal') {
    customTags.push(`cm_type:${originalType}`);
  }

  return {
    type: backendType,
    description: cost.description,
    category: backendCategory,
    userid: getUserId(),
    sum: cost.sum,
    currency: toBackendCurrency(cost.currency || 'USD'),
    tags: customTags,
  };
}

function deserializeCost(cost) {
  const tags = Array.isArray(cost.tags) ? cost.tags : [];
  const taggedType = tags.find((tag) => tag.startsWith('cm_type:'));
  const taggedCategory = tags.find((tag) => tag.startsWith('cm_category:'));

  const restoredType = taggedType ? taggedType.replace('cm_type:', '') : cost.type;
  const restoredCategory = taggedCategory ? taggedCategory.replace('cm_category:', '') : cost.category;

  return {
    id: cost._id || cost.id,
    sum: cost.sum,
    currency: toFrontendCurrency(cost.currency),
    category: restoredCategory,
    description: cost.description,
    type: restoredType || 'expense',
    date: toFrontendDate(cost.created_at || cost.createdAt || new Date()),
  };
}

export async function openCostsDB() {
  const dbObject = {
    async addCost(cost) {
      const payload = serializeCost(cost);
      await apiRequest('/api/add', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    async getAllCosts() {
      const items = await apiRequest(`/api/costs?userid=${getUserId()}`);
      return (items || []).map(deserializeCost);
    },

    async getReport(year, month, currency) {
      const report = await apiRequest(
        `/api/report?id=${getUserId()}&year=${year}&month=${month}`
      );

      const costs = Array.isArray(report.costs) ? report.costs.map((cost) => ({
        ...cost,
        currency,
      })) : [];
      const totalExpenses = report.total || report.totals?.expenses || 0;
      const totalIncomes = costs
        .filter((item) => item.type === 'income')
        .reduce((sum, item) => sum + item.sum, 0);

      return {
        ...report,
        costs,
        expenses: costs.filter((item) => item.type !== 'income'),
        incomes: costs.filter((item) => item.type === 'income'),
        savings: {
          deposits: [],
          withdrawals: [],
          total: 0,
        },
        totals: {
          expenses: totalExpenses,
          incomes: totalIncomes,
          savings: 0,
          balance: totalIncomes - totalExpenses,
          currency,
        },
        total: {
          currency,
          total: totalExpenses,
        },
      };
    },

    async getCostsByCategory(category) {
      const all = await dbObject.getAllCosts();
      return all.filter((item) => item.category === category);
    },

    async getCostsByDateRange(startDate, endDate) {
      const start = new Date(startDate.year, startDate.month - 1, startDate.day);
      const end = new Date(endDate.year, endDate.month - 1, endDate.day, 23, 59, 59, 999);
      const all = await dbObject.getAllCosts();
      return all.filter((item) => {
        const date = new Date(item.date.year, item.date.month - 1, item.date.day);
        return date >= start && date <= end;
      });
    },

    async getStatistics(year, month, currency) {
      const [summary, comparison, categories] = await Promise.all([
        apiRequest(`/api/analytics/summary?userid=${getUserId()}`),
        apiRequest(`/api/analytics/comparison?userid=${getUserId()}&year=${year}&month=${month}`),
        apiRequest(`/api/analytics/categories?userid=${getUserId()}&type=expense&year=${year}&month=${month}`),
      ]);

      const totalByCategory = {};
      (categories.breakdown || []).forEach((item) => {
        totalByCategory[item.category] = item.sum;
      });

      const report = await dbObject.getReport(year, month, currency);
      const currentTotal = report.totals.expenses;

      return {
        totalThisMonth: currentTotal || 0,
        totalIncomes: summary.total_income || 0,
        totalSavings: 0,
        balance: summary.balance || 0,
        averageDaily: (summary.average_expense_per_cost || 0),
        totalLastMonth: comparison.previous_month?.expenses || 0,
        changePercentage: comparison.changes?.expense_change_percentage || 0,
        totalByCategory,
        currency,
      };
    },

    async getCategories() {
      const categories = await apiRequest(`/api/categories?userid=${getUserId()}`);
      return (categories || []).map((item) => ({
        id: item._id || item.id,
        name: item.name,
        color: item.color || '#6366f1',
      }));
    },

    async addCategory(category) {
      const created = await apiRequest('/api/categories', {
        method: 'POST',
        body: JSON.stringify({
          userid: getUserId(),
          name: category.name,
          color: category.color || '#6366f1',
        }),
      });
      return {
        id: created._id || created.id,
        name: category.name,
        color: category.color || '#6366f1',
      };
    },

    async updateCategory(id, updates) {
      await apiRequest(`/api/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },

    async deleteCategory(id) {
      await apiRequest(`/api/categories/${id}`, {
        method: 'DELETE',
      });
    },

    async setBudget(budgetData) {
      const payload = {
        userid: getUserId(),
        year: budgetData.year,
        month: budgetData.month,
        type: budgetData.type,
        category: budgetData.type === 'category' ? budgetData.category : undefined,
        amount: budgetData.amount,
        currency: toBackendCurrency(budgetData.currency || 'USD'),
      };

      await apiRequest('/api/budgets', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    async getAllBudgets() {
      const budgets = await apiRequest(`/api/budgets?userid=${getUserId()}`);
      return (budgets || []).map((budget) => ({
        id: budget._id || budget.id,
        year: budget.year,
        month: budget.month,
        amount: budget.amount,
        currency: toFrontendCurrency(budget.currency),
        type: budget.type,
        category: budget.category,
      }));
    },

    async getSavingsGoals() {
      const goals = await apiRequest(`/api/goals?userid=${getUserId()}`);
      return (goals || []).map((goal) => {
        const date = goal.deadline ? new Date(goal.deadline) : new Date();
        return {
          id: goal._id || goal.id,
          name: goal.title,
          targetAmount: goal.target_amount,
          currentAmount: goal.current_amount || 0,
          currency: toFrontendCurrency(goal.currency || 'USD'),
          targetDate: {
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            day: date.getDate(),
          },
          status: goal.status,
        };
      });
    },

    async addSavingsGoal(goalData) {
      const deadline = new Date(
        goalData.targetDate.year,
        goalData.targetDate.month - 1,
        goalData.targetDate.day
      ).toISOString();

      await apiRequest('/api/goals', {
        method: 'POST',
        body: JSON.stringify({
          userid: getUserId(),
          title: goalData.name,
          target_amount: goalData.targetAmount,
          current_amount: 0,
          deadline,
          category: 'savings',
          currency: toBackendCurrency(goalData.currency || 'USD'),
          status: 'active',
        }),
      });
    },

    async updateSavingsGoal(id, goalData) {
      const deadline = new Date(
        goalData.targetDate.year,
        goalData.targetDate.month - 1,
        goalData.targetDate.day
      ).toISOString();

      await apiRequest(`/api/goals/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: goalData.name,
          target_amount: goalData.targetAmount,
          deadline,
          currency: toBackendCurrency(goalData.currency || 'USD'),
        }),
      });
    },

    async deleteSavingsGoal(id) {
      await apiRequest(`/api/goals/${id}`, {
        method: 'DELETE',
      });
    },
  };

  return dbObject;
}
