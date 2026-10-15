// api/routes/circularRoutes.js
// Complete Circular Management API routed to circularController

const express = require('express');
const router = express.Router();
const { protect, optionalAuth } = require('../../middleware/auth');
const circularController = require('../../controllers/circularController');

router.get('/', optionalAuth, circularController.getCirculars);
router.post('/', protect, circularController.createCircular);
router.post('/emergency', protect, circularController.emergency);
router.get('/:id', optionalAuth, circularController.getCircular);
router.put('/:id/approve', protect, circularController.approveCircular);
router.put('/:id/reject', protect, circularController.rejectCircular);
router.post('/:id/read', protect, circularController.markRead);

module.exports = router;
