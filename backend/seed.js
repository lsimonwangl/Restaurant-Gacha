const db = require('./config/db');
const bcrypt = require('bcryptjs');
const { v7: uuidv7 } = require('uuid');

const seed = async () => {
    try {
        console.log('Seeding data...');

        // Clear tables
        await db.query('DELETE FROM draws');
        await db.query('DELETE FROM favorites');
        await db.query('DELETE FROM `dish_groups`');
        await db.query('DELETE FROM dishes');
        await db.query('DELETE FROM `groups`');
        await db.query('DELETE FROM users');

        // Create Admin User
        const adminId = uuidv7();
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('123456', salt);
        await db.query(
            'INSERT INTO users (id, email, password, name, avatar_url) VALUES (?, ?, ?, ?, ?)',
            [adminId, 'admin@test.com', hashedPassword, 'Admin User', '']
        );

        // Create Groups
        const schoolId = uuidv7();
        const homeId = uuidv7();
        await db.query('INSERT INTO `groups` (id, name, slug, description, user_id) VALUES (?, ?, ?, ?, ?)', [schoolId, '學校附近', 'school', 'NTU nearby food', adminId]);
        await db.query('INSERT INTO `groups` (id, name, slug, description, user_id) VALUES (?, ?, ?, ?, ?)', [homeId, '家裡附近', 'home', 'UberEats delivery range', adminId]);

        // Create Dishes
        const dishes = [
            { name: '麥當勞', rarity: 'common', groups: [schoolId, homeId] },
            { name: '肯德基', rarity: 'common', groups: [schoolId, homeId] },
            { name: '巷口乾麵', rarity: 'common', groups: [schoolId] },
            { name: '學校自助餐', rarity: 'common', groups: [schoolId] },
            { name: '高級牛排館', rarity: 'epic', groups: [homeId] },
            { name: '鼎泰豐', rarity: 'rare', groups: [schoolId, homeId] },
            { name: '壽司郎', rarity: 'rare', groups: [schoolId] },
            { name: '路邊攤滷味', rarity: 'common', groups: [homeId] },
            { name: '米其林一星燒肉', rarity: 'epic', groups: [schoolId] },
        ];

        for (const d of dishes) {
            const dishId = uuidv7();
            await db.query(
                'INSERT INTO dishes (id, name, description, rarity, user_id) VALUES (?, ?, ?, ?, ?)',
                [dishId, d.name, 'Delicious food', d.rarity, adminId]
            );

            for (const gid of d.groups) {
                const relationId = uuidv7();
                await db.query('INSERT INTO dish_groups (id, dish_id, group_id) VALUES (?, ?, ?)', [relationId, dishId, gid]);
            }
        }

        console.log('Data seeded successfully!');
        process.exit();
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
};

seed();
