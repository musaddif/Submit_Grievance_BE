const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const { uploadFile, uploadMultipleFiles } = require('../controllers/uploadController');

// Single file upload route
router.post('/upload', upload.single('file'), uploadFile);

// Multiple files upload route (optional)
router.post('/upload-multiple', upload.array('files', 5), uploadMultipleFiles);

// Route to delete file (optional)
router.delete('/delete/:publicId', async (req, res) => {
  try {
    const cloudinary = require('../config/cloudinary');
    const { publicId } = req.params;
    
    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result === 'ok') {
      res.json({ success: true, message: 'File deleted successfully' });
    } else {
      res.status(404).json({ success: false, error: 'File not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;