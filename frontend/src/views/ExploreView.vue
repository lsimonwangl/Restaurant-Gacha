<script setup>
import { ref, onMounted, computed } from 'vue'
import { groupsApi } from '../api/groups'
import GroupDetailModal from '../components/GroupDetailModal.vue'

const publicGroups = ref([])
const loading = ref(true)

// View Details Modal
const showDetails = ref(false)
const selectedGroup = ref(null)

const activeTab = ref('explore') // 'explore' | 'saved' | 'shared'
const savedGroups = ref([])
const sharedGroups = ref([])

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

const fetchShared = async () => {
    loading.value = true
    try {
        const res = await groupsApi.getAll({ type: 'shared' })
        sharedGroups.value = res.data
    } catch (e) {
        console.error(e)
        alert('無法取得分享列表')
    } finally {
        loading.value = false
    }
}

const switchTab = (tab) => {
    activeTab.value = tab
    if (tab === 'explore') {
        fetchExplore()
    } else if (tab === 'saved') {
        fetchSaved()
    } else if (tab === 'shared') {
        fetchShared()
    }
}

// Optimization: Computed property for current list
const currentGroups = computed(() => {
    switch (activeTab.value) {
        case 'saved': return savedGroups.value;
        case 'shared': return sharedGroups.value;
        case 'explore':
        default:
            return publicGroups.value;
    }
})

const emptyMessage = computed(() => {
    switch (activeTab.value) {
        case 'explore': return '目前沒有其他公開群組。';
        case 'saved': return '你還沒有收藏任何群組。';
        case 'shared': return '你還沒有分享任何公開群組。';
        default: return '';
    }
})

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

const openDetails = (group) => {
    selectedGroup.value = group
    showDetails.value = true
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
        <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'shared' }"
            @click="switchTab('shared')"
        >
            📤 我分享的群組
        </button>
      </div>

      <div v-if="loading" style="text-align: center;">載入中...</div>
      
      <div v-else-if="currentGroups.length === 0" style="text-align: center; color: var(--text-muted); padding: 2rem;">
        {{ emptyMessage }}
      </div>

      <div v-else class="group-grid">
        <div v-for="group in currentGroups" 
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

    <!-- Separated Modal Component -->
    <GroupDetailModal 
        v-model="showDetails" 
        :group="selectedGroup" 
    />

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
</style>
