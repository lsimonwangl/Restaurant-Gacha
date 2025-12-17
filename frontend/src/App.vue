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
</script>

<template>
  <header class="navbar glass-panel">
    <div class="logo">
      <RouterLink to="/" class="logo-link">
        <span style="font-size: 1.8rem; margin-right: 0.5rem;">🎰</span>
        Restaurant Gacha
      </RouterLink>
    </div>
    <nav>
      <RouterLink to="/restaurants" class="nav-link">餐廳列表</RouterLink>
      <RouterLink to="/explore" class="nav-link">探索社群</RouterLink>
      <div class="divider"></div>
      <RouterLink v-if="!isAuthenticated" to="/login" class="nav-link">登入</RouterLink>
      <RouterLink v-if="!isAuthenticated" to="/register" class="btn-primary" style="text-decoration: none; padding: 0.5rem 1rem;">註冊</RouterLink>
      
      <div v-else class="user-menu">
         <span style="color: var(--text-muted); margin-right: 1rem;">{{ authStore.user?.name }}</span>
         <a href="#" @click.prevent="logout" class="nav-link">登出</a>
      </div>
    </nav>
  </header>

  <main class="container">
    <RouterView />
  </main>
</template>

<style scoped>
.navbar {
  margin: 1rem;
  padding: 1rem 2rem;
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
</style>
