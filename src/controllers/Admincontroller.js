const mongoose = require('mongoose');
const Grievance = require('../models/Grievance');

// ============================================
// 📌 PUT /api/admin/grievances/:id/status
// Update the status of a particular complaint
// ============================================
exports.updateGrievanceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminComments } = req.body;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid grievance ID format'
      });
    }

    // Validate status against the enum defined in the Grievance model
    // (keeps this controller in sync automatically if you edit the schema)
    const allowedStatuses = Grievance.schema.path('status').enumValues;

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${allowedStatuses.join(', ')}`
      });
    }

    const grievance = await Grievance.findById(id);

    if (!grievance) {
      return res.status(404).json({
        success: false,
        message: 'Grievance not found'
      });
    }

    grievance.status = status;

    if (adminComments !== undefined) {
      grievance.adminComments = adminComments;
    }

    // Auto-stamp resolvedAt when moved into a terminal state
    if (['Resolved', 'Rejected'].includes(status)) {
      grievance.resolvedAt = new Date();
    } else {
      grievance.resolvedAt = undefined;
    }

    await grievance.save();

    return res.status(200).json({
      success: true,
      message: 'Grievance status updated successfully',
      data: grievance
    });

  } catch (error) {
    console.error('Error updating grievance status:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating grievance status',
      error: error.message
    });
  }
};

// ============================================
// 📌 DELETE /api/admin/grievances/:id
// Delete a complaint by ID
// ============================================
exports.deleteGrievance = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid grievance ID format'
      });
    }

    const grievance = await Grievance.findByIdAndDelete(id);

    if (!grievance) {
      return res.status(404).json({
        success: false,
        message: 'Grievance not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Grievance deleted successfully',
      data: { id }
    });

  } catch (error) {
    console.error('Error deleting grievance:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while deleting grievance',
      error: error.message
    });
  }
};