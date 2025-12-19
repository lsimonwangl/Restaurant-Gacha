const GachaService = require('../services/gachaService');

// Helper to handle service errors
const handleServiceError = (res, error) => {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message || 'Server Error' });
};

const drawDish = async (req, res) => {
    const { groupId } = req.body;
    const userId = req.user.id;

    try {
        const result = await GachaService.drawDish(userId, groupId);
        res.json(result);
    } catch (error) {
        handleServiceError(res, error);
    }
};

const getHistory = async (req, res) => {
    const userId = req.user.id;
    try {
        const history = await GachaService.getHistory(userId);
        res.json(history);
    } catch (error) {
        handleServiceError(res, error);
    }
};

const getStats = async (req, res) => {
    const userId = req.user.id;
    const { groupId } = req.query; // Optional filter
    try {
        const stats = await GachaService.getStats(userId, groupId);
        res.json(stats);
    } catch (error) {
        handleServiceError(res, error);
    }
};

module.exports = { drawDish, getHistory, getStats };
