const Dish = require('../models/dishModel');

const getDishes = async (req, res) => {
    try {
        const dishes = await Dish.findAll(req.user.id);
        res.json(dishes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getDishById = async (req, res) => {
    try {
        const dish = await Dish.findById(req.params.id);
        if (dish) {
            res.json(dish);
        } else {
            res.status(404).json({ message: 'Dish not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const { uploadToS3 } = require('../middleware/uploadMiddleware');

const createDish = async (req, res) => {
    const { name, description, rarity } = req.body;
    let image_url = req.body.image_url || ''; // Keep support for raw URL if needed

    try {
        if (req.file) {
            image_url = await uploadToS3(req.file);
        }

        const newDishId = await Dish.create({ name, description, image_url, rarity }, req.user.id);
        const newDish = await Dish.findById(newDishId);
        res.status(201).json(newDish);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateDish = async (req, res) => {
    const { name, description, rarity } = req.body;
    let image_url = req.body.image_url;

    try {
        const dish = await Dish.findById(req.params.id);
        if (dish) {
            // Strictly check ownership
            if (dish.user_id !== req.user.id) {
                return res.status(403).json({ message: 'Not authorized to update this dish' });
            }

            if (req.file) {
                image_url = await uploadToS3(req.file);
            } else if (image_url === undefined) {
                // If no new file and no new url provided, keep old one
                image_url = dish.image_url;
            }

            // Note: If image_url is explicitly sent as empty string or null, it might clear it? 
            // For now, let's assume if it's undefined/null in req, we keep old. 

            await Dish.update(req.params.id, { name, description, image_url, rarity });
            const updatedDish = await Dish.findById(req.params.id);
            res.json(updatedDish);
        } else {
            res.status(404).json({ message: 'Dish not found' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deleteDish = async (req, res) => {
    try {
        const dish = await Dish.findById(req.params.id);
        if (dish) {
            // Strictly check ownership
            if (dish.user_id !== req.user.id) {
                return res.status(403).json({ message: 'Not authorized to delete this dish' });
            }
            await Dish.delete(req.params.id);
            res.json({ message: 'Dish removed' });
        } else {
            res.status(404).json({ message: 'Dish not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getDishes, getDishById, createDish, updateDish, deleteDish };
