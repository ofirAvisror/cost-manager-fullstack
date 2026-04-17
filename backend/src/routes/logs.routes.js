const express = require('express');
const router = express.Router();
const logsController = require('../controllers/logs.controller');
const { logEndpointAccess } = require('../middleware/logging');

// Get logs
router.get('/api/logs', (req, res, next) => {
  logEndpointAccess('/api/logs', 'GET');
  next();
}, logsController.getLogs);

module.exports = router;

