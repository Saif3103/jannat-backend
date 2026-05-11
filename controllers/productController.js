const Product = require('../models/Product');
const Category = require('../models/Category');

// @desc  Get all products with filtering
const getProducts = async (req, res) => {
  try {
    const { category, minPrice, maxPrice, size, color, type, sort, search, featured, bestSeller, newArrival, trending, luxury, page = 1, limit = 12 } = req.query;
    const query = {};

    if (category) query.category = category;
    if (type) query.type = type;
    if (featured === 'true') query.isFeatured = true;
    if (bestSeller === 'true') query.isBestSeller = true;
    if (newArrival === 'true') query.isNewArrival = true;
    if (trending === 'true') query.isTrending = true;
    if (luxury === 'true') query.isLuxury = true;
    if (minPrice || maxPrice) query.price = { ...(minPrice && { $gte: Number(minPrice) }), ...(maxPrice && { $lte: Number(maxPrice) }) };
    if (color) query.colors = { $in: [color] };
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }, { tags: { $in: [new RegExp(search, 'i')] } }];

    const sortOptions = { 'price-asc': { price: 1 }, 'price-desc': { price: -1 }, 'rating': { rating: -1 }, 'newest': { createdAt: -1 }, 'popular': { numReviews: -1 } };
    const sortBy = sortOptions[sort] || { createdAt: -1 };

    const skip = (Number(page) - 1) * Number(limit);
    const [products, total] = await Promise.all([
      Product.find(query).populate('category', 'name slug').sort(sortBy).skip(skip).limit(Number(limit)),
      Product.countDocuments(query)
    ]);

    res.json({ success: true, products, total, pages: Math.ceil(total / Number(limit)), page: Number(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get single product
const getProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ $or: [{ _id: req.params.id }, { slug: req.params.id }] }).populate('category', 'name slug');
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Create product (admin)
const createProduct = async (req, res) => {
  try {
    const { name, description, price, discountPrice, category, material, type, stock, tags, offerLabel, isFeatured, isBestSeller, isNewArrival, isTrending, isLuxury, colors, sizes } = req.body;
    const images = req.files ? req.files.map(f => f.path) : [];

    let sizesArr = [];
    if (typeof sizes === 'string') {
      try {
        const parsed = JSON.parse(sizes);
        if (Array.isArray(parsed)) sizesArr = parsed;
        else throw new Error();
      } catch {
        sizesArr = sizes.trim() ? sizes.split(',').map(s => s.trim()).filter(Boolean).map(s => ({ label: s })) : [];
      }
    } else if (Array.isArray(sizes)) {
      sizesArr = sizes;
    }

    const product = await Product.create({
      name, description, price, discountPrice, category, material, type, stock, offerLabel,
      isFeatured: isFeatured === 'true', isBestSeller: isBestSeller === 'true',
      isNewArrival: isNewArrival !== 'false', isTrending: isTrending === 'true', isLuxury: isLuxury === 'true',
      tags: typeof tags === 'string' && tags.trim() ? tags.split(',').map(s => s.trim()).filter(Boolean) : (Array.isArray(tags) ? tags : []),
      colors: typeof colors === 'string' && colors.trim() ? colors.split(',').map(s => s.trim()).filter(Boolean) : (Array.isArray(colors) ? colors : []),
      sizes: sizesArr,
      images,
      processingTime: req.body.processingTime || '1-2 weeks',
      originPostcode: req.body.originPostcode || '281001',
      returnPolicy: req.body.returnPolicy || '7 days',
      manufacturerInfo: req.body.manufacturerInfo || ''
    });

    res.status(201).json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Update product (admin)
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const updates = req.body;
    if (typeof updates.tags === 'string') updates.tags = updates.tags.trim() ? updates.tags.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (typeof updates.colors === 'string') updates.colors = updates.colors.trim() ? updates.colors.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (typeof updates.sizes === 'string') {
      try {
        const parsed = JSON.parse(updates.sizes);
        if (Array.isArray(parsed)) updates.sizes = parsed;
        else throw new Error();
      } catch {
        updates.sizes = updates.sizes.trim() ? updates.sizes.split(',').map(s => s.trim()).filter(Boolean).map(s => ({ label: s })) : [];
      }
    }
    if (req.files && req.files.length > 0) updates.images = req.files.map(f => f.path);

    Object.assign(product, updates);
    await product.save();
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Delete product (admin)
const deleteProduct = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Add review
const Order = require('../models/Order');

const addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    // Verify delivery
    const deliveredOrder = await Order.findOne({
      user: req.user._id,
      'orderItems.product': req.params.id,
      orderStatus: 'Delivered'
    });

    if (!deliveredOrder) {
      return res.status(403).json({ success: false, message: 'You can only review products that have been delivered to you' });
    }

    const alreadyReviewed = product.reviews.find(r => r.user.toString() === req.user._id.toString());
    if (alreadyReviewed) return res.status(400).json({ success: false, message: 'You have already reviewed this product' });

    const review = {
      user: req.user._id,
      name: req.user.name,
      avatar: req.user.avatar,
      rating: Number(rating),
      comment,
      video: '',
      images: []
    };

    if (req.files) {
      if (req.files.video) review.video = req.files.video[0].path;
      if (req.files.images) review.images = req.files.images.map(f => f.path);
    }

    product.reviews.push(review);
    product.numReviews = product.reviews.length;
    product.rating = product.reviews.reduce((a, r) => a + r.rating, 0) / product.reviews.length;
    await product.save();
    res.status(201).json({ success: true, message: 'Thank you for your valuable feedback!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get search suggestions
const getSearchSuggestions = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ success: true, suggestions: [] });
    const products = await Product.find({ name: { $regex: q, $options: 'i' } }).select('name images price').limit(8);
    res.json({ success: true, suggestions: products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getProducts, getProduct, createProduct, updateProduct, deleteProduct, addReview, getSearchSuggestions };
