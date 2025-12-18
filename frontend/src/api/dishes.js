import axios from '../axios';

export const dishesApi = {
    getAll() {
        return axios.get('/dishes');
    },
    create(data, config) {
        return axios.post('/dishes', data, config);
    },
    update(id, data, config) {
        return axios.put(`/dishes/${id}`, data, config);
    },
    delete(id) {
        return axios.delete(`/dishes/${id}`);
    }
};
