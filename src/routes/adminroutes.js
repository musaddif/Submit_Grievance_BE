const express = require('express');
const router = express.Router();

const {
  updateGrievanceStatus,
  deleteGrievance
} = require('../controllers/adminController');

const { protect, authorize } = require('../middlewares/auth');

// PUT /api/admin/grievances/:id/status
router.put('/grievances/:id/status', protect, authorize('admin'), updateGrievanceStatus);

// DELETE /api/admin/grievances/:id
router.delete('/grievances/:id', protect, authorize('admin'), deleteGrievance);

module.exports = router;