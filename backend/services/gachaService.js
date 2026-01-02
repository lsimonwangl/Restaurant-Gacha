const Gacha = require('../models/gachaModel');
const db = require('../config/db'); // Import DB for transactions

const DAILY_LIMIT = 5;

class GachaService {

    /* 
    // Internal Helper: 決定稀有度 (Deprecated)
    static _rollRarity() {
        const rand = Math.random();
        if (rand < 0.75) return 'common';
        if (rand < 0.95) return 'rare';
        return 'epic';
    } 
    */

    static async drawDish(userId, groupId) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Check Daily Limit
            const drawCount = await Gacha.getDailyDrawCount(userId, connection);
            // if (drawCount >= DAILY_LIMIT) {
            //     throw { statusCode: 403, message: '每日抽卡次數已達上限' };
            // }

            // 2. Fetch all dishes in group
            const dishes = await Gacha.getDishesForDraw(groupId, connection);

            if (!dishes || dishes.length === 0) {
                throw { statusCode: 404, message: '此群組中沒有餐廳可供抽取' };
            }

            // 3. Calculate weights and select dish
            // Weights: Legend(40), Epic(30), Rare(20), Common(10)
            const getWeight = (rarity) => {
                switch (rarity) {
                    case 'legend': return 40;
                    case 'epic': return 30;
                    case 'rare': return 20;
                    default: return 10;
                }
            };

            let totalWeight = 0;
            const weightedDishes = dishes.map(d => {
                const weight = getWeight(d.rarity);
                totalWeight += weight;
                return { ...d, weight };
            });

            let random = Math.random() * totalWeight;
            let selectedDish = null;

            for (const d of weightedDishes) {
                random -= d.weight;
                if (random <= 0) {
                    selectedDish = d;
                    break;
                }
            }

            // Fallback (should theoretically not happen if logic is correct)
            if (!selectedDish) selectedDish = weightedDishes[weightedDishes.length - 1];

            // 4. Use selected dish (no need to fetch again by offset)
            // Ideally we need a method to get dish by ID. using db.query directly here for simplicity and to stay in transaction
            const [selectedDishDetails] = await connection.query('SELECT * FROM dishes WHERE id = ?', [selectedDish.id]);
            const finalDish = selectedDishDetails[0];

            if (!finalDish) {
                throw { statusCode: 404, message: 'Dish not found during draw attempt' };
            }

            // 6. Record Draw
            await Gacha.createDraw(userId, finalDish.id, finalDish.rarity, groupId, connection);

            await connection.commit();

            return {
                dish: finalDish,
                rarity_rolled: finalDish.rarity,
                group_id: groupId, // Return for verification
                remaining: 9999
            };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getHistory(userId) {
        return await Gacha.getDrawHistory(userId);
    }

    static async getStats(userId, groupId = null) {
        const totalDraws = await Gacha.getDrawCount(userId, groupId);
        const mostFrequent = await Gacha.getMostFrequent(userId, groupId);

        return {
            totalDraws,
            mostFrequent: mostFrequent || null
        };
    }
}

module.exports = GachaService;
