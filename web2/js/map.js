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
        this.heatmapData.push([lat, lng, intensity]);
        
        // Update the heatmap layer
        this.heatLayer.setLatLngs(this.heatmapData);
        
        // Update data points counter
        this.mapDataPoints.textContent = `${this.heatmapData.length} data points`;
        
        console.log(`Added heatmap point at [${lat}, ${lng}] with intensity ${intensity}`);
    }
    
    /**
     * Clear all heatmap data
     */
    clearHeatmap() {
        this.heatmapData = [];
        this.heatLayer.setLatLngs([]);
        this.mapDataPoints.textContent = '0 data points';
        console.log("Heatmap cleared");
    }
    
    /**
     * Check if GPS tracking is active
     * @returns {boolean} Tracking status
     */
    isGPSActive() {
        return this.isTracking;
    }
}

// Create and export a singleton instance
const mapManager = new MapManager();
