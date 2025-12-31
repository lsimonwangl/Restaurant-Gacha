const Dish = require('../models/dishModel');
const Group = require('../models/groupModel');
const StorageService = require('./storageService');

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
        let image_url = dishData.image_url || '';

        // Handle Google Maps Photo URL -> Download and re-upload to S3
        if (!file && image_url && image_url.includes('google')) {
            try {
                console.log('Downloading Google Image:', image_url.substring(0, 50) + '...');
                const axios = require('axios');
                const response = await axios.get(image_url, { responseType: 'arraybuffer' });
                const buffer = Buffer.from(response.data, 'binary');
                const contentType = response.headers['content-type'] || 'image/jpeg';

                // Use StorageService directly - no mocking needed!
                image_url = await StorageService.uploadFile(buffer, 'google_import.jpg', contentType);
                console.log('Google Image re-uploaded to S3:', image_url);
            } catch (error) {
                console.error('Failed to process Google Image:', error.message);
                // Fallback: keep original URL but log error
            }
        }
        else if (file) {
            // file is from multer: { buffer, originalname, mimetype }
            image_url = await StorageService.uploadFile(file.buffer, file.originalname, file.mimetype);
        }

        console.log('Inserting dish with image_url:', image_url);
        const newDishId = await Dish.create({
            ...dishData,
            image_url // Now a persistent S3 URL (or original if failed)
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
            image_url = await StorageService.uploadFile(file.buffer, file.originalname, file.mimetype);
        } else if (image_url === undefined) {
            // Keep existing if not provided
            image_url = dish.image_url;
        }

        // 確保空字串轉換為 null
        const updateData = {
            ...dishData,
            image_url,
            place_id: dishData.place_id || null,
            rarity: dishData.rarity || dish.rarity, // Preserve manual rarity if not updated
            lat: dishData.lat || null,
            lng: dishData.lng || null,
            address: dishData.address || null,
            rating: dishData.rating !== undefined ? dishData.rating : dish.rating,
            review_count: dishData.review_count !== undefined ? dishData.review_count : dish.review_count,
            phone: dishData.phone !== undefined ? dishData.phone : dish.phone,
            opening_hours: dishData.opening_hours !== undefined ? dishData.opening_hours : dish.opening_hours
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
            rarity: sourceDish.rarity,
            address: sourceDish.address,
            lat: sourceDish.lat,
            lng: sourceDish.lng,
            place_id: sourceDish.place_id,
            rating: sourceDish.rating,
            review_count: sourceDish.review_count,
            phone: sourceDish.phone,
            opening_hours: sourceDish.opening_hours
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
                rarity: dish.rarity,
                address: dish.address,
                lat: dish.lat,
                lng: dish.lng,
                place_id: dish.place_id,
                rating: dish.rating,
                review_count: dish.review_count,
                phone: dish.phone,
                opening_hours: dish.opening_hours
            }, userId);
            count++;
        }
        return { message: 'Imported successfully', count };
    }
}

module.exports = DishService;
