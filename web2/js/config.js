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
            radius: 35,         // Increased radius to make points more visible
            blur: 25,           // Increased blur for smoother appearance
            maxZoom: 17,
            max: 25,            // Lowered max value to make even low readings more visible
            minOpacity: 0.5,    // Set a minimum opacity to ensure visibility
            gradient: {
                '0.0': 'rgba(0, 255, 0, 0.7)',   // Low pollution (more opaque green)
                '0.3': 'rgba(255, 255, 0, 0.8)', // Medium pollution (more opaque yellow)
                '0.7': 'rgba(255, 128, 0, 0.9)', // High-medium pollution (orange)
                '1.0': 'rgba(255, 0, 0, 1.0)'    // High pollution (fully opaque red)
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
