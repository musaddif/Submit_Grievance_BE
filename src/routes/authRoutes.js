// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth');
const authController = require('../controllers/authController');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes (All authenticated users)
router.get('/profile', protect, authController.getProfile);
router.put('/profile', protect, authController.updateProfile);

// Admin only routes
router.get('/users', protect, authorize('admin'), authController.getAllUsers);
router.delete('/users/:id', protect, authorize('admin'), authController.deleteUser);

module.exports = router;