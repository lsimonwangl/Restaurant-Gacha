const db = require('../config/db');

const DAILY_LIMIT = 5;

const checkDailyLimit = async (userId) => {
    const [rows] = await db.query(
        'SELECT COUNT(*) as count FROM `draws` WHERE user_id = ? AND DATE(created_at) = CURDATE()',
        [userId]
    );
    return rows[0].count;
};

const rollRarity = () => {
    const rand = Math.random();
    if (rand < 0.75) return 'common';
    if (rand < 0.95) return 'rare';
    return 'epic';
};

const drawDish = async (req, res) => {
    const { groupId } = req.body;
    const userId = req.user.id;

    try {
        // 1. Check Daily Limit (Disabled by user request)
        const drawCount = await checkDailyLimit(userId);
        // if (drawCount >= DAILY_LIMIT) {
        //     return res.status(403).json({ message: '每日抽卡次數已達上限' });
        // }

        // 2. Roll Rarity
        let rarity = rollRarity();

        // 3. Find dishes in pool
        // Helper to get count
        const getCount = async (r) => {
            const [rows] = await db.query(
                `SELECT COUNT(*) as count FROM \`dishes\` d
         JOIN \`dish_groups\` dg ON d.id = dg.dish_id
         WHERE dg.group_id = ? AND d.rarity = ?`,
                [groupId, r]
            );
            return rows[0].count;
        };

        let count = await getCount(rarity);

        // Smart Fallback Logic: If rolled rarity is empty, try others in order
        if (count === 0) {
            const rarities = ['common', 'rare', 'epic'];
            // Remove the one we already tried
            const others = rarities.filter(r => r !== rarity);

            for (const r of others) {
                count = await getCount(r);
                if (count > 0) {
                    rarity = r;
                    break;
                }
            }
        }

        if (count === 0) {
            return res.status(404).json({ message: '此群組中沒有餐廳可供抽取' });
        }

        // 4. Random Offset
        const offset = Math.floor(Math.random() * count);

        // 5. Fetch Dish
        const [dishes] = await db.query(
            `SELECT d.* FROM \`dishes\` d
       JOIN \`dish_groups\` dg ON d.id = dg.dish_id
       WHERE dg.group_id = ? AND d.rarity = ?
       LIMIT 1 OFFSET ?`,
            [groupId, rarity, offset]
        );

        const dish = dishes[0];

        // 6. Record Draw
        await db.query(
            'INSERT INTO `draws` (user_id, dish_id, rarity) VALUES (?, ?, ?)',
            [userId, dish.id, rarity]
        );

        res.json({
            dish,
            rarity_rolled: rarity,
            remaining: 9999 // Unlimited
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

const getHistory = async (req, res) => {
    const userId = req.user.id;
    try {
        const [rows] = await db.query(
            `SELECT dr.id, dr.created_at, d.name, d.image_url, dr.rarity 
       FROM \`draws\` dr
       JOIN \`dishes\` d ON dr.dish_id = d.id
       WHERE dr.user_id = ?
       ORDER BY dr.created_at DESC`,
            [userId]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { drawDish, getHistory };
