const express = require('express');
const router = express.Router();
const terminalController = require('../controllers/terminalController');
const { protect } = require('../middleware/authMiddleware');

// Protect this route! Only authenticated users (or admins) should run SQL.
router.post('/query', protect, terminalController.executeQuery);

module.exports = router;
