const Contact = require('../models/Contact');
const Offer = require('../models/Offer');
const Settings = require('../models/Settings');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');

// Gemini REST API helper (avoids SDK stream issues on Windows)
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

async function callGemini(systemPrompt, history, userMessage) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  // Build contents array — system as first user turn (REST API approach)
  const contents = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: 'Understood! I am Jannat, your AI concierge for Jannat Rugs Co. How can I help?' }] },
    ...history
      .filter(h => h.from && h.text)
      .slice(-6)
      .map(h => ({ role: h.from === 'user' ? 'user' : 'model', parts: [{ text: h.text }] })),
    { role: 'user', parts: [{ text: userMessage }] },
  ];

  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.75,
        maxOutputTokens: 512,
        topP: 0.9,
      },
    }),
    signal: AbortSignal.timeout(15000), // 15s timeout
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

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
      req.files.forEach((f) => {
        if (!filesObj[f.fieldname]) filesObj[f.fieldname] = [];
        filesObj[f.fieldname].push(f);
      });
      req.files = filesObj;
    }

    const updates = { ...(req.body || {}) };
    if (updates.socialLinks)
      updates.socialLinks =
        typeof updates.socialLinks === 'string' ? JSON.parse(updates.socialLinks) : updates.socialLinks;
    if (updates.chatbotFaqs)
      updates.chatbotFaqs =
        typeof updates.chatbotFaqs === 'string' ? JSON.parse(updates.chatbotFaqs) : updates.chatbotFaqs;
    if (updates.testimonials)
      updates.testimonials =
        typeof updates.testimonials === 'string' ? JSON.parse(updates.testimonials) : updates.testimonials;

    const imageSet = {};
    const pickUrl = (file) =>
      file?.path || file?.secure_url || file?.url || '';

    if (req.files) {
      if (req.files.logo) imageSet.logo = pickUrl(req.files.logo[0]);
      if (req.files.favicon) imageSet.favicon = pickUrl(req.files.favicon[0]);
      if (req.files.profileImage) imageSet.profileImage = pickUrl(req.files.profileImage[0]);
      if (req.files.founderImage) imageSet.founderImage = pickUrl(req.files.founderImage[0]);
      if (req.files.coFounderImage) imageSet.coFounderImage = pickUrl(req.files.coFounderImage[0]);
      if (req.files.sahanaImage) imageSet.sahanaImage = pickUrl(req.files.sahanaImage[0]);
      if (req.files.saifImage) imageSet.saifImage = pickUrl(req.files.saifImage[0]);
      if (req.files.video) imageSet.heroVideo = pickUrl(req.files.video[0]);
      if (req.files.heroVideo) imageSet.heroVideo = pickUrl(req.files.heroVideo[0]);
      if (req.files.adVideo) imageSet.adVideo = pickUrl(req.files.adVideo[0]);
      if (req.files.bannerImages) {
        updates.bannerImages = req.files.bannerImages.map((f) => pickUrl(f)).filter(Boolean);
      }
    }

    // Never overwrite image fields with empty body strings / helper fields
    const fileFields = [
      'logo',
      'favicon',
      'profileImage',
      'founderImage',
      'coFounderImage',
      'sahanaImage',
      'saifImage',
      'video',
      'heroVideo',
      'adVideo',
      'field',
    ];
    fileFields.forEach((f) => delete updates[f]);

    Object.assign(settings, updates, imageSet);
    Object.keys(imageSet).forEach((k) => settings.markModified(k));
    await settings.save();

    if (Object.keys(imageSet).length) {
      await Settings.findByIdAndUpdate(settings._id, { $set: imageSet });
    }

    const fresh = await Settings.findById(settings._id).lean();
    res.json({ success: true, settings: fresh });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const uploadTeamImage = async (req, res) => {
  try {
    const allowedFields = ['founderImage', 'sahanaImage', 'saifImage', 'coFounderImage'];
    let field = req.body?.field;
    if (Array.isArray(field)) field = field[0];
    field = (field || '').toString().trim();

    if (!allowedFields.includes(field) && req.files?.length) {
      const match = req.files.find((f) => allowedFields.includes(f.fieldname));
      if (match) field = match.fieldname;
    }

    if (!allowedFields.includes(field)) {
      return res.status(400).json({
        success: false,
        message: `Invalid field name. Use one of: ${allowedFields.join(', ')}`,
      });
    }

    let imageUrl = '';
    if (req.files && req.files.length > 0) {
      const file =
        req.files.find((f) => f.fieldname === field) ||
        req.files.find((f) => allowedFields.includes(f.fieldname)) ||
        req.files[0];
      imageUrl =
        file.path ||
        file.secure_url ||
        file.url ||
        (file.filename
          ? `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${file.filename}`
          : '');
    }

    if (!imageUrl && req.body?.base64) {
      const { cloudinary } = require('../config/cloudinary');
      const uploadResponse = await cloudinary.uploader.upload(req.body.base64, {
        folder: 'jannat_rugs/team',
        public_id: `${field}-${Date.now()}`,
      });
      imageUrl = uploadResponse.secure_url;
    }

    if (!imageUrl) {
      return res.status(400).json({ success: false, message: 'No image provided or upload failed' });
    }

    let settings = await Settings.findOne();
    if (!settings) settings = new Settings();
    settings.set(field, imageUrl);
    settings.markModified(field);
    await settings.save();
    await Settings.findByIdAndUpdate(settings._id, { $set: { [field]: imageUrl } });

    const fresh = await Settings.findById(settings._id).lean();
    res.json({ success: true, settings: fresh, url: imageUrl, field });
  } catch (err) {
    console.error('Team image upload error:', err);
    res.status(500).json({ success: false, message: err.message || 'Upload failed' });
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
    const { message, history = [] } = req.body;
    if (!message) return res.json({ success: true, reply: 'Hello! How can I help you today?' });

    // Fetch store context in parallel
    const [settings, featuredProducts] = await Promise.all([
      Settings.findOne().lean(),
      Product.find({ isFeatured: true }).select('name price discountPrice category').limit(6).lean(),
    ]);

    const faqs = settings?.chatbotFaqs || [];
    const faqText = faqs.map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n');
    const productList = featuredProducts.map(p =>
      `• ${p.name} — ₹${p.discountPrice || p.price} (${p.category || 'Rug'})`
    ).join('\n');

    const systemPrompt = `You are Jannat, a warm and helpful AI concierge for "Jannat Rugs Co." — a premium handmade carpet brand from Mirzapur/Bhadohi, UP, India.

Personality & Rules:
- Reply in the EXACT same language as the customer (Hindi, Hinglish, or English)
- Keep replies VERY SHORT, CLEAN, and DIRECT (1-2 short sentences max). Do not write long paragraphs or unnecessary filler.
- Use emojis sparingly ✨
- Order tracking → tell them to check 'My Orders' in their account
- Contact info → WhatsApp +91 7007626680

About Jannat Rugs Co.:
- Premium handmade rugs & carpets (Hand-knotted, Persian, Wool, Silk, Jute)
- Located in Mirzapur/Bhadohi, UP — India's carpet heartland
- Price range: ₹2,000 to ₹2,50,000
- Free shipping on orders above ₹5,000 | 7-day returns | Delivery 5-7 days

Featured products right now:
${productList || 'Check /shop for latest collection'}

Store FAQs:
${faqText || 'No FAQs configured yet'}`;

    // Call Gemini via REST API
    const aiReply = await callGemini(systemPrompt, history, message);

    // Show products if relevant keywords detected
    const productKeywords = ['show', 'recommend', 'suggest', 'carpet', 'rug', 'product', 'collection', 'buy', 'kharidna', 'dikhao', 'best'];
    const shouldShowProducts = productKeywords.some(k => message.toLowerCase().includes(k));

    let suggestedProducts = [];
    if (shouldShowProducts) {
      suggestedProducts = await Product.find({ isFeatured: true })
        .select('name images price discountPrice category _id')
        .limit(3)
        .lean();
    }

    res.json({ success: true, reply: aiReply, suggestedProducts, aiPowered: true });

  } catch (err) {
    console.error('Chatbot AI Error:', err?.message || err);
    // Smart keyword fallback if AI is unavailable
    const msg = (req.body.message || '').toLowerCase();
    let fallbackReply = 'Kuch technical issue aa gaya. Directly WhatsApp karein: +91 7007626680 ✨';
    if (msg.includes('price') || msg.includes('cost') || msg.includes('daam') || msg.includes('rate'))
      fallbackReply = 'Hamare rugs ₹2,000 se ₹2,50,000 tak ke hain! ✨ Exact price ke liye /shop page dekhein ya WhatsApp karein: +91 7007626680';
    else if (msg.includes('return') || msg.includes('refund') || msg.includes('wapas'))
      fallbackReply = 'Hamare paas 7-din ka hassle-free return policy hai. Problem ho toh +91 7007626680 pe contact karein.';
    else if (msg.includes('delivery') || msg.includes('shipping') || msg.includes('kitne din'))
      fallbackReply = '₹5,000+ ke orders par FREE shipping! Delivery 5-7 business days mein ho jaati hai. 🚚';
    else if (msg.includes('custom') || msg.includes('bespoke') || msg.includes('apna'))
      fallbackReply = 'Haan bilkul! Hum custom rugs banate hain — apna size, color aur design choose karo. WhatsApp: +91 7007626680 ✨';
    else if (msg.includes('hello') || msg.includes('hi') || msg.includes('namaste'))
      fallbackReply = 'Namaste! 🙏 Welcome to Jannat Rugs Co. Main aapki kaise madad kar sakta hoon?';

    res.json({ success: true, reply: fallbackReply, suggestedProducts: [], aiPowered: false });
  }
};

module.exports = { submitContact, getContacts, getOffers, getAllOffers, createOffer, updateOffer, deleteOffer, getSettings, updateSettings, uploadTeamImage, subscribeNewsletter, getAnalytics, chatbotQuery, getRecentVideoReviews };
