const Category = require('../models/Category');

async function getCategories(userid) {
  return Category.find({ userid: parseInt(userid, 10) }).sort({ name: 1 });
}

async function addCategory(payload) {
  const category = new Category({
    userid: parseInt(payload.userid, 10),
    name: payload.name,
    color: payload.color || '#6366f1',
  });
  await category.save();
  return category;
}

async function updateCategory(id, payload) {
  const update = {};
  if (payload.name !== undefined) update.name = payload.name;
  if (payload.color !== undefined) update.color = payload.color;

  const category = await Category.findByIdAndUpdate(id, update, { new: true, runValidators: true });
  if (!category) throw new Error('Category not found');
  return category;
}

async function deleteCategory(id) {
  const category = await Category.findByIdAndDelete(id);
  if (!category) throw new Error('Category not found');
}

module.exports = {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
};
