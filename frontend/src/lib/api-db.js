/**
 * api-db.js - Backend API wrapper with idb-react-compatible interface.
 */
const DEFAULT_API_BASE_URL = 'http://localhost:4000';
const DEFAULT_USER_ID = 1;
const AUTH_STORAGE_KEY = 'cm_auth';

function getApiBaseUrl() {
  return process.env.REACT_APP_API_BASE_URL || DEFAULT_API_BASE_URL;
}

export function getUserId() {
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
  const category = (cost.category || '').trim().toLowerCase();

  let backendType = 'expense';
  if (originalType === 'income' || originalType === 'savings_deposit') {
    backendType = 'income';
  }

  const customTags = [];
  if (originalType === 'savings_deposit' || originalType === 'savings_withdrawal') {
    customTags.push(`cm_type:${originalType}`);
  }

  const payload = {
    type: backendType,
    description: cost.description,
    category,
    userid: getUserId(),
    sum: cost.sum,
    currency: toBackendCurrency(cost.currency || 'ILS'),
    tags: customTags,
  };

  if (backendType === 'expense' && cost.isRecurringExpense) {
    payload.recurring = {
      enabled: true,
      frequency: (cost.recurringFrequency || 'monthly').toLowerCase(),
    };
    if (cost.recurringNextDate) {
      payload.recurring.next_date =
        typeof cost.recurringNextDate === 'string'
          ? cost.recurringNextDate
          : new Date(
              cost.recurringNextDate.year,
              cost.recurringNextDate.month - 1,
              cost.recurringNextDate.day
            ).toISOString();
    }
  }

  return payload;
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
    ownerUserId: cost.owner_userid || cost.userid,
    paidByUserId: cost.paid_by_userid || cost.userid,
    isShared: !!cost.is_shared,
    sharedWithUserId: cost.shared_with_userid || null,
    sharedSplitMode: cost.shared_split_mode || 'half_half',
    sharedSplit: cost.shared_split || { self_percentage: 50, partner_percentage: 50 },
    scheduleOnly: !!cost.schedule_only,
    recurring:
      cost.recurring && cost.recurring.enabled
        ? {
            frequency: cost.recurring.frequency,
            nextDate: cost.recurring.next_date,
          }
        : null,
  };
}

export async function openCostsDB(getViewFilter) {
  const resolveVF =
    typeof getViewFilter === 'function' ? getViewFilter : function () {
      return {};
    };

  function viewScopeParam() {
    const vf = resolveVF();
    return vf.viewScope || 'household';
  }

  const dbObject = {
    async addCost(cost) {
      const payload = {
        ...serializeCost(cost),
        owner_userid: cost.ownerUserId || getUserId(),
        paid_by_userid: cost.paidByUserId || getUserId(),
        is_shared: !!cost.isShared,
        shared_with_userid: cost.sharedWithUserId || null,
        shared_split_mode: cost.sharedSplitMode || 'half_half',
        shared_split: cost.sharedSplit || { self_percentage: 50, partner_percentage: 50 },
      };
      await apiRequest('/api/add', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    async getAllCosts() {
      const params = new URLSearchParams({
        userid: String(getUserId()),
        viewScope: viewScopeParam(),
      });
      const items = await apiRequest(`/api/costs?${params.toString()}`);
      return (items || []).map(deserializeCost);
    },

    async processRecurringDue() {
      await apiRequest('/api/recurring/process', { method: 'POST' });
    },

    async getRecurringSchedules() {
      const params = new URLSearchParams({
        userid: String(getUserId()),
        schedulesOnly: 'true',
        viewScope: viewScopeParam(),
      });
      const items = await apiRequest(`/api/costs?${params.toString()}`);
      return (items || []).map(deserializeCost);
    },

    async deleteRecurringSchedule(id) {
      await apiRequest(`/api/costs/schedules/${id}`, { method: 'DELETE' });
    },

    async getReport(year, month, currency) {
      const vs = encodeURIComponent(viewScopeParam());
      const report = await apiRequest(
        `/api/report?id=${getUserId()}&year=${year}&month=${month}&viewScope=${vs}`
      );

      function flattenCategoryBuckets(buckets, type) {
        const rows = [];
        if (!Array.isArray(buckets)) return rows;
        buckets.forEach((bucket) => {
          if (!bucket || typeof bucket !== 'object') return;
          Object.keys(bucket).forEach((category) => {
            const items = bucket[category];
            if (!Array.isArray(items)) return;
            items.forEach((item) => {
              rows.push({
                category,
                sum: item.sum,
                description: item.description,
                day: item.day,
                type,
                date: { year, month, day: item.day },
                currency,
                isShared: !!item.is_shared,
                ownerUserId: item.owner_userid,
                sharedWithUserId: item.shared_with_userid,
                sharedSplit: item.shared_split,
                paidByUserId: item.paid_by_userid,
              });
            });
          });
        });
        return rows;
      }

      let expenseRows = flattenCategoryBuckets(report.expenses || report.costs, 'expense');
      let incomeRows = flattenCategoryBuckets(report.income, 'income');

      const lastDayOfMonth = new Date(year, month, 0).getDate();

      const totalExpenses = Number(
        report.summary?.total_expenses ??
          report.totals?.expenses ??
          report.total ??
          0
      );
      let totalIncomes = Number(
        report.summary?.total_income ??
          report.totals?.incomes ??
          incomeRows.reduce((sum, item) => sum + Number(item.sum || 0), 0)
      );

      // Legacy cached reports: summary correct but category buckets omitted custom categories.
      if (totalExpenses > 0 && expenseRows.length === 0) {
        const fromRange = await dbObject.getCostsByDateRange(
          { year, month, day: 1 },
          { year, month, day: lastDayOfMonth }
        );
        expenseRows = fromRange
          .filter((item) => (item.type || 'expense') === 'expense')
          .map((item) => ({
            category: item.category,
            sum: item.sum,
            description: item.description,
            day: item.date?.day,
            type: 'expense',
            date: item.date,
            currency: item.currency || currency,
            isShared: !!item.isShared,
            ownerUserId: item.ownerUserId,
            sharedWithUserId: item.sharedWithUserId,
            sharedSplit: item.sharedSplit,
            paidByUserId: item.paidByUserId,
          }));
      }
      if (totalIncomes > 0 && incomeRows.length === 0) {
        const fromRange = await dbObject.getCostsByDateRange(
          { year, month, day: 1 },
          { year, month, day: lastDayOfMonth }
        );
        incomeRows = fromRange
          .filter((item) => item.type === 'income')
          .map((item) => ({
            category: item.category,
            sum: item.sum,
            description: item.description,
            day: item.date?.day,
            type: 'income',
            date: item.date,
            currency: item.currency || currency,
          }));
      }

      const costs = expenseRows.concat(incomeRows);

      if (
        (!report.summary?.total_income && !report.totals?.incomes) &&
        incomeRows.length > 0
      ) {
        totalIncomes = incomeRows.reduce((sum, item) => sum + Number(item.sum || 0), 0);
      }

      const balance =
        report.summary?.balance ?? (totalIncomes - totalExpenses);

      return {
        ...report,
        costs,
        expenses: expenseRows,
        incomes: incomeRows,
        savings: {
          deposits: [],
          withdrawals: [],
          total: 0,
        },
        totals: {
          expenses: totalExpenses,
          incomes: totalIncomes,
          savings: 0,
          balance,
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
      const vf = resolveVF();
      const vs = vf.viewScope || 'household';
      const selfId = getUserId();
      const pid = vf.partnerId;

      function mapRows(rows) {
        return (rows || []).map((item) => ({
          id: item._id || item.id,
          name: item.name,
          color: item.color || '#6366f1',
        }));
      }

      async function fetchForUser(uid) {
        const rows = await apiRequest(`/api/categories?userid=${uid}`);
        return mapRows(rows);
      }

      if (vs === 'partner' && Number.isFinite(pid)) {
        return fetchForUser(pid);
      }
      if (vs === 'self' || !Number.isFinite(pid)) {
        return fetchForUser(selfId);
      }

      const [mine, theirs] = await Promise.all([fetchForUser(selfId), fetchForUser(pid)]);
      const byName = new Map();
      mine.forEach(function (c) {
        byName.set(c.name, c);
      });
      theirs.forEach(function (c) {
        if (!byName.has(c.name)) {
          byName.set(c.name, c);
        }
      });
      return Array.from(byName.values()).sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });
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
        currency: toBackendCurrency(budgetData.currency || 'ILS'),
      };

      await apiRequest('/api/budgets', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    async getAllBudgets() {
      const params = new URLSearchParams({
        userid: String(getUserId()),
        viewScope: viewScopeParam(),
      });
      const budgets = await apiRequest(`/api/budgets?${params.toString()}`);
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
      const params = new URLSearchParams({
        userid: String(getUserId()),
        viewScope: viewScopeParam(),
      });
      const goals = await apiRequest(`/api/goals?${params.toString()}`);
      return (goals || []).map((goal) => {
        const date = goal.deadline ? new Date(goal.deadline) : new Date();
        return {
          id: goal._id || goal.id,
          name: goal.title,
          targetAmount: goal.target_amount,
          currentAmount: goal.current_amount || 0,
          currency: toFrontendCurrency(goal.currency || 'ILS'),
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
          currency: toBackendCurrency(goalData.currency || 'ILS'),
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
          currency: toBackendCurrency(goalData.currency || 'ILS'),
        }),
      });
    },

    async deleteSavingsGoal(id) {
      await apiRequest(`/api/goals/${id}`, {
        method: 'DELETE',
      });
    },

    async requestPartner(partnerEmail) {
      return apiRequest('/api/partners/request', {
        method: 'POST',
        body: JSON.stringify({ partner_email: partnerEmail }),
      });
    },

    async respondPartner(action) {
      return apiRequest('/api/partners/respond', {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
    },

    async getPartnerStatus() {
      return apiRequest('/api/partners/status');
    },

    async getMonthlySettlement(year, month) {
      return apiRequest(`/api/settlement/monthly?year=${year}&month=${month}`);
    },
  };

  return dbObject;
}
