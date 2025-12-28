<script setup>
import { computed } from 'vue'

const props = defineProps({
  show: Boolean,
  place: Object,
  loading: Boolean
})

const emit = defineEmits(['close'])

const closeModal = () => {
  emit('close')
}
</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="closeModal">
    <div class="glass-panel modal reviews-modal">
      <div class="modal-header">
        <h3>{{ place?.name }}</h3>
        <button class="close-btn" @click="closeModal">×</button>
      </div>
      
      <div v-if="loading" class="spinner-container" style="display: flex; justify-content: center; padding: 2rem;">
          <div class="spinner"></div>
      </div>
      
      <div v-else class="reviews-content">
          <div class="place-info">
              <p v-if="place?.formatted_address">📍 {{ place.formatted_address }}</p>
              <p v-if="place?.formatted_phone_number">📞 {{ place.formatted_phone_number }}</p>
              <p v-if="place?.rating" style="color: #f59e0b; font-weight: bold; font-size: 1.1rem; margin: 0.5rem 0;">
                  {{ place.rating }} ⭐ <span style="font-size: 0.9rem; color: #94a3b8;">({{ place.user_ratings_total }} 則評論)</span>
              </p>
              <a v-if="place?.website" :href="place.website" target="_blank" style="color: #60a5fa; text-decoration: none; display: inline-block; margin-bottom: 0.5rem;">🌐 官方網站</a>
          </div>

          <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 1rem 0;">
          
          <div v-if="place?.reviews && place.reviews.length > 0" class="reviews-list">
              <div v-for="(review, index) in place.reviews" :key="index" class="review-item">
                  <div class="review-header">
                      <img :src="review.profile_photo_url" class="reviewer-avatar" onerror="this.style.display='none'">
                      <div>
                          <div class="reviewer-name">{{ review.author_name }}</div>
                          <div class="review-rating">{{ '⭐'.repeat(review.rating) }} <span class="review-time">{{ review.relative_time_description }}</span></div>
                      </div>
                  </div>
                  <p class="review-text">{{ review.text }}</p>
              </div>
          </div>
          <div v-else style="text-align: center; color: #94a3b8; padding: 2rem;">
              暫無評論
          </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Copied from NearbyView.vue */
.glass-panel {
    backdrop-filter: blur(12px);
    background: rgba(30, 41, 59, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: white;
}

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
  max-height: 90vh;
  overflow-y: auto;
}

.reviews-modal {
    max-width: 600px;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}

.modal-header h3 {
    margin: 0;
    font-size: 1.3rem;
    color: #fff;
}

.close-btn {
    background: none;
    border: none;
    color: white;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0 0.5rem;
}

.place-info p {
    margin: 0.3rem 0;
    font-size: 0.95rem;
    color: #cbd5e1;
}

.reviews-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.review-item {
    background: rgba(255,255,255,0.05);
    padding: 1rem;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.05);
}

.review-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
}

.reviewer-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
}

.reviewer-name {
    font-weight: bold;
    font-size: 0.95rem;
    color: #e2e8f0;
}

.review-rating {
    font-size: 0.85rem;
    color: #f59e0b;
}

.review-time {
    color: #94a3b8;
    margin-left: 5px;
    font-size: 0.8rem;
}

.review-text {
    font-size: 0.9rem;
    line-height: 1.5;
    color: #cbd5e1;
    white-space: pre-wrap;
    margin: 0;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255,255,255,0.2);
    border-top: 3px solid #60a5fa;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}
</style>
