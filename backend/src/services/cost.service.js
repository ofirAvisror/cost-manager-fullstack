const Cost = require('../models/Cost');
const User = require('../models/User');
const { logger } = require('../config/logger');
const { computeNextOccurrence, processDueRecurringSchedules } = require('./recurring.service');

const EXPENSE_CATEGORIES = ['food', 'health', 'housing', 'sports', 'education'];
const INCOME_CATEGORIES = ['salary', 'freelance', 'investment', 'business', 'gift', 'other'];

/**
 * Create a new cost
 */
async function createCost(costData, userIdFromToken = null) {
  let {
    type,
    description,
    category,
    userid,
    owner_userid,
    paid_by_userid,
    is_shared,
    shared_with_userid,
    shared_split_mode,
    shared_split,
    sum,
    tags,
    recurring,
    created_at,
    currency,
    payment_method
  } = costData;
  
  const actorUserId = userIdFromToken || userid;
  if (!actorUserId) throw new Error('userid is required');

  const ownerUserId = parseInt(owner_userid || userid || actorUserId, 10);
  const paidByUserId = parseInt(paid_by_userid || actorUserId, 10);
  const isShared = is_shared === true || is_shared === 'true';

  const normalizedType = type.toLowerCase();
  const normalizedCategory = String(category).trim().toLowerCase();

  // Validate user exists
  const [actor, owner, payer] = await Promise.all([
    User.findOne({ id: parseInt(actorUserId, 10) }),
    User.findOne({ id: ownerUserId }),
    User.findOne({ id: paidByUserId }),
  ]);

  if (!actor || !owner || !payer) {
    throw new Error('User not found');
  }

  // Allow assigning owner only to self or connected partner.
  const canAssignToOwner =
    owner.id === actor.id ||
    (actor.partner_status === 'connected' && actor.partner_id === owner.id);
  if (!canAssignToOwner) {
    throw new Error('owner_userid must be self or connected partner');
  }

  // Validate payer belongs to same self/partner scope.
  const canUsePayer =
    payer.id === actor.id ||
    (actor.partner_status === 'connected' && actor.partner_id === payer.id);
  if (!canUsePayer) {
    throw new Error('paid_by_userid must be self or connected partner');
  }

  let sharedWithUserId = null;
  let splitMode = shared_split_mode || 'half_half';
  let splitData = { self_percentage: 50, partner_percentage: 50 };
  if (isShared) {
    if (actor.partner_status !== 'connected' || !actor.partner_id) {
      throw new Error('Shared expense requires a connected partner');
    }
    sharedWithUserId = parseInt(shared_with_userid || actor.partner_id, 10);
    if (sharedWithUserId !== actor.partner_id) {
      throw new Error('shared_with_userid must match connected partner');
    }
    if (!['half_half', 'manual'].includes(splitMode)) {
      throw new Error('shared_split_mode must be "half_half" or "manual"');
    }
    if (splitMode === 'manual') {
      const selfPercentage = Number(shared_split?.self_percentage);
      const partnerPercentage = Number(shared_split?.partner_percentage);
      if (
        Number.isNaN(selfPercentage) ||
        Number.isNaN(partnerPercentage) ||
        selfPercentage < 0 ||
        partnerPercentage < 0 ||
        Math.round((selfPercentage + partnerPercentage) * 100) !== 10000
      ) {
        throw new Error('Manual split must have self_percentage + partner_percentage = 100');
      }
      splitData = {
        self_percentage: selfPercentage,
        partner_percentage: partnerPercentage,
      };
    }
  }

  // Validate date if provided
  let costDate = new Date();
  if (created_at) {
    costDate = new Date(created_at);
    if (isNaN(costDate.getTime())) {
      throw new Error('created_at must be a valid date');
    }
    // Check if date is in the past
    const now = new Date();
    if (costDate < now) {
      throw new Error('Cannot add costs with dates in the past');
    }
  }

  // Recurring: only for expenses; stored on a separate schedule row (see below)
  let wantsRecurringSchedule = false;
  let scheduleFrequency = 'monthly';
  let scheduleNextDate = null;
  if (recurring) {
    if (typeof recurring === 'object' && recurring.enabled) {
      if (normalizedType !== 'expense') {
        throw new Error('Recurring schedules are only supported for expenses');
      }
      if (!recurring.frequency || !['daily', 'weekly', 'monthly', 'yearly'].includes(recurring.frequency.toLowerCase())) {
        throw new Error('recurring.frequency is required and must be one of: daily, weekly, monthly, yearly');
      }
      wantsRecurringSchedule = true;
      scheduleFrequency = recurring.frequency.toLowerCase();
      if (recurring.next_date) {
        scheduleNextDate = new Date(recurring.next_date);
        if (isNaN(scheduleNextDate.getTime())) {
          throw new Error('recurring.next_date must be a valid date');
        }
      }
    }
  }

  // Validate tags if provided
  let tagsArray = [];
  if (tags) {
    if (!Array.isArray(tags)) {
      throw new Error('tags must be an array of strings');
    }
    tagsArray = tags.filter(tag => typeof tag === 'string' && tag.trim().length > 0)
                   .map(tag => tag.trim());
  }

  // Create new cost
  const cost = new Cost({
    type: normalizedType,
    description: description.trim(),
    category: normalizedCategory,
    userid: ownerUserId, // backward compatibility
    owner_userid: ownerUserId,
    paid_by_userid: paidByUserId,
    is_shared: isShared,
    shared_with_userid: sharedWithUserId,
    shared_split_mode: splitMode,
    shared_split: splitData,
    sum,
    created_at: costDate,
    currency: currency || 'ILS',
    payment_method: normalizedType === 'expense' ? payment_method : undefined,
    tags: tagsArray,
    recurring: { enabled: false },
    schedule_only: false
  });

  await cost.save();
  logger.info(`Cost created: ${cost._id} (${normalizedType}) for user: ${ownerUserId}`);

  if (wantsRecurringSchedule) {
    const firstNext =
      scheduleNextDate && !isNaN(scheduleNextDate.getTime())
        ? scheduleNextDate
        : computeNextOccurrence(costDate, scheduleFrequency);
    const scheduleRow = new Cost({
      type: normalizedType,
      description: description.trim(),
      category: normalizedCategory,
      userid: ownerUserId,
      owner_userid: ownerUserId,
      paid_by_userid: paidByUserId,
      is_shared: isShared,
      shared_with_userid: sharedWithUserId,
      shared_split_mode: splitMode,
      shared_split: splitData,
      sum,
      created_at: costDate,
      currency: currency || 'ILS',
      payment_method: normalizedType === 'expense' ? payment_method : undefined,
      tags: tagsArray,
      schedule_only: true,
      recurring: {
        enabled: true,
        frequency: scheduleFrequency,
        next_date: firstNext,
      },
    });
    await scheduleRow.save();
    logger.info(`Recurring schedule created: ${scheduleRow._id} for user: ${ownerUserId}`);
  }

  try {
    await processDueRecurringSchedules();
  } catch (err) {
    logger.error({ err }, 'processDueRecurringSchedules after create failed');
  }

  return cost;
}

/**
 * Get costs with filters
 */
async function getCosts(filters = {}) {
  const {
    userid,
    userids,
    type,
    category,
    startDate,
    endDate,
    tags,
    recurring,
    limit,
    skip,
    schedulesOnly,
    includeSchedules
  } = filters;

  // Build query
  const query = {};

  // Required: userid or userids
  if (Array.isArray(userids) && userids.length > 0) {
    query.userid = { $in: userids.map((id) => parseInt(id, 10)) };
  } else if (userid) {
    query.userid = parseInt(userid, 10);
  } else {
    throw new Error('userid is required');
  }

  // Optional: type filter
  if (type) {
    const normalizedType = type.toLowerCase();
    if (!['income', 'expense'].includes(normalizedType)) {
      throw new Error('type must be either "income" or "expense"');
    }
    query.type = normalizedType;
  }

  // Optional: category filter
  if (category) {
    query.category = String(category).trim().toLowerCase();
  }

  // Optional: date range filter
  if (startDate || endDate) {
    query.created_at = {};
    if (startDate) {
      query.created_at.$gte = new Date(startDate);
    }
    if (endDate) {
      query.created_at.$lte = new Date(endDate);
    }
  }

  // Optional: tags filter
  if (tags && Array.isArray(tags) && tags.length > 0) {
    query.tags = { $in: tags.map(tag => tag.trim().toLowerCase()) };
  }

  // Optional: recurring filter
  if (recurring !== undefined) {
    if (recurring === 'true' || recurring === true) {
      query['recurring.enabled'] = true;
    } else if (recurring === 'false' || recurring === false) {
      query['recurring.enabled'] = false;
    }
  }

  if (schedulesOnly === true || schedulesOnly === 'true') {
    query.schedule_only = true;
  } else if (!(includeSchedules === true || includeSchedules === 'true')) {
    query.schedule_only = { $ne: true };
  }

  // Build query options
  const options = {
    sort: { created_at: -1 } // Most recent first
  };

  if (limit) {
    options.limit = parseInt(limit);
  }
  if (skip) {
    options.skip = parseInt(skip);
  }

  const costs = await Cost.find(query, null, options);
  logger.info(`Retrieved ${costs.length} costs`);

  return costs;
}

/**
 * Get cost by ID
 */
async function getCostById(id) {
  if (!id) {
    throw new Error('Cost ID is required');
  }

  const cost = await Cost.findById(id);
  if (!cost) {
    throw new Error('Cost not found');
  }

  logger.info(`Retrieved cost: ${id}`);
  return cost;
}

/**
 * Delete a recurring schedule template (schedule_only). Regular costs cannot be removed here.
 */
async function deleteScheduleCost(id, actorUserId) {
  if (!id) throw new Error('Cost ID is required');
  const cost = await Cost.findById(id);
  if (!cost) throw new Error('Cost not found');
  if (!cost.schedule_only) {
    throw new Error('Only recurring schedule templates can be deleted with this action');
  }
  const actorId = parseInt(actorUserId, 10);
  if (cost.owner_userid !== actorId) {
    throw new Error('Not allowed to delete this schedule');
  }
  await Cost.findByIdAndDelete(id);
  logger.info(`Recurring schedule deleted: ${id} by user ${actorId}`);
}

module.exports = {
  createCost,
  getCosts,
  getCostById,
  deleteScheduleCost,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES
};



