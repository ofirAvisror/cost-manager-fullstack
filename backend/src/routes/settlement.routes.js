const express = require('express');
const router = express.Router();
const settlementController = require('../controllers/settlement.controller');
const { authenticate } = require('../middleware/auth');

router.get('/api/settlement/monthly', authenticate, settlementController.getMonthlySettlement);

module.exports = router;
