const Group = require('../models/groupModel');

const getGroups = async (req, res) => {
    try {
        const groups = await Group.findAll(req.user.id);
        res.json(groups);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createGroup = async (req, res) => {
    const { name, slug, description } = req.body;
    try {
        const id = await Group.create({ name, slug, description }, req.user.id);
        const group = await Group.findById(id);
        res.status(201).json(group);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const addDishToGroup = async (req, res) => {
    const { groupId, dishId } = req.body;
    try {
        await Group.addDish(groupId, dishId);
        res.json({ message: 'Dish added to group' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getGroupDishes = async (req, res) => {
    try {
        const dishes = await Group.getDishes(req.params.id);
        res.json(dishes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const removeDishFromGroup = async (req, res) => {
    const { groupId, dishId } = req.body;
    try {
        await Group.removeDish(groupId, dishId);
        res.json({ message: 'Dish removed from group' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getGroups, createGroup, addDishToGroup, getGroupDishes, removeDishFromGroup };
