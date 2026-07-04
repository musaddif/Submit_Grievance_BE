// src/services/authService.js
const User = require('../models/User'); // ✅ ADD THIS - IT'S MISSING!
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

class AuthService {
  // Generate JWT Token
  generateToken(userId) {
    return jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' } // Added fallback
    );
  }

  // Register user
  async register(userData) {
    const { name, email, password, role } = userData;
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'user'
    });

    const token = this.generateToken(user._id);
    
    return {
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    };
  }

  // Login user
  async login(email, password) {
    try {
      // Check if user exists
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new Error('Account is deactivated');
      }

      // Check password
      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        throw new Error('Invalid credentials');
      }

      const token = this.generateToken(user._id);

      return {
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Get user profile
  async getProfile(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  // Update user
  async updateUser(userId, updateData) {
    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  // Get all users (Admin only)
  async getAllUsers() {
    return await User.find().select('-password');
  }

  // Delete user (Admin only)
  async deleteUser(userId) {
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }
}

module.exports = new AuthService();