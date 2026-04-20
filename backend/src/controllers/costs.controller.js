const costService = require('../services/cost.service');
const { validateCostType, validateCostCategoryLabel, validateDate, validatePositiveNumber } = require('../utils/validators');
const { logger } = require('../config/logger');
const User = require('../models/User');
const { normalizeViewScope, ownerUserIdsForView } = require('../utils/household');

/**
 * Create a new cost
 */
async function createCost(req, res) {
  try {
    const {
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
    } = req.body;

    // Validate required fields
    if (!type || !description || !category || sum === undefined) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'Missing required fields: type, description, category, and sum are required' 
      });
    }

    // Validate type
    if (!validateCostType(type)) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'Invalid type. Must be either "income" or "expense"' 
      });
    }

    if (!validateCostCategoryLabel(category)) {
      return res.status(400).json({
        id: 'VALIDATION_ERROR',
        message: 'category must be a non-empty string (max 64 characters)',
      });
    }

    // Validate sum
    if (!validatePositiveNumber(sum)) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'sum must be a positive number' 
      });
    }

    // Validate payment_method only for expenses
    if (type.toLowerCase() === 'income' && payment_method) {
      return res.status(400).json({ 
        id: 'VALIDATION_ERROR',
        message: 'payment_method is only allowed for expense costs' 
      });
    }

    const cost = await costService.createCost(
      {
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
      },
      req.user?.id
    );
    res.status(201).json(cost);
  } catch (error) {
    logger.error('Error creating cost:', error.message);
    
    if (error.message === 'User not found') {
      return res.status(404).json({ 
        id: 'NOT_FOUND',
        message: error.message 
      });
    }
    
    if (error.code === 11000) {
      return res.status(409).json({ 
        id: 'DUPLICATE_ERROR',
        message: 'Cost already exists' 
      });
    }

    res.status(400).json({ 
      id: 'VALIDATION_ERROR',
      message: error.message 
    });
  }
}

/**
 * Get costs with filters
 */
async function getCosts(req, res) {
  try {
    // Support both userId and userid query parameters
    const {
      userId,
      userid,
      type,
      category,
      startDate,
      endDate,
      tags,
      recurring,
      limit,
      skip,
      includePartner,
      includeSchedules,
      schedulesOnly,
    } = req.query;
    
    // If user is authenticated, use their userid from token
    const userIdToUse = req.user?.id || userId || userid;
    
    if (!userIdToUse) {
      return res.status(400).json({
        id: 'VALIDATION_ERROR',
        message: 'userid is required (or use authentication token)'
      });
    }

    const hasExplicitScope = req.query.viewScope !== undefined && req.query.viewScope !== '';
    let viewScope = hasExplicitScope
      ? normalizeViewScope(req.query.viewScope)
      : (includePartner === 'true' || includePartner === true ? 'household' : 'self');

    let userIdsToUse;
    let userForScope = null;
    if (req.user?.id) {
      const me = await User.findOne({ id: req.user.id });
      if (!me) {
        return res.status(401).json({
          id: 'UNAUTHORIZED',
          message: 'User not found',
        });
      }
      userForScope = me;
      userIdsToUse = ownerUserIdsForView(me, viewScope);
    } else {
      const uid = parseInt(userIdToUse, 10);
      const u = await User.findOne({ id: uid });
      userIdsToUse = u ? ownerUserIdsForView(u, viewScope) : [uid];
      userForScope = u || null;
    }
    
    const costs = await costService.getCosts({
      userid: userIdToUse,
      userids: userIdsToUse,
      viewScope,
      userForScope,
      type,
      category,
      startDate,
      endDate,
      tags: tags ? tags.split(',') : undefined,
      recurring,
      limit,
      skip,
      includeSchedules,
      schedulesOnly,
    });
    
    res.status(200).json(costs);
  } catch (error) {
    logger.error('Error fetching costs:', error.message);
    res.status(500).json({
      id: 'SERVER_ERROR',
      message: error.message
    });
  }
}

/**
 * Get cost by ID
 */
/**
 * Run recurring materialization (safe to call often).
 */
async function processRecurring(req, res) {
  try {
    const { processDueRecurringSchedules } = require('../services/recurring.service');
    const result = await processDueRecurringSchedules();
    res.status(200).json(result);
  } catch (error) {
    logger.error('Error processing recurring:', error.message);
    res.status(500).json({
      id: 'SERVER_ERROR',
      message: error.message,
    });
  }
}

/**
 * Delete a recurring schedule template
 */
async function deleteSchedule(req, res) {
  try {
    const { id } = req.params;
    await costService.deleteScheduleCost(id, req.user.id);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting schedule:', error.message);
    if (error.message === 'Cost not found') {
      return res.status(404).json({ id: 'NOT_FOUND', message: error.message });
    }
    if (
      error.message === 'Not allowed to delete this schedule' ||
      error.message.startsWith('Only recurring schedule')
    ) {
      return res.status(403).json({ id: 'FORBIDDEN', message: error.message });
    }
    res.status(400).json({ id: 'VALIDATION_ERROR', message: error.message });
  }
}

async function getCostById(req, res) {
  try {
    const { id } = req.params;
    const cost = await costService.getCostById(id);
    res.status(200).json(cost);
  } catch (error) {
    logger.error('Error fetching cost:', error.message);
    
    if (error.message === 'Cost not found') {
      return res.status(404).json({
        id: 'NOT_FOUND',
        message: error.message
      });
    }
    
    res.status(500).json({
      id: 'SERVER_ERROR',
      message: error.message
    });
  }
}

/**
 * Update an existing cost (non-recurring-template).
 */
async function updateCost(req, res) {
  try {
    const { id } = req.params;
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const updates = {};

    if (body.description !== undefined) updates.description = body.description;
    if (body.category !== undefined) {
      if (!validateCostCategoryLabel(body.category)) {
        return res.status(400).json({
          id: 'VALIDATION_ERROR',
          message: 'category must be a non-empty string (max 64 characters)',
        });
      }
      updates.category = body.category;
    }
    if (body.sum !== undefined) {
      const s = typeof body.sum === 'string' ? parseFloat(body.sum) : body.sum;
      if (!validatePositiveNumber(s) || s <= 0) {
        return res.status(400).json({
          id: 'VALIDATION_ERROR',
          message: 'sum must be a positive number',
        });
      }
      updates.sum = s;
    }
    if (body.currency !== undefined) updates.currency = body.currency;
    if (body.created_at !== undefined) {
      if (!validateDate(body.created_at)) {
        return res.status(400).json({
          id: 'VALIDATION_ERROR',
          message: 'created_at must be a valid date',
        });
      }
      updates.created_at = body.created_at;
    }
    if (body.type !== undefined) {
      if (!validateCostType(body.type)) {
        return res.status(400).json({
          id: 'VALIDATION_ERROR',
          message: 'Invalid type. Must be either "income" or "expense"',
        });
      }
      updates.type = body.type;
    }
    if (body.payment_method !== undefined) {
      updates.payment_method = body.payment_method;
    }
    if (body.tags !== undefined) {
      updates.tags = body.tags;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        id: 'VALIDATION_ERROR',
        message: 'No updatable fields provided',
      });
    }

    if (
      body.type !== undefined &&
      String(body.type).toLowerCase() === 'income' &&
      body.payment_method !== undefined
    ) {
      return res.status(400).json({
        id: 'VALIDATION_ERROR',
        message: 'payment_method is only allowed for expense costs',
      });
    }

    const cost = await costService.updateCost(id, updates, req.user.id);
    res.status(200).json(cost);
  } catch (error) {
    logger.error('Error updating cost:', error.message);
    if (error.message === 'Cost not found') {
      return res.status(404).json({ id: 'NOT_FOUND', message: error.message });
    }
    if (error.message === 'Not allowed to edit this cost') {
      return res.status(403).json({ id: 'FORBIDDEN', message: error.message });
    }
    if (error.message.startsWith('Cannot edit recurring')) {
      return res.status(403).json({ id: 'FORBIDDEN', message: error.message });
    }
    res.status(400).json({ id: 'VALIDATION_ERROR', message: error.message });
  }
}

/**
 * Delete an existing cost (non-recurring-template).
 */
async function deleteCost(req, res) {
  try {
    const { id } = req.params;
    await costService.deleteCost(id, req.user.id);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting cost:', error.message);
    if (error.message === 'Cost not found') {
      return res.status(404).json({ id: 'NOT_FOUND', message: error.message });
    }
    if (
      error.message === 'Not allowed to delete this cost' ||
      error.message.startsWith('Use the recurring schedule')
    ) {
      return res.status(403).json({ id: 'FORBIDDEN', message: error.message });
    }
    res.status(400).json({ id: 'VALIDATION_ERROR', message: error.message });
  }
}

module.exports = {
  createCost,
  getCosts,
  getCostById,
  updateCost,
  deleteCost,
  processRecurring,
  deleteSchedule,
};



