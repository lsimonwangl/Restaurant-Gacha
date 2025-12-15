const db = require('../config/db');

class Group {
    static async findAll(userId) {
        const [rows] = await db.query('SELECT * FROM `groups` WHERE user_id = ?', [userId]);
        return rows;
    }

    static async create(group, userId) {
        const { name, slug, description } = group;
        const [result] = await db.query(
            'INSERT INTO `groups` (name, slug, description, user_id) VALUES (?, ?, ?, ?)',
            [name, slug, description, userId]
        );
        return result.insertId;
    }

    static async findById(id) {
        const [rows] = await db.query('SELECT * FROM `groups` WHERE id = ?', [id]);
        return rows[0];
    }

    static async addDish(groupId, dishId) {
        await db.query('INSERT IGNORE INTO `dish_groups` (group_id, dish_id) VALUES (?, ?)', [groupId, dishId]);
    }

    // Get dishes in a group, optionally filtered by rarity
    static async getDishes(groupId, rarity = null) {
        let sql = `
      SELECT d.*, 
             GROUP_CONCAT(CONCAT(g2.id, ':', g2.name) SEPARATOR '|||') as group_info
      FROM dishes d
      JOIN \`dish_groups\` dg ON d.id = dg.dish_id
      LEFT JOIN \`dish_groups\` dg2 ON d.id = dg2.dish_id
      LEFT JOIN \`groups\` g2 ON dg2.group_id = g2.id
      WHERE dg.group_id = ?
      GROUP BY d.id
    `;
        const params = [groupId];

        if (rarity) {
            sql += ' AND d.rarity = ?';
            params.push(rarity);
        }

        const [rows] = await db.query(sql, params);
        return rows;
    }

    static async removeDish(groupId, dishId) {
        await db.query('DELETE FROM `dish_groups` WHERE group_id = ? AND dish_id = ?', [groupId, dishId]);
    }
}

module.exports = Group;
