const db = require('./config/db');

const migrate = async () => {
    try {
        console.log('Migrating database...');

        // Add user_id to dishes
        try {
            await db.query('ALTER TABLE `dishes` ADD COLUMN `user_id` INT');
            await db.query('ALTER TABLE `dishes` ADD CONSTRAINT `fk_dish_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE');
            // Assign existing dishes to admin (id=1)
            await db.query('UPDATE `dishes` SET `user_id` = 1 WHERE `user_id` IS NULL');
            console.log('Added user_id to dishes');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('user_id already exists in dishes');
            } else {
                throw e;
            }
        }

        // Add user_id to groups
        try {
            await db.query('ALTER TABLE `groups` ADD COLUMN `user_id` INT');
            await db.query('ALTER TABLE `groups` ADD CONSTRAINT `fk_group_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE');
            // Assign existing groups to admin (id=1)
            await db.query('UPDATE `groups` SET `user_id` = 1 WHERE `user_id` IS NULL');
            console.log('Added user_id to groups');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('user_id already exists in groups');
            } else {
                throw e;
            }
        }

        console.log('Migration completed!');
        process.exit();
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    }
};

migrate();
