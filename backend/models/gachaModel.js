const db = require('../config/db');
const { v7: uuidv7 } = require('uuid');

class Gacha {
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

    static async createDraw(userId, dishId, rarity, connection = null) {
        const queryExecutor = connection || db;
        const id = uuidv7();
        await queryExecutor.query(
            'INSERT INTO `draws` (id, user_id, dish_id, rarity) VALUES (?, ?, ?, ?)',
            [id, userId, dishId, rarity]
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

    static async getDrawCount(userId, groupId = null) {
        let sql = 'SELECT COUNT(DISTINCT dr.id) as count FROM `draws` dr';
        const params = [];

        if (groupId) {
            sql += ' JOIN `dish_groups` dg ON dr.dish_id = dg.dish_id WHERE dr.user_id = ? AND dg.group_id = ?';
            params.push(userId, groupId);
        } else {
            sql += ' WHERE dr.user_id = ?';
            params.push(userId);
        }

        const [rows] = await db.query(sql, params);
        return rows[0].count;
    }

    static async getMostFrequent(userId, groupId = null) {
        let sql = `
            SELECT d.name, COUNT(*) as count 
            FROM \`draws\` dr
            JOIN \`dishes\` d ON dr.dish_id = d.id
        `;
        const params = [];

        if (groupId) {
            sql += ' JOIN `dish_groups` dg ON dr.dish_id = dg.dish_id WHERE dr.user_id = ? AND dg.group_id = ?';
            params.push(userId, groupId);
        } else {
            sql += ' WHERE dr.user_id = ?';
            params.push(userId);
        }

        sql += ' GROUP BY d.id, d.name ORDER BY count DESC LIMIT 1';

        const [rows] = await db.query(sql, params);
        return rows[0];
    }
}

module.exports = Gacha;
