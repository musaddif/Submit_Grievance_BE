// src/controllers/authController.js
const authService = require('../services/authService');

exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    const result = await authService.register({ name, email, password, role });
    
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// ✅ ADD THIS - Login function
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }
    
    const result = await authService.login(email, password);
    
    res.status(200).json(result);
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message
    });
  }
};

// ✅ ADD THESE - Other required functions
exports.getProfile = async (req, res) => {
  try {
    const user = await authService.getProfile(req.user._id);
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await authService.updateUser(req.user._id, req.body);
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await authService.getAllUsers();
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await authService.deleteUser(req.params.id);
    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      data: user
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
};