const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const config = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3308,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'restaurant_gacha'
};

async function verifyStats() {
    console.log('🔍 Verifying Stats...');
    const conn = await mysql.createConnection(config);

    try {
        const [users] = await conn.query("SELECT id, name FROM users LIMIT 3");

        for (const user of users) {
            console.log(`\nUser: ${user.name} (${user.id})`);
            const [stats] = await conn.query("SELECT * FROM user_stats WHERE user_id = ?", [user.id]);
            console.table(stats);

            // Cross check with draws
            const [draws] = await conn.query("SELECT COUNT(*) as c FROM draws WHERE user_id = ?", [user.id]);
            console.log(`Real Count in Draws Table: ${draws[0].c}`);

            if (stats.length > 0 && stats[0].total_draws === draws[0].c) {
                console.log('✅ Sync Check Passed');
            } else {
                console.log('⚠️ Sync Check Failed (Might happen if they drew while migration was running)');
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await conn.end();
    }
}

verifyStats();
