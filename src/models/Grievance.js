const mongoose = require('mongoose');

const grievanceSchema = new mongoose.Schema({
  // ============================================
  // 👤 USER INFORMATION (Who submitted)
  // ============================================
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },

  // 👤 Denormalized user data (for quick access without populate)
  userEmail: {
    type: String,
    required: false,
    trim: true,
    lowercase: true
  },

  userName: {
    type: String,
    required: false,
    trim: true
  },

  userDepartment: {
    type: String,
    required: false,
    trim: true
  },

  // ============================================
  // 📝 GRIEVANCE DETAILS
  // ============================================
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },

  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },

  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Academic Issue', 'Administrative', 'Infrastructure', 'Harassment', 'Other']
  },

  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true
  },

  department: {
    type: String,
    required: [true, 'Department is required'],
    enum: ['Computer Science', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Engineering', 'Business', 'Arts', 'Other']
  },

  priority: {
    type: String,
    required: [true, 'Priority is required'],
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium'
  },

  // ============================================
  // 📎 FILE INFORMATION (from Cloudinary)
  // ============================================
  fileUrl: {
    type: String,
    required: false,
    trim: true
  },

  publicId: {
    type: String,
    required: false,
    trim: true
  },

  fileName: {
    type: String,
    required: false,
    trim: true
  },

  fileSize: {
    type: Number,
    required: false,
    min: 0
  },

  fileType: {
    type: String,
    required: false,
    enum: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
  },

  // ============================================
  // 📊 STATUS TRACKING
  // ============================================
  status: {
  type: String,
  enum: ['Todo', 'Pending', 'Processing', 'Resolved'],
  default: 'Todo'
},

  submittedAt: {
    type: Date,
    default: Date.now
  },

  resolvedAt: {
    type: Date,
    required: false
  },

  // ============================================
  // 👨‍💼 ADMIN RESPONSE
  // ============================================
  adminComments: {
    type: String,
    required: false,
    trim: true,
    maxlength: [1000, 'Admin comments cannot exceed 1000 characters']
  },

  assignedTo: {
    type: String,
    required: false,
    trim: true
  },

  assignedToUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  }

}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// ============================================
// 📊 INDEXES (for faster queries)
// ============================================
grievanceSchema.index({ userId: 1, submittedAt: -1 });
grievanceSchema.index({ userId: 1, status: 1 });
grievanceSchema.index({ userId: 1, department: 1 });
grievanceSchema.index({ userId: 1, priority: 1 });
grievanceSchema.index({ department: 1, status: 1 });
grievanceSchema.index({ status: 1, submittedAt: -1 });

// ============================================
// 📌 VIRTUAL PROPERTIES
// ============================================
grievanceSchema.virtual('formattedFileSize').get(function() {
  if (!this.fileSize) return 'N/A';

  const bytes = this.fileSize;
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
});

grievanceSchema.virtual('fileUrlDisplay').get(function() {
  if (!this.fileUrl) return null;
  return this.fileUrl;
});

grievanceSchema.virtual('timeElapsed').get(function() {
  const now = new Date();
  const diff = now - this.submittedAt;

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) return days + 'd ago';
  if (hours > 0) return hours + 'h ago';
  return Math.floor(diff / (1000 * 60)) + 'm ago';
});

// ============================================
// 📌 INSTANCE METHODS
// ============================================
grievanceSchema.methods.isResolved = function() {
  return this.status === 'Resolved' || this.status === 'Rejected';
};

grievanceSchema.methods.markResolved = function(comments) {
  this.status = 'Resolved';
  this.resolvedAt = new Date();
  if (comments) this.adminComments = comments;
  return this.save();
};

// ============================================
// 📌 STATIC METHODS
// ============================================
grievanceSchema.statics.getUserGrievances = function(userId, options = {}) {
  const { limit = 20, skip = 0, status, department } = options;

  const filter = { userId };
  if (status) filter.status = status;
  if (department) filter.department = department;

  return this.find(filter)
    .sort({ submittedAt: -1 })
    .limit(limit)
    .skip(skip);
};

grievanceSchema.statics.getUserStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { userId } },
    { $group: {
      _id: '$status',
      count: { $sum: 1 }
    }}
  ]);

  const result = {
    total: 0,
    pending: 0,
    underReview: 0,
    resolved: 0,
    rejected: 0
  };

  stats.forEach(stat => {
    const key = (stat._id || '').toLowerCase();
    if (key === 'pending') result.pending = stat.count;
    else if (key === 'under review') result.underReview = stat.count;
    else if (key === 'resolved') result.resolved = stat.count;
    else if (key === 'rejected') result.rejected = stat.count;
    result.total += stat.count;
  });

  return result;
};

// ============================================
// 📌 MIDDLEWARE
// ============================================
grievanceSchema.pre('save', async function() {
  // ✅ FIX: async pre-hooks in Mongoose 7+ do NOT receive a `next` callback —
  // Mongoose just waits for the returned promise to resolve/reject.
  // Declaring `next` as a param and calling it throws
  // "next is not a function" because it's undefined.
  if (this.isNew && !this.userEmail) {
    try {
      const User = mongoose.model('User');
      const user = await User.findById(this.userId).select('name email department');
      if (user) {
        this.userEmail = user.email;
        this.userName = user.name;
        this.userDepartment = user.department;
      }
    } catch (error) {
      console.error('Error populating user data:', error);
      // swallow the error so it doesn't block saving the grievance
    }
  }
});

// ============================================
// 📌 TO JSON CONFIGURATION
// ============================================
grievanceSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret.__v;
    return ret;
  }
});

grievanceSchema.set('toObject', {
  virtuals: true
});

// ============================================
// 📌 EXPORT
// ============================================
module.exports = mongoose.model('Grievance', grievanceSchema);