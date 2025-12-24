const DishService = require('../services/dishService');

// Helper to handle service errors
const handleServiceError = (res, error) => {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message || 'Server Error' });
};

const getDishes = async (req, res) => {
    try {
        const dishes = await DishService.getAllDishes(req.user.id);
        res.json(dishes);
    } catch (error) {
        handleServiceError(res, error);
    }
};

const getDishById = async (req, res) => {
    try {
        const dish = await DishService.getDishById(req.params.id);
        res.json(dish);
    } catch (error) {
        handleServiceError(res, error);
    }
};

const createDish = async (req, res) => {
    try {
        const newDish = await DishService.createDish(req.user.id, req.body, req.file);
        res.status(201).json(newDish);
    } catch (error) {
        // Handle specific error types if needed, otherwise generic
        // Assuming DishService throws errors with statusCode if known
        handleServiceError(res, error);
    }
};

const updateDish = async (req, res) => {
    try {
        const updatedDish = await DishService.updateDish(req.params.id, req.user.id, req.body, req.file);
        res.json(updatedDish);
    } catch (error) {
        handleServiceError(res, error);
    }
};

const deleteDish = async (req, res) => {
    try {
        const result = await DishService.deleteDish(req.params.id, req.user.id);
        res.json(result);
    } catch (error) {
        handleServiceError(res, error);
    }
};

const importDishes = async (req, res) => {
    try {
        const { groupId } = req.body;
        if (!groupId) {
            return res.status(400).json({ message: 'Group ID is required' });
        }
        const result = await DishService.importDishesFromGroup(req.user.id, groupId);
        res.status(201).json(result);
    } catch (error) {
        handleServiceError(res, error);
    }
};

const importOneDish = async (req, res) => {
    try {
        const { dishId } = req.params;
        const dish = await DishService.importDish(req.user.id, dishId);
        res.status(201).json(dish);
    } catch (error) {
        handleServiceError(res, error);
    }
};

module.exports = { getDishes, getDishById, createDish, updateDish, deleteDish, importDishes, importOneDish };

