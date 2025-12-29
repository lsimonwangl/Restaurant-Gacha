<script setup>
defineProps({
  dish: {
    type: Object,
    required: true
  },
  isExpanded: {
    type: Boolean,
    default: false
  },
  showTags: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['toggle-expand', 'add-to-group', 'edit', 'delete', 'remove-group'])

const handleExpand = (event) => {
  emit('toggle-expand', event)
}
</script>

<template>
  <div class="dish-card" 
       :class="[dish.rarity, { 'floating-active': isExpanded }]"
       @click="handleExpand">
    <div class="card-image-wrapper">
      <img v-if="dish.image_url" :src="dish.image_url" alt="Food" class="card-img">
      <div v-else class="card-img-placeholder">🍽️</div>
      <span class="badge-overlay">{{ dish.rarity === 'common' ? '普通' : dish.rarity === 'rare' ? '稀有' : '史詩' }}</span>
    </div>
    
    <div class="card-body">
      <h3>{{ dish.name }}</h3>
      <p v-if="dish.address" class="address-text">{{ dish.address }}</p>
      <p v-if="dish.description" 
         class="description-text" 
         :class="{ expanded: isExpanded }"
         title="點擊展開/收合">
         {{ dish.description }}
      </p>
      
      <div class="card-footer">
        <!-- Group Tags -->
        <div class="card-groups" v-if="showTags && dish.group_info">
           <span v-for="(gItem, idx) in dish.group_info.split('|||')" :key="idx" 
                 class="mini-group-tag clickable"
                 @click.stop="emit('remove-group', gItem)"
                 title="點擊移除群組">
               <span>{{ gItem.split(':')[1] }}</span>
               <span class="remove-x">×</span>
           </span>
        </div>
        <div class="card-actions">
           <slot name="actions">
               <button class="btn-small" @click.stop="emit('add-to-group', dish)">加入群組</button>
               <button class="btn-small btn-edit" @click.stop="emit('edit', dish)">✏️</button>
               <button class="btn-small btn-danger" @click.stop="emit('delete', dish)">🗑️</button>
           </slot>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dish-card {
  background: var(--card-bg);
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.05); /* Subtle border */
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  height: 100%; /* Fill wrapper */
  width: 100%;
  cursor: pointer;
}

.dish-card.floating-active {
  position: absolute;
  top: 0; left: 0;
  width: 100%;
  height: auto;
  min-height: 100%;
  z-index: 9999; /* Ensure above fixed overlay (9998) */
  transform: scale(1.05); /* Slightly larger */
  animation: popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); /* Spring bounce */
}

/* Base Shadow */
.dish-card.floating-active {
    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.8);
}

/* Rarity Neon Glows for Floating State */
.dish-card.floating-active.common {
    box-shadow: 0 0 20px rgba(148, 163, 184, 0.4), 0 25px 50px -12px rgba(0,0,0,0.8);
    border-color: #94a3b8;
}
.dish-card.floating-active.rare {
    box-shadow: 0 0 25px rgba(59, 130, 246, 0.5), 0 25px 50px -12px rgba(0,0,0,0.8);
    border-color: #60a5fa;
}
.dish-card.floating-active.epic {
    box-shadow: 0 0 30px rgba(139, 92, 246, 0.6), 0 25px 50px -12px rgba(0,0,0,0.8);
    border-color: #a78bfa;
}

@keyframes popIn {
  0% { transform: scale(1); }
  50% { transform: scale(1.08); }
  100% { transform: scale(1.05); }
}

.dish-card:not(.floating-active):hover {
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

.card-img-placeholder {
  width: 100%;
  aspect-ratio: 4 / 3;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  font-size: 3rem;
  color: var(--text-muted);
}

.dish-card:hover .card-img {
    transform: scale(1.05);
}

.card-body {
  padding: 0.8rem; /* Further reduced padding */
  flex: 1;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, rgba(30,41,59,0) 0%, rgba(15,23,42,0.4) 100%);
}

.card-body h3 {
    margin-bottom: 0.4rem;
    padding-bottom: 0.2rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 1.2rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.card-body p.address-text {
    color: var(--text-muted);
    font-size: 0.85rem;
    margin-bottom: 0.2rem;
}

.card-body p.description-text {
    color: var(--text-muted);
    font-size: 0.9rem;
    line-height: 1.35; /* Tighter line height */
    margin-bottom: 0.5rem;
    display: -webkit-box;
    -webkit-line-clamp: 2; /* Reduce to 2 lines */
    line-clamp: 2; /* Standard property */
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: pointer; /* Indicate it's clickable */
    transition: all 0.3s ease; /* Smooth transition */
}

.card-body p.description-text.expanded {
    -webkit-line-clamp: unset; /* Remove limit */
    line-clamp: unset;
    color: var(--text-main); /* Highlight text slightly when expanded */
}

.dish-card.rare .badge { color: #60a5fa; background: rgba(59, 130, 246, 0.1); }
.dish-card.epic .badge { color: #a78bfa; background: rgba(139, 92, 246, 0.1); }

/* Card Footer & Actions */
.card-footer {
    margin-top: auto;
    display: flex;
    flex-direction: column;
}

.card-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
    padding-top: 0.8rem;
    border-top: 1px solid rgba(255,255,255,0.1);
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

.card-image-wrapper {
  position: relative;
  width: 100%;
  display: block; /* Ensure it behaves as a container */
  border-top: 5px solid transparent; /* Thicker rarity line */
}

/* Rarity specific border lines on image wrapper */
.dish-card.common .card-image-wrapper { border-top-color: #64748b; }
.dish-card.rare .card-image-wrapper { border-top-color: #3b82f6; }
.dish-card.epic .card-image-wrapper { border-top-color: #8b5cf6; }

.badge-overlay {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: bold;
  backdrop-filter: blur(4px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  z-index: 10;
  color: white;
  pointer-events: none; /* Let clicks pass through to image if needed */
}

.card-groups {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.5rem;
    margin-bottom: 0.8rem; /* Ensure space before actions separator */
}

.mini-group-tag {
    font-size: 0.75rem;
    padding: 2px 8px;
    border-radius: 4px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    color: var(--text-muted);
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
