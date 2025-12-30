const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// Try loading from current dir
dotenv.config();

console.log('Current Work Dir:', process.cwd());
console.log('Environment Variables Loaded:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);

// Test Connection
const connect = async () => {
    try {
        console.log('Attempting connection...');
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
        });
        console.log('✅ Connection Successful!');
        await connection.end();
    } catch (e) {
        console.error('❌ Connection Failed:', e.message);
    }
};

connect();
