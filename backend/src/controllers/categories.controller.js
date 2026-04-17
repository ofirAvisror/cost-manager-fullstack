const categoryService = require('../services/category.service');
const { logger } = require('../config/logger');

async function getCategories(req, res) {
  try {
    const { userid } = req.query;
    if (!userid) {
      return res.status(400).json({
        id: 'VALIDATION_ERROR',
        message: 'userid query parameter is required',
      });
    }

    const categories = await categoryService.getCategories(userid);
    res.json(categories);
  } catch (error) {
    logger.error('Error getting categories:', error.message);
    res.status(500).json({ id: 'SERVER_ERROR', message: error.message });
  }
}

async function addCategory(req, res) {
  try {
    const { userid, name } = req.body;
    if (!userid || !name) {
      return res.status(400).json({
        id: 'VALIDATION_ERROR',
        message: 'userid and name are required',
      });
    }

    const category = await categoryService.addCategory(req.body);
    res.status(201).json(category);
  } catch (error) {
    logger.error('Error adding category:', error.message);
    if (error.code === 11000) {
      return res.status(409).json({ id: 'DUPLICATE_ERROR', message: 'Category already exists' });
    }
    res.status(500).json({ id: 'SERVER_ERROR', message: error.message });
  }
}

async function updateCategory(req, res) {
  try {
    const category = await categoryService.updateCategory(req.params.id, req.body);
    res.json(category);
  } catch (error) {
    logger.error('Error updating category:', error.message);
    if (error.message === 'Category not found') {
      return res.status(404).json({ id: 'NOT_FOUND', message: error.message });
    }
    res.status(500).json({ id: 'SERVER_ERROR', message: error.message });
  }
}

async function deleteCategory(req, res) {
  try {
    await categoryService.deleteCategory(req.params.id);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting category:', error.message);
    if (error.message === 'Category not found') {
      return res.status(404).json({ id: 'NOT_FOUND', message: error.message });
    }
    res.status(500).json({ id: 'SERVER_ERROR', message: error.message });
  }
}

module.exports = {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
};
