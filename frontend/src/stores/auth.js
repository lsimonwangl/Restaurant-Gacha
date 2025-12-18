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
                    email: response.data.email,
                    avatar_url: response.data.avatar_url
                };
                localStorage.setItem('token', this.token);
            } catch (err) {
                this.error = err.response?.data?.message || 'Login failed';
                throw err;
            } finally {
                this.loading = false;
            }
        },
        async updateProfile(formData) {
            this.loading = true;
            this.error = null;
            try {
                const response = await authApi.updateProfile(formData);
                this.user = {
                    ...this.user,
                    name: response.data.name,
                    avatar_url: response.data.avatar_url
                };
                if (response.data.token) {
                    this.token = response.data.token;
                    localStorage.setItem('token', this.token);
                }
            } catch (err) {
                this.error = err.response?.data?.message || 'Update failed';
                throw err;
            } finally {
                this.loading = false;
            }
        },
        async changePassword(data) {
            this.loading = true;
            this.error = null;
            try {
                await authApi.changePassword(data);
            } catch (err) {
                this.error = err.response?.data?.message || 'Change password failed';
                throw err;
            } finally {
                this.loading = false;
            }
        },
        async deleteAccount(password) {
            this.loading = true;
            this.error = null;
            try {
                await authApi.deleteAccount({ password });
                this.logout();
            } catch (err) {
                this.error = err.response?.data?.message || 'Delete account failed';
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
