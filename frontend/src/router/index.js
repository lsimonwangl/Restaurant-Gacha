import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import LoginView from '../views/LoginView.vue';
import RegisterView from '../views/RegisterView.vue';

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'home',
            component: HomeView,
        },
        {
            path: '/login',
            name: 'login',
            component: LoginView,
        },
        {
            path: '/register',
            name: 'register',
            component: RegisterView,
        },
        {
            path: '/gacha',
            name: 'gacha',
            component: () => import('../views/GachaView.vue'),
        },
        {
            path: '/restaurants',
            name: 'restaurants',
            component: () => import('../views/RestaurantsView.vue'),
        },
        {
            path: '/nearby',
            name: 'nearby',
            component: () => import('../views/NearbyView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/explore',
            name: 'explore',
            component: () => import('../views/ExploreView.vue'),
        },
        {
            path: '/profile',
            name: 'profile',
            component: () => import('../views/ProfileView.vue'),
        },
        {
            path: '/terminal',
            name: 'terminal',
            component: () => import('../views/TerminalView.vue'),
            meta: { requiresAuth: true }
        },
    ],
});

// Navigation guard
router.beforeEach((to, from, next) => {
    const publicPages = ['/login', '/register'];
    const authRequired = !publicPages.includes(to.path);
    const loggedIn = localStorage.getItem('token');

    if (authRequired && !loggedIn) {
        return next('/login');
    }

    next();
});

export default router;
