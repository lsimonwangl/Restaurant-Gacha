const Dish = require('../models/dishModel');
const Group = require('../models/groupModel');
const { uploadToS3 } = require('../middleware/uploadMiddleware');

class DishService {
    static async getAllDishes(userId) {
        return await Dish.findAll(userId);
    }

    static async getDishById(id) {
        const dish = await Dish.findById(id);
        if (!dish) {
            throw { statusCode: 404, message: 'Dish not found' };
        }
        return dish;
    }

    static async createDish(userId, dishData, file) {
        console.log('DishService.createDish called with userId:', userId, 'dishData:', dishData, 'file:', file ? 'yes' : 'no');
        let image_url = dishData.image_url || '';

        if (file) {
            image_url = await uploadToS3(file, 'dishes');
        }

        console.log('Inserting dish with image_url:', image_url);
        const newDishId = await Dish.create({
            ...dishData,
            image_url
        }, userId);

        console.log('Dish created with id:', newDishId);
        return await Dish.findById(newDishId);
    }

    static async updateDish(id, userId, dishData, file) {
        const dish = await Dish.findById(id);

        if (!dish) {
            throw { statusCode: 404, message: 'Dish not found' };
        }

        // Authorization Check
        if (dish.user_id !== userId) {
            throw { statusCode: 403, message: 'Not authorized to update this dish' };
        }

        let image_url = dishData.image_url;

        if (file) {
            image_url = await uploadToS3(file, 'dishes');
        } else if (image_url === undefined) {
            // Keep existing if not provided
            image_url = dish.image_url;
        }

        // 確保空字串轉換為 null
        const updateData = {
            ...dishData,
            image_url,
            place_id: dishData.place_id || null,
            lat: dishData.lat || null,
            lng: dishData.lng || null,
            address: dishData.address || null
        };

        await Dish.update(id, updateData);

        return await Dish.findById(id);
    }

    static async deleteDish(id, userId) {
        const dish = await Dish.findById(id);

        if (!dish) {
            throw { statusCode: 404, message: 'Dish not found' };
        }

        // Authorization Check
        if (dish.user_id !== userId) {
            throw { statusCode: 403, message: 'Not authorized to delete this dish' };
        }

        await Dish.delete(id);
        return { message: 'Dish removed' };
    }

    static async importDish(userId, sourceDishId) {
        const sourceDish = await Dish.findById(sourceDishId);
        if (!sourceDish) {
            throw { statusCode: 404, message: 'Source dish not found' };
        }

        const newDishId = await Dish.create({
            name: sourceDish.name,
            description: sourceDish.description,
            image_url: sourceDish.image_url,
            rarity: sourceDish.rarity
        }, userId);

        return await Dish.findById(newDishId);
    }

    static async importDishesFromGroup(userId, sourceGroupId) {
        const dishes = await Group.getDishes(sourceGroupId);
        if (!dishes || dishes.length === 0) {
            return { message: 'No dishes to import', count: 0 };
        }

        let count = 0;
        for (const dish of dishes) {
            await Dish.create({
                name: dish.name,
                description: dish.description,
                image_url: dish.image_url,
                rarity: dish.rarity
            }, userId);
            count++;
        }
        return { message: 'Imported successfully', count };
    }
}

module.exports = DishService;
