const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

router.get('/daily', statsController.getDailyVisits);
router.post('/visit', statsController.incrementVisits);

module.exports = router;
