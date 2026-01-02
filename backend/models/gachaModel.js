const db = require('../config/db');
const { randomUUID } = require('crypto');
const uuidv7 = randomUUID;

class Gacha {
    // Check if dish is new for user
    static async isNewDish(userId, dishId, connection = null) {
        const queryExecutor = connection || db;
        const [rows] = await queryExecutor.query(
            'SELECT 1 FROM `draws` WHERE user_id = ? AND dish_id = ? LIMIT 1',
            [userId, dishId]
        );
        return rows.length === 0;
    }

    static async getDailyDrawCount(userId, connection = null) {
        const queryExecutor = connection || db;
        const [rows] = await queryExecutor.query(
            'SELECT COUNT(*) as count FROM `draws` WHERE user_id = ? AND DATE(created_at) = CURDATE()',
            [userId]
        );
        return rows[0].count;
    }

    static async getValidDishCount(groupId, rarity, connection = null) {
        const queryExecutor = connection || db;
        const [rows] = await queryExecutor.query(
            `SELECT COUNT(*) as count FROM \`dishes\` d
             JOIN \`dish_groups\` dg ON d.id = dg.dish_id
             WHERE dg.group_id = ? AND d.rarity = ?`,
            [groupId, rarity]
        );
        return rows[0].count;
    }

    static async getDishesForDraw(groupId, connection = null) {
        const queryExecutor = connection || db;
        const [rows] = await queryExecutor.query(
            `SELECT d.id, d.name, d.rarity, d.rating FROM \`dishes\` d
             JOIN \`dish_groups\` dg ON d.id = dg.dish_id
             WHERE dg.group_id = ?`,
            [groupId]
        );
        return rows;
    }

    static async getDishByOffset(groupId, rarity, offset, connection = null) {
        const queryExecutor = connection || db;
        const [dishes] = await queryExecutor.query(
            `SELECT d.* FROM \`dishes\` d
             JOIN \`dish_groups\` dg ON d.id = dg.dish_id
             WHERE dg.group_id = ? AND d.rarity = ?
             LIMIT 1 OFFSET ?`,
            [groupId, rarity, offset]
        );
        return dishes[0];
    }

    static async createDraw(userId, dishId, rarity, groupId, connection = null) {
        const queryExecutor = connection || db;
        const id = uuidv7();
        await queryExecutor.query(
            'INSERT INTO `draws` (id, user_id, dish_id, rarity, group_id) VALUES (?, ?, ?, ?, ?)',
            [id, userId, dishId, rarity, groupId]
        );
    }

    static async getDrawHistory(userId) {
        const [rows] = await db.query(
            `SELECT dr.id, dr.created_at, d.name, d.image_url, dr.rarity, dr.group_id,
            (SELECT name FROM \`groups\` WHERE id = dr.group_id) as group_name
            FROM \`draws\` dr
            JOIN \`dishes\` d ON dr.dish_id = d.id
            WHERE dr.user_id = ?
            ORDER BY dr.created_at DESC`,
            [userId]
        );
        return rows;
    }

    static async getDrawCount(userId, groupId = null) {
        let sql = '';
        const params = [userId];

        if (groupId) {
            sql = 'SELECT COUNT(id) as count FROM `draws` WHERE user_id = ? AND group_id = ?';
            params.push(groupId);
        } else {
            // Count only draws belonging to existing groups for this user
            sql = `
                SELECT COUNT(dr.id) as count 
                FROM \`draws\` dr
                JOIN \`groups\` g ON dr.group_id = g.id
                WHERE dr.user_id = ?
            `;
        }

        const [rows] = await db.query(sql, params);
        return rows[0].count;
    }

    static async getMostFrequent(userId, groupId = null) {
        let sql = '';
        const params = [userId];

        if (groupId) {
            sql = `
                SELECT d.name, COUNT(*) as count 
                FROM \`draws\` dr
                JOIN \`dishes\` d ON dr.dish_id = d.id
                WHERE dr.user_id = ? AND dr.group_id = ?
                GROUP BY d.id, d.name 
                ORDER BY count DESC 
                LIMIT 1
            `;
            params.push(groupId);
        } else {
            // Most frequent among all VALID groups
            sql = `
                SELECT d.name, COUNT(*) as count 
                FROM \`draws\` dr
                JOIN \`dishes\` d ON dr.dish_id = d.id
                JOIN \`groups\` g ON dr.group_id = g.id
                WHERE dr.user_id = ?
                GROUP BY d.id, d.name 
                ORDER BY count DESC 
                LIMIT 1
            `;
        }

        const [rows] = await db.query(sql, params);
        return rows[0];
    }
}

module.exports = Gacha;
