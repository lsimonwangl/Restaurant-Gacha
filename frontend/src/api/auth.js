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
    },
    updateProfile(formData) {
        return axios.put('/auth/update-profile', formData);
    },
    changePassword(data) {
        return axios.put('/auth/change-password', data);
    },
    deleteAccount(data) {
        return axios.delete('/auth/delete-account', { data });
    }
};
