const express = require('express');
const router = express.Router();
const { getDishes, getDishById, createDish, updateDish, deleteDish, importDishes, importOneDish } = require('../controllers/dishController');
const { protect, admin } = require('../middleware/authMiddleware');

const { upload } = require('../middleware/uploadMiddleware');
const { validateRequest, dishValidationRules } = require('../middleware/validationMiddleware');

// Now all users can create dishes, and GET returns own dishes.
// We should protect GET as well to know "who" is asking.
router.route('/').get(protect, getDishes).post(protect, upload.single('image'), dishValidationRules, validateRequest, createDish);

// Import routes must be before /:id to avoid collision if we used /:id for generic actions, 
// though here /:id is at root level so /import is distinct if /import is a distinct path segment.
// But /import/:dishId overlaps with /:id if not careful? No, /import is fixed.
// Wait, router path is relative to /api/dishes.
// /api/dishes/import
// /api/dishes/import/:dishId
// /api/dishes/:id
// Express matches sequentially. /import will match /:id if /:id is defined first?
// Yes, "import" matches ":id" param. So we MUST define import FIRST.

router.post('/import', protect, importDishes);
router.post('/import/:dishId', protect, importOneDish);

router.route('/:id').get(protect, getDishById).put(protect, upload.single('image'), dishValidationRules, validateRequest, updateDish).delete(protect, deleteDish);

module.exports = router;
