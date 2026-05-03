const express = require('express');
const router = express.Router();
const { getProducts, getProduct, createProduct, updateProduct, deleteProduct, addReview, getSearchSuggestions } = require('../controllers/productController');
const { protect, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', getProducts);
router.get('/suggestions', getSearchSuggestions);
router.get('/:id', getProduct);
router.post('/', protect, adminOnly, upload.array('images', 50), createProduct);
router.put('/:id', protect, adminOnly, upload.array('images', 50), updateProduct);
router.delete('/:id', protect, adminOnly, deleteProduct);
router.post('/:id/review', protect, upload.fields([{ name: 'video', maxCount: 1 }, { name: 'images', maxCount: 5 }]), addReview);

module.exports = router;
