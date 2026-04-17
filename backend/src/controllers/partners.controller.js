const partnerService = require('../services/partner.service');
const { logger } = require('../config/logger');

async function requestPartner(req, res) {
  try {
    const { partner_email } = req.body;
    if (!partner_email) {
      return res.status(400).json({
        id: 'VALIDATION_ERROR',
        message: 'partner_email is required',
      });
    }

    const result = await partnerService.requestPartner(req.user.id, partner_email);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Error requesting partner:', error.message);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ id: 'VALIDATION_ERROR', message: error.message });
  }
}

async function respondPartner(req, res) {
  try {
    const { action } = req.body;
    const result = await partnerService.respondToPartnerRequest(req.user.id, action);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Error responding to partner request:', error.message);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ id: 'VALIDATION_ERROR', message: error.message });
  }
}

async function getPartnerStatus(req, res) {
  try {
    const result = await partnerService.getPartnerStatus(req.user.id);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Error getting partner status:', error.message);
    res.status(500).json({ id: 'SERVER_ERROR', message: error.message });
  }
}

module.exports = {
  requestPartner,
  respondPartner,
  getPartnerStatus,
};
