import axios from '../axios';

export const gachaApi = {
    draw(groupId) {
        return axios.post('/gacha/draw', { groupId });
    },
    getHistory() {
        return axios.get('/gacha/history');
    }
};
