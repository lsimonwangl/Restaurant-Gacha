import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useNearbyStore = defineStore('nearby', () => {
    const restaurants = ref([])
    const lastLocation = ref(null)
    const lastSearchTime = ref(0)

    // Distance threshold in meters (e.g., 200m)
    // If user moves less than this, we reuse cache.
    const CACHE_DISTANCE_THRESHOLD = 200
    const CACHE_TIME_THRESHOLD = 1000 * 60 * 30 // 30 minutes

    const calculateDistance = (loc1, loc2) => {
        if (!loc1 || !loc2) return Infinity
        const R = 6371e3 // metres
        const φ1 = loc1.lat * Math.PI / 180
        const φ2 = loc2.lat * Math.PI / 180
        const Δφ = (loc2.lat - loc1.lat) * Math.PI / 180
        const Δλ = (loc2.lng - loc1.lng) * Math.PI / 180

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

        return R * c
    }

    const shouldRefresh = (currentLoc) => {
        if (restaurants.value.length === 0) return true
        if (!lastLocation.value) return true

        // Check time expiry
        if (Date.now() - lastSearchTime.value > CACHE_TIME_THRESHOLD) return true

        // Check distance
        const dist = calculateDistance(lastLocation.value, currentLoc)
        console.log(`[Cache Check] Distance moved: ${Math.round(dist)}m`)

        if (dist > CACHE_DISTANCE_THRESHOLD) {
            return true
        }

        return false
    }

    const setRestaurants = (data, loc) => {
        restaurants.value = data
        lastLocation.value = loc
        lastSearchTime.value = Date.now()
    }

    return {
        restaurants,
        lastLocation,
        shouldRefresh,
        setRestaurants
    }
})
