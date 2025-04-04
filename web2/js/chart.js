/**
 * VIMMS Dust Monitoring System - Chart Module
 * Handles the visualization of particulate matter trends
 */

class ChartManager {
    constructor() {
        this.historyChart = null;
        this.historicalData = {
            pm2_5: [],
            pm10: [],
            timestamps: []
        };
        
        this.chartCanvas = document.getElementById('historyChart');
        this.timeButtons = document.querySelectorAll('.time-btn');
        this.isMobile = CONFIG.browserFlags.isMobile;
        this.isIOS = CONFIG.browserFlags.isIOS;
        
        this.init();
    }
    
    /**
     * Initialize the chart
     */
    init() {
        // Set up time range buttons
        this.timeButtons.forEach(button => {
            button.addEventListener('click', this.handleTimeRangeChange.bind(this));
        });
        
        // iOS Safari bugs with canvas rendering
        if (this.isIOS) {
            const chartContainer = document.querySelector('.chart-container');
            if (chartContainer) {
                // Force Safari to properly render the canvas
                chartContainer.style.webkitTransform = 'translate3d(0,0,0)';
            }
        }
        
        this.initChart();
    }
    
    /**
     * Handle time range button clicks
     * @param {Event} event - Click event
     */
    handleTimeRangeChange(event) {
        this.timeButtons.forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        
        const range = event.target.dataset.range;
        
        // Set appropriate max points based on device and time range
        let maxPoints;
        
        if (this.isMobile) {
            maxPoints = CONFIG.chart.mobileTimeRanges[range] || 30;
        } else {
            maxPoints = CONFIG.chart.timeRanges[range] || 150;
        }
        
        try {
            if (this.historicalData.timestamps.length > maxPoints) {
                const excess = this.historicalData.timestamps.length - maxPoints;
                this.historicalData.pm2_5 = this.historicalData.pm2_5.slice(excess);
                this.historicalData.pm10 = this.historicalData.pm10.slice(excess);
                this.historicalData.timestamps = this.historicalData.timestamps.slice(excess);
            }
            
            this.historyChart.data.labels = this.historicalData.timestamps;
            this.historyChart.data.datasets[0].data = this.historicalData.pm2_5;
            this.historyChart.data.datasets[1].data = this.historicalData.pm10;
            this.historyChart.update(this.isMobile ? 'none' : { duration: 300 });
        } catch (e) {
            console.error("Error updating chart range:", e);
        }
    }
    
    /**
     * Initialize the chart with Chart.js
     */
    initChart() {
        if (!this.chartCanvas) {
            console.error("Chart canvas not found!");
            return;
        }
        
        const ctx = this.chartCanvas.getContext('2d');
        
        // Skip gradients on mobile for performance
        let pm25Fill, pm10Fill;
        
        if (this.isMobile) {
            pm25Fill = CONFIG.chart.colors.pm25.background;
            pm10Fill = CONFIG.chart.colors.pm10.background;
        } else {
            // Only create gradients on desktop
            const pm25Gradient = ctx.createLinearGradient(0, 0, 0, 400);
            pm25Gradient.addColorStop(0, 'rgba(46, 204, 113, 0.4)');
            pm25Gradient.addColorStop(1, 'rgba(46, 204, 113, 0.05)');
            
            const pm10Gradient = ctx.createLinearGradient(0, 0, 0, 400);
            pm10Gradient.addColorStop(0, 'rgba(52, 152, 219, 0.4)');
            pm10Gradient.addColorStop(1, 'rgba(52, 152, 219, 0.05)');
            
            pm25Fill = pm25Gradient;
            pm10Fill = pm10Gradient;
        }
        
        // Create a more lightweight chart configuration for mobile devices
        this.historyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'PM2.5',
                        data: [],
                        borderColor: CONFIG.chart.colors.pm25.border,
                        backgroundColor: pm25Fill,
                        tension: this.isMobile ? 0.1 : 0.4,  // Lower tension on mobile
                        borderWidth: this.isMobile ? 1 : 2,   // Thinner lines on mobile
                        pointRadius: 0,
                        pointHoverRadius: this.isMobile ? 3 : 5,
                        pointHoverBackgroundColor: CONFIG.chart.colors.pm25.border,
                        pointHoverBorderColor: '#fff',
                        pointHoverBorderWidth: 2,
                        fill: true
                    },
                    {
                        label: 'PM10',
                        data: [],
                        borderColor: CONFIG.chart.colors.pm10.border,
                        backgroundColor: pm10Fill,
                        tension: this.isMobile ? 0.1 : 0.4,  // Lower tension on mobile
                        borderWidth: this.isMobile ? 1 : 2,   // Thinner lines on mobile
                        pointRadius: 0,
                        pointHoverRadius: this.isMobile ? 3 : 5,
                        pointHoverBackgroundColor: CONFIG.chart.colors.pm10.border,
                        pointHoverBorderColor: '#fff',
                        pointHoverBorderWidth: 2,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                },
                // iOS Safari optimization: limit the canvas size
                devicePixelRatio: this.isMobile ? 1 : window.devicePixelRatio,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: !this.isMobile, // Hide on mobile
                            text: 'µg/m³',
                            color: '#95a5a6'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false,
                            display: !this.isMobile // Hide grid on mobile
                        },
                        ticks: {
                            color: '#95a5a6',
                            maxTicksLimit: this.isMobile ? 5 : 10 // Fewer ticks on mobile
                        },
                        suggestedMax: 50
                    },
                    x: {
                        title: {
                            display: false
                        },
                        grid: {
                            display: false,
                            drawBorder: false
                        },
                        ticks: {
                            color: '#95a5a6',
                            maxRotation: 0,
                            // Fewer labels on mobile
                            maxTicksLimit: this.isMobile ? 5 : 10,
                            // Only show every Nth label on mobile
                            callback: function(val, index) {
                                return this.isMobile ? (index % 3 === 0 ? this.getLabelForValue(val) : '') : this.getLabelForValue(val);
                            }
                        }
                    }
                },
                // Minimize animations on mobile
                animation: {
                    duration: this.isMobile ? 0 : 300
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: !this.isMobile, // Disable tooltips on mobile for better performance
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        titleFont: {
                            size: 13,
                            weight: 'normal'
                        },
                        bodyFont: {
                            size: 12
                        },
                        padding: 10,
                        cornerRadius: 3,
                        displayColors: true,
                        callbacks: {
                            title: function(tooltipItems) {
                                return tooltipItems[0].label;
                            },
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.parsed.y;
                                return `${label}: ${value.toFixed(1)} µg/m³`;
                            }
                        }
                    },
                    annotation: {
                        annotations: this.isMobile ? {} : { // Disable annotations on mobile
                            pm25Line: {
                                type: 'line',
                                yMin: CONFIG.chart.annotations.pm25Threshold,
                                yMax: CONFIG.chart.annotations.pm25Threshold,
                                borderColor: 'rgba(255, 193, 7, 0.5)',
                                borderWidth: 1,
                                borderDash: [5, 5],
                                label: {
                                    display: true,
                                    content: 'PM2.5 WHO Guideline',
                                    position: 'start',
                                    backgroundColor: 'rgba(255, 193, 7, 0.7)',
                                    color: '#000',
                                    font: {
                                        size: 10
                                    }
                                }
                            },
                            pm10Line: {
                                type: 'line',
                                yMin: CONFIG.chart.annotations.pm10Threshold,
                                yMax: CONFIG.chart.annotations.pm10Threshold,
                                borderColor: 'rgba(255, 87, 34, 0.5)',
                                borderWidth: 1,
                                borderDash: [5, 5],
                                label: {
                                    display: true,
                                    content: 'PM10 WHO Guideline',
                                    position: 'start',
                                    backgroundColor: 'rgba(255, 87, 34, 0.7)',
                                    color: '#000',
                                    font: {
                                        size: 10
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Update the chart with new readings
     * @param {Object} readings - Sensor readings
     */
    updateChart(readings) {
        if (readings.pm2_5 === undefined || readings.pm10 === undefined || !this.historyChart) {
            return;
        }
        
        try {
            const now = new Date();
            const timeLabel = now.toLocaleTimeString([], { hour: '2-digit', minute:'2-digit', second:'2-digit' });
            
            // Limit data points more aggressively on mobile devices
            const maxDataPoints = this.isMobile ? 30 : 150;
            
            this.historicalData.pm2_5.push(readings.pm2_5);
            this.historicalData.pm10.push(readings.pm10);
            this.historicalData.timestamps.push(timeLabel);
            
            if (this.historicalData.pm2_5.length > maxDataPoints) {
                this.historicalData.pm2_5.shift();
                this.historicalData.pm10.shift();
                this.historicalData.timestamps.shift();
            }
            
            let maxValue = 15; // Start with minimum max value
            
            // Safely calculate max value
            try {
                const validPm25 = this.historicalData.pm2_5.filter(v => v !== null && !isNaN(v));
                const validPm10 = this.historicalData.pm10.filter(v => v !== null && !isNaN(v));
                
                if (validPm25.length > 0 || validPm10.length > 0) {
                    maxValue = Math.max(
                        validPm25.length > 0 ? Math.max(...validPm25) : 0,
                        validPm10.length > 0 ? Math.max(...validPm10) : 0,
                        15
                    );
                }
            } catch (e) {
                console.warn("Error calculating max value:", e);
            }
            
            maxValue = Math.ceil(maxValue * 1.2);
            
            // Safely update chart
            if (this.historyChart.options && this.historyChart.options.scales && this.historyChart.options.scales.y) {
                this.historyChart.options.scales.y.suggestedMax = maxValue;
            }
            
            this.historyChart.data.labels = this.historicalData.timestamps;
            this.historyChart.data.datasets[0].data = this.historicalData.pm2_5;
            this.historyChart.data.datasets[1].data = this.historicalData.pm10;
            
            // Use minimal or no animation
            this.historyChart.update(this.isMobile ? 'none' : { duration: 0 });
        } catch (e) {
            console.error("Error updating chart:", e);
            // Fallback for chart error - create a basic chart
            if (e.message && e.message.includes("canvas")) {
                console.log("Attempting to reinitialize chart due to canvas error");
                setTimeout(() => this.initChart(), 1000);
            }
        }
    }
    
    /**
     * Clear all historical data
     */
    clearData() {
        this.historicalData = {
            pm2_5: [],
            pm10: [],
            timestamps: []
        };
        
        if (this.historyChart) {
            this.historyChart.data.labels = [];
            this.historyChart.data.datasets[0].data = [];
            this.historyChart.data.datasets[1].data = [];
            this.historyChart.update();
        }
    }
}

// Create and export a singleton instance
const chartManager = new ChartManager();
