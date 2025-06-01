/**
 * @fileoverview Performance Monitor - Web Vitals tracking and optimization
 * @version 1.0.0
 * @author Forge EC Team
 * @description Comprehensive performance monitoring system with Web Vitals tracking,
 * Intersection Observer polyfill, and performance optimization utilities.
 */

/**
 * @typedef {Object} WebVitalsMetric
 * @property {string} name - Metric name (CLS, FID, FCP, LCP, TTFB)
 * @property {number} value - Metric value
 * @property {number} delta - Change from previous measurement
 * @property {string} rating - Performance rating (good, needs-improvement, poor)
 * @property {Array} entries - Performance entries
 */

/**
 * @typedef {Object} PerformanceConfig
 * @property {boolean} enableWebVitals - Enable Web Vitals monitoring
 * @property {boolean} enableIntersectionObserver - Enable Intersection Observer polyfill
 * @property {boolean} enableResourceTiming - Enable resource timing monitoring
 * @property {boolean} enableUserTiming - Enable user timing marks
 * @property {Function} onMetric - Callback for metric reporting
 */

/**
 * Performance Monitor Class
 * Handles Web Vitals tracking, performance optimization, and monitoring
 */
class PerformanceMonitor {
  /**
   * @param {PerformanceConfig} config - Configuration options
   */
  constructor(config = {}) {
    /** @type {PerformanceConfig} */
    this.config = {
      enableWebVitals: true,
      enableIntersectionObserver: true,
      enableResourceTiming: true,
      enableUserTiming: true,
      onMetric: this.defaultMetricHandler.bind(this),
      ...config
    };

    /** @type {Map<string, WebVitalsMetric>} */
    this.metrics = new Map();
    
    /** @type {boolean} */
    this.isSupported = this.checkSupport();
    
    /** @type {PerformanceObserver|null} */
    this.performanceObserver = null;

    this.init();
  }

  /**
   * Initialize performance monitoring
   * @returns {Promise<void>}
   */
  async init() {
    try {
      console.log('🚀 Initializing Performance Monitor...');

      // Load Intersection Observer polyfill if needed
      if (this.config.enableIntersectionObserver) {
        await this.loadIntersectionObserverPolyfill();
      }

      // Initialize Web Vitals monitoring
      if (this.config.enableWebVitals && this.isSupported) {
        await this.initWebVitals();
      }

      // Setup resource timing monitoring
      if (this.config.enableResourceTiming) {
        this.setupResourceTiming();
      }

      // Setup user timing
      if (this.config.enableUserTiming) {
        this.setupUserTiming();
      }

      // Setup performance observer
      this.setupPerformanceObserver();

      console.log('✅ Performance Monitor initialized successfully');
    } catch (error) {
      console.warn('⚠️ Performance Monitor initialization failed:', error);
    }
  }

  /**
   * Check browser support for performance APIs
   * @returns {boolean}
   */
  checkSupport() {
    return !!(
      window.performance &&
      window.performance.mark &&
      window.performance.measure &&
      window.PerformanceObserver
    );
  }

  /**
   * Load Intersection Observer polyfill for older browsers
   * @returns {Promise<void>}
   */
  async loadIntersectionObserverPolyfill() {
    if (!window.IntersectionObserver) {
      try {
        console.log('📦 Loading Intersection Observer polyfill...');
        
        // Load polyfill from CDN
        const script = document.createElement('script');
        script.src = 'https://polyfill.io/v3/polyfill.min.js?features=IntersectionObserver';
        script.crossOrigin = 'anonymous';
        
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });

        console.log('✅ Intersection Observer polyfill loaded');
      } catch (error) {
        console.warn('⚠️ Failed to load Intersection Observer polyfill:', error);
      }
    }
  }

  /**
   * Initialize Web Vitals monitoring
   * @returns {Promise<void>}
   */
  async initWebVitals() {
    try {
      // Import Web Vitals library dynamically
      const webVitalsModule = await this.loadWebVitals();
      
      if (webVitalsModule) {
        const { getCLS, getFID, getFCP, getLCP, getTTFB } = webVitalsModule;

        // Monitor Core Web Vitals
        getCLS(this.handleMetric.bind(this));
        getFID(this.handleMetric.bind(this));
        getFCP(this.handleMetric.bind(this));
        getLCP(this.handleMetric.bind(this));
        getTTFB(this.handleMetric.bind(this));

        console.log('✅ Web Vitals monitoring enabled');
      }
    } catch (error) {
      console.warn('⚠️ Web Vitals initialization failed:', error);
      // Fallback to manual performance tracking
      this.setupFallbackMetrics();
    }
  }

  /**
   * Load Web Vitals library
   * @returns {Promise<Object|null>}
   */
  async loadWebVitals() {
    try {
      // Try to load from CDN
      const response = await fetch('https://unpkg.com/web-vitals@4/dist/web-vitals.js');
      if (!response.ok) throw new Error('Failed to fetch Web Vitals');
      
      const code = await response.text();
      const module = new Function('exports', code + '; return exports;')({});
      
      return module;
    } catch (error) {
      console.warn('⚠️ Failed to load Web Vitals library:', error);
      return null;
    }
  }

  /**
   * Setup fallback performance metrics
   */
  setupFallbackMetrics() {
    // Manual LCP tracking
    this.trackLargestContentfulPaint();
    
    // Manual FID tracking
    this.trackFirstInputDelay();
    
    // Manual CLS tracking
    this.trackCumulativeLayoutShift();
  }

  /**
   * Track Largest Contentful Paint manually
   */
  trackLargestContentfulPaint() {
    if (!window.PerformanceObserver) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        
        this.handleMetric({
          name: 'LCP',
          value: lastEntry.startTime,
          rating: this.getRating('LCP', lastEntry.startTime),
          entries: [lastEntry]
        });
      });

      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (error) {
      console.warn('⚠️ LCP tracking failed:', error);
    }
  }

  /**
   * Track First Input Delay manually
   */
  trackFirstInputDelay() {
    if (!window.PerformanceObserver) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.handleMetric({
            name: 'FID',
            value: entry.processingStart - entry.startTime,
            rating: this.getRating('FID', entry.processingStart - entry.startTime),
            entries: [entry]
          });
        });
      });

      observer.observe({ entryTypes: ['first-input'] });
    } catch (error) {
      console.warn('⚠️ FID tracking failed:', error);
    }
  }

  /**
   * Track Cumulative Layout Shift manually
   */
  trackCumulativeLayoutShift() {
    if (!window.PerformanceObserver) return;

    try {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });

        this.handleMetric({
          name: 'CLS',
          value: clsValue,
          rating: this.getRating('CLS', clsValue),
          entries: entries
        });
      });

      observer.observe({ entryTypes: ['layout-shift'] });
    } catch (error) {
      console.warn('⚠️ CLS tracking failed:', error);
    }
  }

  /**
   * Get performance rating for a metric
   * @param {string} metricName - Name of the metric
   * @param {number} value - Metric value
   * @returns {string} Rating (good, needs-improvement, poor)
   */
  getRating(metricName, value) {
    const thresholds = {
      LCP: { good: 2500, poor: 4000 },
      FID: { good: 100, poor: 300 },
      CLS: { good: 0.1, poor: 0.25 },
      FCP: { good: 1800, poor: 3000 },
      TTFB: { good: 800, poor: 1800 }
    };

    const threshold = thresholds[metricName];
    if (!threshold) return 'unknown';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Handle metric measurement
   * @param {WebVitalsMetric} metric - Metric data
   */
  handleMetric(metric) {
    this.metrics.set(metric.name, metric);
    this.config.onMetric(metric);
  }

  /**
   * Default metric handler
   * @param {WebVitalsMetric} metric - Metric data
   */
  defaultMetricHandler(metric) {
    const emoji = metric.rating === 'good' ? '✅' : metric.rating === 'needs-improvement' ? '⚠️' : '❌';
    console.log(`${emoji} ${metric.name}: ${metric.value.toFixed(2)}ms (${metric.rating})`);
  }

  /**
   * Setup resource timing monitoring
   */
  setupResourceTiming() {
    if (!this.isSupported) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.duration > 1000) { // Log slow resources
            console.warn(`⚠️ Slow resource: ${entry.name} (${entry.duration.toFixed(2)}ms)`);
          }
        });
      });

      observer.observe({ entryTypes: ['resource'] });
    } catch (error) {
      console.warn('⚠️ Resource timing setup failed:', error);
    }
  }

  /**
   * Setup user timing marks and measures
   */
  setupUserTiming() {
    if (!this.isSupported) return;

    // Mark page start
    performance.mark('page-start');

    // Mark when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        performance.mark('dom-ready');
        performance.measure('dom-parse', 'page-start', 'dom-ready');
      });
    } else {
      performance.mark('dom-ready');
    }

    // Mark when page is fully loaded
    window.addEventListener('load', () => {
      performance.mark('page-loaded');
      performance.measure('page-load', 'page-start', 'page-loaded');
    });
  }

  /**
   * Setup performance observer for user timing
   */
  setupPerformanceObserver() {
    if (!this.isSupported) return;

    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'measure') {
            console.log(`📊 ${entry.name}: ${entry.duration.toFixed(2)}ms`);
          }
        });
      });

      this.performanceObserver.observe({ entryTypes: ['measure'] });
    } catch (error) {
      console.warn('⚠️ Performance observer setup failed:', error);
    }
  }

  /**
   * Get all collected metrics
   * @returns {Object} All metrics data
   */
  getMetrics() {
    return Object.fromEntries(this.metrics);
  }

  /**
   * Mark a custom performance point
   * @param {string} name - Mark name
   */
  mark(name) {
    if (this.isSupported) {
      performance.mark(name);
    }
  }

  /**
   * Measure time between two marks
   * @param {string} name - Measure name
   * @param {string} startMark - Start mark name
   * @param {string} endMark - End mark name
   */
  measure(name, startMark, endMark) {
    if (this.isSupported) {
      try {
        performance.measure(name, startMark, endMark);
      } catch (error) {
        console.warn(`⚠️ Failed to measure ${name}:`, error);
      }
    }
  }

  /**
   * Cleanup performance monitoring
   */
  cleanup() {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
  }
}

// Initialize performance monitor when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.performanceMonitor = new PerformanceMonitor({
    onMetric: (metric) => {
      // Send metrics to analytics if available
      if (window.gtag) {
        window.gtag('event', 'web_vitals', {
          event_category: 'Performance',
          event_label: metric.name,
          value: Math.round(metric.value),
          custom_map: { metric_rating: metric.rating }
        });
      }
    }
  });
});

// Export for use in other modules
window.PerformanceMonitor = PerformanceMonitor;
