
const db = require('../config/db');

exports.executeQuery = async (req, res) => {
    const { query, accessCode } = req.body;

    // Check for Terminal Access Code
    const validCode = process.env.TERMINAL_ACCESS_CODE || 'admin123'; // Default fallback
    if (accessCode !== validCode) {
        return res.status(403).json({ success: false, message: 'Invalid Terminal Access Code' });
    }

    if (!query) {
        return res.status(400).json({ success: false, message: 'Query is required' });
    }

    // Safety Warning: This is a high-risk feature.
    // In a real production app, this should be heavily restricted.

    try {
        const [results, fields] = await db.query(query);
        res.json({
            success: true,
            results,
            // meta: fields // Optional: provides column metadata
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
            code: error.code,
            sqlMessage: error.sqlMessage
        });
    }
};
