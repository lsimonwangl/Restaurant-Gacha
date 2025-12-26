const db = require('../config/db');

class Dish {
    static async findAll(userId) {
        const [rows] = await db.query(`
            SELECT d.*, 
                   GROUP_CONCAT(CONCAT(g.id, ':', g.name) SEPARATOR '|||') as group_info
            FROM \`dishes\` d
            LEFT JOIN \`dish_groups\` dg ON d.id = dg.dish_id
            LEFT JOIN \`groups\` g ON dg.group_id = g.id
            WHERE d.user_id = ?
            GROUP BY d.id
            ORDER BY d.created_at DESC
        `, [userId]);
        return rows;
    }

    static async findById(id) {
        const [rows] = await db.query('SELECT * FROM `dishes` WHERE id = ?', [id]);
        return rows[0];
    }

    static async create(dish, userId) {
        console.log('Dish.create called with dish:', dish, 'userId:', userId);
        const { name, description, image_url, address, lat, lng, rarity } = dish;
        console.log('Extracted values:', { name, description, image_url, address, lat, lng, rarity, userId });
        const [result] = await db.query(
            'INSERT INTO `dishes` (name, description, image_url, address, lat, lng, rarity, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [name, description, image_url, address || null, lat || null, lng || null, rarity, userId]
        );
        console.log('Insert result:', result);
        return result.insertId;
    }

    static async update(id, dish) {
        const { name, description, image_url, rarity, address, lat, lng } = dish;
        await db.query(
            'UPDATE `dishes` SET name = ?, description = ?, image_url = ?, address = ?, lat = ?, lng = ?, rarity = ? WHERE id = ?',
            [name, description, image_url, address || null, lat || null, lng || null, rarity, id]
        );
    }

    static async delete(id) {
        await db.query('DELETE FROM `dishes` WHERE id = ?', [id]);
    }
}

module.exports = Dish;
