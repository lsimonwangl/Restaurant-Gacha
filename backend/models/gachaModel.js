const db = require('../config/db');

class Gacha {
    static async getDailyDrawCount(userId) {
        const [rows] = await db.query(
            'SELECT COUNT(*) as count FROM `draws` WHERE user_id = ? AND DATE(created_at) = CURDATE()',
            [userId]
        );
        return rows[0].count;
    }

    static async getValidDishCount(groupId, rarity) {
        const [rows] = await db.query(
            `SELECT COUNT(*) as count FROM \`dishes\` d
             JOIN \`dish_groups\` dg ON d.id = dg.dish_id
             WHERE dg.group_id = ? AND d.rarity = ?`,
            [groupId, rarity]
        );
        return rows[0].count;
    }

    static async getDishByOffset(groupId, rarity, offset) {
        const [dishes] = await db.query(
            `SELECT d.* FROM \`dishes\` d
             JOIN \`dish_groups\` dg ON d.id = dg.dish_id
             WHERE dg.group_id = ? AND d.rarity = ?
             LIMIT 1 OFFSET ?`,
            [groupId, rarity, offset]
        );
        return dishes[0];
    }

    static async createDraw(userId, dishId, rarity) {
        await db.query(
            'INSERT INTO `draws` (user_id, dish_id, rarity) VALUES (?, ?, ?)',
            [userId, dishId, rarity]
        );
    }

    static async getDrawHistory(userId) {
        const [rows] = await db.query(
            `SELECT dr.id, dr.created_at, d.name, d.image_url, dr.rarity,
            (SELECT GROUP_CONCAT(group_id) FROM dish_groups WHERE dish_id = d.id) as group_ids 
            FROM \`draws\` dr
            JOIN \`dishes\` d ON dr.dish_id = d.id
            WHERE dr.user_id = ?
            ORDER BY dr.created_at DESC`,
            [userId]
        );
        return rows;
    }
}

module.exports = Gacha;
