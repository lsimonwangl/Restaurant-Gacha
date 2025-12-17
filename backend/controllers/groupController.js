const Group = require('../models/groupModel');

const getGroups = async (req, res) => {
    try {
        const groups = await Group.findAll(req.user.id);
        res.json(groups);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getExploreGroups = async (req, res) => {
    try {
        const groups = await Group.getExplore(req.user.id);
        res.json(groups);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createGroup = async (req, res) => {
    const { name, slug, description, is_public } = req.body;
    try {
        const id = await Group.create({ name, slug, description, is_public }, req.user.id);
        const group = await Group.findById(id);
        res.status(201).json(group);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateGroup = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ message: 'Group not found' });

        if (group.user_id !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await Group.update(req.params.id, req.body);
        const updated = await Group.findById(req.params.id);
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteGroup = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ message: 'Group not found' });

        if (group.user_id !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await Group.delete(req.params.id);
        res.json({ message: 'Group deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const saveGroup = async (req, res) => {
    try {
        // Can verify if group exists/is public if we want stricter checks
        await Group.save(req.user.id, req.params.id);
        res.json({ message: 'Group saved' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const unsaveGroup = async (req, res) => {
    try {
        await Group.unsave(req.user.id, req.params.id);
        res.json({ message: 'Group unsaved' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const addDishToGroup = async (req, res) => {
    const { groupId, dishId } = req.body;
    try {
        // Validation: Check if user owns group or if it's a shared group (owner validation handled in model implicitly? No, need check)
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: 'Group not found' });

        // Strict: Only owner can add dishes? Or collaborators? For now, owner only.
        if (group.user_id !== req.user.id) {
            return res.status(403).json({ message: 'Only owner can add dishes' });
        }

        await Group.addDish(groupId, dishId);
        res.json({ message: 'Dish added to group' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getGroupDishes = async (req, res) => {
    try {
        // Anyone can view dishes of a group if they have the ID (or we can enforce is_public/is_saved)
        // For simplicity, let's allow it if they are browsing
        const dishes = await Group.getDishes(req.params.id);
        res.json(dishes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const removeDishFromGroup = async (req, res) => {
    const { groupId, dishId } = req.body;
    try {
        const group = await Group.findById(groupId);
        if (group.user_id !== req.user.id) {
            return res.status(403).json({ message: 'Only owner can remove dishes' });
        }
        await Group.removeDish(groupId, dishId);
        res.json({ message: 'Dish removed from group' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getGroups, getExploreGroups, createGroup, updateGroup, deleteGroup,
    saveGroup, unsaveGroup,
    addDishToGroup, getGroupDishes, removeDishFromGroup
};
