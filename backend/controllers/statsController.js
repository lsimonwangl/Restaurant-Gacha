const db = require('../config/db');

// Get TOTAL visit count
const getDailyVisits = async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT SUM(visits) as total FROM daily_stats'
        );

        const count = rows.length > 0 ? rows[0].total : 0;

        res.json({
            success: true,
            count: count || 0
        });
    } catch (error) {
        console.error('Error fetching total visits:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch stats' });
    }
};

// Increment visit and return TOTAL count
const incrementVisits = async (req, res) => {
    try {
        await db.query(`
            INSERT INTO daily_stats (date, visits) 
            VALUES (CURDATE(), 1) 
            ON DUPLICATE KEY UPDATE visits = visits + 1
        `);

        // Return the updated TOTAL count
        const [rows] = await db.query(
            'SELECT SUM(visits) as total FROM daily_stats'
        );

        const count = rows.length > 0 ? rows[0].total : 1;

        res.json({
            success: true,
            count: count
        });
    } catch (error) {
        console.error('Error incrementing visits:', error);
        res.status(500).json({ success: false, message: 'Failed to record visit' });
    }
};

module.exports = {
    getDailyVisits,
    incrementVisits
};
