// api/routes/postRoutes.js
// Complete Innovation/Post feed API routed to postController

const express = require('express');
const router = express.Router();
const { protect, optionalAuth } = require('../../middleware/auth');
const postController = require('../../controllers/postController');
const upload = require('../../middleware/upload');

router.get('/', optionalAuth, postController.getPosts);
router.post('/', protect, upload.array('files', 5), postController.createPost);
router.get('/:id', optionalAuth, postController.getPost);
router.put('/:id', protect, postController.updatePost);
router.delete('/:id', protect, postController.deletePost);
router.post('/:id/like', protect, postController.likePost);
router.post('/:id/endorse', protect, postController.endorsePost);
router.post('/:id/comment', protect, postController.addComment);

module.exports = router;
