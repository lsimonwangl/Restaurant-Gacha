const express = require('express');
const router = express.Router();
const { getGroups, createGroup, addDishToGroup, getGroupDishes } = require('../controllers/groupController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/').get(protect, getGroups).post(protect, createGroup);
router.route('/add-dish').post(protect, addDishToGroup);
const { removeDishFromGroup } = require('../controllers/groupController');
router.route('/remove-dish').post(protect, removeDishFromGroup);

router.route('/:id/dishes').get(protect, getGroupDishes);

module.exports = router;
