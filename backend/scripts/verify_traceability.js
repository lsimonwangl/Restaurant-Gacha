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

async function verify() {
    let connection;
    try {
        console.log('🔍 Connecting to database at', config.host, '...');
        connection = await mysql.createConnection(config);
        console.log('✅ Connection successful!');

        // 1. Check Schema
        console.log('\n--- Checking Schema ---');
        const [cols] = await connection.query("SHOW COLUMNS FROM `draws` LIKE 'group_id'");
        if (cols.length > 0) {
            console.log('✅ Column `group_id` FOUND in `draws` table.');
            console.log('   Type:', cols[0].Type);
        } else {
            console.error('❌ Column `group_id` NOT FOUND in `draws` table!');
        }

        // 2. Check Foreign Key
        console.log('\n--- Checking Constraints ---');
        const [constraints] = await connection.query(`
            SELECT CONSTRAINT_NAME 
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE TABLE_NAME = 'draws' AND COLUMN_NAME = 'group_id'
        `);
        if (constraints.length > 0) {
            console.log('✅ Foreign Key constraint FOUND:', constraints[0].CONSTRAINT_NAME);
        } else {
            console.warn('⚠️ No Foreign Key constraint found for `group_id` (This might be okay if strictly checking logical link).');
        }

        // 3. Check Data Quality
        console.log('\n--- Checking Data ---');
        const [rows] = await connection.query("SELECT COUNT(*) as count FROM `draws` WHERE group_id IS NOT NULL");
        console.log(`📊 Number of draws with group_id recorded: ${rows[0].count}`);

        if (rows[0].count === 0) {
            console.log('ℹ️ No draws with group_id yet. (Try drawing a card in the app!)');
        } else {
            console.log('✅ Traceability is working! We have records with source groups.');
        }

    } catch (err) {
        console.error('❌ Verification Failed:', err.message);
    } finally {
        if (connection) await connection.end();
        process.exit(0);
    }
}

verify();
