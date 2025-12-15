const express = require('express');
const router = express.Router();
const { drawDish, getHistory } = require('../controllers/gachaController');
const { protect } = require('../middleware/authMiddleware');

router.post('/draw', protect, drawDish);
router.get('/history', protect, getHistory);

module.exports = router;
