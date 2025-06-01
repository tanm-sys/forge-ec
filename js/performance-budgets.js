/**
 * Performance Budgets and Monitoring System
 * Maintains Core Web Vitals standards and performance budgets
 */

class PerformanceBudgetSystem {
  constructor() {
    this.isInitialized = false;
    this.budgets = new Map();
    this.measurements = new Map();
    this.violations = [];
    this.alerts = [];
    
    // Performance budgets (WCAG 2.1 AA and Core Web Vitals standards)
    this.defaultBudgets = {
      // Core Web Vitals
      'LCP': { threshold: 2500, unit: 'ms', description: 'Largest Contentful Paint' },
      'FID': { threshold: 100, unit: 'ms', description: 'First Input Delay' },
      'CLS': { threshold: 0.1, unit: 'score', description: 'Cumulative Layout Shift' },
      
      // Additional Web Vitals
      'FCP': { threshold: 1800, unit: 'ms', description: 'First Contentful Paint' },
      'TTFB': { threshold: 800, unit: 'ms', description: 'Time to First Byte' },
      'TTI': { threshold: 3800, unit: 'ms', description: 'Time to Interactive' },
      
      // Resource budgets
      'total-byte-weight': { threshold: 1600000, unit: 'bytes', description: 'Total Page Weight' }, // 1.6MB
      'script-byte-weight': { threshold: 500000, unit: 'bytes', description: 'JavaScript Bundle Size' }, // 500KB
      'style-byte-weight': { threshold: 100000, unit: 'bytes', description: 'CSS Bundle Size' }, // 100KB
      'image-byte-weight': { threshold: 800000, unit: 'bytes', description: 'Total Image Weight' }, // 800KB
      
      // Performance timing budgets
      'dom-content-loaded': { threshold: 2000, unit: 'ms', description: 'DOM Content Loaded' },
      'load-event': { threshold: 4000, unit: 'ms', description: 'Load Event' },
      
      // Animation performance
      'animation-frame-rate': { threshold: 55, unit: 'fps', description: 'Animation Frame Rate' },
      'long-task-count': { threshold: 5, unit: 'count', description: 'Long Tasks Count' },
      
      // Memory budgets
      'memory-usage': { threshold: 50000000, unit: 'bytes', description: 'Memory Usage' }, // 50MB
      'memory-limit-ratio': { threshold: 0.8, unit: 'ratio', description: 'Memory Limit Ratio' }
    };
    
    this.init();
  }

  init() {
    console.log('📊 Initializing Performance Budget System...');
    
    try {
      // Initialize budgets
      this.initializeBudgets();
      
      // Setup monitoring
      this.setupCoreWebVitalsMonitoring();
      this.setupResourceMonitoring();
      this.setupAnimationMonitoring();
      this.setupMemoryMonitoring();
      
      // Setup reporting
      this.setupReporting();
      
      // Setup alerts
      this.setupAlertSystem();
      
      // Start monitoring
      this.startMonitoring();
      
      this.isInitialized = true;
      console.log('✅ Performance Budget System initialized successfully');
      
    } catch (error) {
      console.warn('⚠️ Performance Budget System initialization failed:', error);
    }
  }

  initializeBudgets() {
    // Load default budgets
    Object.entries(this.defaultBudgets).forEach(([key, budget]) => {
      this.budgets.set(key, budget);
    });
    
    // Load custom budgets from localStorage
    const customBudgets = localStorage.getItem('performance-budgets');
    if (customBudgets) {
      try {
        const parsed = JSON.parse(customBudgets);
        Object.entries(parsed).forEach(([key, budget]) => {
          this.budgets.set(key, budget);
        });
      } catch (error) {
        console.warn('Failed to load custom budgets:', error);
      }
    }
  }

  setupCoreWebVitalsMonitoring() {
    // Integrate with existing performance monitor
    if (window.performanceMonitor) {
      window.performanceMonitor.onMetric = (metric) => {
        this.recordMeasurement(metric.name, metric.value, metric.unit || 'ms');
        this.checkBudget(metric.name, metric.value);
      };
    }
    
    // Setup Web Vitals library integration
    this.setupWebVitalsIntegration();
  }

  setupWebVitalsIntegration() {
    // Load web-vitals library if not already loaded
    if (!window.webVitals) {
      this.loadWebVitals().then(() => {
        this.initializeWebVitals();
      }).catch(error => {
        console.warn('Failed to load web-vitals library:', error);
      });
    } else {
      this.initializeWebVitals();
    }
  }

  async loadWebVitals() {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/web-vitals@3.5.1/dist/web-vitals.iife.js';
    
    return new Promise((resolve, reject) => {
      script.onload = () => {
        if (window.webVitals) {
          resolve();
        } else {
          reject(new Error('web-vitals not available after loading'));
        }
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  initializeWebVitals() {
    if (!window.webVitals) return;
    
    // Monitor all Core Web Vitals
    window.webVitals.getCLS((metric) => {
      this.recordMeasurement('CLS', metric.value, 'score');
      this.checkBudget('CLS', metric.value);
    });
    
    window.webVitals.getFID((metric) => {
      this.recordMeasurement('FID', metric.value, 'ms');
      this.checkBudget('FID', metric.value);
    });
    
    window.webVitals.getFCP((metric) => {
      this.recordMeasurement('FCP', metric.value, 'ms');
      this.checkBudget('FCP', metric.value);
    });
    
    window.webVitals.getLCP((metric) => {
      this.recordMeasurement('LCP', metric.value, 'ms');
      this.checkBudget('LCP', metric.value);
    });
    
    window.webVitals.getTTFB((metric) => {
      this.recordMeasurement('TTFB', metric.value, 'ms');
      this.checkBudget('TTFB', metric.value);
    });
  }

  setupResourceMonitoring() {
    // Monitor resource loading
    window.addEventListener('load', () => {
      setTimeout(() => {
        this.measureResourceBudgets();
      }, 1000);
    });
    
    // Monitor new resources
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            this.processResourceEntry(entry);
          });
        });
        
        observer.observe({ entryTypes: ['resource'] });
      } catch (error) {
        console.warn('Resource monitoring not supported:', error);
      }
    }
  }

  measureResourceBudgets() {
    const resources = performance.getEntriesByType('resource');
    
    let totalBytes = 0;
    let scriptBytes = 0;
    let styleBytes = 0;
    let imageBytes = 0;
    
    resources.forEach(resource => {
      const size = resource.transferSize || 0;
      totalBytes += size;
      
      if (resource.name.includes('.js')) {
        scriptBytes += size;
      } else if (resource.name.includes('.css')) {
        styleBytes += size;
      } else if (resource.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
        imageBytes += size;
      }
    });
    
    this.recordMeasurement('total-byte-weight', totalBytes, 'bytes');
    this.recordMeasurement('script-byte-weight', scriptBytes, 'bytes');
    this.recordMeasurement('style-byte-weight', styleBytes, 'bytes');
    this.recordMeasurement('image-byte-weight', imageBytes, 'bytes');
    
    this.checkBudget('total-byte-weight', totalBytes);
    this.checkBudget('script-byte-weight', scriptBytes);
    this.checkBudget('style-byte-weight', styleBytes);
    this.checkBudget('image-byte-weight', imageBytes);
  }

  processResourceEntry(entry) {
    // Check for slow resources
    if (entry.duration > 1000) {
      this.recordViolation('slow-resource', {
        name: entry.name,
        duration: entry.duration,
        size: entry.transferSize
      });
    }
  }

  setupAnimationMonitoring() {
    let frameCount = 0;
    let lastTime = performance.now();
    let longTaskCount = 0;
    
    // Monitor frame rate
    const monitorFrameRate = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        
        this.recordMeasurement('animation-frame-rate', fps, 'fps');
        this.checkBudget('animation-frame-rate', fps);
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(monitorFrameRate);
    };
    
    requestAnimationFrame(monitorFrameRate);
    
    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.duration > 50) {
              longTaskCount++;
              
              if (longTaskCount % 10 === 0) {
                this.recordMeasurement('long-task-count', longTaskCount, 'count');
                this.checkBudget('long-task-count', longTaskCount);
              }
            }
          });
        });
        
        observer.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        console.warn('Long task monitoring not supported:', error);
      }
    }
  }

  setupMemoryMonitoring() {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = performance.memory;
        const usedBytes = memory.usedJSHeapSize;
        const limitBytes = memory.jsHeapSizeLimit;
        const ratio = usedBytes / limitBytes;
        
        this.recordMeasurement('memory-usage', usedBytes, 'bytes');
        this.recordMeasurement('memory-limit-ratio', ratio, 'ratio');
        
        this.checkBudget('memory-usage', usedBytes);
        this.checkBudget('memory-limit-ratio', ratio);
      }, 10000); // Check every 10 seconds
    }
  }

  setupReporting() {
    // Setup integration with Sentry
    if (window.sentryMonitoringSystem) {
      this.sentryIntegration = true;
    }
    
    // Setup console reporting
    this.consoleReporting = true;
    
    // Setup periodic reporting
    setInterval(() => {
      this.generatePerformanceReport();
    }, 60000); // Report every minute
  }

  setupAlertSystem() {
    // Create performance alert panel
    this.createAlertPanel();
    
    // Setup alert thresholds
    this.alertThresholds = {
      'critical': 0.8, // 80% of budget
      'warning': 0.6   // 60% of budget
    };
  }

  createAlertPanel() {
    const panel = document.createElement('div');
    panel.id = 'performance-alerts';
    panel.style.cssText = `
      position: fixed;
      bottom: 10px;
      right: 10px;
      width: 300px;
      max-height: 200px;
      background: rgba(255, 0, 0, 0.9);
      color: white;
      padding: 10px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 12px;
      z-index: 10000;
      overflow-y: auto;
      display: none;
    `;
    
    document.body.appendChild(panel);
  }

  startMonitoring() {
    // Monitor navigation timing
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0];
      
      if (navigation) {
        const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
        const loadEvent = navigation.loadEventEnd - navigation.loadEventStart;
        
        this.recordMeasurement('dom-content-loaded', domContentLoaded, 'ms');
        this.recordMeasurement('load-event', loadEvent, 'ms');
        
        this.checkBudget('dom-content-loaded', domContentLoaded);
        this.checkBudget('load-event', loadEvent);
      }
    });
  }

  // Core methods
  recordMeasurement(metric, value, unit) {
    const measurement = {
      metric,
      value,
      unit,
      timestamp: Date.now()
    };
    
    if (!this.measurements.has(metric)) {
      this.measurements.set(metric, []);
    }
    
    this.measurements.get(metric).push(measurement);
    
    // Keep only last 100 measurements per metric
    const measurements = this.measurements.get(metric);
    if (measurements.length > 100) {
      measurements.shift();
    }
  }

  checkBudget(metric, value) {
    const budget = this.budgets.get(metric);
    if (!budget) return;
    
    const ratio = value / budget.threshold;
    
    if (ratio > 1) {
      this.recordViolation(metric, {
        value,
        threshold: budget.threshold,
        ratio,
        severity: 'critical'
      });
    } else if (ratio > this.alertThresholds.critical) {
      this.recordAlert(metric, {
        value,
        threshold: budget.threshold,
        ratio,
        severity: 'critical'
      });
    } else if (ratio > this.alertThresholds.warning) {
      this.recordAlert(metric, {
        value,
        threshold: budget.threshold,
        ratio,
        severity: 'warning'
      });
    }
  }

  recordViolation(metric, details) {
    const violation = {
      metric,
      details,
      timestamp: Date.now()
    };
    
    this.violations.push(violation);
    
    console.warn(`📊 Performance Budget Violation: ${metric}`, details);
    
    if (this.sentryIntegration) {
      window.sentryMonitoringSystem.captureMessage(
        `Performance budget violation: ${metric}`,
        'error',
        {
          type: 'performance_budget_violation',
          metric,
          details
        }
      );
    }
  }

  recordAlert(metric, details) {
    const alert = {
      metric,
      details,
      timestamp: Date.now()
    };
    
    this.alerts.push(alert);
    
    // Show alert panel
    this.showAlert(alert);
    
    if (details.severity === 'critical') {
      console.warn(`📊 Performance Budget Alert (Critical): ${metric}`, details);
    } else {
      console.log(`📊 Performance Budget Alert (Warning): ${metric}`, details);
    }
  }

  showAlert(alert) {
    const panel = document.getElementById('performance-alerts');
    if (!panel) return;
    
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = `
      margin: 5px 0;
      padding: 5px;
      background: ${alert.details.severity === 'critical' ? 'rgba(255, 0, 0, 0.3)' : 'rgba(255, 165, 0, 0.3)'};
      border-radius: 4px;
    `;
    
    alertDiv.innerHTML = `
      <strong>${alert.metric}</strong><br>
      ${alert.details.value} / ${alert.details.threshold}<br>
      <small>${Math.round(alert.details.ratio * 100)}% of budget</small>
    `;
    
    panel.appendChild(alertDiv);
    panel.style.display = 'block';
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
      alertDiv.remove();
      if (panel.children.length === 0) {
        panel.style.display = 'none';
      }
    }, 10000);
  }

  generatePerformanceReport() {
    const report = {
      timestamp: Date.now(),
      budgets: Object.fromEntries(this.budgets),
      measurements: this.getLatestMeasurements(),
      violations: this.violations.slice(-10), // Last 10 violations
      alerts: this.alerts.slice(-20) // Last 20 alerts
    };
    
    if (this.consoleReporting && (this.violations.length > 0 || this.alerts.length > 0)) {
      console.group('📊 Performance Budget Report');
      console.log('Violations:', this.violations.length);
      console.log('Alerts:', this.alerts.length);
      console.log('Latest measurements:', report.measurements);
      console.groupEnd();
    }
    
    return report;
  }

  getLatestMeasurements() {
    const latest = {};
    
    this.measurements.forEach((measurements, metric) => {
      if (measurements.length > 0) {
        latest[metric] = measurements[measurements.length - 1];
      }
    });
    
    return latest;
  }

  // Public API
  setBudget(metric, threshold, unit, description) {
    this.budgets.set(metric, { threshold, unit, description });
    this.saveBudgets();
  }

  getBudget(metric) {
    return this.budgets.get(metric);
  }

  getAllBudgets() {
    return Object.fromEntries(this.budgets);
  }

  getViolations() {
    return this.violations;
  }

  getAlerts() {
    return this.alerts;
  }

  saveBudgets() {
    const customBudgets = {};
    this.budgets.forEach((budget, metric) => {
      if (!this.defaultBudgets[metric]) {
        customBudgets[metric] = budget;
      }
    });
    
    localStorage.setItem('performance-budgets', JSON.stringify(customBudgets));
  }

  // Cleanup
  destroy() {
    this.budgets.clear();
    this.measurements.clear();
    this.violations = [];
    this.alerts = [];
    
    const panel = document.getElementById('performance-alerts');
    if (panel) {
      panel.remove();
    }
  }
}

// Initialize Performance Budget System when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.performanceBudgetSystem = new PerformanceBudgetSystem();
});

export default PerformanceBudgetSystem;
