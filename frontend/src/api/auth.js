import axios from '../axios';

export const authApi = {
    register(userData) {
        return axios.post('/auth/register', userData);
    },
    login(credentials) {
        return axios.post('/auth/login', credentials);
    },
    getMe() {
        return axios.get('/auth/me');
    }
};
