const settlementService = require('../services/settlement.service');
const { logger } = require('../config/logger');

async function getMonthlySettlement(req, res) {
  try {
    const { year, month } = req.query;
    if (!year || !month) {
      return res.status(400).json({
        id: 'VALIDATION_ERROR',
        message: 'year and month query params are required',
      });
    }

    const result = await settlementService.getMonthlySettlement(req.user.id, year, month);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Error calculating monthly settlement:', error.message);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ id: 'VALIDATION_ERROR', message: error.message });
  }
}

module.exports = {
  getMonthlySettlement,
};
