import { defineStore } from 'pinia';
import { authApi } from '../api/auth';

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: null,
        token: localStorage.getItem('token') || null,
        loading: false,
        error: null,
    }),
    getters: {
        isAuthenticated: (state) => !!state.token,
    },
    actions: {
        async register(userData) {
            this.loading = true;
            this.error = null;
            try {
                const response = await authApi.register(userData);
                this.token = response.data.token;
                this.user = response.data;
                localStorage.setItem('token', this.token);
            } catch (err) {
                this.error = err.response?.data?.message || 'Registration failed';
                throw err;
            } finally {
                this.loading = false;
            }
        },
        async login(credentials) {
            this.loading = true;
            this.error = null;
            try {
                const response = await authApi.login(credentials);
                this.token = response.data.token;
                this.user = {
                    id: response.data._id,
                    name: response.data.name,
                    email: response.data.email
                };
                localStorage.setItem('token', this.token);
            } catch (err) {
                this.error = err.response?.data?.message || 'Login failed';
                throw err;
            } finally {
                this.loading = false;
            }
        },
        async fetchUser() {
            if (!this.token) return;
            try {
                const response = await authApi.getMe();
                this.user = response.data;
            } catch (err) {
                this.logout();
            }
        },
        logout() {
            this.user = null;
            this.token = null;
            localStorage.removeItem('token');
        }
    },
});
