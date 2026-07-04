require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const uploadRoutes = require('./src/routes/uploadRoutes');
const grievanceRoutes = require('./src/routes/grievanceRoutes'); // ← ADD THIS

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ============ ROUTES ============
app.use('/api/auth', authRoutes);
app.use('/api', uploadRoutes);
app.use('/api', grievanceRoutes); // ← ADD THIS LINE - FIXES THE ERROR!

// Root route
app.get('/', (req, res) => {
  res.send('Express API is running');
});

// ============ ERROR HANDLING ============
// Multer error handler
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'FILE_TOO_LARGE') {
      return res.status(400).json({ 
        success: false,
        error: 'File too large. Max size is 10MB' 
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ 
        success: false,
        error: 'Unexpected file field. Use "file" as the field name.' 
      });
    }
  }
  // Handle custom errors from fileFilter
  if (err.message && err.message.includes('Only PDF files are allowed')) {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
  next(err);
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: err.message
  });
});

// ============ DATABASE CONNECTION ============
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ============ START SERVER ============
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Upload endpoint: http://localhost:${PORT}/api/upload`);
  console.log(`📋 Grievance endpoint: http://localhost:${PORT}/api/grievance`);
  console.log(`🔐 Auth endpoint: http://localhost:${PORT}/api/`);
});