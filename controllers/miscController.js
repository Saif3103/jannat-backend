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
      if (req.files.video) settings.heroVideo = req.files.video[0].path;
      if (req.files.bannerImages) updates.bannerImages = req.files.bannerImages.map(f => f.path);
    }
    
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
const chatbotQuery = async (req, res) => {
  try {
    const { message } = req.body;
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
    if (msg.includes('price') || msg.includes('cost') || msg.includes('rate') || msg.includes('kitna') || msg.includes('daam')) {
      reply = 'Our carpets range from ₹1,500 to ₹2,50,000 depending on size and craftsmanship.';
    } else if (msg.includes('size') || msg.includes('bada') || msg.includes('chota')) {
      reply = 'We offer sizes like 2x3, 3x5, 4x6, 5x7, 6x9, 8x10, and 9x12 feet, plus custom sizes.';
    } else if (msg.includes('material') || msg.includes('wool') || msg.includes('silk') || msg.includes('kapda')) {
      reply = 'We use premium pure wool, silk, cotton, and jute. All carpets are handmade.';
    } else if (msg.includes('order') || msg.includes('track') || msg.includes('status')) {
      reply = 'You can track your order from the "Order Tracking" page or User Dashboard.';
    } else if (msg.includes('delivery') || msg.includes('shipping') || msg.includes('kab tak') || msg.includes('time')) {
      reply = 'Free shipping on orders above ₹5,000! Delivery takes 5-7 days.';
    } else if (msg.includes('return') || msg.includes('refund') || msg.includes('wapas')) {
      reply = 'We have an easy 7-day return policy. You can email or call us for returns.';
    } else if (msg.includes('room') || msg.includes('living') || msg.includes('bedroom') || msg.includes('kamre')) {
      reply = 'For living rooms, 5x7 or 8x10 ft is best. For bedrooms, 4x6 ft works great.';
    } else if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey') || msg.includes('namaste')) {
      reply = 'Welcome to Jannat Rugs Co.! 🙏 I am your AI assistant. How can I help you today?';
    } else if (msg.includes('contact') || msg.includes('phone') || msg.includes('email') || msg.includes('number') || msg.includes('baat')) {
      reply = 'You can reach us at: 📞 9235508422 / 9696700737 or 📧 jannatrugs786@gmail.com';
    } else if (msg.includes('location') || msg.includes('address') || msg.includes('kahan') || msg.includes('pata') || msg.includes('jagah') || msg.includes('where')) {
      reply = 'Our firm is located in Ghantaghar, Mirzapur, Uttar Pradesh, famous for handmade carpets!';
    } else if (msg.includes('owner') || msg.includes('founder') || msg.includes('malik') || msg.includes('azeem') || msg.includes('sahana')) {
      reply = 'The founder of Jannat Rugs Co. is Mr. Azeem Ansari, and the co-founder is Mrs. Sahana Ansari. They are visionary leaders committed to delivering authentic handmade luxury to your homes.';
    } else if (msg.includes('payment') || msg.includes('pay') || msg.includes('paisa')) {
      reply = 'We accept COD, UPI, Razorpay, and Cards. All payments are 100% secure!';
    } else if (msg.includes('kaise banta') || msg.includes('process') || msg.includes('taiyar') || msg.includes('banta hai') || msg.includes('make')) {
      reply = 'Our carpets are 100% handmade. The premium wool is dyed, and then artisans knot them by hand on traditional looms.';
    } else if (msg.includes('handmade') || msg.includes('hand made') || msg.includes('haath')) {
      reply = 'Yes! All our carpets are 100% authentic handmade, ensuring premium quality and uniqueness. 🎨';
    } else if (msg.includes('dhona') || msg.includes('clean') || msg.includes('saaf') || msg.includes('wash')) {
      reply = 'You can vacuum regularly, but for deep cleaning, please use professional dry-cleaning services only.';
    } else if (msg.includes('life') || msg.includes('durability') || msg.includes('tikega') || msg.includes('saal') || msg.includes('umar')) {
      reply = 'Since they are handmade from premium wool, our carpets can easily last 20-30+ years!';
    } else if (msg.includes('custom') || msg.includes('apna design') || msg.includes('mera design')) {
      reply = 'Yes, we make custom designs! Simply send us your design or specific size on WhatsApp.';
    } else if (msg.includes('discount') || msg.includes('offer') || msg.includes('sale') || msg.includes('sasta') || msg.includes('chhut')) {
      reply = 'We have great offers running! Check our website coupons. We also offer special discounts for bulk orders.';
    } else if (msg.includes('dikhao') || msg.includes('show') || msg.includes('recommend') || msg.includes('suggest') || msg.includes('carpet') || msg.includes('rug')) {
      reply = 'Sure! Here are some of our premium handmade carpets:';
    } else {
      reply = 'Thank you! For specific details, please call us directly at 9235508422.';
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

module.exports = { submitContact, getContacts, getOffers, getAllOffers, createOffer, updateOffer, deleteOffer, getSettings, updateSettings, subscribeNewsletter, getAnalytics, chatbotQuery };
