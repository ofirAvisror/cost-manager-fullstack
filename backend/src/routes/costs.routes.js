const express = require('express');
const router = express.Router();
const costsController = require('../controllers/costs.controller');
const { optionalAuth, authenticate } = require('../middleware/auth');
const { logEndpointAccess } = require('../middleware/logging');

// Get costs with filters
router.get('/api/costs', optionalAuth, (req, res, next) => {
  logEndpointAccess('/api/costs', 'GET', req.user?.id || req.query?.userId || req.query?.userid);
  next();
}, costsController.getCosts);

// Delete recurring schedule template (before /:id)
router.delete('/api/costs/schedules/:id', authenticate, (req, res, next) => {
  logEndpointAccess(`/api/costs/schedules/${req.params.id}`, 'DELETE', req.user?.id);
  next();
}, costsController.deleteSchedule);

// Get cost by ID
router.get('/api/costs/:id', optionalAuth, (req, res, next) => {
  logEndpointAccess(`/api/costs/${req.params.id}`, 'GET', req.user?.id);
  next();
}, costsController.getCostById);

// Create cost
router.post('/api/add', authenticate, (req, res, next) => {
  logEndpointAccess('/api/add', 'POST', req.user?.id || req.body?.userid);
  next();
}, costsController.createCost);

// Materialize due recurring expenses (idempotent)
router.post('/api/recurring/process', authenticate, (req, res, next) => {
  logEndpointAccess('/api/recurring/process', 'POST', req.user?.id);
  next();
}, costsController.processRecurring);

module.exports = router;



