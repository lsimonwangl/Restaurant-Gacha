import axios from 'axios';

const instance = axios.create({
    baseURL: '/api', // Use relative path for Docker/Nginx
    timeout: 5000,
});

// Add a request interceptor to insert auth token
instance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default instance;
