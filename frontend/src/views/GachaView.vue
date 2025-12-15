<script setup>
import { ref } from 'vue'
import axios from '../axios'
import { useAuthStore } from '../stores/auth'

const result = ref(null)
const loading = ref(false)
const error = ref(null)
const groups = ref([])
const selectedGroup = ref(null)

// Load groups on mount
// For now, mock or try fetch
const fetchGroups = async () => {
    try {
        const res = await axios.get('/groups')
        groups.value = res.data
        if (groups.value.length > 0) selectedGroup.value = groups.value[0].id
    } catch (e) {
        console.error("Failed to fetch groups", e)
        // Mock for UI dev if DB down
        groups.value = [
            { id: 1, name: '學校附近' }, 
            { id: 2, name: '家裡附近' }
        ]
        selectedGroup.value = 1
    }
}
fetchGroups()

const draw = async () => {
    if (!selectedGroup.value) return
    loading.value = true
    error.value = null
    result.value = null
    
    // Simulate animation delay
    await new Promise(r => setTimeout(r, 1000))

    try {
        const res = await axios.post('/gacha/draw', { groupId: selectedGroup.value })
        result.value = res.data
    } catch (e) {
        error.value = e.response?.data?.message || '抽卡失敗，請檢查網路或伺服器'
    } finally {
        loading.value = false
    }
}
</script>

<template>
  <div class="gacha-container">
    <div class="glass-panel control-panel">
      <h2>今日抽卡</h2>
      <div class="form-group">
        <label>選擇區域群組</label>
        <select v-model="selectedGroup" class="input-field">
            <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
        </select>
      </div>
      
      <button class="btn-primary draw-btn" @click="draw" :disabled="loading">
        {{ loading ? '🔮 命運流轉中...' : '🎰 抽取午餐' }}
      </button>

      <div v-if="error" class="error-msg">{{ error }}</div>
    </div>

    <div class="result-area" v-if="result || loading">
      <div class="card" :class="{ 'is-flipped': result }">
        <div class="card-face card-front">
           <div class="card-content">
             ❓
           </div>
        </div>
        <div class="card-face card-back" :class="result?.rarity_rolled">
           <div v-if="result" class="card-content">
             <div class="rarity-badge">{{ result.rarity_rolled === 'common' ? '普通' : result.rarity_rolled === 'rare' ? '稀有' : '史詩' }}</div>
             <img v-if="result.dish.image_url" :src="result.dish.image_url" alt="Food" class="food-img">
             <h3>{{ result.dish.name }}</h3>
             <p>{{ result.dish.description }}</p>
           </div>
        </div>
      </div>
      
      </div>

     <div v-if="result" style="text-align: center; margin-top: 1rem;">
        <p>剩餘次數: {{ result.remaining }}</p>
     </div>
  </div>
</template>

<style scoped>
.gacha-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3rem;
  padding: 2rem 0;
}

.control-panel {
  width: 100%;
  max-width: 500px;
  padding: 3rem 2rem;
  text-align: center;
  background: linear-gradient(135deg, rgba(30,41,59,0.9), rgba(15,23,42,0.95));
}

.draw-btn {
  width: 100%;
  font-size: 1.2rem;
  margin-top: 2rem;
  padding: 1rem;
  letter-spacing: 2px;
  text-transform: uppercase;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); /* Gold/Orange for Gacha */
  box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);
}
.draw-btn:hover {
    box-shadow: 0 6px 20px rgba(245, 158, 11, 0.6);
    transform: translateY(-2px);
}

.error-msg {
  color: var(--error-color);
  margin-top: 1rem;
  background: rgba(239, 68, 68, 0.1);
  padding: 0.5rem;
  border-radius: 6px;
}

/* Card Animation */
.result-area {
  perspective: 1200px;
  width: 320px;
  height: 480px;
  position: relative;
  max-width: 90vw; /* Responsive width */
  max-height: 80vh; /* Responsive height */
}

.card {
  width: 100%;
  height: 100%;
  position: relative;
  transition: transform 1s cubic-bezier(0.175, 0.885, 0.32, 1.275); /* Bouncy transition */
  transform-style: preserve-3d;
}

.card.is-flipped {
  transform: rotateY(180deg);
}

.card-face {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
  border: 1px solid rgba(255,255,255,0.1);
  overflow: hidden;
}

.card-front {
  background: linear-gradient(135deg, #1e293b, #0f172a);
  font-size: 6rem;
  color: rgba(255,255,255,0.1);
  
  /* Pattern */
  background-image: radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px);
  background-size: 20px 20px;
}

.card-back {
  background: #1e293b;
  transform: rotateY(180deg);
  border: 2px solid transparent;
  flex-direction: column;
  padding: 2rem;
  background-clip: padding-box;
}

/* Rarity Styles */
.card-back.common { border-color: #94a3b8; box-shadow: 0 0 30px rgba(148, 163, 184, 0.2); }
.card-back.rare { border-color: #60a5fa; box-shadow: 0 0 40px rgba(96, 165, 250, 0.4); }
.card-back.epic { border-color: #c084fc; box-shadow: 0 0 50px rgba(192, 132, 252, 0.6); }

/* Shine effect for Epic */
.card-back.epic::after {
    content: '';
    position: absolute;
    top: -50%; left: -50%; width: 200%; height: 200%;
    background: linear-gradient(to right, transparent, rgba(255,255,255,0.3), transparent);
    transform: rotate(45deg);
    animation: shine 3s infinite;
    pointer-events: none;
}
@keyframes shine { 
    0% { transform: translateX(-100%) rotate(45deg); } 
    100% { transform: translateX(100%) rotate(45deg); } 
}

.food-img {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: 12px;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

.card-content {
  text-align: center;
  width: 100%;
  z-index: 2; /* Above shine */
}

.card-content h3 {
    font-size: 1.8rem;
    margin-bottom: 0.5rem;
    background: linear-gradient(to right, #fff, #cbd5e1);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.rarity-badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 20px;
    margin-bottom: 1rem;
    font-size: 0.9rem;
    font-weight: bold;
    text-transform: uppercase;
    background: rgba(255,255,255,0.1);
    letter-spacing: 1px;
}

.remaining-count {
    background: rgba(0,0,0,0.3);
    padding: 0.5rem 1rem;
    border-radius: 30px;
    font-size: 0.9rem;
    color: var(--text-muted);
    border: 1px solid rgba(255,255,255,0.05);
}
</style>
