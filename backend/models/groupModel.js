const db = require('../config/db');

class Group {
    static async findAll(userId) {
        // Find both Owned groups AND Saved groups
        const sql = `
            SELECT g.*, 
                   CASE WHEN g.user_id = ? THEN 1 ELSE 0 END as is_owner,
                   CASE WHEN sg.id IS NOT NULL THEN 1 ELSE 0 END as is_saved
            FROM \`groups\` g
            LEFT JOIN \`saved_groups\` sg ON g.id = sg.group_id AND sg.user_id = ?
            WHERE g.user_id = ? OR sg.id IS NOT NULL
            ORDER BY g.created_at DESC
        `;
        const [rows] = await db.query(sql, [userId, userId, userId]);
        return rows;
    }

    static async getExplore(userId) {
        // Find ALL Public groups (including mine), but excluding saved (unless we want to show saved too? User just said "see my own group").
        // Let's keep "excluding saved" for now or maybe just show all public.
        // User said: "See my own group... show this is my shared group... and save count".
        // Use CASE to mark is_owner.
        const sql = `
            SELECT g.*, u.name as owner_name, u.avatar_url as owner_avatar,
                   CASE WHEN g.user_id = ? THEN 1 ELSE 0 END as is_owner,
                   CASE WHEN sg.id IS NOT NULL THEN 1 ELSE 0 END as is_saved_by_me,
                   (SELECT COUNT(*) FROM saved_groups WHERE group_id = g.id) as save_count
            FROM \`groups\` g
            JOIN \`users\` u ON g.user_id = u.id
            LEFT JOIN \`saved_groups\` sg ON g.id = sg.group_id AND sg.user_id = ?
            WHERE g.is_public = TRUE
            ORDER BY g.created_at DESC
        `;
        const [rows] = await db.query(sql, [userId, userId]);
        return rows;
    }

    static async create(group, userId) {
        const { name, slug, description, is_public = false } = group;
        const [result] = await db.query(
            'INSERT INTO `groups` (name, slug, description, is_public, user_id) VALUES (?, ?, ?, ?, ?)',
            [name, slug, description, is_public, userId]
        );
        return result.insertId;
    }

    static async update(id, data) {
        const { name, description, is_public } = data;
        // Build dynamic query
        let fields = [];
        let values = [];
        if (name !== undefined) { fields.push('name = ?'); values.push(name); }
        if (description !== undefined) { fields.push('description = ?'); values.push(description); }
        if (is_public !== undefined) { fields.push('is_public = ?'); values.push(is_public); }

        if (fields.length === 0) return;

        values.push(id);
        const sql = `UPDATE \`groups\` SET ${fields.join(', ')} WHERE id = ?`;
        await db.query(sql, values);
    }

    static async delete(id) {
        await db.query('DELETE FROM `groups` WHERE id = ?', [id]);
    }

    static async findById(id) {
        const [rows] = await db.query('SELECT * FROM `groups` WHERE id = ?', [id]);
        return rows[0];
    }

    static async save(userId, groupId) {
        await db.query('INSERT IGNORE INTO `saved_groups` (user_id, group_id) VALUES (?, ?)', [userId, groupId]);
    }

    static async unsave(userId, groupId) {
        await db.query('DELETE FROM `saved_groups` WHERE user_id = ? AND group_id = ?', [userId, groupId]);
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
