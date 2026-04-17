const express = require('express');
const router = express.Router();
const partnersController = require('../controllers/partners.controller');
const { authenticate } = require('../middleware/auth');

router.post('/api/partners/request', authenticate, partnersController.requestPartner);
router.post('/api/partners/respond', authenticate, partnersController.respondPartner);
router.get('/api/partners/status', authenticate, partnersController.getPartnerStatus);

module.exports = router;
