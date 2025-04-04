/**
 * VIMMS Dust Monitoring System - Configuration
 * Centralizes all configuration settings and constants for the application
 */

const CONFIG = {
    // Bluetooth configuration
    bluetooth: {
        // Nordic UART Service UUIDs
        NUS_SERVICE_UUID: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
        NUS_RX_UUID: '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
        NUS_TX_UUID: '6e400003-b5a3-f393-e0a9-e50e24dcca9e',
        
        // Device scan settings
        scanFilters: [
            { namePrefix: 'SPS30' }
        ],
        
        // Bluefy compatibility options
        bluefyDelay: 2000,
        
        // Connection retry settings
        maxRetries: 3,
        retryDelay: 1000
    },
    
    // Chart configuration
    chart: {
        colors: {
            pm25: {
                border: 'rgba(46, 204, 113, 1)',
                background: 'rgba(46, 204, 113, 0.2)'
            },
            pm10: {
                border: 'rgba(52, 152, 219, 1)',
                background: 'rgba(52, 152, 219, 0.2)'
            }
        },
        timeRanges: {
            '5m': 150,  // 5 minutes = 150 data points default
            '15m': 450, // 15 minutes
            '30m': 900  // 30 minutes
        },
        mobileTimeRanges: {
            '5m': 30,   // Fewer points for mobile
            '15m': 60,
            '30m': 90
        },
        refreshRate: 1000, // ms
        annotations: {
            pm25Threshold: 12, // WHO guideline for PM2.5
            pm10Threshold: 45  // WHO guideline for PM10
        }
    },
    
    // Map and GPS configuration
    map: {
        defaultLocation: [59.9139, 10.7522], // Oslo, Norway as default
        defaultZoom: 13,
        maxZoom: 18,
        tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        
        // Heatmap configuration
        heatmap: {
            radius: 20,
            blur: 15,
            maxZoom: 17,
            max: 50, // Max value for intensity (based on PM2.5)
            gradient: {
                0.0: 'green',  // Low pollution
                0.5: 'yellow', // Medium pollution
                1.0: 'red'     // High pollution
            }
        },
        
        // GPS settings
        gps: {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0, // Always get a fresh position
            watchInterval: 10000 // ms between position updates when moving
        }
    },
    
    // Thresholds for air quality indicators
    airQuality: {
        pm25: {
            good: 12,      // WHO guideline
            moderate: 35,  // Between good and unhealthy
            unhealthy: 150 // Poor air quality
        },
        pm10: {
            good: 54,      // WHO guideline adjusted
            moderate: 154, // Between good and unhealthy
            unhealthy: 350 // Poor air quality
        }
    },
    
    // Browser detection & optimization flags
    browserFlags: {
        isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,
        isMobile: /iPhone|iPad|iPod|Android|webOS|Bluefy/i.test(navigator.userAgent),
        isBluefy: /BluetoothBrowser/.test(navigator.userAgent) || /Bluefy/.test(navigator.userAgent)
    }
};
