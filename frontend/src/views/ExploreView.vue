<script setup>
import { ref, onMounted } from 'vue'
import axios from '../axios'

const publicGroups = ref([])
const loading = ref(true)

// View Details Modal
const showDetails = ref(false)
const selectedGroup = ref(null)
const groupDishes = ref([])
const loadingDishes = ref(false)

const fetchExplore = async () => {
    loading.value = true
    try {
        const res = await axios.get('/groups/explore')
        publicGroups.value = res.data
    } catch (e) {
        console.error(e)
        alert('無法取得公開群組列表')
    } finally {
        loading.value = false
    }
}

const toggleSave = async (group) => {
    try {
        if (group.is_saved_by_me) {
             await axios.delete(`/groups/${group.id}/save`)
             group.is_saved_by_me = 0
             group.save_count--
        } else {
             await axios.post(`/groups/${group.id}/save`)
             group.is_saved_by_me = 1
             group.save_count++
        }
    } catch (e) {
        alert('操作失敗: ' + (e.response?.data?.message || e.message))
    }
}

const openDetails = async (group) => {
    selectedGroup.value = group
    showDetails.value = true
    groupDishes.value = []
    loadingDishes.value = true
    try {
        const res = await axios.get(`/groups/${group.id}/dishes`)
        groupDishes.value = res.data
    } catch (e) {
        alert('無法載入餐廳列表')
    } finally {
        loadingDishes.value = false
    }
}

onMounted(() => {
    fetchExplore()
})
</script>

<template>
  <div class="explore-container">
    <div class="glass-panel" style="padding: 2rem; width: 100%; max-width: 1000px;">
      <h2>🌏 探索社群群組</h2>
      <p style="color: var(--text-muted); margin-bottom: 2rem;">看看其他人建立了什麼美食清單，收藏後即可在你的抽卡列表使用！</p>

      <div v-if="loading" style="text-align: center;">載入中...</div>
      
      <div v-else-if="publicGroups.length === 0" style="text-align: center; color: var(--text-muted); padding: 2rem;">
        目前沒有其他公開群組。來當第一個分享的人吧！
      </div>

      <div v-else class="group-grid">
        <div v-for="group in publicGroups" :key="group.id" class="group-card" :class="{ 'my-group': group.is_owner }">
            <div class="group-header">
                <h3>{{ group.name }}</h3>
                <span v-if="group.is_owner" class="badge-owner">我分享的</span>
                <span v-else class="group-owner">by {{ group.owner_name }}</span>
            </div>
            
            <p class="group-desc">{{ group.description || '沒有描述' }}</p>
            
            <div class="group-stats">
                <span>🔥 {{ group.save_count }} 人收藏</span>
            </div>

            <div class="card-actions">
                <button class="btn-secondary full-width" @click="openDetails(group)">
                    👁️ 查看內容
                </button>
                <button v-if="!group.is_owner" class="btn-primary full-width" @click="toggleSave(group)"
                        :class="{'btn-saved': group.is_saved_by_me}">
                    {{ group.is_saved_by_me ? '💔 取消收藏' : '❤️ 收藏此群組' }}
                </button>
            </div>
        </div>
      </div>
    </div>

    <!-- Review Modal -->
    <div v-if="showDetails" class="modal-overlay" @click.self="showDetails = false">
      <div class="glass-panel modal list-modal">
        <h3>{{ selectedGroup?.name }} - 餐廳列表</h3>
        
        <div v-if="loadingDishes" style="text-align: center; padding: 2rem;">載入中...</div>
        <div v-else-if="groupDishes.length === 0" style="text-align: center; padding: 2rem; color: var(--text-muted);">
            此群組還沒有任何餐廳。
        </div>
        <div v-else class="dish-list">
            <div v-for="dish in groupDishes" :key="dish.id" class="dish-row">
                <img v-if="dish.image_url" :src="dish.image_url" class="dish-thumb">
                <div class="dish-info">
                    <strong>{{ dish.name }}</strong>
                    <span class="rarity-tag" :class="dish.rarity">{{ dish.rarity }}</span>
                </div>
            </div>
        </div>

        <div class="modal-actions">
           <button class="btn-secondary" @click="showDetails = false">關閉</button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.explore-container {
  display: flex;
  justify-content: center;
  width: 100%;
}

.group-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
}

.group-card {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    transition: transform 0.2s;
    position: relative;
}

.group-card.my-group {
    border-color: rgba(99, 102, 241, 0.5);
    background: rgba(99, 102, 241, 0.05);
}

.group-card:hover {
    transform: translateY(-5px);
    border-color: rgba(255,255,255,0.3);
}

.group-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
}

.group-header h3 {
    margin: 0;
    font-size: 1.2rem;
    color: var(--primary-color);
}

.group-owner {
    font-size: 0.8rem;
    color: var(--text-muted);
}

.badge-owner {
    font-size: 0.7rem;
    background: var(--primary-color);
    color: white;
    padding: 2px 6px;
    border-radius: 4px;
}

.group-desc {
    color: var(--text-main);
    font-size: 0.95rem;
    flex: 1;
    line-height: 1.5;
}

.group-stats {
    font-size: 0.85rem;
    color: var(--text-muted);
    margin-bottom: 0.5rem;
}

.card-actions {
    display: flex;
    gap: 0.5rem;
}

.full-width {
    flex: 1;
}

.btn-saved {
    background: transparent;
    border-color: #ef4444;
    color: #ef4444;
}
.btn-saved:hover {
    background: rgba(239, 68, 68, 0.1);
}

/* List Modal */
.list-modal {
    max-width: 500px;
    max-height: 80vh;
    overflow-y: auto;
}

.dish-list {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    margin-top: 1rem;
}

.dish-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem;
    background: rgba(255,255,255,0.03);
    border-radius: 8px;
}

.dish-thumb {
    width: 50px;
    height: 50px;
    border-radius: 6px;
    object-fit: cover;
}

.dish-info {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
}

.rarity-tag {
    font-size: 0.7rem;
    text-transform: uppercase;
    font-weight: bold;
}
.rarity-tag.common { color: #94a3b8; }
.rarity-tag.rare { color: #60a5fa; }
.rarity-tag.epic { color: #a78bfa; }

/* Modals */
.modal-overlay {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: rgba(0,0,0,0.8);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  animation: fadeIn 0.2s ease-out;
}

.modal {
  padding: 2.5rem;
  width: 90%;
  max-width: 500px;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  position: relative;
  background: var(--card-bg, #1e293b); /* Fallback */
  border: 1px solid rgba(255,255,255,0.1);
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}
</style>
