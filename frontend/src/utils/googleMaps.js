/**
 * Loads the Google Maps Javascript API script dynamically.
 * Returns a promise that resolves with the `window.google` object when loaded.
 */
let googleMapsPromise = null;

export const loadGoogleMaps = () => {
    // If already loading or loaded, return the existing promise
    if (googleMapsPromise) {
        return googleMapsPromise;
    }

    googleMapsPromise = new Promise((resolve, reject) => {
        // If already loaded globally (e.g. by another script)
        if (window.google && window.google.maps && window.google.maps.places) {
            console.log('✅ Google Maps already loaded (Global Check)');
            return resolve(window.google);
        }

        const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (!key) {
            console.error('❌ Google Maps API key not set');
            return reject(new Error('Google Maps API key not set'));
        }

        console.log('📡 Loading Google Maps API...');
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&v=weekly`;
        script.async = true;
        script.defer = true;
        script.id = 'google-maps-script'; // Add ID to prevent duplicates

        script.onload = () => {
            console.log('✅ Google Maps API loaded successfully via Utility');
            resolve(window.google);
        };

        script.onerror = (error) => {
            console.error('❌ Google Maps API failed to load:', error);
            // Reset promise so retry is possible
            googleMapsPromise = null;
            reject(error);
        };

        document.head.appendChild(script);
    });

    return googleMapsPromise;
};
