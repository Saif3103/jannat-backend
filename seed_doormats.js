const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product');
const Category = require('./models/Category');

dotenv.config();

const doormats = [
  { name: 'Handmade Woolen Lotus Doormat', price: 1200, discountPrice: 899, material: 'Pure Wool', colors: ['Pink', 'White'], tags: ['doormat', 'handmade', 'lotus'] },
  { name: 'Braided Jute Natural Doormat', price: 950, discountPrice: 650, material: 'Eco-friendly Jute', colors: ['Beige', 'Brown'], tags: ['jute', 'natural', 'eco'] },
  { name: 'Royal Persian Mini Doormat', price: 1500, discountPrice: 1100, material: 'Soft Silk & Wool', colors: ['Red', 'Gold'], tags: ['royal', 'persian', 'luxury'] },
  { name: 'Boho Chic Tasseled Doormat', price: 1100, discountPrice: 799, material: 'Cotton Blend', colors: ['Multi', 'Cream'], tags: ['boho', 'cotton', 'decor'] },
  { name: 'Geometric Pattern Modern Doormat', price: 1300, discountPrice: 950, material: 'Premium Wool', colors: ['Grey', 'Black'], tags: ['modern', 'geometric'] },
  { name: 'Hand-Tufted Floral Welcome Mat', price: 1400, discountPrice: 999, material: 'Hand-Tufted Wool', colors: ['Green', 'Blue'], tags: ['floral', 'welcome', 'tufted'] },
  { name: 'Vintage Heritage Small Doormat', price: 1800, discountPrice: 1350, material: 'Antique Silk', colors: ['Maroon', 'Beige'], tags: ['vintage', 'heritage', 'silk'] },
  { name: 'Textured Shaggy Comfort Doormat', price: 850, discountPrice: 599, material: 'High Pile Wool', colors: ['White', 'Grey'], tags: ['shaggy', 'soft', 'comfort'] },
  { name: 'Mandala Art Round Doormat', price: 1600, discountPrice: 1200, material: 'Hand-knotted Cotton', colors: ['Indigo', 'White'], tags: ['mandala', 'round', 'art'] },
  { name: 'Minimalist Zen Entrance Mat', price: 1050, discountPrice: 750, material: 'Natural Fibers', colors: ['Sand', 'Stone'], tags: ['minimalist', 'zen', 'entrance'] },
];

const seedDoormats = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to Database...');

    // 1. Create/Find Category
    let category = await Category.findOne({ name: 'Handmade Doormate' });
    if (!category) {
      category = await Category.create({
        name: 'Handmade Doormate',
        description: 'Premium collection of handmade doormats for your elegant entrance.',
        image: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800'
      });
      console.log('Category created!');
    }

    // Clean existing products for this category to avoid duplicates
    await Product.deleteMany({ category: category._id });
    console.log('Cleaned old doormats.');

    // 2. Add Products
    const productsToSave = doormats.map(d => ({
      ...d,
      slug: d.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      category: category._id,
      description: `A beautiful ${d.name} crafted with love by our master artisans. Perfect for adding a touch of luxury to your home entrance.`,
      stock: 50,
      isNewArrival: true,
      type: 'Handmade',
      images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800'] // Placeholder
    }));

    await Product.insertMany(productsToSave);
    console.log('10 Doormats added successfully!');
    
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seedDoormats();
