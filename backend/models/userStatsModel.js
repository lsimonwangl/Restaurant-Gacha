const db = require('../config/db');

class UserStats {
    // Get Stats
    static async getStats(userId, connection = null) {
        const query = 'SELECT * FROM user_stats WHERE user_id = ?';
        const conn = connection || db;
        const [rows] = await conn.query(query, [userId]);
        return rows[0] || null;
    }

    // Create Stats (if not exists)
    static async createStats(userId, connection = null) {
        const query = `
            INSERT IGNORE INTO user_stats (user_id, total_draws, current_streak, total_login_days, last_active_date, unique_dishes_count)
            VALUES (?, 0, 0, 1, CURDATE(), 0)
        `;
        const conn = connection || db;
        await conn.query(query, [userId]);
    }

    // Update Activity (Login/Draw)
    // Updates: last_active_date, current_streak, total_login_days
    static async updateActivity(userId, newLastActiveDate, newStreak, incrementLoginDays, incrementDraws, incrementCollection, connection = null) {
        let sql = `UPDATE user_stats SET last_active_date = ?`;
        const params = [newLastActiveDate];

        if (newStreak !== null) {
            sql += `, current_streak = ?`;
            params.push(newStreak);
        }
        if (incrementLoginDays) {
            sql += `, total_login_days = total_login_days + 1`;
        }
        if (incrementDraws) {
            sql += `, total_draws = total_draws + 1`;
        }
        if (incrementCollection) {
            sql += `, unique_dishes_count = unique_dishes_count + 1`;
        }

        sql += ` WHERE user_id = ?`;
        params.push(userId);

        const conn = connection || db;
        await conn.query(sql, params);
    }
}

module.exports = UserStats;
