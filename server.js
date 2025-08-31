const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { Pool } = require("pg");
require("dotenv").config();

// Import middleware and routes
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const analyticsRoutes = require('./routes/analytics');

const app = express();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', limiter);

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database connection (Render PostgreSQL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Use Render DATABASE_URL
  ssl: {
    rejectUnauthorized: false, // Required for Render PostgreSQL
  },
});

// Test DB connection
pool.connect()
  .then(() => console.log("✅ Connected to PostgreSQL (Render)"))
  .catch(err => console.error("❌ DB connection error:", err));

// Root route
app.get("/", (req, res) => {
  res.json({ 
    message: "🚀 Finance Tracker API is running!",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      transactions: "/api/transactions",
      analytics: "/api/analytics"
    }
  });
});

// Health check
app.get("/health", async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected'
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/analytics', analyticsRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 Shutting down server gracefully...');
  await pool.end();
  console.log('✅ Database connections closed');
  process.exit(0);
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`🔐 Environment: ${process.env.NODE_ENV || 'development'}`);
});
