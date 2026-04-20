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
  const me = Number(myUserId);
  return Number.isFinite(me) ? me : myUserId;
}

function numUserId(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function sharedPortionForUser(row, perspectiveUserId, sum) {
  const split = row.sharedSplit || { self_percentage: 50, partner_percentage: 50 };
  const selfPct = Number(split.self_percentage);
  const partnerPct = Number(split.partner_percentage);
  const owner = numUserId(row.ownerUserId ?? row.owner_userid);
  const sharedWith = numUserId(row.sharedWithUserId ?? row.shared_with_userid);
  const perspective = numUserId(perspectiveUserId);
  if (perspective != null && owner != null && owner === perspective) {
    return sum * (selfPct / 100);
  }
  if (perspective != null && sharedWith != null && sharedWith === perspective) {
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
  const isShared = !!(row?.isShared ?? row?.is_shared);
  if (viewScope === 'household' || !isShared) {
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
  if (row?.isShared ?? row?.is_shared) return 'shared';
  const owner = numUserId(row.ownerUserId ?? row.owner_userid);
  const me = numUserId(myUserId);
  const pid = numUserId(partnerId);
  if (owner != null && me != null && owner === me) return 'mine';
  if (owner != null && pid != null && owner === pid) {
    return 'theirs';
  }
  return 'mine';
}

/**
 * Whether the signed-in user may edit or delete this cost (matches backend rules).
 */
export function canUserMutateCost(cost, myUserId) {
  if (!cost || cost.scheduleOnly) return false;
  const me = numUserId(myUserId);
  if (me == null) return false;
  const owner = numUserId(cost.ownerUserId ?? cost.owner_userid);
  if (owner != null && owner === me) return true;
  const sharedWith = numUserId(cost.sharedWithUserId ?? cost.shared_with_userid);
  if (cost.isShared ?? cost.is_shared) {
    if (sharedWith != null && sharedWith === me) return true;
  }
  return false;
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
