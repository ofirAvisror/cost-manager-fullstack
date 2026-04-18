/**
 * Costs use userid / owner_userid as the logical owner. Partner views use both IDs.
 */

const User = require('../models/User');

const VIEW_SCOPES = ['household', 'self', 'partner'];

function normalizeViewScope(raw) {
  const s = String(raw || 'household').toLowerCase();
  if (VIEW_SCOPES.includes(s)) return s;
  return 'household';
}

function householdOwnerIdsFromUser(user) {
  if (!user || user.id == null) return [];
  const self = typeof user.id === 'number' ? user.id : parseInt(user.id, 10);
  if (user.partner_status === 'connected' && user.partner_id != null) {
    const partner =
      typeof user.partner_id === 'number' ? user.partner_id : parseInt(user.partner_id, 10);
    return [self, partner];
  }
  return [self];
}

/**
 * Which cost owner userids to include for list/report/analytics.
 * @param {import('../models/User')} user
 * @param {string} viewScope household | self | partner
 */
function ownerUserIdsForView(user, viewScope) {
  const scope = normalizeViewScope(viewScope);
  if (!user || user.id == null) return [];
  const self = typeof user.id === 'number' ? user.id : parseInt(user.id, 10);
  if (scope === 'self') return [self];
  if (scope === 'partner') {
    if (user.partner_status === 'connected' && user.partner_id != null) {
      const partner =
        typeof user.partner_id === 'number' ? user.partner_id : parseInt(user.partner_id, 10);
      return [partner];
    }
    return [self];
  }
  const both = householdOwnerIdsFromUser(user);
  return both.length ? both : [self];
}

async function resolveHouseholdOwnerIds(userid) {
  const id = parseInt(userid, 10);
  if (!Number.isFinite(id)) return [];
  const user = await User.findOne({ id });
  const ids = householdOwnerIdsFromUser(user);
  return ids.length ? ids : [id];
}

async function resolveOwnerIdsForView(userid, viewScope) {
  const id = parseInt(userid, 10);
  if (!Number.isFinite(id)) return [];
  const user = await User.findOne({ id });
  if (!user) return [id];
  const ids = ownerUserIdsForView(user, viewScope);
  return ids.length ? ids : [id];
}

/**
 * Mongo match for costs visible in viewScope. For self/partner, includes shared rows
 * where the focus user is shared_with_userid (owner userid may be the other person).
 * @param {import('../models/User')} user
 * @param {string} viewScope household | self | partner
 */
function costOwnerMatchForView(user, viewScope) {
  const scope = normalizeViewScope(viewScope);
  if (!user || user.id == null) return null;
  const self = typeof user.id === 'number' ? user.id : parseInt(user.id, 10);
  if (scope === 'household') {
    const ids = householdOwnerIdsFromUser(user);
    return { userid: { $in: ids.length ? ids : [self] } };
  }
  if (scope === 'self') {
    return {
      $or: [
        { userid: self },
        { is_shared: true, shared_with_userid: self },
      ],
    };
  }
  if (scope === 'partner') {
    const focusIds = ownerUserIdsForView(user, 'partner');
    const focus = focusIds[0] ?? self;
    return {
      $or: [
        { userid: focus },
        { is_shared: true, shared_with_userid: focus },
      ],
    };
  }
  return { userid: self };
}

module.exports = {
  householdOwnerIdsFromUser,
  resolveHouseholdOwnerIds,
  normalizeViewScope,
  ownerUserIdsForView,
  resolveOwnerIdsForView,
  costOwnerMatchForView,
};
