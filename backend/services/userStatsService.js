const UserStats = require('../models/userStatsModel');

class UserStatsService {

    // helper to get YYYY-MM-DD string in local time
    static _getTodayString() {
        // Use client's timezone if possible, but for simplicity use Server Local or consistent UTC+8
        // Here we use simple local Date object which follows server time
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // helper to diff days
    static _dayDiff(d1str, d2str) {
        const d1 = new Date(d1str);
        const d2 = new Date(d2str);
        const diffTime = Math.abs(d2 - d1);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    static async updateActivity(userId, isDraw = false, isNewDish = false, connection = null) {
        // 1. Ensure stats exist
        let stats = await UserStats.getStats(userId, connection);
        if (!stats) {
            await UserStats.createStats(userId, connection);
            stats = await UserStats.getStats(userId, connection);
        }

        const todayStr = this._getTodayString();
        // stats.last_active_date is Date object from DB usually

        let lastActiveStr = null;
        if (stats.last_active_date) {
            const d = new Date(stats.last_active_date);
            lastActiveStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }

        // Logic
        let newStreak = stats.current_streak;
        let incrementLoginDays = false;

        // If first time active
        if (!lastActiveStr) {
            newStreak = 1;
            incrementLoginDays = true;
        } else if (lastActiveStr !== todayStr) {
            // New Day
            incrementLoginDays = true;

            const diff = this._dayDiff(lastActiveStr, todayStr);
            if (diff === 1) {
                // Streak!
                newStreak += 1;
            } else {
                // Reset
                newStreak = 1;
            }
        }
        // If same day, streak doesn't change, login days doesn't increment

        // Only update if something changed or if it's a Draw (need to incr draw count)
        // If it's just login and same day, strictly speaking we don't need to update DB unless updating 'last_login_time' timestamp which we don't have in this table (we have last_active_date only).
        // But for consistency let's update last_active_date (no-op value wise but updates timestamp).

        await UserStats.updateActivity(
            userId,
            todayStr, // newLastActiveDate
            newStreak,
            incrementLoginDays,
            isDraw, // incrementDraws
            isNewDish, // incrementCollection
            connection
        );

        return {
            current_streak: newStreak,
            total_login_days: stats.total_login_days + (incrementLoginDays ? 1 : 0),
            unique_dishes_count: stats.unique_dishes_count + (isNewDish ? 1 : 0)
        };
    }

    static async getStats(userId) {
        let stats = await UserStats.getStats(userId);
        if (!stats) {
            // Return zeroes if not created yet (or auto-create?)
            return {
                total_draws: 0,
                current_streak: 0,
                total_login_days: 0,
                unique_dishes_count: 0
            };
        }
        return stats;
    }
}

module.exports = UserStatsService;
