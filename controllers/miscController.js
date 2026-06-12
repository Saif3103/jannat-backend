const Contact = require('../models/Contact');
const Offer = require('../models/Offer');
const Settings = require('../models/Settings');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');

// Contact
const submitContact = async (req, res) => {
  try {
    const contact = await Contact.create(req.body);
    res.status(201).json({ success: true, message: 'Message sent successfully!', contact });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getContacts = async (req, res) => {
  try {
    const contacts = await Contact.find().sort('-createdAt');
    res.json({ success: true, contacts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Offers
const getOffers = async (req, res) => {
  try {
    const offers = await Offer.find({ isActive: true, validUntil: { $gte: new Date() } }).sort('-createdAt');
    res.json({ success: true, offers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAllOffers = async (req, res) => {
  try {
    const offers = await Offer.find().sort('-createdAt');
    res.json({ success: true, offers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createOffer = async (req, res) => {
  try {
    const offer = await Offer.create({ ...req.body, image: req.file ? req.file.path : '' });
    res.status(201).json({ success: true, offer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateOffer = async (req, res) => {
  try {
    const offer = await Offer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, offer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteOffer = async (req, res) => {
  try {
    await Offer.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Offer deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Settings
const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create({});
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) settings = new Settings();

    // Convert upload.any() array to an object matching upload.fields structure
    if (req.files && Array.isArray(req.files)) {
      const filesObj = {};
      req.files.forEach(f => {
        if (!filesObj[f.fieldname]) filesObj[f.fieldname] = [];
        filesObj[f.fieldname].push(f);
      });
      req.files = filesObj;
    }
    
    const updates = req.body;
    if (updates.socialLinks) updates.socialLinks = typeof updates.socialLinks === 'string' ? JSON.parse(updates.socialLinks) : updates.socialLinks;
    if (updates.chatbotFaqs) updates.chatbotFaqs = typeof updates.chatbotFaqs === 'string' ? JSON.parse(updates.chatbotFaqs) : updates.chatbotFaqs;
    if (updates.testimonials) updates.testimonials = typeof updates.testimonials === 'string' ? JSON.parse(updates.testimonials) : updates.testimonials;
    
    if (req.files) {
      if (req.files.logo) settings.logo = req.files.logo[0].path;
      if (req.files.favicon) settings.favicon = req.files.favicon[0].path;
      if (req.files.profileImage) settings.profileImage = req.files.profileImage[0].path;
      if (req.files.founderImage) settings.founderImage = req.files.founderImage[0].path;
      if (req.files.coFounderImage) settings.coFounderImage = req.files.coFounderImage[0].path;
      if (req.files.sahanaImage) settings.sahanaImage = req.files.sahanaImage[0].path;
      if (req.files.saifImage) settings.saifImage = req.files.saifImage[0].path;
      if (req.files.video) settings.heroVideo = req.files.video[0].path;
      if (req.files.heroVideo) settings.heroVideo = req.files.heroVideo[0].path;
      if (req.files.adVideo) settings.adVideo = req.files.adVideo[0].path;
      if (req.files.bannerImages) updates.bannerImages = req.files.bannerImages.map(f => f.path);
    }
    
    // Ensure we don't accidentally overwrite images with empty strings from req.body
    const fileFields = ['logo', 'favicon', 'profileImage', 'founderImage', 'coFounderImage', 'sahanaImage', 'saifImage', 'video', 'heroVideo', 'adVideo'];
    fileFields.forEach(f => delete updates[f]);

    Object.assign(settings, updates);
    await settings.save();
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const subscribeNewsletter = async (req, res) => {
  try {
    const { email } = req.body;
    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create({});
    if (!settings.newsletter.includes(email)) {
      settings.newsletter.push(email);
      await settings.save();
    }
    res.json({ success: true, message: 'Subscribed to newsletter!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Analytics
const getAnalytics = async (req, res) => {
  try {
    const [totalProducts, totalOrders, totalUsers, revenue, recentOrders, topProducts] = await Promise.all([
      Product.countDocuments(),
      Order.countDocuments(),
      User.countDocuments({ role: 'user' }),
      Order.aggregate([{ $group: { _id: null, total: { $sum: '$totalPrice' } } }]),
      Order.find().populate('user', 'name email').sort('-createdAt').limit(5),
      Product.find().sort('-numReviews').limit(5).select('name images price rating numReviews')
    ]);

    const ordersByStatus = await Order.aggregate([{ $group: { _id: '$orderStatus', count: { $sum: 1 } } }]);
    const monthlyRevenue = await Order.aggregate([
      { $group: { _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }, total: { $sum: '$totalPrice' }, count: { $sum: 1 } } },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 6 }
    ]);

    res.json({
      success: true,
      analytics: {
        totalProducts, totalOrders, totalUsers,
        totalRevenue: revenue[0]?.total || 0,
        ordersByStatus, monthlyRevenue, recentOrders, topProducts
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Chatbot
// Get recent video reviews for homepage
const getRecentVideoReviews = async (req, res) => {
  try {
    const products = await Product.find({ 'reviews.video': { $ne: '' } }).select('name reviews');
    let videoReviews = [];
    products.forEach(p => {
      p.reviews.forEach(r => {
        if (r.video) videoReviews.push({ ...r._doc, productName: p.name, productId: p._id });
      });
    });
    videoReviews.sort((a, b) => b.createdAt - a.createdAt);
    res.json({ success: true, reviews: videoReviews.slice(0, 10) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const chatbotQuery = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.json({ success: true, reply: 'Hello! How can I help you today?' });
    
    console.log('Chatbot query received:', message);
    const settings = await Settings.findOne();
    const faqs = settings?.chatbotFaqs || [];
    
    const msg = message.toLowerCase();
    
    // Check FAQs
    const faq = faqs.find(f => msg.includes(f.question.toLowerCase().split(' ').slice(0, 3).join(' ')));
    if (faq) {
      console.log('Found FAQ match:', faq.question);
      return res.json({ success: true, reply: faq.answer });
    }

    // Smart responses (Strictly English)
    let reply = '';
    if (msg.includes('price') || msg.includes('cost') || msg.includes('rate') || msg.includes('daam') || msg.includes('expensive')) {
      reply = "Our masterpieces are an investment in art, ranging from ₹2,000 for boutique pieces to ₹2,50,000 for our most exclusive hand-knotted silk collections. Each price reflects the months of labor and premium materials used.";
    } else if (msg.includes('size') || msg.includes('dimension') || msg.includes('feet') || msg.includes('bada') || msg.includes('chota')) {
      reply = "We offer a wide range of standard sizes including 2x3, 4x6, 5x7, 6x9, 8x10, and 9x12 feet. We also specialize in bespoke sizes tailored perfectly to your architecture.";
    } else if (msg.includes('material') || msg.includes('wool') || msg.includes('silk') || msg.includes('jute') || msg.includes('cotton')) {
      reply = "We use only the finest natural fibers: high-altitude hand-spun wool for durability and pure mulberry silk for a celestial sheen. All our materials are ethically sourced and traditionally dyed.";
    } else if (msg.includes('order') || msg.includes('track') || msg.includes('status')) {
      reply = "You can monitor your masterpiece's journey through the 'Order Tracking' section in your dashboard. For real-time updates, our concierge team is always available.";
    } else if (msg.includes('delivery') || msg.includes('shipping') || msg.includes('time') || msg.includes('arrive')) {
      reply = "We provide complimentary white-glove shipping on orders above ₹5,000. Domestic deliveries typically arrive within 5-7 business days, meticulously packaged to ensure safety.";
    } else if (msg.includes('return') || msg.includes('refund') || msg.includes('exchange')) {
      reply = "Your satisfaction is paramount. We offer a 7-day return policy for our catalog pieces. If a rug doesn't perfectly resonate with your space, we will facilitate an effortless exchange.";
    } else if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey') || msg.includes('greetings')) {
      reply = "Greetings from Jannat Rugs Co.! ✨ I am your personal concierge. How may I assist you in discovering the perfect piece for your home today?";
    } else if (msg.includes('contact') || msg.includes('phone') || msg.includes('email') || msg.includes('talk')) {
      reply = "Our collection experts are available for a private consultation. You may call us at +91 9235508422 or email us at jannatrugs786@gmail.com.";
    } else if (msg.includes('location') || msg.includes('address') || msg.includes('where') || msg.includes('pata')) {
      reply = "Our heritage gallery is located in the historic carpet heartland of Bhadohi/Mirzapur, Uttar Pradesh. We welcome visits by appointment to experience our craftsmanship in person.";
    } else if (msg.includes('owner') || msg.includes('founder') || msg.includes('who are')) {
      reply = "Jannat Rugs Co. is led by visionaries Shahid Ali and Sazid Ali, who carry forward a multi-generational legacy of authentic hand-knotted carpet weaving.";
    } else if (msg.includes('making') || msg.includes('process') || msg.includes('how are') || msg.includes('handmade')) {
      reply = "Every Jannat rug is 100% hand-knotted by master artisans. The process involves hand-carding wool, traditional dyeing, and thousands of individual knots tied over several months on vertical looms.";
    } else if (msg.includes('clean') || msg.includes('wash') || msg.includes('maintain') || msg.includes('care')) {
      reply = "To preserve your rug's soul, vacuum regularly on a gentle setting. For deep rejuvenation, we recommend professional dry-cleaning every 2 years. Avoid harsh chemicals at all costs.";
    } else if (msg.includes('custom') || msg.includes('bespoke') || msg.includes('my design') || msg.includes('apna design')) {
      reply = "Absolutely. We specialize in bespoke commissions. You can specify the design, color palette, and dimensions to create a one-of-a-kind masterpiece for your residence.";
    } else if (msg.includes('discount') || msg.includes('offer') || msg.includes('sale') || msg.includes('deal')) {
      reply = "We believe in fair pricing for our artisans, but we do have exclusive seasonal collections. Currently, you can explore our 'Limited Time Offers' section on the homepage for special pieces.";
    } else if (msg.includes('show') || msg.includes('recommend') || msg.includes('suggest') || msg.includes('carpet') || msg.includes('rug')) {
      reply = "I would be delighted to recommend some of our most acclaimed pieces. Here are a few selections that represent the pinnacle of our current collection:";
    } else {
      reply = "That is an excellent inquiry. To provide you with the most accurate details, I can connect you with one of our senior carpet consultants. Would you like our contact information?";
    }

    // Suggest products if relevant
    let suggestedProducts = [];
    if (msg.includes('show') || msg.includes('recommend') || msg.includes('suggest') || msg.includes('carpet') || msg.includes('rug')) {
      suggestedProducts = await Product.find({ isFeatured: true }).select('name images price discountPrice').limit(3);
    }

    res.json({ success: true, reply, suggestedProducts });
  } catch (err) {
    console.error('Chatbot Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { submitContact, getContacts, getOffers, getAllOffers, createOffer, updateOffer, deleteOffer, getSettings, updateSettings, subscribeNewsletter, getAnalytics, chatbotQuery, getRecentVideoReviews };
