/**
 * VIMMS Dust Monitoring System - Bluetooth LE Module
 * Handles BLE connections, communication with the SPS30 sensor,
 * and parses incoming sensor data
 */

class BluetoothManager {
    constructor() {
        // Device properties
        this.device = null;
        this.nusTxCharacteristic = null;
        this.nusRxCharacteristic = null;
        this.connected = false;
        
        // Event callbacks
        this.onConnectedCallback = null;
        this.onDisconnectedCallback = null;
        this.onDataCallback = null;
        this.onStatusCallback = null;
        this.onInfoCallback = null;
        
        // Reference UI elements
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.isBluefy = CONFIG.browserFlags.isBluefy;
    }
    
    /**
     * Set callback for connection events
     * @param {Function} callback - Function to call when device connects
     */
    onConnected(callback) {
        this.onConnectedCallback = callback;
    }
    
    /**
     * Set callback for disconnection events
     * @param {Function} callback - Function to call when device disconnects
     */
    onDisconnected(callback) {
        this.onDisconnectedCallback = callback;
    }
    
    /**
     * Set callback for status updates
     * @param {Function} callback - Function to call with status messages
     */
    onStatus(callback) {
        this.onStatusCallback = callback;
    }
    
    /**
     * Set callback for data reception
     * @param {Function} callback - Function to call with parsed data
     */
    onData(callback) {
        this.onDataCallback = callback;
    }
    
    /**
     * Set callback for device information
     * @param {Function} callback - Function to call with device info
     */
    onInfo(callback) {
        this.onInfoCallback = callback;
    }
    
    /**
     * Update connection status
     * @param {string} message - Status message to display
     */
    updateStatus(message) {
        console.log('BLE Status:', message);
        if (this.onStatusCallback) {
            this.onStatusCallback(message);
        }
    }
    
    /**
     * Start the connection process to a compatible device
     */
    async connect() {
        if (this.connected) {
            await this.disconnect();
            return;
        }
        
        try {
            this.updateStatus('Preparing to scan...');
            
            // Show loading indicator except on Bluefy
            if (!this.isBluefy) {
                this.loadingOverlay.style.visibility = 'visible';
            }
            
            if (this.onInfoCallback) {
                this.onInfoCallback({
                    webBluetoothSupport: navigator.bluetooth ? 'YES' : 'NO',
                    browser: this.isBluefy ? 'Bluefy Browser' : navigator.userAgent
                });
            }
            
            this.updateStatus('Scanning for devices...');
            
            // Prepare scan options using config
            const requestOptions = {
                filters: CONFIG.bluetooth.scanFilters,
                optionalServices: [CONFIG.bluetooth.NUS_SERVICE_UUID]
            };
            
            console.log("Using scan options:", requestOptions);
            
            // Add explicit timeout handling
            this.updateStatus('Starting Bluetooth scan...');
            
            // Create a timeout promise that resolves after 20 seconds
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Scan timeout - no devices found')), 20000)
            );
            
            // Race the device request against the timeout
            const devicePromise = navigator.bluetooth.requestDevice(requestOptions);
            this.device = await Promise.race([devicePromise, timeoutPromise]);
            
            // Always hide loading overlay after device selection
            this.loadingOverlay.style.visibility = 'hidden';
            
            if (this.onInfoCallback) {
                this.onInfoCallback({
                    device: `Selected device: "${this.device.name || 'Unnamed Device'}" (ID: ${this.device.id})`
                });
            }
            
            this.device.addEventListener('gattserverdisconnected', this.handleDisconnection.bind(this));
            
            this.updateStatus('Connecting...');
            
            // For Bluefy, don't use retries as it handles its own reconnection
            const server = this.isBluefy ? 
                await this.device.gatt.connect() : 
                await this.connectWithRetry(this.device);
            
            // Handle Bluefy's slower connection handshake
            if (this.isBluefy) {
                await new Promise(resolve => setTimeout(resolve, CONFIG.bluetooth.bluefyDelay));
            }
            
            this.updateStatus('Finding Nordic UART Service...');
            const service = await server.getPrimaryService(CONFIG.bluetooth.NUS_SERVICE_UUID);
            
            this.updateStatus('Getting characteristics...');
            this.nusTxCharacteristic = await service.getCharacteristic(CONFIG.bluetooth.NUS_TX_UUID);
            this.nusRxCharacteristic = await service.getCharacteristic(CONFIG.bluetooth.NUS_RX_UUID);
            
            // Bluefy needs a longer delay before enabling notifications
            await new Promise(resolve => setTimeout(resolve, this.isBluefy ? 2000 : 1000));
            
            this.updateStatus('Enabling notifications...');
            await this.nusTxCharacteristic.startNotifications();
            this.nusTxCharacteristic.addEventListener('characteristicvaluechanged', this.handleIncomingData.bind(this));
            
            this.connected = true;
            
            if (this.onConnectedCallback) {
                this.onConnectedCallback();
            }
            
            this.updateStatus('Connected to ' + (this.device.name || 'device'));
            
            // Send info command after a delay
            setTimeout(() => {
                this.sendCommand('info');
            }, this.isBluefy ? 3000 : 2000);
            
        } catch (error) {
            // Always ensure loading overlay is hidden when an error occurs
            this.loadingOverlay.style.visibility = 'hidden';
            
            console.error('Connection error:', error);
            
            let errorMessage = error.message;
            let additionalInfo = '';
            
            if (error.message.includes('User cancelled')) {
                errorMessage = 'Device selection cancelled';
            } else if (error.message.includes('Scan timeout')) {
                errorMessage = 'No devices found in scan';
                additionalInfo = `
                    <div>Your device might not be visible because:</div>
                    <ul>
                        <li>Device is not powered on or not advertising</li>
                        <li>Advertising parameters not compatible with Bluefy</li>
                        <li>Location services may be disabled</li>
                        <li>Device is out of range</li>
                    </ul>
                    <div>Try using nRF Connect app to verify if device is advertising.</div>
                `;
            } else if (error.message.includes('GATT operation failed')) {
                errorMessage = 'GATT connection failed - try again';
            }
            
            this.updateStatus('Connection failed: ' + errorMessage);
            
            if (this.onInfoCallback) {
                this.onInfoCallback({
                    error: `${errorMessage}`,
                    troubleshooting: additionalInfo + `
                        <div>Troubleshooting steps:</div>
                        <ol>
                          <li>Ensure device is powered on and in range</li>
                          <li>Restart the device</li>
                          <li>${this.isBluefy ? 'Try "Clear BLE Cache" in Bluefy settings' : 'Refresh this page and try again'}</li>
                          <li>Enable Location services on your phone</li>
                          <li>Try with a different Bluetooth scanner app</li>
                        </ol>`
                });
            }
            
            if (this.onDisconnectedCallback) {
                this.onDisconnectedCallback();
            }
        }
    }
    
    /**
     * Attempt to connect to a device with retries
     * @param {BluetoothDevice} device - Device to connect to
     * @param {number} maxRetries - Maximum number of connection attempts
     * @returns {Promise<BluetoothRemoteGATTServer>} GATT server
     */
    async connectWithRetry(device, maxRetries = CONFIG.bluetooth.maxRetries) {
        let attempts = 0;
        
        while (attempts < maxRetries) {
            try {
                attempts++;
                this.updateStatus(`Connection attempt ${attempts}/${maxRetries}...`);
                
                const server = await device.gatt.connect();
                console.log("GATT connection successful");
                return server;
            } catch (error) {
                console.error(`Connection attempt ${attempts} failed:`, error);
                
                if (attempts >= maxRetries) {
                    throw error;
                }
                
                await new Promise(resolve => setTimeout(resolve, CONFIG.bluetooth.retryDelay));
            }
        }
    }
    
    /**
     * Handle disconnection events
     * @param {Event} event - Disconnection event
     */
    handleDisconnection(event) {
        console.log("Disconnection event:", event);
        
        if (this.connected) {
            this.updateStatus('Connection lost, attempting to reconnect...');
            
            setTimeout(async () => {
                try {
                    if (this.device) {
                        const server = await this.connectWithRetry(this.device, 2);
                        if (server) {
                            const service = await server.getPrimaryService(CONFIG.bluetooth.NUS_SERVICE_UUID);
                            this.nusTxCharacteristic = await service.getCharacteristic(CONFIG.bluetooth.NUS_TX_UUID);
                            this.nusRxCharacteristic = await service.getCharacteristic(CONFIG.bluetooth.NUS_RX_UUID);
                            
                            await this.nusTxCharacteristic.startNotifications();
                            this.nusTxCharacteristic.addEventListener('characteristicvaluechanged', this.handleIncomingData.bind(this));
                            
                            this.updateStatus('Reconnected to ' + this.device.name);
                            return;
                        }
                    }
                } catch (error) {
                    console.error('Reconnection failed:', error);
                }
                
                this.connected = false;
                
                if (this.onDisconnectedCallback) {
                    this.onDisconnectedCallback();
                }
                
                this.updateStatus('Disconnected');
            }, 1000);
        } else {
            this.connected = false;
            
            if (this.onDisconnectedCallback) {
                this.onDisconnectedCallback();
            }
            
            this.updateStatus('Disconnected');
        }
        
        // Ensure loading overlay is hidden if connection is lost
        this.loadingOverlay.style.visibility = 'hidden';
    }
    
    /**
     * Disconnect from device
     */
    async disconnect() {
        try {
            if (this.device && this.device.gatt.connected) {
                await this.device.gatt.disconnect();
            }
        } catch (error) {
            console.error('Error disconnecting:', error);
        } finally {
            this.connected = false;
            
            if (this.onDisconnectedCallback) {
                this.onDisconnectedCallback();
            }
            
            this.updateStatus('Disconnected');
        }
    }
    
    /**
     * Send a command to the device
     * @param {string} command - Command to send
     */
    async sendCommand(command) {
        if (!this.connected || !this.nusRxCharacteristic) {
            console.error('Not connected');
            return;
        }
        
        try {
            this.updateStatus(`Sending: ${command}...`);
            
            const encoder = new TextEncoder();
            const data = encoder.encode(command);
            
            // Bluefy might need WriteWithoutResponse for more reliable operation
            if (this.isBluefy && this.nusRxCharacteristic.properties.writeWithoutResponse) {
                await this.nusRxCharacteristic.writeValueWithoutResponse(data);
            } else {
                await this.nusRxCharacteristic.writeValue(data);
            }
            
            this.updateStatus(`Command sent: ${command}`);
        } catch (error) {
            console.error('Error sending command:', error);
            this.updateStatus('Command failed: ' + error.message);
        }
    }
    
    /**
     * Handle incoming data from the device
     * @param {Event} event - Characteristic value changed event
     */
    handleIncomingData(event) {
        const value = event.target.value;
        const decoder = new TextDecoder();
        const data = decoder.decode(value);
        
        console.log('Received data:', data);
        
        if (data.startsWith('SPS30 SN:')) {
            if (this.onInfoCallback) {
                this.onInfoCallback({ deviceInfo: data });
            }
            return;
        }
        
        if (data.startsWith('RAW:')) {
            this.handleRawData(data);
            return;
        }
        
        try {
            const readings = this.parseCompactFormat(data);
            if (Object.keys(readings).length > 0) {
                if (this.onDataCallback) {
                    this.onDataCallback(readings);
                }
            }
        } catch (error) {
            console.error('Error parsing data:', error);
        }
    }
    
    /**
     * Parse compact format data
     * @param {string} data - Raw data string
     * @returns {Object} Parsed readings
     */
    parseCompactFormat(data) {
        const readings = {};
        try {
            if (data.includes('{') && data.includes('}')) {
                const jsonData = JSON.parse(data);
                
                if (jsonData.pm && Array.isArray(jsonData.pm) && jsonData.pm.length >= 4) {
                    readings.pm1_0 = jsonData.pm[0] / 100;
                    readings.pm2_5 = jsonData.pm[1] / 100;
                    readings.pm4_0 = jsonData.pm[2] / 100;
                    readings.pm10 = jsonData.pm[3] / 100;
                }
                
                if (jsonData.nc && Array.isArray(jsonData.nc) && jsonData.nc.length >= 5) {
                    readings.nc0_5 = jsonData.nc[0] / 100;
                    readings.nc1_0 = jsonData.nc[1] / 100;
                    readings.nc2_5 = jsonData.nc[2] / 100;
                    readings.nc4_0 = jsonData.nc[3] / 100;
                    readings.nc10 = jsonData.nc[4] / 100;
                }
                
                if (jsonData.ts !== undefined) {
                    readings.typical_size = jsonData.ts / 100;
                }
            }
        } catch (error) {
            console.error('Error parsing compact format:', error);
        }
        
        return readings;
    }
    
    /**
     * Handle raw data format
     * @param {string} rawMessage - Raw data message
     */
    handleRawData(rawMessage) {
        try {
            console.log("Raw data received:", rawMessage);
            
            const sensorData = this.parseSps30RawData(rawMessage);
            if (sensorData) {
                document.getElementById('rawDataStatus').textContent = 
                    `Raw data received (${new Date().toLocaleTimeString()})`;
                
                if (this.onDataCallback) {
                    this.onDataCallback(sensorData);
                }
            } else {
                console.error("Failed to parse raw data");
            }
        } catch (error) {
            console.error('Error handling raw data:', error);
        }
    }
    
    /**
     * Parse SPS30 raw data format
     * @param {string} rawMessage - Raw data message
     * @returns {Object|null} Parsed sensor data or null if parsing failed
     */
    parseSps30RawData(rawMessage) {
        if (!rawMessage.startsWith('RAW:')) {
            return null;
        }
        
        console.log("Processing raw data:", rawMessage);
        
        let parts;
        let validMask = 0x03FF;
        let hexData = '';
        
        parts = rawMessage.split(':');
        
        if (parts.length >= 3) {
            try {
                validMask = parseInt(parts[1], 16);
                hexData = parts[2];
                console.log(`Found standard format. Mask: 0x${validMask.toString(16)}, Data: ${hexData}`);
            } catch (e) {
                console.warn("Error parsing mask:", e);
                validMask = 0x03FF;
            }
        } else if (parts.length === 2) {
            console.log("Found format without mask");
            hexData = parts[1];
        } else {
            console.warn("Unexpected format - trying to extract data");
            hexData = rawMessage.substring(4);
        }
        
        let valueStrings = [];
        if (hexData.includes('.')) {
            valueStrings = hexData.split('.');
            console.log(`Found ${valueStrings.length} dot-separated values`);
        } else {
            console.log("No dots found in data, assuming continuous format");
            return null;
        }
        
        const values = [];
        
        for (let i = 0; i < valueStrings.length; i++) {
            try {
                const hexValue = valueStrings[i];
                if (hexValue.length < 8) {
                    console.warn(`Value ${i} has insufficient length: ${hexValue}`);
                    values.push(0);
                    continue;
                }
                
                const bytes = new Uint8Array(4);
                for (let j = 0; j < 4; j++) {
                    const byteIndex = j * 2;
                    if (byteIndex + 1 < hexValue.length) {
                        bytes[j] = parseInt(hexValue.substring(byteIndex, byteIndex + 2), 16);
                    } else {
                        bytes[j] = 0;
                    }
                }
                
                const buffer = bytes.buffer;
                const view = new DataView(buffer);
                
                const floatValue = view.getFloat32(0, false);
                
                console.log(`Value ${i} parsed: ${floatValue}`);
                
                if (!isNaN(floatValue) && isFinite(floatValue)) {
                    values.push(floatValue);
                } else {
                    console.warn(`Invalid float value at position ${i}: ${floatValue}`);
                    values.push(0);
                }
            } catch (err) {
                console.error(`Error parsing value ${i}:`, err);
                values.push(0);
            }
        }
        
        while (values.length < 10) {
            values.push(0);
        }
        
        return {
            pm1_0: values[0],
            pm2_5: values[1],
            pm4_0: values[2],
            pm10: values[3],
            nc0_5: values[4],
            nc1_0: values[5],
            nc2_5: values[6],
            nc4_0: values[7],
            nc10: values[8],
            typical_size: values[9]
        };
    }
    
    /**
     * Check if device is connected
     * @returns {boolean} Connection status
     */
    isConnected() {
        return this.connected;
    }
}

// Create and export a singleton instance
const bleManager = new BluetoothManager();
