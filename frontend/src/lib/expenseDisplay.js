/**
 * Display amounts for expenses: full total in household view, attributed share in self/partner.
 * Household list coloring: mine / partner / shared.
 */

/**
 * @param {'household'|'self'|'partner'} viewScope
 * @param {number} myUserId
 * @param {number|null|undefined} partnerId
 */
export function getPerspectiveUserId(viewScope, myUserId, partnerId) {
  if (viewScope === 'partner' && partnerId != null && Number.isFinite(Number(partnerId))) {
    return Number(partnerId);
  }
  return myUserId;
}

function sharedPortionForUser(row, perspectiveUserId, sum) {
  const split = row.sharedSplit || { self_percentage: 50, partner_percentage: 50 };
  const selfPct = Number(split.self_percentage);
  const partnerPct = Number(split.partner_percentage);
  const owner = row.ownerUserId ?? row.owner_userid;
  const sharedWith = row.sharedWithUserId ?? row.shared_with_userid;
  if (perspectiveUserId != null && owner === perspectiveUserId) {
    return sum * (selfPct / 100);
  }
  if (perspectiveUserId != null && sharedWith != null && sharedWith === perspectiveUserId) {
    return sum * (partnerPct / 100);
  }
  return sum * (selfPct / 100);
}

/**
 * Line amount to show for an expense (or full sum for non-expense types).
 */
export function getExpenseLineAmount(row, viewScope, perspectiveUserId) {
  const typ = row?.type || 'expense';
  if (typ !== 'expense') {
    return Number(row?.sum) || 0;
  }
  const sum = Number(row?.sum) || 0;
  if (viewScope === 'household' || !row?.isShared) {
    return sum;
  }
  return sharedPortionForUser(row, perspectiveUserId, sum);
}

/**
 * @returns {'shared'|'mine'|'theirs'|null}
 */
export function getHouseholdExpenseKind(row, myUserId, partnerId) {
  const typ = row?.type || 'expense';
  if (typ !== 'expense') return null;
  if (row?.isShared) return 'shared';
  const owner = row.ownerUserId ?? row.owner_userid;
  if (owner === myUserId) return 'mine';
  if (partnerId != null && Number.isFinite(Number(partnerId)) && owner === Number(partnerId)) {
    return 'theirs';
  }
  return 'mine';
}

export function householdExpenseRowSx(kind) {
  if (kind === 'shared') {
    return {
      bgcolor: 'rgba(156, 39, 176, 0.09)',
      boxShadow: 'inset 4px 0 0 #9c27b0',
    };
  }
  if (kind === 'mine') {
    return {
      bgcolor: 'rgba(25, 118, 210, 0.07)',
      boxShadow: 'inset 4px 0 0 #1976d2',
    };
  }
  if (kind === 'theirs') {
    return {
      bgcolor: 'rgba(237, 108, 2, 0.08)',
      boxShadow: 'inset 4px 0 0 #ed6c02',
    };
  }
  return {};
}
