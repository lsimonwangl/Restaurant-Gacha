<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const name = ref('')
const email = ref('')
const password = ref('')
const authStore = useAuthStore()
const router = useRouter()
const errorMsg = ref('')

const handleRegister = async () => {
  try {
    await authStore.register({ name: name.value, email: email.value, password: password.value })
    router.push('/')
  } catch (err) {
    errorMsg.value = '註冊失敗，請稍後再試'
  }
}
</script>

<template>
  <div class="auth-container">
    <div class="glass-panel auth-card">
      <h2 style="text-align: center; margin-bottom: 2rem;">建立帳號</h2>
      
      <form @submit.prevent="handleRegister">
        <div class="form-group">
          <label>名稱</label>
          <input type="text" v-model="name" class="input-field" required placeholder="您的暱稱">
        </div>

        <div class="form-group">
          <label>Email</label>
          <input type="email" v-model="email" class="input-field" required placeholder="name@example.com">
        </div>
        
        <div class="form-group">
          <label>密碼</label>
          <input type="password" v-model="password" class="input-field" required placeholder="••••••••">
        </div>

        <div v-if="errorMsg" style="color: var(--error-color); margin-bottom: 1rem; text-align: center;">
          {{ errorMsg }}
        </div>

        <button type="submit" class="btn-primary" style="width: 100%;" :disabled="authStore.loading">
          {{ authStore.loading ? '註冊中...' : '註冊' }}
        </button>
      </form>

      <p style="text-align: center; margin-top: 1.5rem; color: var(--secondary-color);">
        已經有帳號？ <RouterLink to="/login">登入</RouterLink>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
}

.auth-card {
  width: 100%;
  max-width: 400px;
  padding: 2.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--secondary-color);
  font-size: 0.9rem;
}
</style>
