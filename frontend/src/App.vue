<script setup>
import { RouterLink, RouterView } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { computed, onMounted } from 'vue'

const authStore = useAuthStore()
const isAuthenticated = computed(() => authStore.isAuthenticated) 

onMounted(() => {
  if (authStore.token) {
    authStore.fetchUser()
  }
})

const logout = () => {
  authStore.logout()
  window.location.href = '/login' 
}

const version = __APP_VERSION__
</script>

<template>
  <header class="navbar glass-panel">
    <div class="logo">
      <RouterLink to="/" class="logo-link">
        <span style="font-size: 1.8rem; margin-right: 0.5rem;">🎰</span>
        隨食抽
      </RouterLink>
    </div>
    <nav>
      <RouterLink to="/restaurants" class="nav-link">我的餐廳</RouterLink>
      <RouterLink to="/explore" class="nav-link">探索社群</RouterLink>
      <div class="divider"></div>
      <RouterLink v-if="!isAuthenticated" to="/login" class="nav-link">登入</RouterLink>
      <RouterLink v-if="!isAuthenticated" to="/register" class="btn-primary" style="text-decoration: none; padding: 0.5rem 1rem;">註冊</RouterLink>
      
      <div v-else class="user-menu">
         <RouterLink to="/profile" class="profile-link">
             <img v-if="authStore.user?.avatar_url" :src="authStore.user.avatar_url" class="nav-avatar">
             <span v-else class="nav-avatar-placeholder">👤</span>
             <span class="nav-username">{{ authStore.user?.name }}</span>
         </RouterLink>
         <div class="divider"></div>
         <a href="#" @click.prevent="logout" class="nav-link logout-btn">登出</a>
      </div>
    </nav>
  </header>

  <main class="container">
    <RouterView />
  </main>

  <footer class="app-footer">
    <p>Created by William Wang • v{{ version }}</p>
  </footer>
</template>

<style scoped>
.navbar {
  margin: 1rem;
  padding: 0.8rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 1rem;
  z-index: 100;
}

.logo-link {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-main);
  letter-spacing: -0.5px;
  display: flex;
  align-items: center;
  background: linear-gradient(to right, #fff, #94a3b8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent; 
  /* Fallback for icon */
  text-decoration: none;
}
.logo-link span {
  -webkit-text-fill-color: initial;
}

nav {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.nav-link {
  color: var(--text-muted);
  font-weight: 500;
  transition: color 0.2s;
  position: relative;
  text-decoration: none;
}

.nav-link:hover, .nav-link.router-link-active {
  color: var(--text-main);
}

.nav-link.router-link-active::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--primary-color);
  box-shadow: 0 0 8px var(--primary-color);
  border-radius: 2px;
}

.user-menu {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.profile-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    text-decoration: none;
    color: var(--text-main);
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    transition: background 0.2s;
}

.profile-link:hover {
    background: rgba(255, 255, 255, 0.1);
}

.nav-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid rgba(255, 255, 255, 0.2);
}

.nav-avatar-placeholder {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
}

.nav-username {
    font-weight: 600;
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.divider {
  width: 1px;
  height: 24px;
  background: rgba(255,255,255,0.1);
}

.container {
  flex: 1;
  padding: 2rem 1rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}
@media (max-width: 768px) {
  .navbar {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }
  
  nav {
    width: 100%;
    justify-content: center;
    flex-wrap: wrap;
    gap: 1rem;
  }
  
  .divider {
    display: none;
  }
}

.app-footer {
  text-align: center;
  padding: 1.5rem;
  color: var(--text-muted);
  font-size: 0.8rem;
  margin-top: auto; /* Push to bottom if flex column */
  border-top: 1px solid rgba(255,255,255,0.05);
}
</style>
