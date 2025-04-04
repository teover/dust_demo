/**
 * VIMMS Dust Monitoring System - Map Module
 * Handles map visualization, heatmap, and GPS location tracking
 */

class MapManager {
    constructor() {
        // Map elements
        this.map = null;
        this.heatLayer = null;
        this.positionMarker = null;
        this.legendControl = null;
        
        // Data storage
        this.heatmapData = [];
        this.currentPosition = null;
        
        // Local storage key
        this.STORAGE_KEY = 'vimms_dust_heatmap_data';
        
        // Auto-save timer
        this.saveTimer = null;
        
        // GPS tracking
        this.watchId = null;
        this.isTracking = false;
        
        // DOM elements
        this.mapContainer = document.getElementById('mapContainer');
        this.gpsToggleButton = document.getElementById('gpsToggleButton');
        this.gpsStatus = document.getElementById('gpsStatus');
        this.gpsInfoStatus = document.getElementById('gpsInfoStatus');
        this.clearMapButton = document.getElementById('clearMapButton');
        this.mapDataPoints = document.getElementById('mapDataPoints');
        
        // Initialize the map
        this.init();
        
        // Set up auto-save
        this.setupAutoSave();
        
        // Load any saved data
        this.loadFromStorage();
    }
    
    /**
     * Initialize the map and controls
     */
    init() {
        if (!this.mapContainer) {
            console.error('Map container element not found!');
            return;
        }
        
        // Create the Leaflet map
        this.map = L.map(this.mapContainer, {
            center: CONFIG.map.defaultLocation,
            zoom: CONFIG.map.defaultZoom,
            zoomControl: true,
            attributionControl: true,
            maxZoom: CONFIG.map.maxZoom
        });
        
        // Add the tile layer
        L.tileLayer(CONFIG.map.tileLayer, {
            attribution: CONFIG.map.attribution,
            maxZoom: CONFIG.map.maxZoom
        }).addTo(this.map);
        
        // Initialize the heatmap layer with empty data
        this.heatLayer = L.heatLayer([], {
            radius: CONFIG.map.heatmap.radius,
            blur: CONFIG.map.heatmap.blur,
            maxZoom: CONFIG.map.heatmap.maxZoom,
            max: CONFIG.map.heatmap.max,
            gradient: CONFIG.map.heatmap.gradient
        }).addTo(this.map);
        
        // Add a custom heatmap legend
        this.addHeatmapLegend();
        
        // Add event listeners
        this.gpsToggleButton.addEventListener('click', () => this.toggleGPS());
        this.clearMapButton.addEventListener('click', () => this.clearHeatmap());
        
        // Add event listener for the save button
        const saveMapButton = document.getElementById('saveMapButton');
        if (saveMapButton) {
            saveMapButton.addEventListener('click', () => {
                if (this.saveHeatmap()) {
                    // Show success message or animation
                    console.log("Map data manually saved");
                } else {
                    // Show no data message
                    alert("No heatmap data to save.");
                }
            });
        }
        
        // Make map responsive to container size changes
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // Initial check for geolocation availability
        if ('geolocation' in navigator) {
            this.gpsToggleButton.removeAttribute('disabled');
            
            // Try to get initial position
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    this.map.setView([latitude, longitude], CONFIG.map.defaultZoom);
                    console.log("Initial position acquired:", latitude, longitude);
                },
                (error) => {
                    console.warn("Initial position error:", error.message);
                },
                {
                    enableHighAccuracy: CONFIG.map.gps.enableHighAccuracy,
                    timeout: CONFIG.map.gps.timeout,
                    maximumAge: CONFIG.map.gps.maximumAge
                }
            );
        } else {
            console.warn("Geolocation not available in this browser");
            this.gpsToggleButton.setAttribute('disabled', 'disabled');
            this.gpsStatus.textContent = 'GPS Not Supported';
            this.gpsInfoStatus.textContent = 'Not Supported';
        }
    }
    
    /**
     * Add a custom heatmap legend to the map
     */
    addHeatmapLegend() {
        // Create a custom control
        const legend = L.control({ position: 'bottomright' });
        
        legend.onAdd = function() {
            const div = L.DomUtil.create('div', 'heatmap-legend');
            div.innerHTML = `
                <div>Pollution</div>
                <div class="heatmap-legend-bar"></div>
                <div class="heatmap-legend-labels">
                    <div>Low</div>
                    <div>High</div>
                </div>
            `;
            return div;
        };
        
        legend.addTo(this.map);
        this.legendControl = legend;
    }
    
    /**
     * Handle window resize events
     */
    handleResize() {
        if (this.map) {
            this.map.invalidateSize();
        }
    }
    
    /**
     * Toggle GPS tracking on/off
     */
    toggleGPS() {
        if (this.isTracking) {
            this.stopTracking();
        } else {
            this.startTracking();
        }
    }
    
    /**
     * Start GPS tracking
     */
    startTracking() {
        if (!navigator.geolocation) {
            console.error("Geolocation not supported");
            return;
        }
        
        // Update UI
        this.gpsToggleButton.classList.add('active');
        this.gpsStatus.textContent = 'GPS On';
        this.gpsInfoStatus.textContent = 'Active';
        this.isTracking = true;
        
        // Create position marker if it doesn't exist
        if (!this.positionMarker) {
            this.positionMarker = L.marker(CONFIG.map.defaultLocation, {
                icon: L.divIcon({
                    className: 'position-marker',
                    html: '<div class="position-marker-inner"></div>',
                    iconSize: [12, 12]
                })
            }).addTo(this.map);
        }
        
        // Start watching position with high accuracy
        this.watchId = navigator.geolocation.watchPosition(
            this.handlePositionUpdate.bind(this),
            this.handlePositionError.bind(this),
            {
                enableHighAccuracy: CONFIG.map.gps.enableHighAccuracy,
                timeout: CONFIG.map.gps.timeout,
                maximumAge: CONFIG.map.gps.maximumAge
            }
        );
        
        console.log("GPS tracking started, watch ID:", this.watchId);
    }
    
    /**
     * Stop GPS tracking
     */
    stopTracking() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        
        // Update UI
        this.gpsToggleButton.classList.remove('active');
        this.gpsStatus.textContent = 'GPS Off';
        this.gpsInfoStatus.textContent = 'Off';
        this.isTracking = false;
        
        // Remove position marker
        if (this.positionMarker) {
            this.map.removeLayer(this.positionMarker);
            this.positionMarker = null;
        }
        
        console.log("GPS tracking stopped");
    }
    
    /**
     * Handle position updates from the GPS
     * @param {GeolocationPosition} position - Position object from the Geolocation API
     */
    handlePositionUpdate(position) {
        const { latitude, longitude, accuracy } = position.coords;
        this.currentPosition = [latitude, longitude];
        
        console.log("Position update:", latitude, longitude, "Accuracy:", accuracy);
        
        // Update position marker and center map
        if (this.positionMarker) {
            this.positionMarker.setLatLng(this.currentPosition);
            
            // Only center map on first position or if accuracy is good
            if (!this.map._userZoomed || accuracy < 100) {
                this.map.setView(this.currentPosition);
            }
        }
        
        // Update GPS info in UI
        this.gpsInfoStatus.textContent = `Active (±${Math.round(accuracy)}m)`;
    }
    
    /**
     * Handle position errors
     * @param {GeolocationPositionError} error - Error from the Geolocation API
     */
    handlePositionError(error) {
        console.error("GPS Error:", error.message);
        
        // Update UI to show error
        this.gpsInfoStatus.textContent = `Error: ${error.message}`;
        
        // If it's a fatal error, stop tracking
        if (error.code === 1) { // PERMISSION_DENIED
            this.stopTracking();
            this.gpsInfoStatus.textContent = 'Permission Denied';
        }
    }
    
    /**
     * Add a data point to the heatmap
     * @param {Object} readings - Sensor readings
     */
    addDataPoint(readings) {
        if (!this.currentPosition || !this.isTracking) {
            return;
        }
        
        // Use PM2.5 as intensity because it's the most relevant for health impacts
        const intensity = readings.pm2_5;
        
        if (!intensity || isNaN(intensity)) {
            console.warn("Invalid intensity value:", intensity);
            return;
        }
        
        // Add the data point with intensity
        const [lat, lng] = this.currentPosition;
        
        // Create a small random offset (± 0.0005 degrees, roughly 50m) to prevent 
        // all points from stacking exactly on top of each other
        const jitterLat = lat + (Math.random() * 0.001 - 0.0005);
        const jitterLng = lng + (Math.random() * 0.001 - 0.0005);
        
        // Add to heatmap data with slightly randomized location
        this.heatmapData.push([jitterLat, jitterLng, intensity]);
        
        // Update the heatmap layer
        this.heatLayer.setLatLngs(this.heatmapData);
        
        // Update data points counter
        this.mapDataPoints.textContent = `${this.heatmapData.length} data points`;
        
        // Add a temporary marker to show where data was recorded
        this.showTemporaryMarker(lat, lng, intensity);
        
        console.log(`Added heatmap point at [${jitterLat}, ${jitterLng}] with intensity ${intensity}`);
    }
    
    /**
     * Show a temporary marker when data point is added
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @param {number} intensity - Intensity value (PM2.5)
     */
    showTemporaryMarker(lat, lng, intensity) {
        // Create a circle marker with color based on intensity
        let color = 'green';
        if (intensity > 12) color = 'yellow';
        if (intensity > 35) color = 'orange';
        if (intensity > 55) color = 'red';
        
        const marker = L.circleMarker([lat, lng], {
            radius: 10,
            color: color,
            fillColor: color,
            fillOpacity: 0.8,
            weight: 2
        }).addTo(this.map);
        
        // Add a tooltip showing the value
        marker.bindTooltip(`PM2.5: ${intensity.toFixed(1)}`, { 
            permanent: true,
            direction: 'top',
            className: 'data-tooltip'
        }).openTooltip();
        
        // Create a pulse animation effect
        const animateMarker = () => {
            marker.setRadius(10);
            setTimeout(() => marker.setRadius(15), 200);
            setTimeout(() => marker.setRadius(10), 400);
        };
        
        // Animate the marker a few times
        animateMarker();
        const pulseInterval = setInterval(animateMarker, 600);
        
        // Remove the marker after a few seconds
        setTimeout(() => {
            clearInterval(pulseInterval);
            this.map.removeLayer(marker);
        }, 5000);
    }
    
    /**
     * Clear all heatmap data
     */
    clearHeatmap() {
        this.heatmapData = [];
        this.heatLayer.setLatLngs([]);
        this.mapDataPoints.textContent = '0 data points';
        
        // Also clear data from local storage
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            console.log("Heatmap cleared from UI and local storage");
        } catch (error) {
            console.error('Error clearing heatmap data from storage:', error);
        }
    }
    
    /**
     * Manually save current heatmap data
     * This can be triggered by a UI button
     */
    saveHeatmap() {
        if (this.heatmapData.length > 0) {
            this.saveToStorage();
            return true;
        } else {
            console.log("No heatmap data to save");
            return false;
        }
    }
    
    /**
     * Check if GPS tracking is active
     * @returns {boolean} Tracking status
     */
    isGPSActive() {
        return this.isTracking;
    }
    
    /**
     * Set up auto-save functionality
     * Saves heatmap data to local storage every 30 seconds
     */
    setupAutoSave() {
        // Clear any existing timer
        if (this.saveTimer) {
            clearInterval(this.saveTimer);
        }
        
        // Set up a new auto-save interval
        this.saveTimer = setInterval(() => {
            if (this.heatmapData.length > 0) {
                this.saveToStorage();
            }
        }, 30000); // Save every 30 seconds
        
        // Also save when page is unloaded
        window.addEventListener('beforeunload', () => {
            if (this.heatmapData.length > 0) {
                this.saveToStorage();
            }
        });
    }
    
    /**
     * Save heatmap data to local storage
     */
    saveToStorage() {
        try {
            // Convert data to JSON string and save
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.heatmapData));
            console.log(`Saved ${this.heatmapData.length} heatmap points to local storage`);
            
            // Add a notification to the UI
            this.showSaveNotification();
        } catch (error) {
            console.error('Error saving heatmap data to storage:', error);
        }
    }
    
    /**
     * Load heatmap data from local storage
     */
    loadFromStorage() {
        try {
            // Get data from storage
            const storedData = localStorage.getItem(this.STORAGE_KEY);
            
            if (storedData) {
                // Parse the data
                this.heatmapData = JSON.parse(storedData);
                
                // Update the heatmap layer
                this.heatLayer.setLatLngs(this.heatmapData);
                
                // Update data points counter
                this.mapDataPoints.textContent = `${this.heatmapData.length} data points`;
                
                console.log(`Loaded ${this.heatmapData.length} heatmap points from local storage`);
                
                // If we have data, fit the map to show all points
                if (this.heatmapData.length > 0) {
                    // Extract lat/lng points without intensity
                    const points = this.heatmapData.map(point => [point[0], point[1]]);
                    
                    // Create a bounds object and fit the map to it
                    const bounds = L.latLngBounds(points);
                    this.map.fitBounds(bounds, { padding: [50, 50] });
                }
            }
        } catch (error) {
            console.error('Error loading heatmap data from storage:', error);
        }
    }
    
    /**
     * Show a temporary save notification
     */
    showSaveNotification() {
        // Create a notification element if it doesn't exist
        let notification = document.getElementById('save-notification');
        
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'save-notification';
            notification.className = 'save-notification';
            document.body.appendChild(notification);
        }
        
        // Set the notification message
        notification.innerHTML = `<i class="bi bi-cloud-check"></i> Heatmap saved (${this.heatmapData.length} points)`;
        notification.style.display = 'block';
        
        // Add animation
        notification.classList.add('show');
        
        // Hide after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.style.display = 'none';
            }, 500);
        }, 3000);
    }
}

// Create and export a singleton instance
const mapManager = new MapManager();
