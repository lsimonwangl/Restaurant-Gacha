const Group = require('../models/groupModel');

class GroupService {

    // 取得使用者群組
    static async getUserGroups(userId, type = 'all') {
        if (type === 'owned') {
            return await Group.findOwned(userId);
        } else if (type === 'saved') {
            return await Group.findSaved(userId);
        } else if (type === 'shared') {
            return await Group.findShared(userId);
        }
        return await Group.findAll(userId);
    }

    // 取得探索群組
    static async getExploreGroups(userId) {
        return await Group.getExplore(userId);
    }

    // 建立群組
    static async createGroup(data, userId) {
        // Business Rule: Validate required fields (Basic validation)
        if (!data.name) throw { statusCode: 400, message: 'Group name is required' };

        // Use provided slug or auto-generate (if logic was here, but for now we trust controller/model)
        const id = await Group.create(data, userId);
        return await Group.findById(id);
    }

    // 更新群組
    static async updateGroup(groupId, updates, userId) {
        const group = await Group.findById(groupId);
        if (!group) throw { statusCode: 404, message: 'Group not found' };

        // Business Rule: Ownership Check
        if (group.user_id !== userId) {
            throw { statusCode: 403, message: 'Not authorized to update this group' };
        }

        await Group.update(groupId, updates);
        return await Group.findById(groupId);
    }

    // 刪除群組
    static async deleteGroup(groupId, userId) {
        const group = await Group.findById(groupId);
        if (!group) throw { statusCode: 404, message: 'Group not found' };

        // Business Rule: Ownership Check
        if (group.user_id !== userId) {
            throw { statusCode: 403, message: 'Not authorized to delete this group' };
        }

        await Group.delete(groupId);
        return { message: 'Group deleted' };
    }

    // 收藏/取消收藏邏輯比較簡單，也可以搬進來
    static async saveGroup(userId, groupId) {
        const group = await Group.findById(groupId);
        if (!group) throw { statusCode: 404, message: 'Group not found' };

        // Business Rule: Cannot save own group
        if (group.user_id === userId) {
            throw { statusCode: 400, message: 'Cannot save your own group' };
        }

        await Group.save(userId, groupId);
    }

    static async unsaveGroup(userId, groupId) {
        await Group.unsave(userId, groupId);
    }

    // 管理群組餐廳
    static async addDishToGroup(groupId, dishId, userId) {
        const group = await Group.findById(groupId);
        if (!group) throw { statusCode: 404, message: 'Group not found' };

        if (group.user_id !== userId) {
            throw { statusCode: 403, message: 'Only owner can add dishes' };
        }

        await Group.addDish(groupId, dishId);
    }

    static async removeDishFromGroup(groupId, dishId, userId) {
        const group = await Group.findById(groupId);
        if (!group) throw { statusCode: 404, message: 'Group not found' };

        if (group.user_id !== userId) {
            throw { statusCode: 403, message: 'Only owner can remove dishes' };
        }

        await Group.removeDish(groupId, dishId);
    }

    static async getGroupDishes(groupId) {
        // Business Rule: Check if public or saved? (Skipping for now as per original logic)
        return await Group.getDishes(groupId);
    }
}

module.exports = GroupService;
