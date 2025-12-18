import axios from '../axios';

export const groupsApi = {
    // Basic CRUD
    getAll() {
        return axios.get('/groups');
    },
    getUserGroups() {
        return this.getAll();
    },
    getExplore() {
        return axios.get('/groups/explore');
    },
    create(data) {
        return axios.post('/groups', data);
    },
    update(id, data) {
        return axios.put(`/groups/${id}`, data);
    },
    delete(id) {
        return axios.delete(`/groups/${id}`);
    },

    // Social
    save(id) {
        return axios.post(`/groups/${id}/save`);
    },
    unsave(id) {
        return axios.delete(`/groups/${id}/save`); // Check route again, it was .delete /:id/save in route file
    },

    // Dishes management
    getDishes(id, rarity = null) {
        // Handle optional query param if implemented, currently just simple get
        return axios.get(`/groups/${id}/dishes`);
    },
    addDish(groupId, dishId) {
        return axios.post('/groups/add-dish', { groupId, dishId });
    },
    removeDish(groupId, dishId) {
        return axios.post('/groups/remove-dish', { groupId, dishId });
    }
};
