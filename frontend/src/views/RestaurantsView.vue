<script setup>
import { ref, watch, nextTick } from 'vue'
import { groupsApi } from '../api/groups'
import { dishesApi } from '../api/dishes'
import DishCard from '../components/DishCard.vue'

const dishes = ref([])
const groups = ref([])
const loading = ref(true)
const userLocation = ref(null)

// Get user location
const getUserLocation = () => {
    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    userLocation.value = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    }
                    resolve(userLocation.value)
                },
                (error) => {
                    console.warn('無法獲取用戶位置:', error)
                    resolve(null)
                }
            )
        } else {
            console.warn('瀏覽器不支持地理位置')
            resolve(null)
        }
    })
}

// Calculate distance between two points
const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
}

// Add distance to dishes
const addDistancesToDishes = (dishesArray) => {
    if (!userLocation.value) return dishesArray
    
    return dishesArray.map(dish => {
        if (dish.lat && dish.lng) {
            const distance = calculateDistance(
                userLocation.value.lat, 
                userLocation.value.lng, 
                dish.lat, 
                dish.lng
            )
            return { ...dish, distance: Math.round(distance * 10) / 10 } // Round to 1 decimal
        }
        return { ...dish, distance: null }
    })
}

// Modals
const showCreateDish = ref(false)
const showCreateGroup = ref(false)
const showAddToGroup = ref(false)
const newDish = ref({ name: '', description: '', rarity: 'common', address: '', lat: null, lng: null, place_id: null, image_url: null })
const newGroup = ref({ name: '', description: '', is_public: false })
const showManageGroups = ref(false)
const selectedDish = ref(null)
const selectedGroupId = ref(null)
// const addSuccess = ref(false) // Removed
const selectedGroupFilter = ref(null) // For filtering view

// Notification State
const notificationVisible = ref(false)
const notificationText = ref('')

const showTopNotification = (text) => {
    notificationText.value = text
    notificationVisible.value = true
    setTimeout(() => {
        notificationVisible.value = false
    }, 3000)
}

const fetchDishes = async () => {
    loading.value = true
    try {
        const res = await dishesApi.getAll()
        let dishesData = res.data
        
        // Get user location if not already have
        if (!userLocation.value) {
            await getUserLocation()
        }
        
        // Add distances
        dishesData = addDistancesToDishes(dishesData)
        
        dishes.value = dishesData
    } catch (e) {
        console.error(e)
    } finally {
        loading.value = false
    }
}

const fetchGroups = async () => {
    try {
        const res = await groupsApi.getAll({ type: 'owned' })
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
        let dishesData = res.data
        
        // Add distances
        dishesData = addDistancesToDishes(dishesData)
        
        dishes.value = dishesData
    } catch(e) {
        alert('無法取得群組餐廳')
    } finally {
        loading.value = false
    }
}


const selectedFile = ref(null)
const uploading = ref(false)

// Info panel & map
const infoPanelOpen = ref(false)
const placeDetail = ref(null)
const mapContainer = ref(null)
let map = null
let marker = null

// Google Maps Places Search refs
const searchQuery = ref('')
const searchResults = ref([])
const searching = ref(false)
const editSearchResults = ref([]) // 編輯模式的搜尋結果
let placesService = null
let placesMap = null


import { loadGoogleMaps } from '../utils/googleMaps'

const ensureMap = async () => {
    await loadGoogleMaps()
    const container = mapContainer.value
    if (!container) return
    const mountedDiv = map?.getDiv?.()
    if (!map || mountedDiv !== container) {
        map = new window.google.maps.Map(container, {
            zoom: 16,
            center: { lat: 23.5, lng: 121 }
        })
    }
}

const fetchPlaceDetail = async (query) => {
    await initPlacesService()
    return new Promise((resolve, reject) => {
        placesService.findPlaceFromQuery({
            query,
            fields: ['place_id', 'name', 'formatted_address', 'geometry', 'rating', 'user_ratings_total', 'photos', 'opening_hours']
        }, (results, status) => {
            if (status !== window.google.maps.places.PlacesServiceStatus.OK || !results?.length) {
                return reject(status)
            }
            const r = results[0]
            // 用 getDetails 取得更完整的資訊
            placesService.getDetails({
                placeId: r.place_id,
                fields: ['name', 'formatted_address', 'formatted_phone_number', 'international_phone_number', 'rating', 'user_ratings_total', 'photos', 'opening_hours', 'geometry']
            }, (placeDetail, status) => {
                if (status !== window.google.maps.places.PlacesServiceStatus.OK) {
                    console.warn('getDetails failed, using findPlace results', status)
                    const photoUrl = r.photos?.[0]?.getUrl({ maxWidth: 800, maxHeight: 600 })
                    return resolve({
                        name: r.name,
                        address: r.formatted_address,
                        phone: '',
                        rating: r.rating,
                        reviewCount: r.user_ratings_total,
                        openingHours: r.opening_hours?.weekday_text,
                        location: r.geometry?.location,
                        photoUrl,
                        placeId: r.place_id,
                    })
                }
                const photoUrl = placeDetail.photos?.[0]?.getUrl({ maxWidth: 800, maxHeight: 600 })
                resolve({
                    name: placeDetail.name,
                    address: placeDetail.formatted_address,
                    phone: placeDetail.formatted_phone_number || placeDetail.international_phone_number || '',
                    rating: placeDetail.rating,
                    reviewCount: placeDetail.user_ratings_total,
                    openingHours: placeDetail.opening_hours?.weekday_text,
                    location: placeDetail.geometry?.location,
                    photoUrl,
                    placeId: r.place_id,
                })
            })
        })
    })
}

const updateDishData = async (dish) => {
    // Helper to fetch details and save to DB
    if (!dish.place_id) return false // Cannot update without place_id
    
    try {
        await initPlacesService()
        const detail = await new Promise((resolve, reject) => {
            placesService.getDetails({
                placeId: dish.place_id,
                fields: ['name', 'formatted_address', 'formatted_phone_number', 'international_phone_number', 'rating', 'user_ratings_total', 'photos', 'opening_hours', 'geometry']
            }, (placeDetail, status) => {
                if (status !== window.google.maps.places.PlacesServiceStatus.OK) {
                    return reject(status)
                }
                const photoUrl = placeDetail.photos?.[0]?.getUrl({ maxWidth: 800, maxHeight: 600 })
                resolve({
                    name: placeDetail.name,
                    address: placeDetail.formatted_address,
                    phone: placeDetail.formatted_phone_number || placeDetail.international_phone_number || '',
                    rating: placeDetail.rating,
                    reviewCount: placeDetail.user_ratings_total,
                    openingHours: placeDetail.opening_hours?.weekday_text,
                    location: placeDetail.geometry?.location,
                    photoUrl,
                })
            })
        })

        // Always save if we fetched successfully
        await savePlaceDetailsToDb(dish, detail)
        return true
    } catch (e) {
        console.warn(`Failed to update ${dish.name}:`, e)
        return false
    }
}

const showPlaceOnPanel = async (dish) => {
    placeDetail.value = null
    infoPanelOpen.value = true
    await nextTick()

    // 預設使用 dish 的基本資料
    placeDetail.value = {
        name: dish.name,
        address: dish.address,
        phone: dish.phone || '',
        rating: dish.rating || null,
        reviewCount: dish.review_count || null,
        openingHours: dish.opening_hours ? JSON.parse(dish.opening_hours) : null,
        photoUrl: dish.image_url || '',
        placeId: dish.place_id,
        id: dish.id
    }

    let locationFromDetail = null

    //如果只有 place_id 且缺詳細資料，嘗試背景更新 (Single Update)
    // 但因為我們有了 updateAll 功能，這邊可以只做 "如果完全沒資料才抓" 或是 "Smart Cache"
    const hasCachedDetails = dish.phone || dish.opening_hours || dish.rating;
    
    if (dish.place_id && !hasCachedDetails) {
        // Trigger background update for this single dish
        updateDishData(dish).then(success => {
            if (success && placeDetail.value?.id === dish.id) {
                // If panel is still open for this dish, refresh view
                // We can't easily re-trigger showPlaceOnPanel without infinite loop or complex state.
                // Instead, just update placeDetail.value via reactivity if we could.
                // Or simplified: Just let the updateAll button handle mass updates.
                // For now, let's keep the original "Lazy Update" behavior but using the new helper?
                // Actually the original logic put 'placeDetail.value' update inside the fetch block.
                // Let's stick closer to original logic for 'showPlaceOnPanel' to ensure smooth UX,
                // BUT call savePlaceDetailsToDb same as before.
            }
        })
    }
    
    // Original Logic for setting map location
    const fallbackLocation = (dish.lat && dish.lng) ? { lat: Number(dish.lat), lng: Number(dish.lng) } : null
    if (fallbackLocation) {
         await ensureMap()
         await nextTick()
         map.setCenter(fallbackLocation)
         map.setZoom(16)
         if (!marker) marker = new window.google.maps.Marker({ map })
         marker.setMap(map)
         marker.setPosition(fallbackLocation)
         marker.setTitle(dish.name)
    }
}

const isUpdatingAll = ref(false)
const updateProgress = ref({ current: 0, total: 0 })

const updateAllRestaurants = async () => {
    const targets = dishes.value.filter(d => d.place_id)
    if (targets.length === 0) return alert('沒有綁定 Google 地點的餐廳，無法更新。')
    
    if (!confirm(`即將更新 ${targets.length} 間餐廳的資訊 (評分、電話、營業時間等)，這可能需要一點時間。確定要繼續嗎？`)) return

    isUpdatingAll.value = true
    updateProgress.value = { current: 0, total: targets.length }
    
    let successCount = 0
    
    // Process in chunks to avoid blocking too much or hitting easy rate limits
    const CHUNK_SIZE = 3 
    for (let i = 0; i < targets.length; i += CHUNK_SIZE) {
        const chunk = targets.slice(i, i + CHUNK_SIZE)
        const promises = chunk.map(dish => updateDishData(dish))
        
        const results = await Promise.all(promises)
        successCount += results.filter(r => r).length
        
        updateProgress.value.current = Math.min(i + CHUNK_SIZE, targets.length)
        
        // Small delay between chunks
        if (i + CHUNK_SIZE < targets.length) {
            await new Promise(r => setTimeout(r, 1000)) 
        }
    }
    
    isUpdatingAll.value = false
    alert(`更新完成！成功更新 ${successCount} / ${targets.length} 間餐廳。`)
    fetchDishes() // Refresh list to show new data
}

const refreshPlaceInfo = async (dish) => {
    if (!dish.place_id) return alert('此餐廳沒有連結 Google 地點，無法更新')
    
    const success = await updateDishData(dish)
    if (success) {
        alert('已更新最新資訊！')
        // Refresh current list item manually or re-fetch
        fetchDishes()
    } else {
        alert('更新失敗，請稍後再試')
    }
}

const initPlacesService = async () => {
    try {
        await loadGoogleMaps()
        if (!placesMap) {
            // Create a hidden map element for Places service
            const hiddenMapDiv = document.createElement('div')
            hiddenMapDiv.style.display = 'none'
            document.body.appendChild(hiddenMapDiv)
            placesMap = new window.google.maps.Map(hiddenMapDiv, { center: { lat: 0, lng: 0 }, zoom: 1 })
        }
        placesService = new window.google.maps.places.PlacesService(placesMap)
        console.log('✅ PlacesService initialized')
    } catch (e) {
        console.error('❌ Failed to init PlacesService:', e)
    }
}

const geocodeAddress = async (address) => {
    if (!address || address.trim().length === 0) {
        alert('請輸入地址')
        return
    }
    
    await loadGoogleMaps()
    const geocoder = new window.google.maps.Geocoder()
    try {
        const results = await new Promise((resolve, reject) => {
            geocoder.geocode({ address }, (results, status) => {
                if (status === 'OK') {
                    resolve(results)
                } else {
                    reject(status)
                }
            })
        })
        
        if (results && results.length > 0) {
            const location = results[0].geometry.location
            newDish.value.lat = location.lat()
            newDish.value.lng = location.lng()
            newDish.value.address = results[0].formatted_address
            console.log('✅ 地址已定位:', newDish.value.address, newDish.value.lat, newDish.value.lng)
            alert('✅ 地址定位成功！')
        } else {
            alert('❌ 找不到該地址，請檢查是否輸入正確')
        }
    } catch (e) {
        console.error('❌ Geocoding failed:', e)
        alert('❌ 地址定位失敗，請檢查網路或地址內容')
    }
}

const geocodeEditAddress = async (address) => {
    if (!address || address.trim().length === 0) {
        alert('請輸入地址')
        return
    }
    
    await loadGoogleMaps()
    const geocoder = new window.google.maps.Geocoder()
    try {
        const results = await new Promise((resolve, reject) => {
            geocoder.geocode({ address }, (results, status) => {
                if (status === 'OK') {
                    resolve(results)
                } else {
                    reject(status)
                }
            })
        })
        
        if (results && results.length > 0) {
            const location = results[0].geometry.location
            editDishData.value.lat = location.lat()
            editDishData.value.lng = location.lng()
            editDishData.value.address = results[0].formatted_address
            editDishData.value.place_id = null // 手動定位不帶 place_id
            console.log('✅ 地址已定位:', editDishData.value.address, editDishData.value.lat, editDishData.value.lng)
            alert('✅ 地址定位成功！')
        } else {
            alert('❌ 找不到該地址，請檢查是否輸入正確')
        }
    } catch (e) {
        console.error('❌ Geocoding failed:', e)
        alert('❌ 地址定位失敗，請檢查網路或地址內容')
    }
}

const onCreateAddressInput = () => {
    newDish.value.place_id = null
    newDish.value.lat = null
    newDish.value.lng = null
}

const onEditAddressInput = () => {
    editDishData.value.place_id = null
    editDishData.value.lat = null
    editDishData.value.lng = null
}

const refetchPlaceId = async () => {
    if (!editDishData.value.name || !editDishData.value.address) {
        alert('請確保餐廳名稱和地址已填寫')
        return
    }
    
    // 移除郵遞區號（前面3-5位數字）
    const addressWithoutPostal = editDishData.value.address.replace(/^\d{3,5}/, '').trim()
    
    // 檢查移除郵遞區號後是否還有門牌號碼
    const hasNumber = /\d/.test(addressWithoutPostal)
    
    if (!hasNumber) {
        // 地址不完整，搜尋附近餐廳
        console.log('🔍 地址不完整，搜尋附近餐廳:', editDishData.value.address)
        
        try {
            await initPlacesService()
            const request = {
                query: editDishData.value.address + ' 餐廳',
                type: 'restaurant'
            }
            
            placesService.textSearch(request, (results, status) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
                    console.log('✅ 找到', results.length, '家餐廳')
                    console.log('📋 餐廳列表:', results.map(r => r.name))
                    editSearchResults.value = results
                    console.log('✅ editSearchResults 已設置，長度:', editSearchResults.value.length)
                    // 使用 nextTick 確保 DOM 更新後再顯示 alert
                    nextTick(() => {
                        console.log('🔄 nextTick 執行，列表應該已渲染')
                        alert(`⚠️ 地址不完整（缺少門牌號碼）\n\n已找到 ${results.length} 家附近餐廳，請從下方列表中選擇正確的餐廳`)
                    })
                } else {
                    console.warn('❌ 搜尋狀態:', status, '結果數量:', results?.length || 0)
                    editSearchResults.value = []
                    alert('❌ 找不到附近餐廳，請輸入完整地址\n例如：台灣桃園市八德區中華路277號')
                }
            })
        } catch (e) {
            console.error('❌ 搜尋失敗:', e)
            alert('❌ 搜尋失敗，請檢查網路連線')
        }
        return
    }
    
    // 地址完整，直接搜尋
    const query = `${editDishData.value.name} ${editDishData.value.address}`.trim()
    console.log('🔍 搜尋餐廳資訊:', query)
    
    try {
        const detail = await fetchPlaceDetail(query)
        editDishData.value.place_id = detail.placeId
        if (detail.location) {
            editDishData.value.lat = detail.location.lat()
            editDishData.value.lng = detail.location.lng()
        }
        editDishData.value.address = detail.address || editDishData.value.address
        console.log('✅ 找到餐廳資訊:', detail.name, detail.placeId)
        alert('✅ 已找到餐廳資訊，儲存後將顯示完整詳情')
        editSearchResults.value = [] // 清空搜尋結果
    } catch (e) {
        console.warn('❌ 搜尋失敗:', e)
        alert('❌ 找不到餐廳資訊，請確認名稱和地址正確')
    }
}

const selectEditPlace = (place) => {
    console.log('📍 選擇餐廳:', place)
    editDishData.value.name = place.name || editDishData.value.name
    editDishData.value.address = place.formatted_address || place.name || ''
    editDishData.value.place_id = place.place_id || null
    if (place.geometry && place.geometry.location) {
        editDishData.value.lat = place.geometry.location.lat()
        editDishData.value.lng = place.geometry.location.lng()
    }
    editSearchResults.value = [] // 清空搜尋結果
    console.log('✅ 餐廳資訊已填入')
}

const searchRestaurants = async () => {
    if (!searchQuery.value) return
    searching.value = true
    try {
        // Ensure user location is available
        if (!userLocation.value) {
            await getUserLocation()
        }
        
        await initPlacesService()
        const request = {
            query: searchQuery.value,
            type: 'restaurant'
        }
        placesService.textSearch(request, (results, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK) {
                console.log('✅ Found ' + results.length + ' results')
                // Add distances to search results
                let resultsWithDistance = results.map(result => {
                    if (result.geometry && result.geometry.location && userLocation.value) {
                        const distance = calculateDistance(
                            userLocation.value.lat,
                            userLocation.value.lng,
                            result.geometry.location.lat(),
                            result.geometry.location.lng()
                        )
                        return { ...result, distance: Math.round(distance * 10) / 10 }
                    }
                    return { ...result, distance: null }
                })
                searchResults.value = resultsWithDistance
            } else {
                console.warn('⚠️ Search status:', status)
                searchResults.value = []
            }
        })
    } catch (e) {
        console.error('❌ Search failed:', e)
    } finally {
        searching.value = false
    }
}

const selectPlace = async (place) => {
    try {
        console.log('📍 Selecting place:', place)
        newDish.value.name = place.name || ''
        newDish.value.address = place.formatted_address || place.name || ''
        newDish.value.place_id = place.place_id || null // 儲存 place_id
        if (place.geometry && place.geometry.location) {
            newDish.value.lat = place.geometry.location.lat()
            newDish.value.lng = place.geometry.location.lng()
        }

        // Capture Photo URL
        if (place.photos && place.photos.length > 0) {
            newDish.value.image_url = place.photos[0].getUrl({ maxWidth: 800 });
        } else {
            newDish.value.image_url = null;
        }
        
        // Clear search results after selection
        searchResults.value = []
        searchQuery.value = ''
        console.log('✅ Place info filled successfully')
        
    } catch (e) {
        console.error('❌ Error selecting place:', e)
    }
}

// Initialize PlacesService when create modal opens
watch(showCreateDish, async (val) => {
    if (val) {
        await nextTick()
        initPlacesService()
        searchQuery.value = ''
        searchResults.value = []
    }
})

// ... existing refs ...

const handleFileUpload = (event) => {
    selectedFile.value = event.target.files[0]
}

const createDish = async () => {
    if (!newDish.value.name) return alert('請輸入名稱')
    
    // 檢查是否已有相同名稱或地址的餐廳
    const duplicate = dishes.value.find(d => 
        d.name === newDish.value.name || 
        (newDish.value.address && d.address === newDish.value.address)
    )
    
    if (duplicate) {
        alert(`⚠️ 已經有此餐廳了\n名稱: ${duplicate.name}\n地址: ${duplicate.address || '未設定'}`)
        // 清除表單
        newDish.value = { name: '', description: '', rarity: 'common', address: '', lat: null, lng: null, place_id: null, image_url: null }
        selectedFile.value = null
        searchQuery.value = ''
        searchResults.value = []
        return
    }
    
    uploading.value = true
    try {
        const formData = new FormData()
        formData.append('name', newDish.value.name)
        formData.append('description', newDish.value.description)
        formData.append('rarity', newDish.value.rarity)
        // Include optional address and geo
        if (newDish.value.address) formData.append('address', newDish.value.address)
        if (newDish.value.lat) formData.append('lat', newDish.value.lat)
        if (newDish.value.lng) formData.append('lng', newDish.value.lng)
        if (newDish.value.place_id) formData.append('place_id', newDish.value.place_id)
        if (selectedFile.value) {
            formData.append('image', selectedFile.value)
        } else if (newDish.value.image_url) {
            formData.append('image_url', newDish.value.image_url)
        }

        await dishesApi.create(formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
        
        showCreateDish.value = false
        newDish.value = { name: '', description: '', rarity: 'common', address: '', lat: null, lng: null, place_id: null, image_url: null }
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
        // Show Top Notification
        showTopNotification('加入成功') // Text only
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

const toggleExpand = async (dish, event) => {
    // If clicking the same already expanded card, close it
    if (expandedDishId.value === dish.id) {
        expandedDishId.value = null
        infoPanelOpen.value = false
        placeDetail.value = null
        return
    }

    // Measure height before expanding
    const card = event?.target?.closest?.('.dish-card')
    const wrapper = card?.parentElement
    if (wrapper) {
        wrapperHeights.value[dish.id] = wrapper.offsetHeight
    }

    expandedDishId.value = dish.id
    await showPlaceOnPanel(dish)
}

const closeExpand = () => {
    expandedDishId.value = null
    wrapperHeights.value = {}
    infoPanelOpen.value = false
    placeDetail.value = null
}

// Edit Logic
const showEditDish = ref(false)
const editDishData = ref({ id: null, name: '', description: '', rarity: 'common', address: '', lat: null, lng: null, place_id: null })
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
    editSearchResults.value = [] // 清空搜尋結果
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
        formData.append('address', editDishData.value.address || '')
        formData.append('lat', editDishData.value.lat !== null && editDishData.value.lat !== undefined ? editDishData.value.lat : '')
        formData.append('lng', editDishData.value.lng !== null && editDishData.value.lng !== undefined ? editDishData.value.lng : '')
        formData.append('place_id', editDishData.value.place_id || '')
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
    <!-- Top Notification Banner -->
    <div v-if="notificationVisible" class="top-notification">
        <div style="display: flex; align-items: center; gap: 8px;">
            <div class="icon">✓</div>
            <span>{{ notificationText }}</span>
        </div>
        <div class="close-btn" @click="notificationVisible = false">✕</div>
        <div class="progress-bar"></div>
    </div>
    <div class="panel-wrapper" style="width: 100%; max-width: 1200px; position: relative;">
      <!-- Visual Glass Layer -->
      <div class="glass-panel-bg"></div>

      <!-- Content Layer -->
      <div class="panel-content" style="padding: 2rem; position: relative;">
          <!-- Backdrop for closing expanded card -->
          <transition name="fade">
            <div v-if="expandedDishId" class="click-outside-overlay" @click="closeExpand"></div>
          </transition>

      <h2>我的餐廳</h2>
      
      <div class="actions" style="margin-bottom: 1rem; display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
        <button class="btn-primary" @click="showCreateDish = true">➕ 新增餐廳</button>
        <button class="btn-secondary" @click="showCreateGroup = true">📁 新增群組</button>
        <button v-if="groups.length > 0" class="btn-small" @click="showManageGroups = true">⚙️ 管理群組</button>
        <button class="btn-small btn-highlight" @click="updateAllRestaurants" :disabled="isUpdatingAll">
            {{ isUpdatingAll ? `更新中 (${updateProgress.current}/${updateProgress.total})...` : '🔄 更新所有資料' }}
        </button>
        
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
             :class="{ 'card-behind-panel': infoPanelOpen }"
             :style="{ height: expandedDishId === dish.id ? wrapperHeights[dish.id] + 'px' : 'auto' }">
            
            <DishCard 
              :dish="dish"
              :is-expanded="expandedDishId === dish.id"
                            @toggle-expand="(e) => toggleExpand(dish, e)"
              @add-to-group="openAddToGroup"
              @edit="openEditDish"
              @delete="deleteDish"
              @remove-group="(gItem) => removeGroupFromDish(dish, gItem)"
            />
        </div>
      </div>
        </div>

        <transition name="slide-fade">
            <aside v-if="infoPanelOpen" class="info-panel">
                <button class="info-close" @click="closeExpand">✕</button>
                <div class="info-container">
                    <!-- 左邊：餐廳資訊 -->
                    <div class="info-left">
                        <div v-if="placeDetail" class="info-body">
                            <div v-if="placeDetail.photoUrl" class="info-photo">
                                <img :src="placeDetail.photoUrl" alt="place photo">
                            </div>
                            <div v-else class="info-photo-placeholder">🍽️</div>
                            
                            <div style="display: flex; justify-content: space-between; align-items: start;">
                                <h3 class="info-title">{{ placeDetail.name }}</h3>
                                <button v-if="placeDetail.placeId" 
                                        @click="refreshPlaceInfo(dishes.find(d=>d.id===placeDetail.id))" 
                                        class="btn-small" 
                                        title="從 Google 更新最新資訊"
                                        style="font-size: 0.8rem; padding: 2px 6px;">
                                    🔄 更新
                                </button>
                            </div>
                            
                            <div class="info-rating" v-if="placeDetail.rating">
                                <span class="stars">⭐ {{ placeDetail.rating }}</span>
                                <span v-if="placeDetail.reviewCount" class="review-count">({{ placeDetail.reviewCount }} 則評論)</span>
                            </div>
                            
                            <p class="info-address">📍 {{ placeDetail.address || '無地址資料' }}</p>
                            <p v-if="placeDetail.phone" class="info-line">📞 {{ placeDetail.phone }}</p>
                            
                            <div v-if="placeDetail.openingHours" class="info-hours">
                                <p class="hours-title">營業時間</p>
                                <ul class="hours-list">
                                    <li v-for="(hour, idx) in placeDetail.openingHours" :key="idx" class="hour-item">{{ hour }}</li>
                                </ul>
                            </div>
                        </div>
                        <div v-else class="info-loading">載入中...</div>
                    </div>
                    
                    <!-- 右邊：地圖 -->
                    <div class="info-right">
                        <div class="info-map" ref="mapContainer"></div>
                    </div>
                </div>
            </aside>
        </transition>
    
    <!-- Create Dish Modal -->
    <div v-if="showCreateDish" class="modal-overlay">
      <div class="glass-panel modal">
        <h3>新增餐廳</h3>
        
        <!-- Google Places Search -->
        <div class="search-section">
          <label>🔍 搜尋餐廳</label>
          <div style="display: flex; gap: 0.5rem;">
            <input v-model="searchQuery" placeholder="輸入餐廳名稱" class="input-field" style="flex: 1;">
            <button class="btn-primary" @click="searchRestaurants" :disabled="searching">
              {{ searching ? '搜尋中...' : '搜尋' }}
            </button>
          </div>
          
          <!-- Search Results List -->
          <div v-if="searchResults.length > 0" class="search-results">
            <div v-for="(result, idx) in searchResults" :key="idx" class="search-result-item" @click="selectPlace(result)">
              <div style="font-weight: bold;">{{ result.name }}</div>
              <div style="font-size: 0.85rem; color: var(--text-muted);">{{ result.formatted_address }}</div>
              <div v-if="result.distance !== null" style="font-size: 0.8rem; color: var(--accent); font-weight: 500;">📍 {{ result.distance }} km</div>
            </div>
          </div>
        </div>
        
        <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 1rem 0;">
        
                <div class="form-group">
                    <label>餐廳名稱 <span class="required-asterisk">*</span></label>
                    <input v-model="newDish.name" placeholder="餐廳名稱" class="input-field">
                </div>
                <input v-model="newDish.description" placeholder="描述" class="input-field">
        <div style="display: flex; gap: 0.5rem;">
          <input v-model="newDish.address" @input="onCreateAddressInput" placeholder="地址（搜尋後會自動填入，可手動修改）" class="input-field" style="flex: 1;">
          <button class="btn-primary" @click="geocodeAddress(newDish.address)" style="white-space: normal; line-height: 1.3; padding: 0.5rem 0.8rem;">
            📍 定位<br><span style="font-size: 0.8em;">顯示地圖</span>
          </button>
        </div>

        <!-- File Upload -->
        <div class="file-upload-group">
            <label>餐廳圖片{{ selectedFile ? '（已選）' : '' }}:</label>
            <input type="file" @change="handleFileUpload" accept="image/*" class="input-field file-input">
            <small v-if="selectedFile" style="color: var(--primary-color);">✅ {{ selectedFile.name }}</small>
        </div>

        <select v-model="newDish.rarity" class="input-field">
          <option value="common">普通 (Common)</option>
          <option value="rare">稀有 (Rare)</option>
          <option value="epic">史詩 (Epic)</option>
          <option value="legend">傳說 (Legend)</option>
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
                <div class="form-group">
                    <label>群組名稱 <span class="required-asterisk">*</span></label>
                    <input v-model="newGroup.name" placeholder="群組名稱 (例如: 公司附近)" class="input-field">
                </div>
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
                <div class="form-group">
                    <label>餐廳名稱 <span class="required-asterisk">*</span></label>
                    <input v-model="editDishData.name" placeholder="餐廳名稱" class="input-field">
                </div>
                <input v-model="editDishData.description" placeholder="描述" class="input-field">
        <div style="display: flex; gap: 0.5rem;">
          <input v-model="editDishData.address" @input="onEditAddressInput" placeholder="地址" class="input-field" style="flex: 1;">
          <button class="btn-primary" @click="geocodeEditAddress(editDishData.address)" style="white-space: normal; line-height: 1.3; padding: 0.5rem 0.8rem;">
            📍 定位<br><span style="font-size: 0.8em;">顯示地圖</span>
          </button>
        </div>
        <button class="btn-secondary" @click="refetchPlaceId" style="width: 100%;">🔍 重新搜尋餐廳資訊（恢復評分、電話等）</button>
        
        <!-- Edit Search Results List -->
        <div v-if="editSearchResults.length > 0" style="border: 2px solid var(--primary-color); background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 8px; margin: 1rem 0;">
          <div style="font-weight: bold; margin-bottom: 0.5rem; color: var(--primary-color); font-size: 1.1rem;">✅ 選擇正確的餐廳 (共 {{ editSearchResults.length }} 家)：</div>
          <div style="max-height: 400px; overflow-y: auto; padding-right: 0.5rem;">
            <div v-for="(result, idx) in editSearchResults" :key="idx" @click="selectEditPlace(result)" style="cursor: pointer; padding: 1rem; background: rgba(255,255,255,0.08); border-radius: 6px; margin-bottom: 0.8rem; border: 1px solid rgba(255,255,255,0.2); transition: all 0.2s; min-height: 60px;">
              <div style="font-weight: bold; font-size: 1rem; margin-bottom: 0.3rem;">{{ result.name }}</div>
              <div style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 0.2rem;">{{ result.formatted_address }}</div>
              <div v-if="result.rating" style="font-size: 0.85rem; color: var(--accent);">⭐ {{ result.rating }} ({{ result.user_ratings_total }} 則評論)</div>
            </div>
          </div>
        </div>
        
        <!-- File Upload -->
        <div class="file-upload-group">
            <label>更換圖片 (留空則不變):</label>
            <input type="file" @change="handleEditFileUpload" accept="image/*" class="input-field file-input">
        </div>

        <select v-model="editDishData.rarity" class="input-field">
          <option value="common">普通 (Common)</option>
          <option value="rare">稀有 (Rare)</option>
          <option value="epic">史詩 (Epic)</option>
          <option value="legend">傳說 (Legend)</option>
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
                <div class="form-group">
                    <label>群組名稱 <span class="required-asterisk">*</span></label>
                    <input v-model="editGroupData.name" placeholder="群組名稱" class="input-field">
                </div>
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
  </div>
</template>



<style scoped>
.glass-panel-bg {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: var(--card-bg);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    z-index: 0;
}

.panel-content {
    z-index: 1; /* Sit above background */
}

/* Ensure fixed overlay works */
.click-outside-overlay {
    position: fixed !important; /* Force Viewport */
    inset: 0;
    z-index: 140; /* Below info-panel (150) */
    background: rgba(0,0,0,0.7); 
    backdrop-filter: blur(5px);
    cursor: default;
}

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
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;
  align-items: stretch; /* Ensure equal height */
}

.card-wrapper {
  position: relative;
  /* width and height are managed by grid */
  transition: all 0.3s ease;
}

.card-wrapper.card-behind-panel {
  opacity: 0.3;
  pointer-events: none;
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
  max-height: 90vh; /* Limit height to 90% of viewport */
  overflow-y: auto; /* Enable vertical scrolling */
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

.form-group {
    margin-bottom: 1.2rem;
}

.form-group label {
    display: block;
    margin-bottom: 0.4rem;
    color: var(--text-muted, #cbd5e1);
    font-size: 0.95rem;
}

.required-asterisk {
    color: #ef4444;
    margin-left: 4px;
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

.btn-highlight {
    border-color: #facc15;
    color: #facc15;
}
.btn-highlight:hover {
    background: rgba(250, 204, 21, 0.1);
    color: #fde047;
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

/* Group Tags */
.group-list-display {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    /* Removed width: 100% and border to let it flow next to buttons */
    padding-left: 1rem; /* Add visual separation */
    border-left: 1px solid rgba(255,255,255,0.2); /* Vertical divider */
    /* REMOVED fixed height to allow wrapping content */
    margin-left: 0.5rem;
}
@media (max-width: 768px) {
    .group-list-display {
        border-left: none;
        padding-left: 0;
        margin-left: 0;
        margin-top: 0.5rem;
        width: 100%; /* Force new line on mobile */
    }
}

.group-tag-display {
    padding: 0.2rem 0.8rem;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid transparent;
}

.group-tag-display:hover {
    background: rgba(255, 255, 255, 0.2);
}

.group-tag-display.active {
    background: var(--primary-glow);
    border-color: var(--primary-color);
    color: white;
}

/* Google Places Search Results */
.search-section {
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.search-section label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: bold;
}

.search-results {
    margin-top: 0.8rem;
    max-height: 250px;
    overflow-y: auto;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.3);
}

.search-result-item {
    padding: 0.8rem 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    cursor: pointer;
    transition: background 0.2s;
}

.search-result-item:last-child {
    border-bottom: none;
}

.search-result-item:hover {
    background: rgba(255, 255, 255, 0.1);
}

.info-panel {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 1000px;
    height: 650px;
    background: var(--card-bg);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
    z-index: 150;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.info-close {
    position: absolute;
    top: 12px;
    right: 12px;
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 50%;
    width: 32px;
    height: 32px;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
}

.info-close:hover {
    background: rgba(0, 0, 0, 0.7);
    color: white;
}

.info-container {
    display: flex;
    height: 100%;
    gap: 0;
}

.info-left {
    flex: 0 0 45%;
    padding: 1.5rem;
    overflow-y: auto;
    border-right: 1px solid rgba(255, 255, 255, 0.1);
    max-height: 650px;
}

.info-right {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.info-body {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.info-photo {
    width: 100%;
    height: 260px;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.1);
    margin-bottom: 1rem;
}

.info-photo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.info-photo-placeholder {
    width: 100%;
    height: 260px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 64px;
    background: rgba(255, 255, 255, 0.05);
    margin-bottom: 1rem;
}

.info-title {
    margin: 0;
    font-size: 1.3rem;
    font-weight: 700;
}

.info-rating {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.stars {
    font-size: 1rem;
    font-weight: 600;
    color: #fbbf24;
}

.review-count {
    font-size: 0.9rem;
    color: var(--text-muted);
}

.info-address {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.95rem;
    line-height: 1.5;
}

.info-line {
    margin: 0.5rem 0 0 0;
    color: var(--text-muted);
    font-size: 0.95rem;
}

.info-link {
    color: var(--primary-color);
    text-decoration: none;
    transition: all 0.2s;
}

.info-link:hover {
    text-decoration: underline;
}

.info-hours {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.hours-title {
    margin: 0 0 0.5rem 0;
    font-weight: 600;
    font-size: 0.95rem;
}

.hours-list {
    list-style: none;
    padding: 0;
    margin: 0;
}

.hour-item {
    font-size: 0.85rem;
    color: var(--text-muted);
    margin: 0.25rem 0;
    padding: 0.2rem 0;
}

.info-map {
    flex: 1;
    border-radius: 0;
    overflow: hidden;
    border: none;
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.25s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.95);
}

@media (max-width: 1200px) {
  .info-panel {
    width: 90vw;
    height: 80vh;
    max-width: 1000px;
    max-height: 650px;
  }
}
.top-notification {
    position: fixed;
    top: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: #28C76F; /* Bright Green */
    color: white;
    padding: 10px 20px;
    border-radius: 4px; /* Slightly rounded, like the image */
    font-weight: 500;
    font-size: 1rem;
    z-index: 99999; /* Ensure top */
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 300px;
    justify-content: space-between;
    animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    overflow: hidden; /* Clip the progress bar */
}

.top-notification .progress-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 4px;
    background: rgba(255, 255, 255, 0.6);
    width: 100%;
    animation: countdown 3s linear forwards;
}

@keyframes countdown {
    from { width: 100%; }
    to { width: 0%; }
}

.top-notification .icon {
    font-size: 1.2rem;
    background: rgba(255,255,255,0.2);
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.top-notification .close-btn {
    cursor: pointer;
    font-size: 1.1rem;
    opacity: 0.8;
    transition: opacity 0.2s;
    margin-left: auto;
}

.top-notification .close-btn:hover {
    opacity: 1;
}

@keyframes slideDown {
    from { transform: translate(-50%, -150%); opacity: 0; }
    to { transform: translate(-50%, 0); opacity: 1; }
}
</style>
