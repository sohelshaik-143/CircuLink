const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const msgCtrl = require('../../controllers/messageController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = process.env.VERCEL 
  ? '/tmp' 
  : path.join(__dirname, '../../uploads/messages');

try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (err) {
  console.warn('Warning: Could not create messages upload directory:', err.message);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|pdf|doc|docx|txt|zip/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext || mime) cb(null, true);
    else cb(new Error('File type not allowed'));
  },
});

router.get('/unread',      protect, msgCtrl.getUnreadCounts);
router.get('/:userId',     protect, msgCtrl.getConversation);
router.post('/:userId',    protect, upload.single('file'), msgCtrl.sendMessage);

module.exports = router;
