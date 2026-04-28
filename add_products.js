const mongoose = require('mongoose');
require('dotenv').config();
const Product = require('./models/Product');
const Category = require('./models/Category');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/jannat_rugs';

const carpetImages = [
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80',
  'https://images.unsplash.com/photo-1616627547584-bf28cee262db?w=1200&q=80',
  'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=1200&q=80',
  'https://images.unsplash.com/photo-1600166898405-da9535204843?w=1200&q=80',
  'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1200&q=80',
  'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=1200&q=80',
  'https://images.unsplash.com/photo-1590382352843-1bc2d8da0903?w=1200&q=80',
  'https://images.unsplash.com/photo-1534889156217-d643df14f14a?w=1200&q=80',
  'https://images.unsplash.com/photo-1575414003593-eeaae1db0816?w=1200&q=80',
  'https://images.unsplash.com/photo-1615529182904-14819c35db37?w=1200&q=80',
  'https://images.unsplash.com/photo-1628155243169-214e21a22be1?w=1200&q=80',
  'https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=1200&q=80',
  'https://images.unsplash.com/photo-1560185127-6a4593892f39?w=1200&q=80',
  'https://images.unsplash.com/photo-1579656335342-6de67468641a?w=1200&q=80',
  'https://images.unsplash.com/photo-1617103996702-96ff29b1c467?w=1200&q=80',
  'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200&q=80',
  'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=1200&q=80',
  'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=1200&q=80',
  'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&q=80',
  'https://images.unsplash.com/photo-1594026112284-02bb6f3352fe?w=1200&q=80'
];

const names = [
  'Royal Persian Handmade Rug', 'Kashmiri Silk Hand-Knotted', 'Mirzapur Heritage Handmade', 
  'Mughal Era Handwoven Carpet', 'Jaipur Floral Handmade', 'Bhadohi Authentic Wool Handmade', 
  'Tabriz Vintage Hand-Knotted', 'Agra Fine Silk Handmade', 'Oushak Artisan Handmade', 
  'Khorasan Antique Handmade'
];

async function addMore() {
  try {
    await mongoose.connect(MONGO_URI);
    const cats = await Category.find();
    if (cats.length === 0) { console.error('No categories found. Run seed first.'); process.exit(1); }

    const products = [];
    for (let i = 0; i < 10; i++) {
      const price = Math.floor(Math.random() * (300000 - 45000 + 1)) + 45000; // More expensive since they are handmade
      const discount = Math.random() > 0.5 ? Math.floor(price * 0.85) : 0;
      const name = names[i];
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now() + '-' + i;

      products.push({
        name,
        slug,
        description: `Authentic ${name} meticulously handcrafted by generational artisans in India. This 100% handmade carpet features incredibly dense knotting, vibrant organic dyes, and a legacy of unmatched craftsmanship. Perfect for luxury spaces.`,
        price,
        discountPrice: discount,
        category: cats[i % cats.length]._id,
        images: [carpetImages[i % carpetImages.length]],
        material: i % 2 === 0 ? 'Pure Fine Silk' : 'Premium Handspun Wool',
        type: 'Hand-Knotted',
        stock: Math.floor(Math.random() * 5) + 2,
        isFeatured: i < 10,
        isBestSeller: i % 4 === 0,
        isNewArrival: true,
        isLuxury: true
      });
    }

    await Product.insertMany(products);
    console.log('Successfully added 10 new authentic handmade carpets!');
    process.exit(0);
  } catch (error) {
    console.error('Error adding products:', error);
    process.exit(1);
  }
}

addMore();
