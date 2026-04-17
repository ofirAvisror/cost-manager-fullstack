const express = require('express');
const router = express.Router();
const budgetsController = require('../controllers/budgets.controller');
const { logEndpointAccess } = require('../middleware/logging');

// Create budget
router.post('/api/budgets', (req, res, next) => {
  logEndpointAccess('/api/budgets', 'POST', req.body?.userid);
  next();
}, budgetsController.createBudget);

// Get budgets
router.get('/api/budgets', (req, res, next) => {
  logEndpointAccess('/api/budgets', 'GET', req.query?.userid);
  next();
}, budgetsController.getBudgets);

// Update budget
router.put('/api/budgets/:id', (req, res, next) => {
  logEndpointAccess('/api/budgets/:id', 'PUT', req.params.id);
  next();
}, budgetsController.updateBudget);

// Delete budget
router.delete('/api/budgets/:id', (req, res, next) => {
  logEndpointAccess('/api/budgets/:id', 'DELETE', req.params.id);
  next();
}, budgetsController.deleteBudget);

// Get budget status
router.get('/api/budgets/status', (req, res, next) => {
  logEndpointAccess('/api/budgets/status', 'GET', req.query?.userid);
  next();
}, budgetsController.getBudgetStatus);

module.exports = router;



