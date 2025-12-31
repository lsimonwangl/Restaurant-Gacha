const db = require('../config/db');
const { v7: uuidv7 } = require('uuid');

class Dish {
    static getRarityFromRating(rating) {
        if (!rating) return 'common';
        const r = parseFloat(rating);
        if (r >= 4.5) return 'legend';
        if (r >= 4.0) return 'epic';
        if (r >= 3.5) return 'rare';
        return 'common';
    }

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
        const { name, description, image_url, address, lat, lng, place_id, rating, review_count, phone, opening_hours } = dish;
        let { rarity } = dish; // Get original rarity

        // Prioritize manual rarity. Only calculate from rating if rarity is missing.
        if (!rarity) {
            if (rating !== undefined && rating !== null && rating !== '') {
                rarity = this.getRarityFromRating(rating);
            } else {
                rarity = 'common';
            }
        }

        const id = uuidv7();
        console.log('Extracted values + Generated ID:', { id, name, description, image_url, address, lat, lng, place_id, rarity, userId });
        await db.query(
            'INSERT INTO `dishes` (id, name, description, image_url, address, lat, lng, place_id, rarity, user_id, rating, review_count, phone, opening_hours) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, name, description, image_url, address || null, lat || null, lng || null, place_id || null, rarity, userId, rating || null, review_count || null, phone || null, opening_hours || null]
        );
        console.log('Insert successful, returning id:', id);
        return id;
    }

    static async update(id, dish) {
        const { name, description, image_url, address, lat, lng, place_id, rating, review_count, phone, opening_hours } = dish;
        let { rarity } = dish;

        // Prioritize manual rarity. Only calculate from rating if rarity is missing.
        if (!rarity && rating !== undefined && rating !== null && rating !== '') {
            rarity = this.getRarityFromRating(rating);
        }

        // Note: If rarity and rating are both missing, rarity remains undefined (will be treated as no change or NULL depending on query construction)
        // However, based on DishService usage, rating is likely always present, so this preserves manual rarity logic if frontend sends it.

        await db.query(
            'UPDATE `dishes` SET name = ?, description = ?, image_url = ?, address = ?, lat = ?, lng = ?, place_id = ?, rarity = ?, rating = ?, review_count = ?, phone = ?, opening_hours = ? WHERE id = ?',
            [name, description, image_url, address || null, lat || null, lng || null, place_id || null, rarity, rating || null, review_count || null, phone || null, opening_hours || null, id]
        );
    }

    static async delete(id) {
        await db.query('DELETE FROM `dishes` WHERE id = ?', [id]);
    }
}

module.exports = Dish;
