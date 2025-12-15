const express = require('express');
const router = express.Router();
const { getDishes, getDishById, createDish, updateDish, deleteDish } = require('../controllers/dishController');
const { protect, admin } = require('../middleware/authMiddleware');

const { upload } = require('../middleware/uploadMiddleware');

// Now all users can create dishes, and GET returns own dishes.
// We should protect GET as well to know "who" is asking.
router.route('/').get(protect, getDishes).post(protect, upload.single('image'), createDish);
router.route('/:id').get(protect, getDishById).put(protect, upload.single('image'), updateDish).delete(protect, deleteDish);

module.exports = router;
