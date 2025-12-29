const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD, // Make sure this is set in .env
    database: process.env.DB_NAME || 'restaurant_gacha',
    multipleStatements: true
};

async function migrate() {
    console.log('🔄 Starting migration...', config.host);
    let connection;

    try {
        connection = await mysql.createConnection(config);
        console.log('✅ Connected to database.');

        // 1. Add is_public column
        try {
            await connection.query("ALTER TABLE `groups` ADD COLUMN `is_public` BOOLEAN DEFAULT FALSE");
            console.log('✅ Added is_public column.');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ is_public column already exists.');
            } else {
                throw err;
            }
        }

        // 2. Drop old unique index on slug
        try {
            // First check if it exists or just try to drop (MySQL doesn't support IF EXISTS for DROP INDEX easily in all versions)
            // We generally known the constraint name is 'slug' because it was defined as UNIQUE key in schema
            await connection.query("ALTER TABLE `groups` DROP INDEX `slug`");
            console.log('✅ Dropped global unique index on slug.');
        } catch (err) {
            if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
                console.log('ℹ️ Index `slug` does not exist or already dropped.');
            } else {
                console.log('⚠️ Could not drop index `slug`: ' + err.message);
            }
        }

        // 3. Add new composite unique index
        try {
            await connection.query("ALTER TABLE `groups` ADD UNIQUE KEY `unique_user_slug` (user_id, slug)");
            console.log('✅ Added composite unique index (user_id, slug).');
        } catch (err) {
            if (err.code === 'ER_DUP_KEYNAME') {
                console.log('ℹ️ Index `unique_user_slug` already exists.');
            } else {
                console.log('⚠️ Could not add index: ' + err.message);
            }
        }

        // 4. Create saved_groups table
        const createSavedGroups = `
      CREATE TABLE IF NOT EXISTS \`saved_groups\` (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        group_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (group_id) REFERENCES \`groups\`(id) ON DELETE CASCADE,
        UNIQUE KEY unique_save (user_id, group_id)
      );
    `;
        await connection.query(createSavedGroups);
        console.log('✅ Table saved_groups ensured.');

        // 5. Add address / lat / lng to dishes if missing
        try {
            await connection.query("ALTER TABLE `dishes` ADD COLUMN `address` VARCHAR(500)");
            await connection.query("ALTER TABLE `dishes` ADD COLUMN `lat` DECIMAL(10,7)");
            await connection.query("ALTER TABLE `dishes` ADD COLUMN `lng` DECIMAL(10,7)");
            await connection.query("ALTER TABLE `dishes` ADD COLUMN `place_id` VARCHAR(255) NULL");
            console.log('✅ Added address/lat/lng/place_id columns to dishes.');
        } catch (err) {
            // Error codes when column exists vary; just warn
            console.log('ℹ️ address/lat/lng columns may already exist or could not be added: ' + err.message);
        }

        console.log('🎉 Migration completed successfully!');

    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        if (connection) await connection.end();
    }
}

migrate();
