const express = require('express');
const router = express.Router();
const { drawDish, getHistory, getStats } = require('../controllers/gachaController');
const { protect } = require('../middleware/authMiddleware');

router.post('/draw', protect, drawDish);
router.get('/history', protect, getHistory);
router.get('/stats', protect, getStats);

module.exports = router;
