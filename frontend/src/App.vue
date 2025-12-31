<script setup>
import { RouterLink, RouterView } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'

const dailyVisits = ref(0)
const isVisitExpanded = ref(false)

const toggleVisitBadge = () => {
  isVisitExpanded.value = !isVisitExpanded.value
}

const authStore = useAuthStore()
const isAuthenticated = computed(() => authStore.isAuthenticated) 

onMounted(() => {
  if (authStore.token) {
    authStore.fetchUser()
  }
  // Record visit and get count
  axios.post('/api/stats/visit')
    .then(res => {
      if(res.data.success) dailyVisits.value = res.data.count
    })
    .catch(err => console.error('Stats error:', err))
})

const logout = () => {
  authStore.logout()
  window.location.href = '/login' 
}

const version = __APP_VERSION__

import { useRoute } from 'vue-router'
const route = useRoute()
const isFullWidthPage = computed(() => ['/nearby'].includes(route.path))
</script>

<template>
  <header class="navbar glass-panel">
    <div class="logo">
      <RouterLink to="/" class="logo-link">
        <img src="/logo.png" alt="隨食抽 Logo" class="logo-image" />
        <span class="logo-text">隨食抽</span>
      </RouterLink>
    </div>
    <nav>
      <RouterLink to="/restaurants" class="nav-link">我的餐廳</RouterLink>
      <RouterLink to="/nearby" class="nav-link">附近餐廳</RouterLink>
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

  <main :class="{ 'container': !isFullWidthPage, 'full-width-main': isFullWidthPage }">
    <RouterView />
  </main>

  <footer class="app-footer">
    <p>隨時抽-餐廳抽選系統 • v{{ version }} • 資料庫系統期末專題</p>
  </footer>

  <div 
    class="visit-badge" 
    :class="{ 'expanded': isVisitExpanded }" 
    @click="toggleVisitBadge"
  >
    <span class="visit-icon">👀</span>
    <span class="visit-text">瀏覽人數:</span>
    <span>{{ dailyVisits }}</span>
  </div>
</template>

<style scoped>
.full-width-main {
    flex: 1;
    width: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden; /* Ensure no scrollbars from map */
}
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
  display: flex;
  align-items: center;
  text-decoration: none;
  transition: transform 0.2s;
}

.logo-link:hover {
  transform: scale(1.05);
}
.logo-image {
  height: 60px; /* Increased size */
  width: auto;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2)); /* Add shadow for depth */
}

.logo-text {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-main);
  margin-left: 0.8rem;
  letter-spacing: 1px;
  /* Optional: Add gradient if desired, matching original style */
  background: linear-gradient(to right, #fff, #94a3b8);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
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

.visit-badge {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(30, 41, 59, 0.8); /* Darker background for floating */
  backdrop-filter: blur(8px);
  border-radius: 20px;
  font-size: 0.85rem;
  color: var(--text-muted);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  opacity: 0.8; /* Slightly transparent to not be too attention grabbing */
  cursor: pointer;
}

.visit-badge:hover {
  opacity: 1;
  transform: translateY(-2px);
  background: rgba(30, 41, 59, 0.95);
  color: var(--text-main);
}

.visit-icon {
  font-size: 1rem;
}

.visit-text {
  max-width: 0;
  overflow: hidden;
  opacity: 0;
  white-space: nowrap;
  transition: all 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55); /* Bouncy transition */
}

/* Toggle expansion on click state */
.visit-badge.expanded .visit-text {
  max-width: 100px;
  opacity: 1;
  margin-right: 4px;
}

/* Jelly Animation */
.visit-badge:active {
  transform: scale(0.95);
}

.visit-badge.expanded {
  background: rgba(30, 41, 59, 0.95);
  color: var(--text-main);
  animation: jelly 0.6s ease-in-out both;
}

@keyframes jelly {
  0% { transform: scale(1, 1); }
  30% { transform: scale(1.25, 0.75); }
  40% { transform: scale(0.75, 1.25); }
  50% { transform: scale(1.15, 0.85); }
  65% { transform: scale(0.95, 1.05); }
  75% { transform: scale(1.05, 0.95); }
  100% { transform: scale(1, 1); }
}
</style>
