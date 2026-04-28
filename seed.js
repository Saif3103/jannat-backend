const mongoose = require('mongoose');
require('dotenv').config();
const Product = require('./models/Product');
const Category = require('./models/Category');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/jannat_rugs';

const categoriesData = [
  { name: 'Persian Rugs', slug: 'persian-rugs', description: 'Authentic handcrafted Persian carpets', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80' },
  { name: 'Modern Collection', slug: 'modern-collection', description: 'Contemporary luxury designs', image: 'https://images.unsplash.com/photo-1616627547584-bf28cee262db?w=800&q=80' },
  { name: 'Turkish Kilims', slug: 'turkish-kilims', description: 'Traditional flat-woven carpets', image: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&q=80' }
];

const images = [
  'https://images.unsplash.com/photo-1600166898405-da9535204843?w=800&q=80',
  'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
  'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=800&q=80',
  'https://images.unsplash.com/photo-1590382352843-1bc2d8da0903?w=800&q=80',
  'https://plus.unsplash.com/premium_photo-1673548917296-6d601b0986de?w=800&q=80',
  'https://images.unsplash.com/photo-1534889156217-d643df14f14a?w=800&q=80',
  'https://images.unsplash.com/photo-1575414003593-eeaae1db0816?w=800&q=80',
  'https://images.unsplash.com/photo-1615529182904-14819c35db37?w=800&q=80'
];

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected!');

    console.log('Clearing old data...');
    await Product.deleteMany({});
    await Category.deleteMany({});

    console.log('Creating categories...');
    const createdCats = await Category.insertMany(categoriesData);

    const products = [];
    const names = [
      'Royal Kashan Silk Rug', 'Tabriz Masterpiece', 'Modern Abstract Tufted',
      'Heriz Geometric', 'Oushak Vintage Blend', 'Isfahan Wool Classic',
      'Bespoke Gold Trim', 'Minimalist Beige Handwoven', 'Afghan Red Bukhara',
      'Contemporary Grey Splash', 'Traditional Nain Silk', 'Mamluk Blue Diamond',
      'Kerman Floral Medallion', 'Bohemian Tribal Kilim', 'Nordic Ivory Shag'
    ];

    for (let i = 0; i < 15; i++) {
      const cat = createdCats[i % createdCats.length]._id;
      const price = Math.floor(Math.random() * (150000 - 20000 + 1)) + 20000;
      const discount = Math.random() > 0.6 ? Math.floor(price * 0.8) : price;
      
      const name = names[i];
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + i;
      
      products.push({
        name: name,
        slug: slug,
        description: `Experience the luxury of ${name}. Hand-knotted by expert artisans over 4 months using pure wool and silk highlights. This exquisite piece adds unmatched elegance and warmth to any space.`,
        price: price,
        discountPrice: discount,
        category: cat,
        images: [images[i % images.length]],
        material: i % 2 === 0 ? 'Wool & Silk' : '100% Wool',
        type: i % 3 === 0 ? 'Modern' : 'Hand-Knotted',
        stock: Math.floor(Math.random() * 10) + 1,
        isFeatured: i < 8,
        isBestSeller: i % 3 === 0,
        isNewArrival: i % 2 === 0,
      });
    }

    console.log('Inserting 15 products...');
    await Product.insertMany(products);

    console.log('Seed successful! Added 15 carpets.');
    process.exit(0);
  } catch (error) {
    console.error('Seed Error:', error);
    process.exit(1);
  }
}

seed();
