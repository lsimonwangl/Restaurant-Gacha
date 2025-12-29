<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

// Profile State
const name = ref(authStore.user?.name || '')
const avatarMode = ref('dicebear') // 'dicebear' or 'upload'
const dicebearSeed = ref(authStore.user?.avatar_url?.includes('dicebear') ? authStore.user.avatar_url.split('seed=')[1] : '')
const selectedFile = ref(null)
const selectedFilePreview = ref(null)

// Password State
const oldPassword = ref('')
const newPassword = ref('')

// Delete Account State
const deletePassword = ref('')
const showDeleteConfirm = ref(false)

const message = ref('')
const error = ref('')

// Consolidate Avatar Preview
const previewAvatarUrl = computed(() => {
    if (avatarMode.value === 'upload' && selectedFilePreview.value) {
        return selectedFilePreview.value
    }
    if (avatarMode.value === 'dicebear' && dicebearSeed.value) {
        return `https://api.dicebear.com/7.x/avataaars/svg?seed=${dicebearSeed.value}`
    }
    return authStore.user?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'
})

const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (file) {
        selectedFile.value = file
        // Create local preview
        const reader = new FileReader()
        reader.onload = (e) => {
            selectedFilePreview.value = e.target.result
        }
        reader.readAsDataURL(file)
    }
}

const updateProfile = async () => {
    error.value = ''
    message.value = ''
    
    try {
        const formData = new FormData()
        formData.append('name', name.value)
        
        if (avatarMode.value === 'upload' && selectedFile.value) {
            formData.append('avatar', selectedFile.value)
        } else if (avatarMode.value === 'dicebear' && dicebearSeed.value) {
            formData.append('dicebear_url', `https://api.dicebear.com/7.x/avataaars/svg?seed=${dicebearSeed.value}`)
        }

        await authStore.updateProfile(formData)
        message.value = '個人資料更新成功！'
    } catch (err) {
        error.value = err.message || '更新失敗'
    }
}

const changePassword = async () => {
    error.value = ''
    message.value = ''
    
    try {
        await authStore.changePassword({
            oldPassword: oldPassword.value,
            newPassword: newPassword.value
        })
        message.value = '密碼修改成功！'
        oldPassword.value = ''
        newPassword.value = ''
    } catch (err) {
        error.value = err.message || '密碼修改失敗'
    }
}

const deleteAccount = async () => {
    error.value = ''
    message.value = ''
    
    try {
        await authStore.deleteAccount(deletePassword.value)
        router.push('/') // Redirect to home/login
    } catch (err) {
        error.value = err.message || '刪除帳號失敗，請檢查密碼'
    }
}
</script>

<template>
  <div class="profile-container">
    <div class="glass-panel profile-card">
      <h2>👤 個人頁面</h2>
      
      <!-- Feedback Messages -->
      <div v-if="message" class="alert success">{{ message }}</div>
      <div v-if="error" class="alert error">{{ error }}</div>

      <!-- Avatar Section -->
      <div class="avatar-section">
        <div class="avatar-preview">
            <img :src="previewAvatarUrl" alt="Avatar">
        </div>
        
        <div class="avatar-controls">
            <div class="tabs">
                <button 
                    :class="{ active: avatarMode === 'dicebear' }" 
                    @click="avatarMode = 'dicebear'"
                >隨機產生</button>
                <button 
                    :class="{ active: avatarMode === 'upload' }" 
                    @click="avatarMode = 'upload'"
                >上傳圖片</button>
            </div>

            <div v-if="avatarMode === 'dicebear'" class="input-group">
                <label>輸入種子碼 (隨意打字)</label>
                <input v-model="dicebearSeed" type="text" placeholder="例如: happy-cat">
            </div>

            <div v-if="avatarMode === 'upload'" class="input-group">
                <label>選擇圖片</label>
                <input type="file" accept="image/*" @change="handleFileSelect">
            </div>
        </div>
      </div>

      <!-- Basic Info Form -->
      <form @submit.prevent="updateProfile" class="profile-form">
        <div class="form-group">
          <label>顯示名稱</label>
          <input v-model="name" type="text" required>
        </div>
        <button type="submit" class="btn-primary" :disabled="authStore.loading">
            {{ authStore.loading ? '更新中...' : '儲存變更' }}
        </button>
      </form>
    </div>

    <!-- Security Section -->
    <div class="glass-panel security-card">
        <h3>🔒 帳號安全</h3>
        <form @submit.prevent="changePassword" class="security-form">
            <div class="form-group">
                <label>舊密碼</label>
                <input v-model="oldPassword" type="password" required>
            </div>
            <div class="form-group">
                <label>新密碼</label>
                <input v-model="newPassword" type="password" required>
            </div>
            <button type="submit" class="btn-secondary" :disabled="authStore.loading">修改密碼</button>
        </form>
    </div>

    <!-- Developer Tools -->
    <div class="glass-panel dev-card">
        <h3>🛠️ 開發人員工具</h3>
        <p>進階系統管理功能。</p>
        <button @click="router.push('/terminal')" class="btn-secondary">開啟 SQL 終端機</button>
    </div>

    <!-- Danger Zone -->
    <div class="glass-panel danger-card">
        <h3>🚨 危險區域</h3>
        <p>刪除帳號是不可逆的，您所有的資料 (餐廳、群組) 都將被刪除。</p>
        
        <button v-if="!showDeleteConfirm" @click="showDeleteConfirm = true" class="btn-danger">
            刪除我的帳號
        </button>

        <div v-else class="delete-confirm">
            <p>請輸入密碼以確認刪除：</p>
            <input v-model="deletePassword" type="password" placeholder="您的密碼">
            <div class="confirm-actions">
                <button @click="deleteAccount" class="btn-danger-confirm">確認刪除</button>
                <button @click="showDeleteConfirm = false, deletePassword = ''" class="btn-cancel">取消</button>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
.profile-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

.glass-panel {
    background: rgba(30, 41, 59, 0.7);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 2rem;
    color: var(--text-main, #f8fafc);
}

h2, h3 {
    margin-bottom: 1.5rem;
    color: var(--text-main, #ffffff);
}

.alert {
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
}

.alert.success {
    background: rgba(34, 197, 94, 0.2);
    color: #4ade80;
    border: 1px solid rgba(34, 197, 94, 0.3);
}

.alert.error {
    background: rgba(239, 68, 68, 0.2);
    color: #fca5a5;
    border: 1px solid rgba(239, 68, 68, 0.3);
}

/* Avatar Section */
.avatar-section {
    display: flex;
    gap: 2rem;
    margin-bottom: 2rem;
    align-items: center;
}

.avatar-preview {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    overflow: hidden;
    border: 3px solid rgba(255, 255, 255, 0.2);
    background: rgba(0, 0, 0, 0.2);
}

.avatar-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.avatar-controls {
    flex: 1;
}

.tabs {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
}

.tabs button {
    background: transparent;
    border: none;
    color: var(--text-muted, #94a3b8);
    padding: 0.5rem 0;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
}

.tabs button.active {
    color: white;
    border-bottom-color: #3b82f6;
}

/* Forms */
.form-group {
    margin-bottom: 1.5rem;
}

.form-group label {
    display: block;
    margin-bottom: 0.5rem;
    color: var(--text-muted, #cbd5e1);
}

input[type="text"],
input[type="password"],
input[type="file"] {
    width: 100%;
    padding: 0.75rem;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(0, 0, 0, 0.3);
    color: white;
    font-size: 1rem;
}

/* Buttons */
.btn-primary {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    width: 100%;
}

.btn-secondary {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.2);
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
    width: 100%;
}

.danger-card {
    border-color: rgba(239, 68, 68, 0.3);
}

.danger-card h3 {
    color: #fca5a5;
}

.btn-danger {
    background: rgba(239, 68, 68, 0.2);
    color: #fca5a5;
    border: 1px solid rgba(239, 68, 68, 0.3);
    padding: 0.75rem;
    border-radius: 8px;
    cursor: pointer;
}

.btn-danger-confirm {
    background: #ef4444;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
}

.btn-cancel {
    background: transparent;
    color: #94a3b8;
    border: none;
    padding: 0.5rem 1rem;
    cursor: pointer;
}

.delete-confirm {
    margin-top: 1rem;
    background: rgba(0, 0, 0, 0.3);
    padding: 1rem;
    border-radius: 8px;
}

.confirm-actions {
    margin-top: 1rem;
    display: flex;
    gap: 1rem;
    align-items: center;
}

@media (max-width: 600px) {
    .avatar-section {
        flex-direction: column;
        text-align: center;
    }
}
</style>
