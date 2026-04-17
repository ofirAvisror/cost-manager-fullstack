const express = require('express');
const router = express.Router();
const categoriesController = require('../controllers/categories.controller');

router.get('/api/categories', categoriesController.getCategories);
router.post('/api/categories', categoriesController.addCategory);
router.put('/api/categories/:id', categoriesController.updateCategory);
router.delete('/api/categories/:id', categoriesController.deleteCategory);

module.exports = router;
