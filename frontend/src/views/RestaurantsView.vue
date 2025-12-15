<script setup>
import { ref } from 'vue'
import axios from '../axios'

const dishes = ref([])
const groups = ref([])
const loading = ref(true)

// Modals
const showCreateDish = ref(false)
const showCreateGroup = ref(false)
const showAddToGroup = ref(false)
const newDish = ref({ name: '', description: '', rarity: 'common' })
const newGroup = ref({ name: '', description: '' })
const selectedDish = ref(null)
const selectedGroupId = ref(null)
const selectedGroupFilter = ref(null) // For filtering view

const fetchDishes = async () => {
    loading.value = true
    try {
        const res = await axios.get('/dishes')
        dishes.value = res.data
    } catch (e) {
        console.error(e)
    } finally {
        loading.value = false
    }
}

const fetchGroups = async () => {
    try {
        const res = await axios.get('/groups')
        groups.value = res.data
    } catch (e) {
        console.error(e)
    }
}

const filterByGroup = async (group) => {
    if (selectedGroupFilter.value === group.id) {
        // Toggle off
        selectedGroupFilter.value = null
        fetchDishes() // Reset to all
        return
    }
    
    selectedGroupFilter.value = group.id
    loading.value = true
    try {
        const res = await axios.get(`/groups/${group.id}/dishes`)
        dishes.value = res.data
    } catch(e) {
        alert('無法取得群組餐廳')
    } finally {
        loading.value = false
    }
}


const selectedFile = ref(null)
const uploading = ref(false)

// ... existing refs ...

const handleFileUpload = (event) => {
    selectedFile.value = event.target.files[0]
}

const createDish = async () => {
    if (!newDish.value.name) return alert('請輸入名稱')
    
    uploading.value = true
    try {
        const formData = new FormData()
        formData.append('name', newDish.value.name)
        formData.append('description', newDish.value.description)
        formData.append('rarity', newDish.value.rarity)
        if (selectedFile.value) {
            formData.append('image', selectedFile.value)
        }

        await axios.post('/dishes', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
        
        showCreateDish.value = false
        newDish.value = { name: '', description: '', rarity: 'common' }
        selectedFile.value = null
        fetchDishes()
    } catch (e) {
        alert('建立失敗: ' + (e.response?.data?.message || e.message))
    } finally {
        uploading.value = false
    }
}

const createGroup = async () => {
    try {
        await axios.post('/groups', { ...newGroup.value, slug: newGroup.value.name }) // Simple slug
        showCreateGroup.value = false
        newGroup.value = { name: '', description: '' }
        fetchGroups()
    } catch (e) {
        alert('建立失敗: ' + (e.response?.data?.message || e.message))
    }
}

const openAddToGroup = (dish) => {
    selectedDish.value = dish
    showAddToGroup.value = true
    if (groups.value.length > 0) selectedGroupId.value = groups.value[0].id
}

const addToGroup = async () => {
    if (!selectedGroupId.value) return
    try {
        await axios.post('/groups/add-dish', { groupId: selectedGroupId.value, dishId: selectedDish.value.id })
        showAddToGroup.value = false
        alert('已加入群組！')
        fetchDishes()
    } catch (e) {
        alert('加入失敗: ' + (e.response?.data?.message || e.message))
    }
}

const deleteDish = async(dish) => {
    if(!confirm(`確定要刪除餐廳「${dish.name}」嗎？`)) return;
    try {
        await axios.delete(`/dishes/${dish.id}`);
        fetchDishes(); // Refresh list
    } catch (e) {
        alert('刪除失敗: ' + (e.response?.data?.message || e.message));
    }
}

const removeGroupFromDish = async (dish, groupInfo) => {
    const [groupId, groupName] = groupInfo.split(':');
    if(!confirm(`確定要將「${dish.name}」從群組「${groupName}」中移除嗎？`)) return;

    try {
        await axios.post('/groups/remove-dish', { groupId, dishId: dish.id });
        fetchDishes(); // Refresh
    } catch (e) {
        alert('移除失敗: ' + (e.response?.data?.message || e.message));
    }
}

// Edit Logic
const showEditDish = ref(false)
const editDishData = ref({ id: null, name: '', description: '', rarity: 'common' })
const editFile = ref(null)

const openEditDish = (dish) => {
    editDishData.value = { ...dish } // Copy data
    editFile.value = null
    showEditDish.value = true
}

const handleEditFileUpload = (event) => {
    editFile.value = event.target.files[0]
}

const updateDish = async () => {
    if (!editDishData.value.name) return alert('請輸入名稱')
    
    uploading.value = true
    try {
        const formData = new FormData()
        formData.append('name', editDishData.value.name)
        formData.append('description', editDishData.value.description || '')
        formData.append('rarity', editDishData.value.rarity)
        if (editFile.value) {
            formData.append('image', editFile.value)
        }

        await axios.put(`/dishes/${editDishData.value.id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
        
        showEditDish.value = false
        fetchDishes()
    } catch (e) {
        alert('更新失敗: ' + (e.response?.data?.message || e.message))
    } finally {
        uploading.value = false
    }
}

fetchDishes()
fetchGroups()
</script>

<template>
  <div class="list-container">
    <div class="glass-panel" style="padding: 2rem; width: 100%; max-width: 1200px;">
      <h2>餐廳列表</h2>
      
      <div class="actions" style="margin-bottom: 1rem; display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
        <button class="btn-primary" @click="showCreateDish = true">➕ 新增餐廳</button>
        <button class="btn-secondary" @click="showCreateGroup = true">📁 新增群組</button>
        
        <div v-if="groups.length > 0" class="group-list-display">
            <span style="color: var(--secondary-color); margin-right: 0.5rem;" @click="selectedGroupFilter = null; fetchDishes()" :style="{cursor: 'pointer', textDecoration: selectedGroupFilter ? 'underline' : 'none'}">目前群組 (點擊篩選):</span>
            <span v-for="g in groups" :key="g.id" 
                  class="group-tag-display" 
                  :class="{ active: selectedGroupFilter === g.id }"
                  @click="filterByGroup(g)">
                  {{ g.name }}
            </span>
            <button v-if="selectedGroupFilter" class="btn-small" style="margin-left: 0.5rem;" @click="selectedGroupFilter = null; fetchDishes()">❌ 清除篩選</button>
        </div>
      </div>

      <div v-if="loading" style="text-align: center;">載入中...</div>
      
      <div v-else-if="dishes.length === 0" style="text-align: center; color: var(--secondary-color); margin-top: 2rem;">
        {{ selectedGroupFilter ? '此群組沒有餐廳' : '目前沒有餐廳' }}
      </div>

      <div v-else class="dish-grid">
        <div v-for="dish in dishes" :key="dish.id" class="dish-card" :class="dish.rarity">
           <img v-if="dish.image_url" :src="dish.image_url" alt="Food" class="card-img">
           <div class="card-body">
             <h3>{{ dish.name }}</h3>
             <span class="badge">{{ dish.rarity === 'common' ? '普通' : dish.rarity === 'rare' ? '稀有' : '史詩' }}</span>
             <p v-if="dish.description">{{ dish.description }}</p>
             
             
             <div class="card-footer">
                 <!-- Group Tags -->
                 <div class="card-groups" v-if="dish.group_info">
                    <span v-for="(gItem, idx) in dish.group_info.split('|||')" :key="idx" 
                          class="mini-group-tag clickable"
                          @click="removeGroupFromDish(dish, gItem)"
                          title="點擊移除群組">
                        <span>{{ gItem.split(':')[1] }}</span>
                        <span class="remove-x">×</span>
                    </span>
                 </div>
                 <div class="card-actions">
                    <button class="btn-small" @click="openAddToGroup(dish)">加入群組</button>
                    <button class="btn-small btn-edit" @click="openEditDish(dish)">✏️</button>
                    <button class="btn-small btn-danger" @click="deleteDish(dish)">🗑️</button>
                 </div>
             </div>
           </div>
        </div>
      </div>
    </div>

    <!-- Create Dish Modal -->
    <div v-if="showCreateDish" class="modal-overlay">
      <div class="glass-panel modal">
        <h3>新增餐廳</h3>
        <input v-model="newDish.name" placeholder="餐廳名稱" class="input-field">
        <input v-model="newDish.description" placeholder="描述" class="input-field">
        
        <!-- File Upload -->
        <div class="file-upload-group">
            <label>餐廳圖片:</label>
            <input type="file" @change="handleFileUpload" accept="image/*" class="input-field file-input">
        </div>

        <select v-model="newDish.rarity" class="input-field">
          <option value="common">普通 (Common)</option>
          <option value="rare">稀有 (Rare)</option>
          <option value="epic">史詩 (Epic)</option>
        </select>
        <div class="modal-actions">
           <button class="btn-primary" @click="createDish" :disabled="uploading">
             {{ uploading ? '上傳中...' : '建立' }}
           </button>
           <button class="btn-secondary" @click="showCreateDish = false">取消</button>
        </div>
      </div>
    </div>

    <!-- Create Group Modal -->
    <div v-if="showCreateGroup" class="modal-overlay">
      <div class="glass-panel modal">
        <h3>新增群組</h3>
        <input v-model="newGroup.name" placeholder="群組名稱 (例如: 公司附近)" class="input-field">
        <input v-model="newGroup.description" placeholder="描述" class="input-field">
        <div class="modal-actions">
           <button class="btn-primary" @click="createGroup">建立</button>
           <button class="btn-secondary" @click="showCreateGroup = false">取消</button>
        </div>
      </div>
    </div>

    <!-- Add to Group Modal -->
    <div v-if="showAddToGroup" class="modal-overlay">
      <div class="glass-panel modal">
        <h3>將 "{{ selectedDish?.name }}" 加入群組</h3>
        <select v-model="selectedGroupId" class="input-field">
            <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
        </select>
        <div class="modal-actions">
           <button class="btn-primary" @click="addToGroup">加入</button>
           <button class="btn-secondary" @click="showAddToGroup = false">取消</button>
        </div>
      </div>
    </div>

    <!-- Edit Dish Modal -->
    <div v-if="showEditDish" class="modal-overlay">
      <div class="glass-panel modal">
        <h3>編輯餐廳</h3>
        <input v-model="editDishData.name" placeholder="餐廳名稱" class="input-field">
        <input v-model="editDishData.description" placeholder="描述" class="input-field">
        
        <!-- File Upload -->
        <div class="file-upload-group">
            <label>更換圖片 (留空則不變):</label>
            <input type="file" @change="handleEditFileUpload" accept="image/*" class="input-field file-input">
        </div>

        <select v-model="editDishData.rarity" class="input-field">
          <option value="common">普通 (Common)</option>
          <option value="rare">稀有 (Rare)</option>
          <option value="epic">史詩 (Epic)</option>
        </select>
        <div class="modal-actions">
           <button class="btn-primary" @click="updateDish" :disabled="uploading">
             {{ uploading ? '更新中...' : '儲存' }}
           </button>
           <button class="btn-secondary" @click="showEditDish = false">取消</button>
        </div>
      </div>
    </div>

  </div>
</template>



<style scoped>
.list-container {
  display: flex;
  justify-content: center;
  width: 100%;
}

.actions {
    background: rgba(0,0,0,0.2);
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 2rem;
}

.dish-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); /* Slightly wider cards */
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.dish-card {
  background: var(--card-bg);
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.05); /* Subtle border */
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.dish-card:hover {
    transform: translateY(-8px);
    box-shadow: 0 12px 24px -4px rgba(0,0,0,0.4);
    border-color: rgba(255,255,255,0.2);
}

/* Rarity Borders/Glows on Hover */
.dish-card.common:hover { border-color: #64748b; }
.dish-card.rare:hover { box-shadow: 0 12px 24px -4px rgba(59, 130, 246, 0.3); border-color: #3b82f6; }
.dish-card.epic:hover { box-shadow: 0 12px 24px -4px rgba(139, 92, 246, 0.4); border-color: #8b5cf6; }


.card-img {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  transition: transform 0.5s;
}

.dish-card:hover .card-img {
    transform: scale(1.05);
}

.card-body {
  padding: 1.2rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, rgba(30,41,59,0) 0%, rgba(15,23,42,0.4) 100%);
}

.card-body h3 {
    margin-bottom: 0.5rem;
    font-size: 1.2rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.badge {
  display: inline-block;
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 12px;
  background: rgba(255,255,255,0.1);
  color: var(--text-muted);
  font-weight: 600;
  margin-bottom: 0.8rem;
}

.dish-card.rare .badge { color: #60a5fa; background: rgba(59, 130, 246, 0.1); }
.dish-card.epic .badge { color: #a78bfa; background: rgba(139, 92, 246, 0.1); }

.card-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: auto;
    padding-top: 1rem;
    border-top: 1px solid rgba(255,255,255,0.1);
}

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
  max-width: 450px;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
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
}
.btn-small:hover {
  background: rgba(255,255,255,0.1);
  color: var(--text-main);
  border-color: rgba(255,255,255,0.4);
}

.btn-danger:hover {
    background: rgba(239, 68, 68, 0.1);
    border-color: #ef4444;
    color: #ef4444;
}

.group-tag-display {
    background: rgba(0, 0, 0, 0.3);
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.9rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    cursor: pointer;
    transition: all 0.2s;
}
.group-tag-display:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-1px);
}
.group-tag-display.active {
    background: var(--primary-color);
    border-color: var(--primary-color);
    color: white;
    box-shadow: 0 0 12px rgba(99, 102, 241, 0.4);
}

.card-groups {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.5rem;
}

.mini-group-tag {
    font-size: 0.75rem;
    padding: 2px 8px;
    border-radius: 4px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    color: var(--text-muted);
}

.card-groups {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.5rem;
    margin-bottom: 0.8rem; /* Ensure space before actions separator */
}

.mini-group-tag.clickable {
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 6px; /* Slightly more gap */
    line-height: 1.2; /* Fix line height */
    padding-right: 6px; 
}

.mini-group-tag.clickable:hover {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.4);
    color: #ef4444;
}

.remove-x {
    font-size: 1.1rem;
    font-weight: bold;
    line-height: 1;
    opacity: 0.5;
    margin-top: -1px; /* Optical alignment */
}
.mini-group-tag.clickable:hover .remove-x {
    opacity: 1;
}
</style>
