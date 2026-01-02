<script setup>
import { ref, watch, onMounted } from 'vue'
import { groupsApi } from '../api/groups'
import { dishesApi } from '../api/dishes'
import DishCard from './DishCard.vue'

const props = defineProps({
    modelValue: Boolean,
    group: Object
})

const emit = defineEmits(['update:modelValue'])

const groupDishes = ref([])
const loadingDishes = ref(false)

// Expansion Logic
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

const fetchDishes = async () => {
    if (!props.group) return;
    loadingDishes.value = true
    groupDishes.value = []
    try {
        const res = await groupsApi.getDishes(props.group.id)
        groupDishes.value = res.data
    } catch (e) {
        alert('無法載入餐廳列表')
    } finally {
        loadingDishes.value = false
    }
}

const importAll = async () => {
    if (!props.group) return;
    if (!confirm(`確定要將「${props.group.name}」的所有餐廳匯入到你的清單嗎？`)) return;
    
    try {
        const res = await dishesApi.importFromGroup(props.group.id);
        alert(`成功匯入 ${res.data.count} 間餐廳！`);
    } catch (e) {
        alert('匯入失敗: ' + (e.response?.data?.message || e.message));
    }
}

const importOne = async (dish) => {
    if (!confirm(`確定要匯入「${dish.name}」嗎？`)) return;
    try {
        const res = await dishesApi.importOne(dish.id);
        if (res.data.isNew) {
            alert(`成功匯入「${dish.name}」！`);
        } else {
            alert(`您已經擁有「${dish.name}」了 (已自動略過以防重複)`);
        }
    } catch (e) {
        alert('匯入失敗: ' + (e.response?.data?.message || e.message));
    }
}

const closeModal = () => {
    emit('update:modelValue', false)
}

watch(() => props.modelValue, (newVal) => {
    if (newVal) {
        fetchDishes()
    } else {
        closeExpand()
    }
})
</script>

<template>
    <Teleport to="body" v-if="modelValue">
<div class="modal-overlay" @click.self="closeModal">
        <div class="modal-wrapper list-modal" style="position: relative;">
            <!-- Glass BG -->
            <div class="glass-panel-bg"></div>
            
            <div class="panel-content" style="position: relative; padding: 2.5rem; height: 100%; overflow-y: auto;">
                <!-- Backdrop -->
                <transition name="fade">
                <div v-if="expandedDishId" class="click-outside-overlay" @click.stop="closeExpand"></div>
                </transition>

            <div class="modal-header-row">
                <h3>{{ group?.name }} <span class="text-muted" style="font-size: 0.9em;">- 餐廳列表</span></h3>
                
                <div v-if="group?.is_owner" class="badge-owner">我分享的</div>
                <div v-else class="owner-info">
                    <img v-if="group?.owner_avatar" :src="group.owner_avatar" class="owner-avatar">
                    <span v-else class="owner-avatar-placeholder">👤</span>
                    <span class="group-owner">by {{ group?.owner_name || '使用者' }}</span>
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
                            <button v-if="!group.is_owner" class="btn-small full-width" @click.stop="importOne(dish)">
                                📥 匯入
                            </button>
                        </template>
                    </DishCard>
                </div>
            </div>

            <div class="modal-actions">
            <button v-if="!group.is_owner" class="btn-primary" @click="importAll">📥 匯入所有餐廳</button>
            <button class="btn-secondary" @click="closeModal">關閉</button>
            </div>
        </div>
        </div>
        </div>
    </Teleport>
</template>

<style scoped>
/* Replicate necessary styles from ExploreView */
.text-muted { color: var(--text-muted); }

.glass-panel-bg {
    position: absolute;
    inset: 0;
    background: rgba(30, 41, 59, 0.95); /* Slightly darker for modal */
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    z-index: 0;
}

.modal-wrapper {
    width: 95%;
    max-width: 1200px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.panel-content {
    z-index: 1;
}

/* Override existing glass-panel if needed or just use wrapper */


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

@keyframes popIn {
  0% { transform: scale(0.95); opacity: 0; }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); opacity: 1; }
}

.modal.list-modal {
    width: 95%;              
    max-width: 1200px;       /* Match RestaurantsView */
    max-height: 85vh;
    overflow-y: auto;
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

.group-owner {
    font-size: 0.85rem;
    color: var(--text-muted);
}

.dish-grid-modal {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); 
    gap: 1.5rem;
    margin-top: 1rem;
    padding-right: 0.5rem;
    align-items: stretch; 
}

.card-wrapper {
  position: relative;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

.btn-primary, .btn-secondary {
    padding: 0.6rem 1.2rem;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid;
}
.btn-primary {
    background: var(--primary-color);
    border-color: var(--primary-color);
    color: white;
}
.btn-secondary {
    background: transparent;
    border-color: rgba(255,255,255,0.2);
    color: var(--text-main);
}
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
    position: fixed;
    inset: 0;
    z-index: 50;
    background: rgba(0,0,0,0.6); 
    backdrop-filter: blur(2px);
    border-radius: 0; /* Full screen, no radius needed */
    cursor: default;
}
.full-width { width: 100%; }
</style>
