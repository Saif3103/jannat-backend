require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const connectDB = require('./config/db');

const app = express();

// Connect DB
connectDB();

// ✅ Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// ✅ CORS (safe for production)
const allowedOrigin = process.env.FRONTEND_URL || '*';

app.use(cors({
  origin: allowedOrigin,
  credentials: true
}));

// ✅ Logging
app.use(morgan('dev'));

// ✅ Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests, please try again later.'
});
app.use('/api/', limiter);

// ✅ Body parsing
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

// ✅ Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Root route (NEW)
app.get('/', (req, res) => {
  res.send('🚀 Jannat Rugs Backend API is running');
});

// ✅ Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '✅ Jannat Rugs Co. API is running',
    timestamp: new Date()
  });
});

// ✅ Routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api', require('./routes/miscRoutes'));

// ❌ 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// ❌ Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// ✅ Server start
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;