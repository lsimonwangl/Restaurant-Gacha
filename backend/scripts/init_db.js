const fs = require('fs');
const path = require('path');
const db = require('../config/db');

const initDb = async () => {
    try {
        const schemaLocations = [
            path.join(__dirname, '../../database/schema.sql'), // Local Dev (peer folder)
            path.join(__dirname, '../schema.sql')              // Docker Prod (copied to app root)
        ];

        let schemaPath = schemaLocations.find(p => fs.existsSync(p));

        if (!schemaPath) {
            throw new Error(`schema.sql not found in any of: ${schemaLocations.join(', ')}`);
        }

        console.log(`Loading schema from: ${schemaPath}`);
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        // Split by semicolon to get individual statements, filtering out empty ones
        const statements = schemaSql
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0);

        console.log(`Found ${statements.length} SQL statements to execute.`);

        for (const statement of statements) {
            await db.query(statement);
        }

        console.log('Database initialized successfully from schema.sql');
        process.exit(0);
    } catch (error) {
        console.error('Error initializing database:', error);
        process.exit(1);
    }
};

initDb();
