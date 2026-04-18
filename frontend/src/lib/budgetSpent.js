/**
 * Budget "spent" totals aligned with report logic: personal share vs shared-only (full joint amounts).
 */

import { getExpenseLineAmount } from './expenseDisplay';

function normalizeBasis(budget) {
  return budget?.spent_basis === 'couple_shared' ? 'couple_shared' : 'personal';
}

function ownerId(budget) {
  const id = budget?.ownerUserId ?? budget?.userid;
  return id != null ? Number(id) : null;
}

async function sumMonthPersonal(db, year, month, currency, ownerUserId) {
  const report = await db.getReport(year, month, currency, {
    viewScope: 'self',
    userId: ownerUserId,
  });
  const rows = report.expenses || [];
  let s = 0;
  for (let i = 0; i < rows.length; i++) {
    s += getExpenseLineAmount(rows[i], 'self', ownerUserId);
  }
  return s;
}

async function sumMonthCoupleShared(db, year, month, currency, anchorUserId) {
  const report = await db.getReport(year, month, currency, {
    viewScope: 'household',
    userId: anchorUserId,
  });
  const rows = report.expenses || [];
  let s = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.isShared ?? row.is_shared) {
      s += Number(row.sum) || 0;
    }
  }
  return s;
}

function convertToBudgetCurrency(amount, fromCurrency, toCurrency, rates) {
  if (!rates || fromCurrency === toCurrency) {
    return amount;
  }
  const fromRate = rates[fromCurrency];
  const toRate = rates[toCurrency];
  if (!fromRate || !toRate) {
    return amount;
  }
  const amountInUSD = amount / fromRate;
  return amountInUSD * toRate;
}

/**
 * @param {object} db - api-db instance
 * @param {object} budget - budget row with type, year, month?, category?, currency, spent_basis, ownerUserId
 * @param {number} loggedInUserId - JWT user (household anchor for couple_shared)
 */
export async function computeBudgetSpent(db, budget, loggedInUserId) {
  const basis = normalizeBasis(budget);
  const oid = ownerId(budget);
  if (oid == null || !Number.isFinite(oid)) {
    return 0;
  }

  if (budget.type === 'monthly' && budget.month) {
    if (basis === 'couple_shared') {
      return sumMonthCoupleShared(db, budget.year, budget.month, budget.currency, loggedInUserId);
    }
    return sumMonthPersonal(db, budget.year, budget.month, budget.currency, oid);
  }

  if (budget.type === 'yearly') {
    let total = 0;
    for (let m = 1; m <= 12; m++) {
      if (basis === 'couple_shared') {
        total += await sumMonthCoupleShared(db, budget.year, m, budget.currency, loggedInUserId);
      } else {
        total += await sumMonthPersonal(db, budget.year, m, budget.currency, oid);
      }
    }
    return total;
  }

  if (budget.type === 'category' && budget.category) {
    const exchangeRateUrl =
      (typeof localStorage !== 'undefined' && localStorage.getItem('exchangeRateUrl')) ||
      './exchange-rates.json';
    let rates;
    try {
      const r = await fetch(exchangeRateUrl);
      rates = await r.json();
    } catch (e) {
      rates = null;
    }
    if (!rates) {
      return 0;
    }

    const vs = basis === 'couple_shared' ? 'household' : 'self';
    const anchor = basis === 'couple_shared' ? loggedInUserId : oid;
    const costs = await db.getCostsByCategory(budget.category, {
      viewScope: vs,
      userId: anchor,
    });

    let spent = 0;
    for (let i = 0; i < costs.length; i++) {
      const cost = costs[i];
      if ((cost.type || 'expense') !== 'expense') {
        continue;
      }
      if (basis === 'couple_shared' && !(cost.isShared ?? cost.is_shared)) {
        continue;
      }
      let amt =
        basis === 'couple_shared'
          ? Number(cost.sum) || 0
          : getExpenseLineAmount(cost, 'self', oid);
      amt = convertToBudgetCurrency(amt, cost.currency, budget.currency, rates);
      spent += amt;
    }
    return spent;
  }

  return 0;
}
