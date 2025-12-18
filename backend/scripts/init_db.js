const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const init = async () => {
    try {
        // Connect without database selected
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
        });

        console.log('Connected to MySQL server.');

        // Create Database
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
        console.log(`Database '${process.env.DB_NAME}' created or already exists.`);

        // Switch to Database
        await connection.changeUser({ database: process.env.DB_NAME });

        // Read Schema
        const schemaPath = path.join(__dirname, '../../database/schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Execute Schema - Need to split by ; for multiple statements if driver doesn't support multipleStatements by default (mysql2 does if configured, lets try connection.query with multiple enabled or split)
        // Actually mysql2 createConnection doesn't support multipleStatements by default usually. 
        // Let's enable it in options.

        await connection.end();

        const dbConnection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            multipleStatements: true
        });

        console.log('Executing schema...');
        await dbConnection.query(schema);
        console.log('Schema executed successfully.');

        await dbConnection.end();
        process.exit(0);

    } catch (error) {
        console.error('Initialization failed:', error);
        process.exit(1);
    }
};

init();
