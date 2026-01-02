const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const config = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3308,
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

        // Helper to add column safely
        const addColumnSafe = async (table, columnDef) => {
            try {
                await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN ${columnDef}`);
                console.log(`✅ Added column to ${table}: ${columnDef.split(' ')[0]}`);
            } catch (err) {
                // ER_DUP_FIELDNAME = 1060
                if (err.code === 'ER_DUP_FIELDNAME' || err.errno === 1060) {
                    console.log(`ℹ️ Column already exists in ${table}: ${columnDef.split(' ')[0]}`);
                } else {
                    console.warn(`⚠️ Could not add column to ${table}: ${err.message}`);
                }
            }
        };

        // 5. Add address / lat / lng / place_id to dishes if missing
        await addColumnSafe('dishes', '`address` VARCHAR(500)');
        await addColumnSafe('dishes', '`lat` DECIMAL(10,7)');
        await addColumnSafe('dishes', '`lng` DECIMAL(10,7)');
        await addColumnSafe('dishes', '`place_id` VARCHAR(255) NULL');

        // 6. Clean up duplicates in dish_groups
        try {
            console.log('🧹 Cleaning up duplicates in dish_groups...');
            await connection.query(`
                DELETE t1 FROM dish_groups t1
                INNER JOIN dish_groups t2 
                WHERE t1.id > t2.id AND t1.dish_id = t2.dish_id AND t1.group_id = t2.group_id
            `);
            console.log('✅ Duplicates removed from dish_groups.');
        } catch (err) {
            if (err.code === 'ER_NO_SUCH_TABLE') {
                console.log('ℹ️ Table dish_groups does not exist yet, skipping cleanup.');
            } else {
                console.log('⚠️ Error cleaning dish_groups duplicates: ' + err.message);
            }
        }

        // 7. Add UNIQUE constraint to dish_groups
        try {
            await connection.query("ALTER TABLE `dish_groups` ADD UNIQUE KEY `unique_dish_group` (dish_id, group_id)");
            console.log('✅ Added unique constraint to dish_groups.');
        } catch (err) {
            if (err.code === 'ER_DUP_KEYNAME') {
                console.log('ℹ️ Index `unique_dish_group` already exists.');
            } else if (err.code === 'ER_NO_SUCH_TABLE') {
                console.log('ℹ️ Table dish_groups does not exist yet, skipping index add.');
            } else {
                console.log('⚠️ Could not add index to dish_groups: ' + err.message);
            }
        }

        // 8. Clean up duplicates in saved_groups
        try {
            console.log('🧹 Cleaning up duplicates in saved_groups...');
            await connection.query(`
                DELETE t1 FROM saved_groups t1
                INNER JOIN saved_groups t2 
                WHERE t1.id > t2.id AND t1.user_id = t2.user_id AND t1.group_id = t2.group_id
            `);
            console.log('✅ Duplicates removed from saved_groups.');
        } catch (err) {
            console.log('⚠️ Error cleaning saved_groups duplicates: ' + err.message);
        }

        // 9. Add UNIQUE constraint to saved_groups (if missing)
        try {
            await connection.query("ALTER TABLE `saved_groups` ADD UNIQUE KEY `unique_save` (user_id, group_id)");
            console.log('✅ Added unique constraint to saved_groups.');
        } catch (err) {
            if (err.code === 'ER_DUP_KEYNAME') {
                console.log('ℹ️ Index `unique_save` already exists.');
            } else {
                console.log('⚠️ Could not add index to saved_groups: ' + err.message);
            }
        }

        // 10. Add group_id to draws
        try {
            const [cols] = await connection.query("SHOW COLUMNS FROM `draws` LIKE 'group_id'");
            if (cols.length === 0) {
                console.log('✨ Adding group_id to draws...');
                await connection.query("ALTER TABLE `draws` ADD COLUMN `group_id` VARCHAR(36) AFTER `user_id`");
                // Add FK
                await connection.query("ALTER TABLE `draws` ADD CONSTRAINT `fk_draws_group` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE SET NULL");
                console.log('✅ Added group_id to draws.');
            } else {
                console.log('ℹ️ Column group_id already exists in draws.');
            }
        } catch (err) {
            console.warn(`⚠️ Could not add group_id to draws: ${err.message}`);
        }

        console.log('🎉 Migration completed successfully!');

    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        if (connection) await connection.end();
    }
}

migrate();
