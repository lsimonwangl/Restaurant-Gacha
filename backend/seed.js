const db = require('./config/db');
const bcrypt = require('bcryptjs');

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
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('123456', salt);
        await db.query(
            'INSERT INTO users (email, password, name, avatar_url) VALUES (?, ?, ?, ?)',
            ['admin@test.com', hashedPassword, 'Admin User', '']
        );

        // Create Groups
        const [g1] = await db.query('INSERT INTO `groups` (name, slug, description) VALUES (?, ?, ?)', ['學校附近', 'school', 'NTU nearby food']);
        const [g2] = await db.query('INSERT INTO `groups` (name, slug, description) VALUES (?, ?, ?)', ['家裡附近', 'home', 'UberEats delivery range']);

        const schoolId = g1.insertId;
        const homeId = g2.insertId;

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
            const [res] = await db.query(
                'INSERT INTO dishes (name, description, rarity) VALUES (?, ?, ?)',
                [d.name, 'Delicious food', d.rarity]
            );
            const dishId = res.insertId;
            for (const gid of d.groups) {
                await db.query('INSERT INTO dish_groups (dish_id, group_id) VALUES (?, ?)', [dishId, gid]);
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
