const GroupService = require('../services/groupService');

const handleServiceError = (res, error) => {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message || 'Server Error' });
};

const getGroups = async (req, res) => {
    try {
        const groups = await GroupService.getUserGroups(req.user.id);
        res.json(groups);
    } catch (error) {
        handleServiceError(res, error);
    }
};

const getExploreGroups = async (req, res) => {
    try {
        const groups = await GroupService.getExploreGroups(req.user.id);
        res.json(groups);
    } catch (error) {
        handleServiceError(res, error);
    }
};

const createGroup = async (req, res) => {
    try {
        const group = await GroupService.createGroup(req.body, req.user.id);
        res.status(201).json(group);
    } catch (error) {
        handleServiceError(res, error);
    }
};

const updateGroup = async (req, res) => {
    try {
        const updated = await GroupService.updateGroup(req.params.id, req.body, req.user.id);
        res.json(updated);
    } catch (error) {
        handleServiceError(res, error);
    }
};

const deleteGroup = async (req, res) => {
    try {
        const result = await GroupService.deleteGroup(req.params.id, req.user.id);
        res.json(result);
    } catch (error) {
        handleServiceError(res, error);
    }
};

const saveGroup = async (req, res) => {
    try {
        await GroupService.saveGroup(req.user.id, req.params.id);
        res.json({ message: 'Group saved' });
    } catch (error) {
        handleServiceError(res, error);
    }
};

const unsaveGroup = async (req, res) => {
    try {
        await GroupService.unsaveGroup(req.user.id, req.params.id);
        res.json({ message: 'Group unsaved' });
    } catch (error) {
        handleServiceError(res, error);
    }
};

const addDishToGroup = async (req, res) => {
    try {
        await GroupService.addDishToGroup(req.body.groupId, req.body.dishId, req.user.id);
        res.json({ message: 'Dish added to group' });
    } catch (error) {
        handleServiceError(res, error);
    }
};

const removeDishFromGroup = async (req, res) => {
    try {
        await GroupService.removeDishFromGroup(req.body.groupId, req.body.dishId, req.user.id);
        res.json({ message: 'Dish removed from group' });
    } catch (error) {
        handleServiceError(res, error);
    }
};

const getGroupDishes = async (req, res) => {
    try {
        const dishes = await GroupService.getGroupDishes(req.params.id);
        res.json(dishes);
    } catch (error) {
        handleServiceError(res, error);
    }
};

module.exports = {
    getGroups, getExploreGroups, createGroup, updateGroup, deleteGroup,
    saveGroup, unsaveGroup,
    addDishToGroup, getGroupDishes, removeDishFromGroup
};
