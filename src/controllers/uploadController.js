// Controller for single file upload
exports.uploadFile = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }

    // File uploaded successfully
    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      fileUrl: req.file.path, // Cloudinary URL
      publicId: req.file.filename, // Cloudinary public ID
      fileSize: req.file.size,
      fileType: req.file.mimetype
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Upload failed: ' + error.message
    });
  }
};

// Controller for multiple file uploads
exports.uploadMultipleFiles = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No files uploaded' 
      });
    }

    const files = req.files.map(file => ({
      fileUrl: file.path,
      publicId: file.filename
    }));

    res.status(200).json({
      success: true,
      message: 'Files uploaded successfully',
      files: files
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Upload failed: ' + error.message
    });
  }
};