const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const config = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3308,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'restaurant_gacha',
    multipleStatements: true
};

async function migrateStats() {
    console.log('🔄 Starting User Stats Migration...', config.host);
    let connection;

    try {
        connection = await mysql.createConnection(config);
        console.log('✅ Connected to database.');

        // 1. Create user_stats table
        const createTableSql = `
            CREATE TABLE IF NOT EXISTS \`user_stats\` (
                \`user_id\` VARCHAR(36) NOT NULL,
                \`total_draws\` INT DEFAULT 0,
                \`current_streak\` INT DEFAULT 0,
                \`total_login_days\` INT DEFAULT 1,
                \`last_active_date\` DATE,
                \`unique_dishes_count\` INT DEFAULT 0,
                \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (\`user_id\`),
                CONSTRAINT \`fk_stats_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
            );
        `;

        await connection.query(createTableSql);
        console.log('✅ Table user_stats ensured.');

        // 2. Backfill Data
        console.log('⏳ Starting backfill for existing users...');
        const [users] = await connection.query("SELECT id FROM users");

        for (const user of users) {
            // 2a. Total Draws
            const [draws] = await connection.query(
                "SELECT COUNT(*) as count FROM draws WHERE user_id = ?",
                [user.id]
            );
            const totalDraws = draws[0].count;

            // 2b. Unique Dishes (Collection)
            const [uniqueDishes] = await connection.query(
                "SELECT COUNT(DISTINCT dish_id) as count FROM draws WHERE user_id = ?",
                [user.id]
            );
            const uniqueDishesCount = uniqueDishes[0].count;

            // 2c. Total Login Days (Based on Draw history)
            // Note: 'created_at' in draws implies activity.
            const [loginDays] = await connection.query(
                "SELECT COUNT(DISTINCT DATE(created_at)) as count FROM draws WHERE user_id = ?",
                [user.id]
            );
            // Default to 1 if user exists but has no draws (creation day counts as 1 if we tracked it, but safely at least 1)
            // Or if 0 draws, maybe just 0? But user account creation is an activity.
            // We can check user.created_at if available, but for now max(1, loginDays) is safe.
            // Actually, if they never drew, loginDays is 0. 
            // We will assume 1 if registered.
            const constructedLoginDays = Math.max(1, loginDays[0].count);

            // 2d. Last Active Date (Max draw date or today)
            const [lastDraw] = await connection.query(
                "SELECT MAX(created_at) as last_date FROM draws WHERE user_id = ?",
                [user.id]
            );
            const lastActiveDate = lastDraw[0].last_date ? new Date(lastDraw[0].last_date) : new Date();

            // 2e. Streak (Simple heuristic: 0 for now to rely on future activity, or 1 if drew today)
            // Calculating historical streak is complex. Resetting to 1 is fair for a new system.
            const currentStreak = 1;

            // Insert or Update
            await connection.query(`
                INSERT INTO user_stats (user_id, total_draws, unique_dishes_count, total_login_days, last_active_date, current_streak)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    total_draws = VALUES(total_draws),
                    unique_dishes_count = VALUES(unique_dishes_count),
                    total_login_days = VALUES(total_login_days),
                    last_active_date = VALUES(last_active_date)
             `, [user.id, totalDraws, uniqueDishesCount, constructedLoginDays, lastActiveDate, currentStreak]);

            process.stdout.write('.'); // Progress dot
        }

        console.log('\n✅ Backfill completed for ' + users.length + ' users.');
        console.log('🎉 Stats migration process finished!');

    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        if (connection) await connection.end();
    }
}

migrateStats();
