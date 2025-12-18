<script setup>
import { useAuthStore } from '../stores/auth'
import { ref, onMounted } from 'vue'
import axios from '../axios'

const authStore = useAuthStore()
const lastDraw = ref(null)
const dishCount = ref(0)
const loading = ref(true)
const dishes = ref([])

const fetchStats = async () => {
  try {
    const [historyRes, dishesRes] = await Promise.all([
      axios.get('/gacha/history'),
      axios.get('/dishes')
    ])

    // Process history for today
    if (historyRes.data.length > 0) {
      // Always show the latest draw, user feedback says it wasn't updating (likely timezone mismatch)
      lastDraw.value = historyRes.data[0]
    }

    // Process dish count
    dishes.value = dishesRes.data
    dishCount.value = dishesRes.data.length
  } catch (e) {
    console.error('Fetch stats failed', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchStats()
})
</script>

<template>
  <div class="dashboard">
    <div class="glass-panel hero">
      <h1>👋 嗨，{{ authStore.user?.name || '美食家' }}</h1>
      <p style="color: var(--secondary-color); font-size: 1.2rem;">今天想吃點什麼？</p>
      
      <div class="action-buttons" style="margin-top: 2rem;">
        <RouterLink to="/gacha" class="btn-primary" style="font-size: 1.2rem; padding: 1rem 2rem; text-decoration: none;">
          🎲 開始抽卡
        </RouterLink>
      </div>
    </div>

    <div class="stats-grid">
      <!-- Today's Fortune -->
      <div class="glass-panel stat-card fortune-card">
        <h3>🔥 今日運勢</h3>
        <div v-if="lastDraw" class="fortune-content">
           <div class="fortune-image-wrapper">
             <img v-if="lastDraw.image_url" :src="lastDraw.image_url" class="fortune-img">
             <span v-else class="no-img-placeholder">🍲</span>
             
             <!-- Rarity Badge Overlay -->
             <span class="rarity-tag" :class="lastDraw.rarity">
               {{ lastDraw.rarity === 'common' ? '普通' : lastDraw.rarity === 'rare' ? '稀有' : '史詩' }}
             </span>
           </div>
           
           <div class="fortune-details">
             <p class="restaurant-name">{{ lastDraw.name }}</p>
             <p class="restaurant-desc" v-if="lastDraw.description">{{ lastDraw.description }}</p>
           </div>
        </div>
        <div v-else class="stat-content-centered empty-state">
            <span class="empty-icon">❓</span>
            <p style="color: var(--text-muted); margin: 0.5rem 0 1.5rem;">尚未抽卡</p>
            <RouterLink to="/gacha" class="btn-small">去抽一張</RouterLink>
        </div>
      </div>

      <!-- Collection Stats -->
      <div class="glass-panel stat-card">
        <h3>⭐ 餐廳圖鑑</h3>
        <div class="stat-content-centered">
            <p style="font-size: 3rem; font-weight: 800; line-height: 1; margin-bottom: 0.5rem; background: linear-gradient(to right, #fbbf24, #d97706); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                {{ dishCount }}
            </p>
            <p style="color: var(--text-muted); margin-bottom: 2rem;">收錄餐廳數</p>
            
            <div class="mini-gallery" v-if="dishes.length > 0">
            <div v-for="dish in dishes.slice(0, 9)" :key="dish.id" class="mini-thumb">
                <img v-if="dish.image_url" :src="dish.image_url" :title="dish.name">
                <span v-else class="no-img">🍽️</span>
            </div>
            <div v-if="dishes.length > 9" class="mini-thumb more">
                +{{ dishes.length - 9 }}
            </div>
            </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 3rem;
  padding: 1rem 0;
}

.hero {
  text-align: center;
  padding: 5rem 2rem;
  background: linear-gradient(180deg, rgba(30, 41, 59, 0.4) 0%, rgba(30, 41, 59, 0.8) 100%);
  border: 1px solid rgba(255,255,255,0.05);
}

.hero h1 {
  font-size: 3rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
  background: linear-gradient(to right, #fff, #94a3b8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.action-buttons {
    display: flex;
    justify-content: center;
    gap: 1rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.stat-card {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  justify-content: flex-start; /* Changed from default to explicit start, though default is start */
}

/* ... existing hover ... */

.stat-card h3 {
    font-size: 1.4rem;
    color: var(--text-main);
    border-bottom: 1px solid rgba(255,255,255,0.1);
    padding-bottom: 0.5rem;
    margin-bottom: 0; /* No margin at all */
    text-align: left;
}

/* Center content inside the card specifically */
.stat-content-centered {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    margin-top: -1rem; /* Pull content UPWARDS drastically */
}

.mini-gallery {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
    gap: 10px;
    width: 100%;
    margin-top: 1rem; /* Fixed margin instead of auto */
}

.mini-thumb {
    width: 100%;
    aspect-ratio: 1; /* Square for consistency */
    border-radius: 8px;
    overflow: hidden;
    background: rgba(0,0,0,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    border: 1px solid rgba(255,255,255,0.05);
    transition: transform 0.2s;
}

.mini-thumb:hover {
    transform: scale(1.1);
    z-index: 10;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

.mini-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.mini-thumb.more {
    background: rgba(255,255,255,0.1);
    color: var(--text-muted);
    font-size: 0.9rem;
    font-weight: 600;
}
@media (max-width: 600px) {
  .hero {
    padding: 3rem 1rem;
  }
  .hero h1 {
    font-size: 2rem;
  }
  .stats-grid {
    grid-template-columns: 1fr;
  }
}

.empty-icon {
    font-size: 4rem;
    color: rgba(255,255,255,0.1);
    margin-bottom: 0.5rem;
}

/* Fortune Card Specifics */
.fortune-content {
    display: flex;
    flex-direction: column;
    width: 100%;
    margin-top: 1rem;
}

.fortune-image-wrapper {
    position: relative;
    width: 100%;
    aspect-ratio: 16/9;
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 1rem;
    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
}

.fortune-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s;
}

.fortune-card:hover .fortune-img {
    transform: scale(1.05);
}

.rarity-tag {
    position: absolute;
    top: 10px;
    right: 10px;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: bold;
    color: white;
    text-transform: uppercase;
    backdrop-filter: blur(4px);
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}

.rarity-tag.common { background: rgba(148, 163, 184, 0.9); }
.rarity-tag.rare { background: rgba(59, 130, 246, 0.9); }
.rarity-tag.epic { 
    background: linear-gradient(135deg, #a855f7 0%, #d946ef 100%);
    box-shadow: 0 2px 10px rgba(168, 85, 247, 0.4);
}

.fortune-details {
    padding: 0 0.5rem;
}

.restaurant-name {
    font-size: 1.5rem;
    font-weight: 800;
    margin-bottom: 0.25rem;
    background: linear-gradient(to right, #ffffff, #e2e8f0);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.restaurant-desc {
    color: var(--text-muted);
    font-size: 0.95rem;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.no-img-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 3rem;
    background: rgba(30, 41, 59, 0.5);
}
</style>
