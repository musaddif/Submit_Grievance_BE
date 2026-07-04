const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const grievanceController = require('../controllers/grievanceController');
const { protect, authorize } = require('../middlewares/auth');

// ============================================
// 📝 Submit grievance with PDF (logged-in user)
// ✅ FIX: `protect` added so req.user is populated -> fixes the
// "Cannot read properties of undefined (reading '_id')" error
// ============================================
router.post(
  '/grievance',
  protect,
  upload.single('file'),
  grievanceController.submitGrievance
);

// ============================================
// 📋 API #2 — Get ALL grievances (admin only)
// ============================================
router.get(
  '/grievances',
  protect,
  authorize('admin'),
  grievanceController.getGrievances
);

// ============================================
// 🔍 API #4 — Get single grievance details
// (owner can view their own, admin can view any)
// ============================================
router.get(
  '/grievance/:id',
  protect,
  grievanceController.getGrievanceById
);

// ============================================
// 🛠️ Update grievance status (admin only)
// ============================================
router.put(
  '/grievance/:id/status',
  protect,
  authorize('admin'),
  grievanceController.updateStatus
);

// ============================================
// 🗑️ Delete grievance (owner or admin)
// ============================================
router.delete(
  '/grievance/:id',
  protect,
  grievanceController.deleteGrievance
);

// ============================================
// 👤 API #3 — Get logged-in user's own grievances (with status)
// ============================================
router.get(
  '/my-grievances',
  protect,
  grievanceController.getMyGrievances
);

// ============================================
// 📊 Get logged-in user's grievance statistics
// ============================================
router.get(
  '/my-grievances/stats',
  protect,
  grievanceController.getMyStats
);

module.exports = router;