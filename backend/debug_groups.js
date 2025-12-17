const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'restaurant_gacha'
};

async function check() {
    const conn = await mysql.createConnection(config);
    const [rows] = await conn.query('SELECT id, name, is_public, user_id FROM `groups`');
    console.log('Total Groups:', rows.length);
    console.log('Public Groups:', rows.filter(g => g.is_public).length);
    console.table(rows);
    await conn.end();
}

check().catch(console.error);
