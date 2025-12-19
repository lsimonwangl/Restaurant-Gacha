<script setup>
import { ref } from 'vue'
import { groupsApi } from '../api/groups'
import { dishesApi } from '../api/dishes'
import DishCard from '../components/DishCard.vue'

const dishes = ref([])
const groups = ref([])
const loading = ref(true)

// Modals
const showCreateDish = ref(false)
const showCreateGroup = ref(false)
const showAddToGroup = ref(false)
const newDish = ref({ name: '', description: '', rarity: 'common' })
const newGroup = ref({ name: '', description: '', is_public: false })
const showManageGroups = ref(false)
const selectedDish = ref(null)
const selectedGroupId = ref(null)
const selectedGroupFilter = ref(null) // For filtering view

const fetchDishes = async () => {
    loading.value = true
    try {
        const res = await dishesApi.getAll()
        dishes.value = res.data
    } catch (e) {
        console.error(e)
    } finally {
        loading.value = false
    }
}

const fetchGroups = async () => {
    try {
        const res = await groupsApi.getAll()
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
        const res = await groupsApi.getDishes(group.id)
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

        await dishesApi.create(formData, {
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
        await groupsApi.create({ ...newGroup.value, slug: newGroup.value.name }) 
        showCreateGroup.value = false
        newGroup.value = { name: '', description: '', is_public: false }
        fetchGroups()
    } catch (e) {
        alert('建立失敗: ' + (e.response?.data?.message || e.message))
    }
}

const toggleGroupPublic = async (group) => {
    try {
        const newStatus = !group.is_public
        await groupsApi.update(group.id, { is_public: newStatus })
        group.is_public = newStatus // Optimistic update
        // fetchGroups() // Optional: refresh to be sure
    } catch (e) {
        alert('更新失敗: ' + (e.response?.data?.message || e.message))
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
        await groupsApi.addDish(selectedGroupId.value, selectedDish.value.id)
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
        await dishesApi.delete(dish.id);
        fetchDishes(); // Refresh list
    } catch (e) {
        alert('刪除失敗: ' + (e.response?.data?.message || e.message));
    }
}

const removeGroupFromDish = async (dish, groupInfo) => {
    const [groupId, groupName] = groupInfo.split(':');
    if(!confirm(`確定要將「${dish.name}」從群組「${groupName}」中移除嗎？`)) return;

    try {
        await groupsApi.removeDish(groupId, dish.id);
        fetchDishes(); // Refresh
    } catch (e) {
        alert('移除失敗: ' + (e.response?.data?.message || e.message));
    }
}

// Text Expansion Logic
const expandedDishId = ref(null)
const wrapperHeights = ref({})

const toggleExpand = (id, event) => {
    // If clicking the same already expanded card, close it
    if (expandedDishId.value === id) {
        expandedDishId.value = null
        return
    }

    // Measure height before expanding
    // We need to find the specific card element
    // Since we are inside v-for, event.target is closest. 
    // We aim for the .card-wrapper
    const card = event.target.closest('.dish-card')
    const wrapper = card.parentElement
    if (wrapper) {
        wrapperHeights.value[id] = wrapper.offsetHeight
    }

    expandedDishId.value = id
}

const closeExpand = () => {
    expandedDishId.value = null
    wrapperHeights.value = {}
}

// Edit Logic
const showEditDish = ref(false)
const editDishData = ref({ id: null, name: '', description: '', rarity: 'common' })
const editFile = ref(null)

// Group Edit Logic
const showEditGroup = ref(false)
const editGroupData = ref({ id: null, name: '', description: '', is_public: false })

const openEditGroup = (group) => {
    editGroupData.value = { ...group }
    showEditGroup.value = true
}

const updateGroup = async () => {
    if (!editGroupData.value.name) return alert('請輸入名稱')
    try {
        await groupsApi.update(editGroupData.value.id, editGroupData.value)
        showEditGroup.value = false
        // Update local list
        const idx = groups.value.findIndex(g => g.id === editGroupData.value.id)
        if (idx !== -1) groups.value[idx] = { ...groups.value[idx], ...editGroupData.value }
        alert('群組已更新')
    } catch(e) {
        alert('更新失敗: ' + (e.response?.data?.message || e.message))
    }
}

const deleteGroup = async (group) => {
    if (!confirm(`確定要刪除群組「${group.name}」嗎？此動作無法復原！`)) return
    try {
        await groupsApi.delete(group.id)
        groups.value = groups.value.filter(g => g.id !== group.id)
        if (selectedGroupFilter.value === group.id) selectedGroupFilter.value = null
    } catch(e) {
        alert('刪除失敗: ' + (e.response?.data?.message || e.message))
    }
}

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

        await dishesApi.update(editDishData.value.id, formData, {
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
    <div class="glass-panel" style="padding: 2rem; width: 100%; max-width: 1200px; overflow: visible;">
      <!-- Backdrop for closing expanded card (Moved inside to respect stacking context) -->
      <transition name="fade">
        <div v-if="expandedDishId" class="click-outside-overlay" @click="closeExpand"></div>
      </transition>

      <h2>餐廳列表</h2>
      
      <div class="actions" style="margin-bottom: 1rem; display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
        <button class="btn-primary" @click="showCreateDish = true">➕ 新增餐廳</button>
        <button class="btn-secondary" @click="showCreateGroup = true">📁 新增群組</button>
        <button v-if="groups.length > 0" class="btn-small" @click="showManageGroups = true">⚙️ 管理群組</button>
        
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
        <div v-for="dish in dishes" 
             :key="dish.id" 
             class="card-wrapper"
             :style="{ height: expandedDishId === dish.id ? wrapperHeights[dish.id] + 'px' : 'auto' }">
            
            <DishCard 
              :dish="dish"
              :is-expanded="expandedDishId === dish.id"
              @toggle-expand="(e) => toggleExpand(dish.id, e)"
              @add-to-group="openAddToGroup"
              @edit="openEditDish"
              @delete="deleteDish"
              @remove-group="(gItem) => removeGroupFromDish(dish, gItem)"
            />
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
        <div class="checkbox-group">
            <input type="checkbox" id="publicGroup" v-model="newGroup.is_public">
            <label for="publicGroup">設為公開 (其他人可以收藏)</label>
        </div>
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


    <!-- Manage Groups Modal -->
    <div v-if="showManageGroups" class="modal-overlay">
      <div class="glass-panel modal">
        <h3>管理我的群組</h3>
        <div class="manage-list">
            <div v-for="g in groups" :key="g.id" class="manage-item" v-show="g.is_owner">
                <span>{{ g.name }}</span>
                <button class="btn-small" :class="{ 'btn-active': g.is_public }" @click="toggleGroupPublic(g)">
                    {{ g.is_public ? '🌐 公開中' : '🔒 私人' }}
                </button>
                <div class="manage-actions">
                    <button class="btn-small" @click="openEditGroup(g)">✏️ 編輯</button>
                    <button class="btn-small btn-danger" @click="deleteGroup(g)">🗑️ 刪除</button>
                </div>
            </div>
            <p v-if="groups.filter(g=>g.is_owner).length === 0" style="color:var(--text-muted)">你還沒有建立任何群組。</p>
        </div>
        <div class="modal-actions">
           <button class="btn-secondary" @click="showManageGroups = false">關閉</button>
        </div>
      </div>
    </div>

    <!-- Edit Group Modal -->
    <div v-if="showEditGroup" class="modal-overlay">
      <div class="glass-panel modal">
        <h3>編輯群組</h3>
        <input v-model="editGroupData.name" placeholder="群組名稱" class="input-field">
        <input v-model="editGroupData.description" placeholder="描述" class="input-field">
         <div class="checkbox-group">
            <input type="checkbox" id="editPublicGroup" v-model="editGroupData.is_public">
            <label for="editPublicGroup">設為公開</label>
        </div>
        <div class="modal-actions">
           <button class="btn-primary" @click="updateGroup">儲存</button>
           <button class="btn-secondary" @click="showEditGroup = false">取消</button>
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

.card-wrapper {
  position: relative;
  /* width and height are managed by grid */
}

.dish-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;
  align-items: stretch; /* Ensure equal height */
}

.card-wrapper {
  position: relative;
  /* width and height are managed by grid */
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
    color: var(--text-muted);
}

/* Manage Groups List */
.manage-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-height: 400px;
    overflow-y: auto;
    padding-right: 0.5rem;
}

.manage-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(255,255,255,0.05);
    padding: 0.8rem 1rem;
    border-radius: 8px;
    gap: 1rem;
}

.manage-item span {
    font-weight: bold;
    flex: 1; /* Name takes remaining space */
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.manage-actions {
    display: flex;
    gap: 0.5rem;
}

.btn-active {
    border-color: #10b981;
    color: #10b981;
    background: rgba(16, 185, 129, 0.1);
}

.click-outside-overlay {
    position: absolute; /* Changed from fixed */
    inset: 0; /* Cover the parent glass-panel */
    z-index: 50;
    background: rgba(0,0,0,0.4); 
    backdrop-filter: blur(4px); /* Slightly reduced blur for localized effect */
    border-radius: 16px; /* Match panel radius */
    cursor: default;
    animation: fadeIn 0.3s ease;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
