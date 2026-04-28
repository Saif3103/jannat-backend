const express = require('express');
const router = express.Router();
const { getCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');
const { protect, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', getCategories);
router.post('/', protect, adminOnly, upload.single('categoryImage'), createCategory);
router.put('/:id', protect, adminOnly, upload.single('categoryImage'), updateCategory);
router.delete('/:id', protect, adminOnly, deleteCategory);

module.exports = router;
