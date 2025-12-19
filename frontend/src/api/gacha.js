import axios from '../axios';

export const gachaApi = {
    draw(groupId) {
        return axios.post('/gacha/draw', { groupId });
    },
    getHistory(params) {
        return axios.get('/gacha/history', { params });
    },
    getStats(params) {
        return axios.get('/gacha/stats', { params });
    }
};
