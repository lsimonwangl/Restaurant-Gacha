<script setup>
import { ref, watch, toRef } from 'vue'

const props = defineProps({
  modelValue: Boolean, // show
  dish: {
    type: Object,
    default: () => ({ name: '', description: '', rarity: 'common' })
  },
  isEdit: {
    type: Boolean,
    default: false
  },
  loading: Boolean
})

const emit = defineEmits(['update:modelValue', 'submit'])

const formData = ref({ ...props.dish })
const selectedFile = ref(null)

// Watch for changes in props.dish to update local formData when opening modal
watch(() => props.dish, (newVal) => {
    formData.value = { ...newVal }
    if (!formData.value.rarity) formData.value.rarity = 'common'
    selectedFile.value = null
})

const close = () => {
    emit('update:modelValue', false)
}

const handleFileUpload = (event) => {
    selectedFile.value = event.target.files[0]
}

const submit = () => {
    if (!formData.value.name) return alert('請輸入名稱')
    
    // Pass raw data + file to parent to handle API call
    emit('submit', { 
        data: formData.value, 
        file: selectedFile.value 
    })
}
</script>

<template>
    <div v-if="modelValue" class="modal-overlay">
      <div class="glass-panel modal">
        <h3>{{ isEdit ? '編輯餐廳' : '新增餐廳' }}</h3>
        <input v-model="formData.name" placeholder="餐廳名稱" class="input-field">
        <input v-model="formData.description" placeholder="描述" class="input-field">
        
        <!-- File Upload -->
        <div class="file-upload-group">
            <label>{{ isEdit ? '更換圖片 (留空則不變):' : '餐廳圖片:' }}</label>
            <input type="file" @change="handleFileUpload" accept="image/*" class="input-field file-input">
        </div>

        <select v-model="formData.rarity" class="input-field">
          <option value="common">普通 (Common)</option>
          <option value="rare">稀有 (Rare)</option>
          <option value="epic">史詩 (Epic)</option>
        </select>
        <div class="modal-actions">
           <button class="btn-primary" @click="submit" :disabled="loading">
             {{ loading ? (isEdit ? '更新中...' : '上傳中...') : (isEdit ? '儲存' : '建立') }}
           </button>
           <button class="btn-secondary" @click="close">取消</button>
        </div>
      </div>
    </div>
</template>

<style scoped>
/* Inherit modal styles or redefine if needed. 
   Assuming global styles or parent styles might not reach here due to scoped.
   Ideally we should move these to global css as per task list item 9.
   For now I will copy key structural styles.
*/

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

.file-upload-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    color: var(--text-main);
    font-size: 0.9rem;
}
</style>
