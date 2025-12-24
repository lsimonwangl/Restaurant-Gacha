<script setup>
import { ref, onMounted } from 'vue'
import { groupsApi } from '../api/groups'
import { dishesApi } from '../api/dishes'
import DishCard from '../components/DishCard.vue'

const publicGroups = ref([])
const loading = ref(true)

// View Details Modal
const showDetails = ref(false)
const selectedGroup = ref(null)
const groupDishes = ref([])
const loadingDishes = ref(false)

const activeTab = ref('explore') // 'explore' or 'saved'
const savedGroups = ref([])

const fetchExplore = async () => {
    loading.value = true
    try {
        const res = await groupsApi.getExplore()
        publicGroups.value = res.data
    } catch (e) {
        console.error(e)
        alert('無法取得公開群組列表')
    } finally {
        loading.value = false
    }
}

const fetchSaved = async () => {
    loading.value = true
    try {
        const res = await groupsApi.getAll({ type: 'saved' })
        savedGroups.value = res.data
    } catch (e) {
        console.error(e)
        alert('無法取得收藏列表')
    } finally {
        loading.value = false
    }
}

const switchTab = (tab) => {
    activeTab.value = tab
    if (tab === 'explore') {
        fetchExplore()
    } else {
        fetchSaved()
    }
}

const toggleSave = async (group) => {
    try {
        if (group.is_saved_by_me || (activeTab.value === 'saved')) {
             // In 'saved' tab, they are by definition saved (is_saved=1)
             // But the API might return different structures.
             // If we are in 'saved' tab, unsaving removes it from list
             if(!confirm('確定要取消收藏嗎？')) return
             await groupsApi.unsave(group.id)
             
             if (activeTab.value === 'explore') {
                group.is_saved_by_me = 0
                group.save_count--
             } else {
                // Remove from list
                savedGroups.value = savedGroups.value.filter(g => g.id !== group.id)
             }
        } else {
             await groupsApi.save(group.id)
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
        const res = await groupsApi.getDishes(group.id)
        groupDishes.value = res.data
    } catch (e) {
        alert('無法載入餐廳列表')
    } finally {
        loadingDishes.value = false
    }
}

const importAll = async () => {
    if (!selectedGroup.value) return;
    if (!confirm(`確定要將「${selectedGroup.value.name}」的所有餐廳匯入到你的清單嗎？`)) return;
    
    try {
        const res = await dishesApi.importFromGroup(selectedGroup.value.id);
        alert(`成功匯入 ${res.data.count} 間餐廳！`);
    } catch (e) {
        alert('匯入失敗: ' + (e.response?.data?.message || e.message));
    }
}

const importOne = async (dish) => {
    if (!confirm(`確定要匯入「${dish.name}」嗎？`)) return;
    try {
        await dishesApi.importOne(dish.id);
        alert(`成功匯入「${dish.name}」！`);
    } catch (e) {
        alert('匯入失敗: ' + (e.response?.data?.message || e.message));
    }
}

// Expansion Logic (Copied from RestaurantsView for consistency)
const expandedDishId = ref(null)
const wrapperHeights = ref({})

const toggleExpand = (id, event) => {
    if (expandedDishId.value === id) {
        expandedDishId.value = null
        return
    }
    const card = event.target.closest('.dish-card')
    const wrapper = card?.parentElement
    if (wrapper) {
        wrapperHeights.value[id] = wrapper.offsetHeight
    }
    expandedDishId.value = id
}

const closeExpand = () => {
    expandedDishId.value = null
    wrapperHeights.value = {}
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

      <div class="tabs">
        <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'explore' }"
            @click="switchTab('explore')"
        >
            🌏 探索社群
        </button>
        <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'saved' }"
            @click="switchTab('saved')"
        >
            ❤️ 我的收藏
        </button>
      </div>

      <div v-if="loading" style="text-align: center;">載入中...</div>
      
      <div v-else-if="(activeTab === 'explore' ? publicGroups : savedGroups).length === 0" style="text-align: center; color: var(--text-muted); padding: 2rem;">
        {{ activeTab === 'explore' ? '目前沒有其他公開群組。' : '你還沒有收藏任何群組。' }}
      </div>

      <div v-else class="group-grid">
        <div v-for="group in (activeTab === 'explore' ? publicGroups : savedGroups)" 
             :key="group.id" 
             class="group-card" 
             :class="{ 'my-group': group.is_owner }"
             @click="openDetails(group)">
            
            <div class="group-header">
                <h3>{{ group.name }}</h3>
                <span v-if="group.is_owner" class="badge-owner">我分享的</span>
                <div v-else class="owner-info">
                    <img v-if="group.owner_avatar" :src="group.owner_avatar" class="owner-avatar">
                    <span v-else class="owner-avatar-placeholder">👤</span>
                    <!-- Backend findSaved might not join User table for owner name. -->
                    <span class="group-owner">by {{ group.owner_name || '使用者' }}</span>
                </div>
            </div>
            
            <p class="group-desc">{{ group.description || '沒有描述' }}</p>
            
            <div class="preview-images" v-if="group.preview_images">
                <div v-for="(img, index) in group.preview_images.split(',').slice(0, 3)" :key="index" class="preview-img-wrapper">
                     <img :src="img" class="preview-img" loading="lazy">
                     <div v-if="index === 2 && group.preview_images.split(',').length > 3" class="preview-more-overlay">
                        +{{ group.preview_images.split(',').length - 3 }}
                     </div>
                </div>
            </div>

            <div class="group-stats" v-if="activeTab === 'explore'">
                <span>🔥 {{ group.save_count }} 人收藏</span>
            </div>

            <div class="card-actions">
                <button class="btn-secondary full-width" @click.stop="openDetails(group)">
                    👁️ 查看內容
                </button>
                <button v-if="!group.is_owner || activeTab === 'saved'" class="btn-primary full-width" @click.stop="toggleSave(group)"
                        :class="{'btn-saved': group.is_saved_by_me || activeTab === 'saved'}">
                    {{ (group.is_saved_by_me || activeTab === 'saved') ? '💔 取消收藏' : '❤️ 收藏' }}
                </button>
            </div>
        </div>
      </div>
    </div>

    <!-- Review Modal -->
    <Teleport to="body" v-if="showDetails">
        <div class="modal-overlay" @click.self="showDetails = false">
        <div class="glass-panel modal list-modal">
            <!-- Backdrop for closing expanded card -->
            <transition name="fade">
            <div v-if="expandedDishId" class="click-outside-overlay" @click.stop="closeExpand"></div>
            </transition>

            <div class="modal-header-row">
                <h3>{{ selectedGroup?.name }} <span class="text-muted" style="font-size: 0.9em;">- 餐廳列表</span></h3>
                
                <div v-if="selectedGroup?.is_owner" class="badge-owner">我分享的</div>
                <div v-else class="owner-info">
                    <img v-if="selectedGroup?.owner_avatar" :src="selectedGroup.owner_avatar" class="owner-avatar">
                    <span v-else class="owner-avatar-placeholder">👤</span>
                    <span class="group-owner">by {{ selectedGroup?.owner_name || '使用者' }}</span>
                </div>
            </div>
            
            <div v-if="loadingDishes" style="text-align: center; padding: 2rem;">載入中...</div>
            <div v-else-if="groupDishes.length === 0" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                此群組還沒有任何餐廳。
            </div>
            <div v-else class="dish-grid-modal">
                <div v-for="dish in groupDishes" 
                    :key="dish.id" 
                    class="card-wrapper"
                    :style="{ height: expandedDishId === dish.id ? wrapperHeights[dish.id] + 'px' : 'auto' }">
                    
                    <DishCard 
                        :dish="dish"
                        :is-expanded="expandedDishId === dish.id"
                        :show-tags="false"
                        @toggle-expand="(e) => toggleExpand(dish.id, e)"
                    >
                        <template #actions>
                            <button v-if="!selectedGroup.is_owner" class="btn-small full-width" @click.stop="importOne(dish)">
                                📥 匯入
                            </button>
                        </template>
                    </DishCard>
                </div>
            </div>

            <div class="modal-actions">
            <button v-if="!selectedGroup.is_owner" class="btn-primary" @click="importAll">📥 匯入所有餐廳</button>
            <button class="btn-secondary" @click="showDetails = false">關閉</button>
            </div>
        </div>
        </div>
    </Teleport>

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
    align-items: stretch; /* Explicitly ensure stretch */
}

.group-card {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    position: relative;
    height: 100%; /* Force fill grid cell height */
    cursor: pointer;
}

@keyframes popIn {
  0% { transform: scale(0.95); opacity: 0; }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); opacity: 1; }
}

/* ... existing styles ... */

/* ... existing styles ... */

.preview-images {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px; /* Reverted to 8px */
    margin-bottom: 0.5rem; /* Reduced bottom margin */
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
    font-size: 0.85rem;
    color: var(--text-muted);
}

.owner-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.owner-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.owner-avatar-placeholder {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
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

.preview-images {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
    margin-bottom: 0.5rem;
    width: 100%;
}

.preview-img-wrapper {
    aspect-ratio: 4 / 3;
    width: 100%;
    border-radius: 6px;
    overflow: hidden;
    position: relative;
    background: rgba(0,0,0,0.2);
}

.preview-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.preview-more-overlay {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background: rgba(0,0,0,0.6);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    font-weight: bold;
    backdrop-filter: blur(2px);
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

/* List Modal - Ensure specificity overrides .modal */
.modal.list-modal {
    width: 95%;              
    max-width: 1200px;       /* Match RestaurantsView */
    max-height: 85vh;
    overflow-y: auto;
}

.dish-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;               
    margin-top: 1rem;
}

.dish-row {
    display: flex;
    align-items: flex-start; /* Align top for description */
    gap: 1.5rem;             /* Increased gap */
    padding: 1rem;           /* Increased padding */
    background: rgba(255,255,255,0.05);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: background 0.2s;
}

.dish-row:hover {
    background: rgba(255,255,255,0.08);
}

.dish-thumb {
    width: 100px;            /* Increased from 50px */
    height: 100px;           /* Increased from 50px */
    border-radius: 8px;
    object-fit: cover;
    flex-shrink: 0;
    box-shadow: 0 4px 6px rgba(0,0,0,0.2);
}

.dish-info {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex: 1;
    min-width: 0;           /* Prevent text overflow issues */
}

.dish-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.dish-name {
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--text-main);
}

.dish-desc {
    font-size: 0.95rem;
    color: var(--text-muted);
    line-height: 1.5;
    margin: 0;
}

.rarity-tag {
    font-size: 0.75rem;
    text-transform: uppercase;
    font-weight: bold;
    padding: 4px 8px;
    border-radius: 4px;
    background: rgba(255,255,255,0.1);
}
.rarity-tag.common { color: #cbd5e1; background: rgba(148, 163, 184, 0.2); }
.rarity-tag.rare { color: #60a5fa; background: rgba(37, 99, 235, 0.2); }
.rarity-tag.epic { color: #e879f9; background: rgba(192, 38, 211, 0.2); }

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
  z-index: 9999;
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
  animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Tabs */
.tabs {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
    border-bottom: 1px solid rgba(255,255,255,0.1);
}

.tab-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    padding: 0.8rem 1.2rem;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
}

.tab-btn:hover {
    color: var(--text-main);
}

.tab-btn.active {
    color: var(--primary-color);
    border-bottom-color: var(--primary-color);
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

.dish-grid-modal {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); /* Match RestaurantsView 240px */
    gap: 1.5rem;
    margin-top: 1rem;
    padding-right: 0.5rem;
    align-items: stretch; 
}

/* Logic for card wrapper expansion placeholder */
.card-wrapper {
  position: relative;
  /* width and height are managed by grid */
}

/* Re-use buttons but scoped */
.btn-small {
  padding: 0.4rem 0.8rem;
  font-size: 0.85rem;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.2);
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-small:hover {
  background: rgba(255,255,255,0.1);
  color: var(--text-main);
  border-color: rgba(255,255,255,0.4);
}
.click-outside-overlay {
    position: absolute;
    inset: 0;
    z-index: 50;
    background: rgba(0,0,0,0.4); 
    backdrop-filter: blur(2px);
    border-radius: 12px;
    cursor: default;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.modal-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    padding-bottom: 1rem;
    margin-bottom: 1rem;
}

.modal-header-row h3 {
    margin: 0;
    color: var(--primary-color);
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
</style>
