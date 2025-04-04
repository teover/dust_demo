/**
 * VIMMS Dust Monitoring System - Main Application
 * Coordinates between the BLE, Chart, and Map modules
 */

class App {
    constructor() {
        // UI elements
        this.connectButton = document.getElementById('connectButton');
        this.resetButton = document.getElementById('resetButton');
        this.cleanButton = document.getElementById('cleanButton');
        this.infoButton = document.getElementById('infoButton');
        this.browserInfoElement = document.getElementById('browserInfo');
        this.bleSupportElement = document.getElementById('bleSupport');
        this.deviceInfoElement = document.getElementById('deviceInfo');
        this.lastUpdateTimeElement = document.getElementById('lastUpdateTime');
        this.connectionStatusElement = document.getElementById('connectionStatus');
        
        // Reading elements
        this.pm1_0Element = document.getElementById('pm1_0');
        this.pm2_5Element = document.getElementById('pm2_5');
        this.pm4_0Element = document.getElementById('pm4_0');
        this.pm10Element = document.getElementById('pm10');
        this.typical_sizeElement = document.getElementById('typical_size');
        this.nc0_5Element = document.getElementById('nc0_5');
        this.nc1_0Element = document.getElementById('nc1_0');
        this.nc2_5Element = document.getElementById('nc2_5');
        this.nc4_0Element = document.getElementById('nc4_0');
        this.nc10Element = document.getElementById('nc10');
        
        // Air quality indicators
        this.pm25MarkerElement = document.getElementById('pm25Marker');
        this.pm10MarkerElement = document.getElementById('pm10Marker');
        
        // Application state
        this.lastReadings = null;
        this.initialized = false;
        
        // Options
        this.isMobile = CONFIG.browserFlags.isMobile;
        this.isBluefy = CONFIG.browserFlags.isBluefy;
        
        // Setup event handlers
        this.setupEventHandlers();
        
        // Timer for updating heatmap
        this.heatmapUpdateTimer = null;
        
        // Initialize the application
        this.initialize();
    }
    
    /**
     * Initialize the application
     */
    initialize() {
        if (this.initialized) return;
        
        console.log('Initializing VIMMS Dust Monitoring System');
        
        // Update browser info
        this.browserInfoElement.textContent = this.isBluefy ? 'Bluefy' : navigator.userAgent;
        this.bleSupportElement.textContent = navigator.bluetooth ? 'Supported ✓' : 'Not Supported ✗';
        
        // Setup BLE callbacks
        bleManager.onConnected(this.handleBleConnected.bind(this));
        bleManager.onDisconnected(this.handleBleDisconnected.bind(this));
        bleManager.onData(this.handleBleData.bind(this));
        bleManager.onStatus(this.updateConnectionStatus.bind(this));
        bleManager.onInfo(this.updateDeviceInfo.bind(this));
        
        // Init GPS feedback interactions
        mapManager.isGPSActive();
        
        this.initialized = true;
        
        console.log('Application initialized');
    }
    
    /**
     * Setup event handlers for buttons
     */
    setupEventHandlers() {
        // BLE connection button
        this.connectButton.addEventListener('click', () => {
            if (bleManager.isConnected()) {
                bleManager.disconnect();
            } else {
                bleManager.connect();
            }
        });
        
        // Device command buttons
        this.resetButton.addEventListener('click', () => bleManager.sendCommand('reset'));
        this.cleanButton.addEventListener('click', () => bleManager.sendCommand('clean'));
        this.infoButton.addEventListener('click', () => bleManager.sendCommand('info'));
    }
    
    /**
     * Handle BLE connection event
     */
    handleBleConnected() {
        this.updateConnectionUI(true);
    }
    
    /**
     * Handle BLE disconnection event
     */
    handleBleDisconnected() {
        this.updateConnectionUI(false);
        this.clearReadings();
        
        // Stop heatmap updates when disconnected
        this.stopHeatmapUpdates();
    }
    
    /**
     * Handle BLE data reception
     * @param {Object} readings - Sensor readings
     */
    handleBleData(readings) {
        // Store last readings
        this.lastReadings = readings;
        
        // Update UI elements
        this.updateReadings(readings);
        
        // Update chart
        chartManager.updateChart(readings);
        
        // Start heatmap updates if not already started
        this.startHeatmapUpdates();
        
        // Update last update time
        const now = new Date();
        this.lastUpdateTimeElement.textContent = `Last update: ${now.toLocaleTimeString()}`;
    }
    
    /**
     * Start periodic heatmap updates
     */
    startHeatmapUpdates() {
        if (this.heatmapUpdateTimer === null) {
            // Add data point immediately
            if (this.lastReadings && mapManager.isGPSActive()) {
                mapManager.addDataPoint(this.lastReadings);
            }
            
            // Then set up periodic updates with shorter interval for better visualization
            // Use a shorter interval (3000ms) than the GPS watch interval for more frequent updates
            this.heatmapUpdateTimer = setInterval(() => {
                if (this.lastReadings && mapManager.isGPSActive()) {
                    mapManager.addDataPoint(this.lastReadings);
                }
            }, 3000); // Update every 3 seconds for more visible data points
            
            console.log('Heatmap updates started with 3-second interval');
        }
    }
    
    /**
     * Stop periodic heatmap updates
     */
    stopHeatmapUpdates() {
        if (this.heatmapUpdateTimer !== null) {
            clearInterval(this.heatmapUpdateTimer);
            this.heatmapUpdateTimer = null;
            console.log('Heatmap updates stopped');
        }
    }
    
    /**
     * Update connection status
     * @param {string} message - Status message
     */
    updateConnectionStatus(message) {
        const statusClass = bleManager.isConnected() ? 'status-connected' : 'status-disconnected';
        this.connectionStatusElement.innerHTML = `<span class="status-indicator ${statusClass}"></span> ${message}`;
    }
    
    /**
     * Update device information
     * @param {Object} info - Device information
     */
    updateDeviceInfo(info) {
        let infoHtml = '';
        
        if (info.webBluetoothSupport) {
            infoHtml += `<div>Web Bluetooth Support: ${info.webBluetoothSupport}</div>`;
        }
        
        if (info.browser) {
            infoHtml += `<div>Browser: ${info.browser}</div>`;
        }
        
        if (info.device) {
            infoHtml += `<div>${info.device}</div>`;
        }
        
        if (info.deviceInfo) {
            infoHtml += `<div>${info.deviceInfo}</div>`;
        }
        
        if (info.error) {
            infoHtml += `<div style="color:red">Error: ${info.error}</div>`;
        }
        
        if (info.troubleshooting) {
            infoHtml += info.troubleshooting;
        }
        
        this.deviceInfoElement.innerHTML = infoHtml || 'No information available yet.';
    }
    
    /**
     * Update connection UI elements
     * @param {boolean} isConnected - Connection state
     */
    updateConnectionUI(isConnected) {
        if (isConnected) {
            this.connectButton.innerHTML = '<i class="bi bi-bluetooth"></i> Disconnect';
            this.connectButton.classList.remove('btn-primary');
            this.connectButton.classList.add('btn-danger');
            
            this.resetButton.disabled = false;
            this.cleanButton.disabled = false;
            this.infoButton.disabled = false;
            
            this.connectionStatusElement.innerHTML = 
                '<span class="status-indicator status-connected"></span> Connected';
        } else {
            this.connectButton.innerHTML = '<i class="bi bi-bluetooth"></i> Connect to Device';
            this.connectButton.classList.remove('btn-danger');
            this.connectButton.classList.add('btn-primary');
            
            this.resetButton.disabled = true;
            this.cleanButton.disabled = true;
            this.infoButton.disabled = true;
            
            this.connectionStatusElement.innerHTML = 
                '<span class="status-indicator status-disconnected"></span> Disconnected';
        }
    }
    
    /**
     * Update readings UI elements
     * @param {Object} readings - Sensor readings
     */
    updateReadings(readings) {
        // Update PM values
        this.updateElement(this.pm1_0Element, readings.pm1_0);
        this.updateElement(this.pm2_5Element, readings.pm2_5);
        this.updateElement(this.pm4_0Element, readings.pm4_0);
        this.updateElement(this.pm10Element, readings.pm10);
        this.updateElement(this.typical_sizeElement, readings.typical_size);
        
        // Update NC values
        this.updateElement(this.nc0_5Element, readings.nc0_5);
        this.updateElement(this.nc1_0Element, readings.nc1_0);
        this.updateElement(this.nc2_5Element, readings.nc2_5);
        this.updateElement(this.nc4_0Element, readings.nc4_0);
        this.updateElement(this.nc10Element, readings.nc10);
        
        // Update air quality indicators
        this.updateAirQualityIndicators(readings);
    }
    
    /**
     * Update a single reading element
     * @param {HTMLElement} element - Element to update
     * @param {number} value - Value to display
     */
    updateElement(element, value) {
        if (element && value !== undefined && value !== null) {
            element.textContent = value.toFixed(1);
        }
    }
    
    /**
     * Update air quality indicators
     * @param {Object} readings - Sensor readings
     */
    updateAirQualityIndicators(readings) {
        if (readings.pm2_5 !== undefined && readings.pm2_5 !== null) {
            const pm25 = readings.pm2_5;
            let position;
            
            if (pm25 <= CONFIG.airQuality.pm25.good) {
                position = (pm25 / CONFIG.airQuality.pm25.good) * 25;
            } else if (pm25 <= CONFIG.airQuality.pm25.moderate) {
                position = 25 + ((pm25 - CONFIG.airQuality.pm25.good) / (CONFIG.airQuality.pm25.moderate - CONFIG.airQuality.pm25.good)) * 25;
            } else if (pm25 <= CONFIG.airQuality.pm25.unhealthy) {
                position = 50 + ((pm25 - CONFIG.airQuality.pm25.moderate) / (CONFIG.airQuality.pm25.unhealthy - CONFIG.airQuality.pm25.moderate)) * 50;
            } else {
                position = 100;
            }
            
            this.pm25MarkerElement.style.left = `${Math.min(position, 100)}%`;
        }
        
        if (readings.pm10 !== undefined && readings.pm10 !== null) {
            const pm10 = readings.pm10;
            let position;
            
            if (pm10 <= CONFIG.airQuality.pm10.good) {
                position = (pm10 / CONFIG.airQuality.pm10.good) * 25;
            } else if (pm10 <= CONFIG.airQuality.pm10.moderate) {
                position = 25 + ((pm10 - CONFIG.airQuality.pm10.good) / (CONFIG.airQuality.pm10.moderate - CONFIG.airQuality.pm10.good)) * 25;
            } else if (pm10 <= CONFIG.airQuality.pm10.unhealthy) {
                position = 50 + ((pm10 - CONFIG.airQuality.pm10.moderate) / (CONFIG.airQuality.pm10.unhealthy - CONFIG.airQuality.pm10.moderate)) * 50;
            } else {
                position = 100;
            }
            
            this.pm10MarkerElement.style.left = `${Math.min(position, 100)}%`;
        }
    }
    
    /**
     * Clear all readings
     */
    clearReadings() {
        const elements = [
            this.pm1_0Element, this.pm2_5Element, this.pm4_0Element, this.pm10Element, this.typical_sizeElement,
            this.nc0_5Element, this.nc1_0Element, this.nc2_5Element, this.nc4_0Element, this.nc10Element
        ];
        
        elements.forEach(element => {
            if (element) element.textContent = '-';
        });
        
        if (this.pm25MarkerElement) this.pm25MarkerElement.style.left = '0%';
        if (this.pm10MarkerElement) this.pm10MarkerElement.style.left = '0%';
        
        if (this.lastUpdateTimeElement) {
            this.lastUpdateTimeElement.textContent = 'Last update: --:--:--';
        }
        
        document.getElementById('rawDataStatus').textContent = 'Waiting for data...';
    }
}

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    
    // Make CSS animations smoother on iOS
    if (CONFIG.browserFlags.isIOS) {
        document.documentElement.style.webkitTouchCallout = 'none';
        document.documentElement.style.webkitUserSelect = 'none';
        document.documentElement.style.webkitTapHighlightColor = 'rgba(0,0,0,0)';
    }
});
