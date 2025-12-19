const Gacha = require('../models/gachaModel');
const db = require('../config/db'); // Import DB for transactions

const DAILY_LIMIT = 5;

class GachaService {

    // Internal Helper: 決定稀有度
    static _rollRarity() {
        const rand = Math.random();
        if (rand < 0.75) return 'common';
        if (rand < 0.95) return 'rare';
        return 'epic';
    }

    static async drawDish(userId, groupId) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Check Daily Limit
            const drawCount = await Gacha.getDailyDrawCount(userId, connection);
            // if (drawCount >= DAILY_LIMIT) {
            //     throw { statusCode: 403, message: '每日抽卡次數已達上限' };
            // }

            // 2. 決定稀有度
            let rarity = this._rollRarity();

            // 3. 確認該稀有度是否有菜色
            let count = await Gacha.getValidDishCount(groupId, rarity, connection);

            if (count === 0) {
                const rarities = ['common', 'rare', 'epic'];
                const others = rarities.filter(r => r !== rarity);

                for (const r of others) {
                    count = await Gacha.getValidDishCount(groupId, r, connection);
                    if (count > 0) {
                        rarity = r;
                        break;
                    }
                }
            }

            if (count === 0) {
                throw { statusCode: 404, message: '此群組中沒有餐廳可供抽取' };
            }

            // 4. Random Offset
            const offset = Math.floor(Math.random() * count);

            // 5. Fetch Dish
            const dish = await Gacha.getDishByOffset(groupId, rarity, offset, connection);

            if (!dish) {
                // 如果發生，因為有 Transaction + Row locks (雖然這裡是讀所以可能要 FOR UPDATE?)
                // 在預設 Isolation level 主要是防止不一致。
                throw { statusCode: 404, message: 'Dish not found during draw attempt' };
            }

            // 6. Record Draw
            await Gacha.createDraw(userId, dish.id, rarity, connection);

            await connection.commit();

            return {
                dish,
                rarity_rolled: rarity,
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
