const Gacha = require('../models/gachaModel');

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
        // 1. Check Daily Limit (目前需求說先關閉但保留邏輯)
        const drawCount = await Gacha.getDailyDrawCount(userId);
        // if (drawCount >= DAILY_LIMIT) {
        //     throw { statusCode: 403, message: '每日抽卡次數已達上限' };
        // }

        // 2. 決定稀有度
        let rarity = this._rollRarity();

        // 3. 確認該稀有度是否有菜色 (Smart Fallback)
        let count = await Gacha.getValidDishCount(groupId, rarity);

        if (count === 0) {
            const rarities = ['common', 'rare', 'epic'];
            // 排除剛才抽到的空稀有度
            const others = rarities.filter(r => r !== rarity);

            for (const r of others) {
                count = await Gacha.getValidDishCount(groupId, r);
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
        const dish = await Gacha.getDishByOffset(groupId, rarity, offset);

        if (!dish) {
            // 理論上不該發生，因為前面有點過數量
            throw { statusCode: 404, message: 'Dish not found during draw' };
        }

        // 6. Record Draw
        await Gacha.createDraw(userId, dish.id, rarity);

        return {
            dish,
            rarity_rolled: rarity,
            remaining: 9999 // Unlimited for now
        };
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
