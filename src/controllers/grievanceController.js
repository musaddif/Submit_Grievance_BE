const Grievance = require('../models/Grievance');
const cloudinary = require('../config/cloudinary');

// ============================================
// 📝 Submit new grievance with PDF (logged-in user)
// ============================================
exports.submitGrievance = async (req, res) => {
  try {
    // ✅ FIX: req.user only exists if the route has the `protect` middleware
    // attached (see grievanceRoutes.js). Without it, req.user is undefined
    // and req.user._id throws "Cannot read properties of undefined".
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        error: 'You must be logged in to submit a grievance.'
      });
    }

    const {
      title,
      description,
      category,
      subject,
      department,
      priority
    } = req.body;

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'PDF file is required. Please upload a PDF document.'
      });
    }

    // Validate required fields
    const requiredFields = ['title', 'description', 'category', 'subject', 'department'];
    const missingFields = requiredFields.filter(field => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    const grievance = new Grievance({
      userId: req.user._id,
      title,
      description,
      category,
      subject,
      department,
      priority: priority || 'Medium',
      fileUrl: req.file.path,
      publicId: req.file.filename,
      fileName: req.file.originalname || 'document.pdf',
      fileSize: req.file.size,
      fileType: req.file.mimetype
    });

    await grievance.save();

    res.status(201).json({
      success: true,
      message: 'Grievance submitted successfully with PDF attachment',
      data: {
        grievance,
        fileDetails: {
          fileUrl: req.file.path,
          fileName: req.file.originalname,
          fileSize: req.file.size
        }
      }
    });

  } catch (error) {
    console.error('Grievance submission error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit grievance: ' + error.message
    });
  }
};

// ============================================
// 📋 Get ALL grievances (Admin only) — API #2
// ============================================
exports.getGrievances = async (req, res) => {
  try {
    const { department, status, priority, page = 1, limit = 100 } = req.query;

    // Build filter
    const filter = {};
    if (department) filter.department = department;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(parseInt(limit) || 100, 200);

    const [grievances, total] = await Promise.all([
      Grievance.find(filter)
        .sort({ submittedAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Grievance.countDocuments(filter)
    ]);

    res.json({
      success: true,
      count: grievances.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: grievances
    });

  } catch (error) {
    console.error('Get grievances error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch grievances: ' + error.message
    });
  }
};

// ============================================
// 🔍 Get single grievance by ID with full details — API #4
// (Owner can view their own; admin can view any)
// ============================================
exports.getGrievanceById = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        error: 'You must be logged in to view this grievance.'
      });
    }

    const filter = { _id: req.params.id };

    // Non-admins can only view their own grievance
    if (req.user.role !== 'admin') {
      filter.userId = req.user._id;
    }

    const grievance = await Grievance.findOne(filter);

    if (!grievance) {
      return res.status(404).json({
        success: false,
        error: 'Grievance not found or you do not have permission to view it'
      });
    }

    res.json({
      success: true,
      data: grievance
    });

  } catch (error) {
    console.error('Get grievance by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch grievance: ' + error.message
    });
  }
};

// ============================================
// 🛠️ Update grievance status (Admin only)
// ============================================
exports.updateStatus = async (req, res) => {
  try {
    const { status, adminComments } = req.body;

    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only admins can update grievance status.'
      });
    }

    const allowedStatuses = ['Pending', 'Under Review', 'Resolved', 'Rejected'];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Allowed values: ${allowedStatuses.join(', ')}`
      });
    }

    const grievance = await Grievance.findById(req.params.id);

    if (!grievance) {
      return res.status(404).json({
        success: false,
        error: 'Grievance not found'
      });
    }

    if (status) grievance.status = status;
    if (adminComments) grievance.adminComments = adminComments;
    if (status === 'Resolved') grievance.resolvedAt = new Date();

    await grievance.save();

    res.json({
      success: true,
      message: 'Grievance status updated successfully',
      data: grievance
    });

  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update grievance: ' + error.message
    });
  }
};

// ============================================
// 🗑️ Delete grievance (owner or admin)
// ============================================
exports.deleteGrievance = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        error: 'You must be logged in to delete a grievance.'
      });
    }

    const filter = { _id: req.params.id };

    // If not admin, only allow if it's their grievance
    if (req.user.role !== 'admin') {
      filter.userId = req.user._id;
    }

    const grievance = await Grievance.findOne(filter);

    if (!grievance) {
      return res.status(404).json({
        success: false,
        error: 'Grievance not found or you do not have permission to delete it'
      });
    }

    // Delete file from Cloudinary if it exists
    if (grievance.publicId) {
      try {
        await cloudinary.uploader.destroy(grievance.publicId, {
          resource_type: 'raw'
        });
      } catch (cloudinaryError) {
        console.error('Cloudinary deletion error:', cloudinaryError);
      }
    }

    await grievance.deleteOne();

    res.json({
      success: true,
      message: 'Grievance deleted successfully'
    });

  } catch (error) {
    console.error('Delete grievance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete grievance: ' + error.message
    });
  }
};

// ============================================
// 👤 Get all grievances for the LOGGED-IN user, with status — API #3
// ============================================
exports.getMyGrievances = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        error: 'You must be logged in to view your grievances.'
      });
    }

    const { status, department, priority } = req.query;

    // Build filter - ONLY for the logged-in user
    const filter = { userId: req.user._id };
    if (status) filter.status = status;
    if (department) filter.department = department;
    if (priority) filter.priority = priority;

    const grievances = await Grievance.find(filter)
      .sort({ submittedAt: -1 })
      .limit(100);

    res.json({
      success: true,
      count: grievances.length,
      data: grievances
    });

  } catch (error) {
    console.error('Get my grievances error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch grievances: ' + error.message
    });
  }
};

// ============================================
// 📊 Get grievance statistics for logged-in user
// ============================================
exports.getMyStats = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        error: 'You must be logged in to view your statistics.'
      });
    }

    const stats = await Grievance.getUserStats(req.user._id);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics: ' + error.message
    });
  }
};