const express = require('express');
const router = express.Router();
const {
    getGroups, getExploreGroups, createGroup, updateGroup, deleteGroup,
    saveGroup, unsaveGroup,
    addDishToGroup, getGroupDishes, removeDishFromGroup
} = require('../controllers/groupController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').get(protect, getGroups).post(protect, createGroup);
router.route('/explore').get(protect, getExploreGroups); // Explicit paths first

router.route('/add-dish').post(protect, addDishToGroup);
router.route('/remove-dish').post(protect, removeDishFromGroup);

router.route('/:id').put(protect, updateGroup).delete(protect, deleteGroup);
router.route('/:id/save').post(protect, saveGroup).delete(protect, unsaveGroup);
router.route('/:id/dishes').get(protect, getGroupDishes);

module.exports = router;
