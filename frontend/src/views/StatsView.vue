<script setup>
import { ref, onMounted, watch } from 'vue'
import { gachaApi } from '../api/gacha'
import { groupsApi } from '../api/groups'
import { dishesApi } from '../api/dishes'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

// State
const loading = ref(true)
const userGroups = ref([])
const defaultGroupId = ref(null)

// Stats
const totalDraws = ref(0)
const mostFrequent = ref(null)
const stats = ref({
    currentStreak: 0,
    totalLoginDays: 0,
    uniqueDishesCount: 0
})
const totalDishesCount = ref(0)

// Methods
const fetchStats = async () => {
    loading.value = true
    try {
        const params = { _t: Date.now() }
        if (defaultGroupId.value) {
            params.groupId = defaultGroupId.value
        }

        const [statsRes, groupsRes, dishesRes] = await Promise.all([
            gachaApi.getStats(params),
            groupsApi.getUserGroups(),
            dishesApi.getAll()
        ])

        // API Stats
        totalDraws.value = statsRes.data.totalDraws
        mostFrequent.value = statsRes.data.mostFrequent
        
        // Gamification Stats
        stats.value = {
            currentStreak: statsRes.data.currentStreak || 0,
            totalLoginDays: statsRes.data.totalLoginDays || 0,
            uniqueDishesCount: statsRes.data.uniqueDishesCount || 0
        }

        userGroups.value = groupsRes.data
        totalDishesCount.value = dishesRes.data.length

    } catch (e) {
        console.error('Failed to fetch stats', e)
    } finally {
        loading.value = false
    }
}

// Watch group change
watch(defaultGroupId, async (newVal) => {
    // Refresh stats when filter changes
    // Optimization: separate calls if needed, but getStats is fast enough
    await fetchStats()
})

onMounted(() => {
    fetchStats()
})
</script>

<template>
    <div class="stats-view container">
        <h1 class="page-title">📊 個人紀錄</h1>
        
        <div v-if="loading" class="loading">載入中...</div>
        
        <div v-else class="dashboard-grid">
            
            <!-- Achievements Card -->
            <div class="glass-panel stats-card">
                <h3>🏆 成就紀錄</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-value">{{ stats.currentStreak }}<small>天</small></span>
                        <span class="stat-label">🔥 連續登入</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">{{ stats.totalLoginDays }}<small>天</small></span>
                        <span class="stat-label">📅 總登入</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">{{ totalDishesCount }}<small>間</small></span>
                        <span class="stat-label">🍽️ 餐廳圖鑑</span>
                    </div>
                </div>
            </div>

            <!-- Gacha Stats Card (Filterable) -->
            <div class="glass-panel stats-card">
                <div class="card-header">
                    <h3>🎲 抽卡數據</h3>
                    <select v-if="userGroups.length > 0" v-model="defaultGroupId" class="group-select">
                        <option :value="null">所有群組</option>
                        <option v-for="g in userGroups" :key="g.id" :value="g.id">
                            {{ g.name }}
                        </option>
                    </select>
                </div>
                
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-value">{{ totalDraws }}<small>次</small></span>
                        <span class="stat-label">總抽卡數</span>
                    </div>
                    <div class="stat-item" v-if="mostFrequent">
                        <span class="stat-value highlight">{{ mostFrequent.name }}</span>
                        <span class="stat-label">最常抽到 ({{ mostFrequent.count }}次)</span>
                    </div>
                    <div class="stat-item" v-else>
                        <span class="stat-value">-</span>
                        <span class="stat-label">最常抽到</span>
                    </div>
                </div>
            </div>

        </div>
    </div>
</template>

<style scoped>
.page-title {
    margin-bottom: 2rem;
    color: var(--text-main);
    font-size: 2rem;
    font-weight: 800;
}

.dashboard-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 1.5rem;
}

.glass-panel {
    background: rgba(30, 41, 59, 0.7);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 1.5rem;
}

.stats-card h3 {
    margin-bottom: 1.5rem;
    color: var(--primary-color, #fbbf24);
    font-size: 1.25rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
}
.card-header h3 {
    margin-bottom: 0;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    text-align: center;
}

.stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 12px;
}

.stat-value {
    font-size: 1.8rem;
    font-weight: 800;
    color: var(--text-main);
}

.stat-value small {
    font-size: 0.9rem;
    margin-left: 2px;
    color: var(--text-muted);
    font-weight: normal;
}

.stat-value.highlight {
    font-size: 1.2rem; /* Smaller font for long names */
    word-break: break-word;
    line-height: 1.2;
    padding: 0 0.2rem;
}

.stat-label {
    font-size: 0.85rem;
    color: var(--text-muted);
}

.group-select {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: var(--text-main);
    padding: 0.3rem 0.6rem;
    border-radius: 6px;
    outline: none;
    font-size: 0.9rem;
}

.loading {
    text-align: center;
    color: var(--text-muted);
    padding: 2rem;
}

@media (max-width: 600px) {
    .dashboard-grid {
        grid-template-columns: 1fr;
    }
    .stats-grid {
        grid-template-columns: 1fr 1fr; /* 2 columns on mobile */
    }
}
</style>
