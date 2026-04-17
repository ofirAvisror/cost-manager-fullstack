const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users.controller');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const { logEndpointAccess } = require('../middleware/logging');

// Register new user
router.post('/api/register', (req, res, next) => {
  logEndpointAccess('/api/register', 'POST', req.body?.id);
  next();
}, authController.register);

// Login
router.post('/api/login', (req, res, next) => {
  logEndpointAccess('/api/login', 'POST');
  next();
}, authController.login);

// Create user (backward compatibility)
router.post('/api/add', (req, res, next) => {
  logEndpointAccess('/api/add', 'POST', req.body?.id);
  next();
}, usersController.createUser);

// Get all users
router.get('/api/users', (req, res, next) => {
  logEndpointAccess('/api/users', 'GET');
  next();
}, usersController.getAllUsers);

// Get current user (authenticated)
router.get('/api/users/me', authenticate, (req, res, next) => {
  logEndpointAccess('/api/users/me', 'GET', req.user?.id);
  next();
}, usersController.getCurrentUser);

// Get user by ID
router.get('/api/users/:id', (req, res, next) => {
  logEndpointAccess('/api/users/:id', 'GET', req.params.id);
  next();
}, usersController.getUserById);

module.exports = router;



