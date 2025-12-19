<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  group: {
    type: Object,
    default: () => ({ name: '', description: '', is_public: false })
  },
  isEdit: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'submit'])

const formData = ref({ ...props.group })

watch(() => props.group, (newVal) => {
    formData.value = { ...newVal }
})

const close = () => {
    emit('update:modelValue', false)
}

const submit = () => {
    if (!formData.value.name) return alert('請輸入名稱')
    emit('submit', formData.value)
}
</script>

<template>
    <div v-if="modelValue" class="modal-overlay">
      <div class="glass-panel modal">
        <h3>{{ isEdit ? '編輯群組' : '新增群組' }}</h3>
        <input v-model="formData.name" placeholder="群組名稱" class="input-field">
        <input v-model="formData.description" placeholder="描述" class="input-field">
         <div class="checkbox-group">
            <input type="checkbox" :id="'publicGroup-' + (isEdit ? 'edit' : 'new')" v-model="formData.is_public">
            <label :for="'publicGroup-' + (isEdit ? 'edit' : 'new')">設為公開</label>
        </div>
        <div class="modal-actions">
           <button class="btn-primary" @click="submit">{{ isEdit ? '儲存' : '建立' }}</button>
           <button class="btn-secondary" @click="close">取消</button>
        </div>
      </div>
    </div>
</template>

<style scoped>
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

.checkbox-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
</style>
