<script setup>
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
    modelValue: Boolean,
    groups: Array
})

const emit = defineEmits(['update:modelValue', 'toggle-public', 'edit', 'delete'])

const close = () => {
    emit('update:modelValue', false)
}
</script>

<template>
    <div v-if="modelValue" class="modal-overlay">
      <div class="glass-panel modal">
        <h3>管理我的群組</h3>
        <div class="manage-list">
            <div v-for="g in groups" :key="g.id" class="manage-item" v-show="g.is_owner">
                <span>{{ g.name }}</span>
                <button class="btn-small" :class="{ 'btn-active': g.is_public }" @click="$emit('toggle-public', g)">
                    {{ g.is_public ? '🌐 公開中' : '🔒 私人' }}
                </button>
                <div class="manage-actions">
                    <button class="btn-small" @click="$emit('edit', g)">✏️ 編輯</button>
                    <button class="btn-small btn-danger" @click="$emit('delete', g)">🗑️ 刪除</button>
                </div>
            </div>
            <p v-if="groups.filter(g=>g.is_owner).length === 0" style="color:var(--text-muted)">你還沒有建立任何群組。</p>
        </div>
        <div class="modal-actions">
           <button class="btn-secondary" @click="close">關閉</button>
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
.btn-active {
    border-color: #10b981;
    color: #10b981;
    background: rgba(16, 185, 129, 0.1);
}
</style>
