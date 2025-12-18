<script setup>
import { useAuthStore } from '../stores/auth'
import { ref, onMounted, computed } from 'vue'
import { gachaApi } from '../api/gacha'
import { dishesApi } from '../api/dishes'
import { groupsApi } from '../api/groups' // Added

const authStore = useAuthStore()
const lastDraw = ref(null)
const dishCount = ref(0)
const loading = ref(true)
const dishes = ref([])
const totalDraws = ref(0)
const mostFrequent = ref(null)
const defaultGroupId = ref(null)
const drawing = ref(false)
const userGroups = ref([]) // Added: Store groups list

// Dynamic Greeting Logic
const greeting = computed(() => {
    const hour = new Date().getHours()
    if (hour < 5) return '夜深了，來點宵夜？'
    if (hour < 11) return '早安，吃早餐了嗎？'
    if (hour < 14) return '午安，午餐想吃什麼？'
    if (hour < 17) return '下午茶時間到了！'
    if (hour < 22) return '晚餐時間，犒賞一下自己！'
    return '夜深了，來點宵夜？'
})

const allDraws = ref([]) // Store full history

const savePreference = () => {
    if (defaultGroupId.value) {
        localStorage.setItem('quickDrawGroupId', defaultGroupId.value)
    }
}

// Re-calculate stats based on selected group (or all)
const calculateStats = () => {
    let targetDraws = allDraws.value
    
    // Filter if specific group selected (and not 'all' if we had that option, currently defaultGroupId is mandatory for quick draw)
    // But for stats viewing, maybe we want 'All' option? User asked "can I see different group stats based on selection".
    // Current UI ties selection to Quick Draw Target.
    // Let's assume if a group is selected, we show stats for that group.
    
    if (defaultGroupId.value) {
        targetDraws = allDraws.value.filter(d => {
            if (!d.group_ids) return false
            const gIds = d.group_ids.split(',')
            return gIds.includes(String(defaultGroupId.value))
        })
    }

    totalDraws.value = targetDraws.length

    // Calculate Most Frequent
    const counts = {}
    targetDraws.forEach(d => {
        counts[d.name] = (counts[d.name] || 0) + 1
    })
    const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1])
    if (sorted.length > 0) {
        mostFrequent.value = { name: sorted[0][0], count: sorted[0][1] }
    } else {
        mostFrequent.value = null
    }
}

// Watch selection to update stats
import { watch } from 'vue'
watch(defaultGroupId, () => {
    calculateStats()
    savePreference()
})

const fetchStats = async () => {
  try {
    const [historyRes, dishesRes, groupsRes] = await Promise.all([
      gachaApi.getHistory({ _t: Date.now() }), // Cache busting
      dishesApi.getAll(),
      groupsApi.getUserGroups()
    ])
    
    userGroups.value = groupsRes.data 
    allDraws.value = historyRes.data // Save full history

    if (groupsRes.data.length > 0) {
        const saved = localStorage.getItem('quickDrawGroupId')
        const found = groupsRes.data.find(g => g.id == saved)
        
        if (saved && found) {
             defaultGroupId.value = Number(saved)
        } else {
             defaultGroupId.value = groupsRes.data[0].id
        }
    }
    
    if (historyRes.data.length > 0) {
      lastDraw.value = historyRes.data[0]
      // Initial calculation
      calculateStats()
    }

    dishes.value = dishesRes.data
    dishCount.value = dishesRes.data.length
  } catch (e) {
    console.error('Fetch stats failed', e)
  } finally {
    loading.value = false
  }
}

const quickDraw = async () => {
    if (!defaultGroupId.value) return
    
    drawing.value = true
    try {
        const res = await gachaApi.draw(defaultGroupId.value)
        
        // Show result
        lastDraw.value = {
            name: res.data.dish.name,
            image_url: res.data.dish.image_url,
            rarity: res.data.rarity_rolled,
            description: res.data.dish.description
        }
        
        // Refetch ALL stats to ensure accuracy (Total Draws, Most Frequent, etc.)
        await fetchStats()
        
    } catch (e) {
        alert(e.response?.data?.message || '抽卡失敗')
    } finally {
        drawing.value = false
    }
}

onMounted(async () => {
  await fetchStats()
})
</script>

<template>
  <div class="dashboard">
    <!-- Floating Background Elements -->
    <div class="background-shapes">
        <span class="shape shape-1">🍕</span>
        <span class="shape shape-2">🍣</span>
        <span class="shape shape-3">🍜</span>
        <span class="shape shape-4">🍔</span>
        <span class="shape shape-5">🍦</span>
        <span class="shape shape-6">🍱</span>
    </div>

    <div class="glass-panel hero">
      <h1>👋 嗨，{{ authStore.user?.name || '美食家' }}</h1>
      <p style="color: var(--secondary-color); font-size: 1.2rem;">{{ greeting }}</p>
      
      <div class="action-buttons" style="margin-top: 2rem;">
        <RouterLink to="/gacha" class="btn-primary" style="font-size: 1.2rem; padding: 1rem 2rem; text-decoration: none;">
          🎲 開始抽卡
        </RouterLink>
      </div>
    </div>

    <div class="stats-grid">
      <!-- 1. Stats Dashboard (New) -->
      <div class="glass-panel stat-card dashboard-card">
          <div class="card-header-row">
            <h3>📊 個人數據</h3>
          </div>
          <div class="dashboard-stats">
              <div class="stat-item">
                  <span class="stat-value">{{ totalDraws }}</span>
                  <span class="stat-label">累積抽卡</span>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-item">
                  <span class="stat-value highlight">{{ mostFrequent?.count || 0 }}</span>
                  <span class="stat-label">最愛: {{ mostFrequent?.name || '無' }}</span>
              </div>
          </div>
          
          <!-- Quick Draw Settings -->
          <div class="quick-draw-settings" v-if="userGroups.length > 0">
              <span class="settings-label">預設抽卡群組:</span>
              <select v-model="defaultGroupId" @change="savePreference" class="group-select">
                  <option v-for="g in userGroups" :key="g.id" :value="g.id">{{ g.name }}</option>
              </select>
          </div>
      </div>

      <!-- 2. Today's Fortune (Modified) -->
      <div class="glass-panel stat-card fortune-card">
        <div class="card-header-row">
            <h3>🔥 今日運勢</h3>
            <!-- Quick Draw Button -->
            <button v-if="lastDraw" @click="quickDraw" :disabled="drawing" class="btn-icon-small" title="再抽一次">
                {{ drawing ? '⏳' : '🔄' }}
            </button>
        </div>
        
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
            <button @click="quickDraw" :disabled="drawing" class="btn-small">
                {{ drawing ? '抽卡中...' : '快來抽一張' }}
            </button>
        </div>
      </div>

      <!-- 3. Collection Stats -->
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
  position: relative;
  z-index: 2; /* Keep content above background */
  backdrop-filter: blur(8px); /* Blur the shapes behind */
}

/* Background Animation */
.background-shapes {
    position: fixed;
    top: 0; left: 0; 
    width: 100%; height: 100%;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
}

.shape {
    position: absolute;
    font-size: 3rem;
    opacity: 0.15;
    animation: float 20s infinite linear;
}

.shape-1 { top: 10%; left: 10%; animation-duration: 25s; }
.shape-2 { top: 20%; right: 20%; animation-duration: 30s; animation-delay: -5s; font-size: 5rem; }
.shape-3 { bottom: 30%; left: 15%; animation-duration: 22s; animation-delay: -10s; }
.shape-4 { bottom: 10%; right: 10%; animation-duration: 28s; animation-delay: -15s; font-size: 4rem; }
.shape-5 { top: 50%; left: 50%; animation-duration: 35s; font-size: 6rem; opacity: 0.1; }
.shape-6 { top: 80%; left: 40%; animation-duration: 20s; }

@keyframes float {
    0% { transform: translate(0, 0) rotate(0deg); }
    33% { transform: translate(30px, -50px) rotate(10deg); }
    66% { transform: translate(-20px, 20px) rotate(-10deg); }
    100% { transform: translate(0, 0) rotate(0deg); }
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


.card-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    padding-bottom: 0.5rem;
    width: 100%;
}

.card-header-row h3 {
    margin: 0;
    border: none;
    padding: 0;
}

.btn-icon-small {
    background: rgba(255,255,255,0.1);
    border: none;
    cursor: pointer;
    font-size: 1.2rem;
    padding: 4px 8px;
    border-radius: 50%;
    transition: background 0.2s, transform 0.2s;
    color: white;
}

.btn-icon-small:hover:not(:disabled) {
    background: rgba(255,255,255,0.2);
    transform: rotate(30deg);
}

.dashboard-stats {
    display: flex;
    justify-content: space-around;
    align-items: center;
    width: 100%;
    flex: 1;
    margin-top: 1rem;
}

.stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
}

.stat-value {
    font-size: 2.5rem;
    font-weight: 800;
    line-height: 1;
    color: white;
}

.stat-value.highlight {
    background: linear-gradient(to right, #f472b6, #db2777); 
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.stat-label {
    font-size: 0.9rem;
    color: var(--text-muted);
}

.stat-divider {
    width: 1px;
    height: 60%;
    background: rgba(255,255,255,0.1);
}

.quick-draw-settings {
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(255,255,255,0.1);
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    gap: 1rem;
}

.settings-label {
    font-size: 0.9rem;
    color: var(--text-muted);
    white-space: nowrap;
}

.group-select {
    flex: 1;
    background: rgba(0,0,0,0.3);
    border: 1px solid rgba(255,255,255,0.1);
    color: var(--text-main);
    padding: 0.4rem 0.8rem;
    border-radius: 6px;
    font-size: 0.9rem;
    outline: none;
    cursor: pointer;
    min-width: 0; /* fixes flex overflow */
}

.group-select:hover {
    background: rgba(0,0,0,0.4);
    border-color: rgba(255,255,255,0.2);
}

.group-select option {
    background: #1e293b;
    color: white;
}

</style>
