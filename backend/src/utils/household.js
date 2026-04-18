/**
 * Costs use userid / owner_userid as the logical owner. Partner views use both IDs.
 */

const User = require('../models/User');

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

async function resolveHouseholdOwnerIds(userid) {
  const id = parseInt(userid, 10);
  if (!Number.isFinite(id)) return [];
  const user = await User.findOne({ id });
  const ids = householdOwnerIdsFromUser(user);
  return ids.length ? ids : [id];
}

module.exports = { householdOwnerIdsFromUser, resolveHouseholdOwnerIds };
