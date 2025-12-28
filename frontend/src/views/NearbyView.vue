<script setup>
import { ref, onMounted, watch, shallowRef, toRaw } from 'vue'
import { dishesApi } from '../api/dishes'
import { loadGoogleMaps } from '../utils/googleMaps'
import RestaurantReviewsModal from '../components/RestaurantReviewsModal.vue'
import { useNearbyStore } from '../stores/nearby'

const mapContainer = ref(null)
const loading = ref(true)
const error = ref(null)
const minRating = ref(0) // Default: All ratings
const maxPrice = ref(null) // Default: Any price
const nearbyRestaurants = ref([]) // Stores results from Google Places
const markers = shallowRef([]) // Use shallowRef for non-reactive complex objects
let map = null
let placesService = null
let infoWindow = null
let currentLocation = null
const nextPageToken = ref(null)
const saving = ref(false)
const isExpanded = ref(false)
const isMobile = ref(window.innerWidth < 600)

const checkMobile = () => {
    isMobile.value = window.innerWidth < 600
    if (!isMobile.value) {
        isExpanded.value = false // Reset
    }
}
// Add listener in onMounted and remove in onUnmounted (implicit in script setup if we use lifecycle hooks)
// Since we already have onMounted, we'll append to it. 
// However, cleaner to just use window.addEventListener here.
window.addEventListener('resize', checkMobile)

const ratings = [
    { value: 0, label: '全部顯示' },
    { value: 3.0, label: '3.0 顆星以上' },
    { value: 4.0, label: '4.0 顆星以上' },
    { value: 4.5, label: '4.5 顆星以上' }
]

const prices = [
    { value: null, label: '不限預算' },
    { value: 1, label: '$ 200元以下' },
    { value: 2, label: '$$ 200-600元' },
    { value: 3, label: '$$$ 600-1500元' },
    { value: 4, label: '$$$$ 1500元以上' }
]

// Custom Map Style (Dark Mode friendly)
const mapStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] }, // Hide default POIs
  { featureType: "transit", stylers: [{ visibility: "off" }] }, // Hide transit icons
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
]

const saveToDatabase = async (place) => {
    if (saving.value) return
    if (!confirm(`確定要將「${place.name}」加入到您的餐廳資料庫嗎？`)) return

    saving.value = true
    try {
        const formData = new FormData()
        formData.append('name', place.name)
        formData.append('address', place.vicinity || '')
        formData.append('description', `Google 評分: ${place.rating || 'N/A'}`)
        if (place.geometry && place.geometry.location) {
            formData.append('lat', place.geometry.location.lat())
            formData.append('lng', place.geometry.location.lng())
        }

        // Auto Rarity Logic
        const rating = place.rating || 0
        let rarity = 'common'
        if (rating >= 4.5) rarity = 'epic' // SSR
        else if (rating >= 4.0) rarity = 'rare' // SR
        formData.append('rarity', rarity)

        // Image URL
        if (place.photos && place.photos.length > 0) {
             const photoUrl = place.photos[0].getUrl({ maxWidth: 400 })
             formData.append('image_url', photoUrl)
        }

        await dishesApi.create(formData, {
            headers: { 'Content-Type': 'multipart/form-Type' }
        })
        
        alert('✅ 匯入成功！')
    } catch (e) {
        console.error(e)
        alert('❌ 匯入失敗: ' + (e.response?.data?.message || e.message))
    } finally {
        saving.value = false
    }
}

const clearMarkers = () => {
    // Thoroughly remove markers from map
    markers.value.forEach(m => {
        const rawMarker = toRaw(m)
        if (rawMarker) rawMarker.setMap(null)
    })
    markers.value = []
}

// Reviews Logic
const showReviewsModal = ref(false)
const selectedPlaceReviews = ref(null)
const reviewsLoading = ref(false)

const fetchReviews = (place) => {
    if (!placesService) return
    
    reviewsLoading.value = true
    selectedPlaceReviews.value = { ...place, reviews: [] } // Init with basic info
    showReviewsModal.value = true

    const request = {
        placeId: place.place_id,
        fields: ['name', 'rating', 'user_ratings_total', 'reviews', 'formatted_address', 'formatted_phone_number', 'opening_hours', 'website']
    }

    placesService.getDetails(request, (placeDetails, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
            selectedPlaceReviews.value = placeDetails
        } else {
            console.error('Failed to fetch details:', status)
        }
        reviewsLoading.value = false
    })
}

const updateMarkers = () => {
    if (!map || !window.google) return
    
    clearMarkers()

    // Filter restaurants based on rating
    const filtered = nearbyRestaurants.value.filter(place => 
        (place.rating || 0) >= minRating.value
    )

    console.log(`Displaying ${filtered.length} google places results`)

    const newMarkers = []
    filtered.forEach(place => {
        const marker = new window.google.maps.Marker({
            position: place.geometry.location,
            map: map,
            title: place.name,
            animation: window.google.maps.Animation.DROP,
        })

        marker.addListener('click', () => {
            const ratingStars = '⭐'.repeat(Math.round(place.rating || 0))
            
            // Get photo URL if available
            const photoUrl = (place.photos && place.photos.length > 0) 
                ? place.photos[0].getUrl({ maxWidth: 250, maxHeight: 150 }) 
                : null
            
            const imageHtml = photoUrl 
                ? `<img src="${photoUrl}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" alt="${place.name}">` 
                : ''

            // Price level display
            const priceLevel = place.price_level ? '💰'.repeat(place.price_level) : ''

            const content = `
                <div style="color: #333; padding: 5px; max-width: 220px;">
                    <h3 style="margin: 0 0 5px 0; font-size: 1.1em; font-weight: bold;">${place.name}</h3>
                    ${imageHtml}
                    <div style="color: #f59e0b; margin-bottom: 5px; font-weight: bold;">
                        ${place.rating || 'N/A'} ${ratingStars} (${place.user_ratings_total || 0})
                        <span style="color: #10b981; margin-left: 5px;">${priceLevel}</span>
                    </div>
                    <p style="margin: 0 0 8px 0; font-size: 0.9em; color: #555;">${place.vicinity}</p>
                    <div style="display: flex; gap: 5px; margin-top: 8px; flex-wrap: wrap;">
                         <button id="btn-reviews-${place.place_id}" style="width: 100%; background: #6366f1; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9rem; margin-bottom: 4px;">💬 查看評論</button>
                        <a href="https://www.google.com/maps/dir/?api=1&destination=${place.geometry.location.lat()},${place.geometry.location.lng()}" target="_blank" style="flex: 1; text-align: center; background: #3b82f6; color: white; padding: 6px 10px; border-radius: 4px; text-decoration: none; font-size: 0.9rem;">📍 導航</a>
                        <button id="btn-save-${place.place_id}" style="flex: 1; background: #10b981; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">📥 匯入</button>
                    </div>
                </div>
            `
            infoWindow.setContent(content)
            infoWindow.open(map, marker)

            // Bind click event after DOM is ready
            window.google.maps.event.addListenerOnce(infoWindow, 'domready', () => {
                const btnSave = document.getElementById(`btn-save-${place.place_id}`)
                if (btnSave) {
                    btnSave.addEventListener('click', () => saveToDatabase(place))
                }
                const btnReviews = document.getElementById(`btn-reviews-${place.place_id}`)
                if (btnReviews) {
                    btnReviews.addEventListener('click', () => fetchReviews(place))
                }
            })
        })
        
        newMarkers.push(marker)
    })
    
    
    markers.value = newMarkers
}

const activeSearches = ref(0) // Track active API calls

const performSearch = (location, type) => {
    if (!placesService) return

    const request = {
        location: location,
        radius: 1500, // 1.5km
        type: type
    }

    // Apply Price Filter if set
    if (maxPrice.value !== null) {
        if (maxPrice.value === 1) {
             request.minPriceLevel = 0
             request.maxPriceLevel = 1
        } else {
             request.minPriceLevel = maxPrice.value
             request.maxPriceLevel = maxPrice.value
        }
    }

    activeSearches.value++

    placesService.nearbySearch(request, (results, status, pagination) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
            // Append new results, avoiding duplicates
            const existingIds = new Set(nearbyRestaurants.value.map(r => r.place_id))
            const newResults = results.filter(r => !existingIds.has(r.place_id))
            
            nearbyRestaurants.value = [...nearbyRestaurants.value, ...newResults]
            
            // Update Cache
            nearbyStore.setRestaurants(nearbyRestaurants.value, currentLocation)
            
            updateMarkers()

            // Fetch next page if available
            // Google requires a short delay before the next page token is valid
            if (pagination && pagination.hasNextPage) {
                 setTimeout(() => {
                    pagination.nextPage()
                }, 2000)
                // Note: We don't decrement activeSearches here because the callback will be called again
                return 
            }
        } else {
            // Only log errors if not ZERO_RESULTS (which is common for some types)
            if (status !== 'ZERO_RESULTS') {
                 console.warn(`Search failed for type ${type}:`, status)
            }
        }
        
        // If we reach here, this branch of search is complete (no more pages or error)
        activeSearches.value--
        if (activeSearches.value <= 0) {
            loading.value = false
            // Final check: if we really found nothing after ALL searches
            if (nearbyRestaurants.value.length === 0) {
                error.value = "附近沒有找到符合條件的餐廳"
            }
        }
    })
}

const triggerSearch = (location) => {
    // Clear previous results
    nearbyRestaurants.value = []
    error.value = null
    loading.value = true 
    activeSearches.value = 0

    const typesToSearch = ['restaurant', 'cafe', 'meal_takeaway', 'bakery', 'bar', 'food']

    typesToSearch.forEach(type => {
        performSearch(location, type)
    })
}

const nearbyStore = useNearbyStore()

// Watch for filter changes
watch(minRating, () => {
    updateMarkers() // Client-side filter
})

watch(maxPrice, () => {
    if (currentLocation) {
        triggerSearch(currentLocation) // Server-side filter (requires re-fetch)
    }
})

const getPreciseLocation = () => {
    return new Promise((resolve, reject) => {
        // First try: High Accuracy
        navigator.geolocation.getCurrentPosition(
            resolve,
            (err) => {
                console.warn("High Accuracy failed, trying low accuracy...", err)
                // Second try: Low Accuracy (Fallback)
                navigator.geolocation.getCurrentPosition(
                    resolve,
                    (err2) => reject(err2), // If even low accuracy fails, reject
                    { 
                        enableHighAccuracy: false, 
                        timeout: 15000, 
                        maximumAge: 30000 
                    }
                )
            },
            { 
                enableHighAccuracy: true, 
                timeout: 5000, // Short timeout for high accuracy first attempt
                maximumAge: 0 
            }
        )
    })
}

const initMap = async (lat, lng) => {
    try {
        const google = await loadGoogleMaps()
        currentLocation = { lat, lng }
        
        // Initialize Map
        map = new google.maps.Map(mapContainer.value, {
            center: currentLocation,
            zoom: 15,
            styles: mapStyle, // Apply dark style
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true
        })

        // Current Location Marker (Blue Dot)
        new google.maps.Marker({
            position: currentLocation,
            map: map,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: "#4285F4",
                fillOpacity: 1,
                strokeColor: "white",
                strokeWeight: 2,
            },
            title: "你目前的位置",
            zIndex: 999 
        })

        infoWindow = new google.maps.InfoWindow()
        placesService = new google.maps.places.PlacesService(map)

        // SMART CACHE CHECK
        if (nearbyStore.shouldRefresh(currentLocation)) {
             console.log('🌍 New location detected (or cache expired), triggering search...')
             triggerSearch(currentLocation)
        } else {
             console.log('💾 Using cached restaurant data')
             nearbyRestaurants.value = nearbyStore.restaurants
             updateMarkers()
             loading.value = false
        }

    } catch (e) {
        console.error("Map Init Error:", e)
        error.value = "地圖載入失敗"
    }
}



onMounted(async () => {
    loading.value = true
    try {
        if (navigator.geolocation) {
            getPreciseLocation()
                .then((position) => {
                    initMap(position.coords.latitude, position.coords.longitude)
                    loading.value = false
                })
                .catch((err) => {
                    console.error("Geolocation Error:", err)
                    let msg = "無法取得您的位置。"
                    if (err.code === 1) msg = "您拒絕了定位權限，請至瀏覽器設定開啟。"
                    else if (err.code === 2) msg = "無法偵測到您的位置。"
                    else if (err.code === 3) msg = "定位請求逾時，系統已切換至預設地點。"
                    
                    // Fallback to Taipei Main Station
                    initMap(25.0478, 121.5170).then(() => {
                        error.value = msg
                    })
                    loading.value = false
                })
        } else {
            error.value = "您的瀏覽器不支援定位功能。"
            loading.value = false
            initMap(25.0478, 121.5170)
        }
    } catch (e) {
        console.error(e)
        error.value = "地圖載入發生錯誤"
        loading.value = false
    }
})

</script>

<template>
    <div class="map-page">
        <!-- Control Panel -->
        <div class="controls glass-panel">
            <div class="header-text">
                <h2>🔎 探索美食</h2>
                <span class="subtitle">搜尋附近 1.5km 的餐廳</span>
            </div>

            <div class="control-group" v-show="isExpanded || !isMobile">
                <label>最低評分：</label>
                <select v-model="minRating" class="rating-select">
                    <option v-for="opt in ratings" :key="opt.value" :value="opt.value">
                        {{ opt.label }}
                    </option>
                </select>
            </div>

            <div class="control-group" v-show="isExpanded || !isMobile">
                <label>預算：</label>
                <select v-model="maxPrice" class="rating-select">
                    <option v-for="opt in prices" :key="opt.value" :value="opt.value">
                        {{ opt.label }}
                    </option>
                </select>
            </div>

            <div class="stats" v-if="!loading && (isExpanded || !isMobile)">
                找到 {{ nearbyRestaurants.length }} 間餐廳
                <span v-if="minRating > 0">(符合條件: {{ markers.length }})</span>
            </div>

            <!-- Pagination Button -->
            <button v-if="nextPageToken && !loading" class="btn-load-more" @click="loadMoreResults">
                ➕ 載入更多
            </button>

            <!-- Mobile Toggle Button -->
            <button class="toggle-btn" v-if="isMobile" @click="isExpanded = !isExpanded">
                {{ isExpanded ? '🔽 收起篩選' : '🔼 展開篩選' }}
            </button>
        </div>

        <div v-if="loading" class="loading-overlay">
            <div class="spinner"></div>
            <p>正在搜尋附近好吃的...</p>
        </div>

        <div v-if="error" class="error-banner">
            ⚠️ {{ error }}
        </div>

        <div ref="mapContainer" class="map-container"></div>
        
        <!-- Filter Feedback -->
        <div v-if="nearbyRestaurants.length > 0 && markers.length === 0" class="no-match-overlay">
            <div class="glass-panel" style="padding: 1rem 2rem; text-align: center;">
                <p style="margin: 0; font-size: 1.1rem;">沒有符合評分條件的餐廳 😅</p>
                <button @click="minRating = 0" style="margin-top: 0.5rem; background: var(--primary-color); border: none; padding: 0.5rem 1rem; border-radius: 8px; color: white; cursor: pointer;">
                    顯示所有餐廳
                </button>
            </div>
        </div>
        
        <!-- Reviews Modal Component -->
        <RestaurantReviewsModal 
            :show="showReviewsModal"
            :place="selectedPlaceReviews"
            :loading="reviewsLoading"
            @close="showReviewsModal = false"
        />
    </div>
</template>

<style scoped>
.map-page {
    position: relative;
    width: 100%;
    flex: 1; /* Grow to fill the flex container */
    display: flex; /* Make map container fill this too */
    flex-direction: column;
}

.map-container {
    width: 100%;
    flex: 1; /* Reliably fill key flex parent */
    min-height: 0; /* Prevent overflow issues in nested flex */
}

.controls {
    position: absolute;
    top: 1rem;
    left: 1rem;
    z-index: 10;
    padding: 1rem 1.5rem;
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    backdrop-filter: blur(12px);
    background: rgba(30, 41, 59, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    min-width: 250px;
    transition: all 0.3s ease;
}

.header-text h2 {
    margin: 0;
    font-size: 1.2rem;
    color: #fff;
}

.header-text .subtitle {
    font-size: 0.8rem;
    color: #94a3b8;
}

.control-group {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    color: #cbd5e1;
    font-size: 0.9rem;
}

.rating-select {
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #fff;
    padding: 0.5rem;
    border-radius: 8px;
    outline: none;
    cursor: pointer;
    font-size: 0.9rem;
    width: 100%;
}

.rating-select:hover {
    border-color: rgba(255, 255, 255, 0.5);
}

.stats {
    color: #94a3b8;
    font-size: 0.85rem;
    border-top: 1px solid rgba(255,255,255,0.1);
    padding-top: 0.5rem;
}

.btn-load-more {
    background: var(--primary-color);
    color: white;
    border: none;
    padding: 0.6rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.9rem;
    margin-top: 0.5rem;
    transition: background 0.2s;
}

.btn-load-more:hover {
    filter: brightness(1.1);
}

.toggle-btn {
    background: transparent;
    border: none;
    color: var(--primary-color);
    font-size: 0.9rem;
    cursor: pointer;
    padding: 0.5rem;
    margin-top: -0.5rem;
    font-weight: 600;
}

.loading-overlay {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: #1a1a1a;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 20;
    color: white;
}

.error-banner {
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(239, 68, 68, 0.95);
    color: white;
    padding: 10px 20px;
    border-radius: 8px;
    z-index: 20;
    font-weight: 500;
    box-shadow: 0 4px 6px rgba(0,0,0,0.2);
}

.spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255,255,255,0.2);
    border-top: 3px solid #60a5fa;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

@media (max-width: 600px) {
    .controls {
        top: auto;
        bottom: 2rem;
        left: 50%;
        transform: translateX(-50%);
        width: 90%;
        max-width: 350px;
        bottom: 1.5rem; /* slightly higher than edges */
    }
}
</style>
