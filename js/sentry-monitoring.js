/**
 * Sentry Error Monitoring and Reporting System
 * Provides comprehensive error tracking and performance monitoring
 */

class SentryMonitoringSystem {
  constructor() {
    this.isInitialized = false;
    this.isEnabled = true;
    this.config = {
      dsn: process.env.SENTRY_DSN || '', // Set in production
      environment: process.env.NODE_ENV || 'development',
      release: process.env.npm_package_version || '1.0.0',
      sampleRate: 1.0,
      tracesSampleRate: 0.1,
      beforeSend: this.beforeSend.bind(this),
      beforeSendTransaction: this.beforeSendTransaction.bind(this)
    };
    
    this.userContext = {};
    this.customTags = new Map();
    this.breadcrumbs = [];
    
    this.init();
  }

  async init() {
    try {
      console.log('🔍 Initializing Sentry Monitoring System...');
      
      // Only initialize in production or when DSN is provided
      if (!this.config.dsn && this.config.environment === 'production') {
        console.warn('⚠️ Sentry DSN not provided for production environment');
        return;
      }
      
      // Load Sentry SDK
      await this.loadSentry();
      
      // Initialize Sentry
      this.initializeSentry();
      
      // Setup error handlers
      this.setupErrorHandlers();
      
      // Setup performance monitoring
      this.setupPerformanceMonitoring();
      
      // Setup user context
      this.setupUserContext();
      
      // Setup custom integrations
      this.setupCustomIntegrations();
      
      this.isInitialized = true;
      console.log('✅ Sentry Monitoring System initialized successfully');
      
    } catch (error) {
      console.warn('⚠️ Sentry initialization failed:', error);
      this.setupFallbackErrorHandling();
    }
  }

  async loadSentry() {
    if (window.Sentry) return;
    
    try {
      const script = document.createElement('script');
      script.src = 'https://browser.sentry-cdn.com/7.93.0/bundle.tracing.min.js';
      script.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        script.onload = () => {
          if (window.Sentry) {
            resolve();
          } else {
            reject(new Error('Sentry not available after loading'));
          }
        };
        script.onerror = reject;
        document.head.appendChild(script);
      });
      
    } catch (error) {
      throw new Error('Failed to load Sentry SDK');
    }
  }

  initializeSentry() {
    if (!window.Sentry) {
      throw new Error('Sentry SDK not available');
    }
    
    window.Sentry.init({
      dsn: this.config.dsn,
      environment: this.config.environment,
      release: `forge-ec-website@${this.config.release}`,
      
      // Performance monitoring
      tracesSampleRate: this.config.tracesSampleRate,
      
      // Error filtering
      beforeSend: this.config.beforeSend,
      beforeSendTransaction: this.config.beforeSendTransaction,
      
      // Integrations
      integrations: [
        new window.Sentry.BrowserTracing({
          routingInstrumentation: window.Sentry.reactRouterV6Instrumentation(
            React.useEffect,
            useLocation,
            useNavigationType,
            createRoutesFromChildren,
            matchRoutes
          ),
        }),
      ],
      
      // Additional configuration
      attachStacktrace: true,
      autoSessionTracking: true,
      sendDefaultPii: false,
      
      // Custom tags
      initialScope: {
        tags: {
          component: 'forge-ec-website',
          browser: this.getBrowserInfo(),
          screen_resolution: `${window.screen.width}x${window.screen.height}`,
          viewport: `${window.innerWidth}x${window.innerHeight}`
        }
      }
    });
  }

  setupErrorHandlers() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.captureError(event.error, {
        type: 'javascript_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });
    
    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(event.reason, {
        type: 'unhandled_promise_rejection'
      });
    });
    
    // Resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.captureMessage(`Resource failed to load: ${event.target.src || event.target.href}`, 'warning', {
          type: 'resource_error',
          element: event.target.tagName,
          source: event.target.src || event.target.href
        });
      }
    }, true);
    
    // Network errors
    this.setupNetworkErrorMonitoring();
  }

  setupNetworkErrorMonitoring() {
    // Monitor fetch errors
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        if (!response.ok) {
          this.captureMessage(`HTTP ${response.status}: ${args[0]}`, 'warning', {
            type: 'http_error',
            status: response.status,
            url: args[0],
            method: args[1]?.method || 'GET'
          });
        }
        
        return response;
      } catch (error) {
        this.captureError(error, {
          type: 'fetch_error',
          url: args[0],
          method: args[1]?.method || 'GET'
        });
        throw error;
      }
    };
    
    // Monitor XMLHttpRequest errors
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      this._sentryMethod = method;
      this._sentryUrl = url;
      return originalXHROpen.call(this, method, url, ...args);
    };
    
    const originalXHRSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function(...args) {
      this.addEventListener('error', () => {
        window.sentryMonitoringSystem?.captureMessage(
          `XHR Error: ${this._sentryMethod} ${this._sentryUrl}`,
          'error',
          {
            type: 'xhr_error',
            method: this._sentryMethod,
            url: this._sentryUrl,
            status: this.status
          }
        );
      });
      
      return originalXHRSend.call(this, ...args);
    };
  }

  setupPerformanceMonitoring() {
    // Monitor Core Web Vitals
    if (window.performanceMonitor) {
      window.performanceMonitor.onMetric = (metric) => {
        this.capturePerformanceMetric(metric);
      };
    }
    
    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.duration > 50) {
              this.captureMessage(`Long task detected: ${entry.duration}ms`, 'warning', {
                type: 'long_task',
                duration: entry.duration,
                startTime: entry.startTime
              });
            }
          });
        });
        
        observer.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        console.warn('Long task monitoring not supported:', error);
      }
    }
    
    // Monitor memory usage
    this.setupMemoryMonitoring();
  }

  setupMemoryMonitoring() {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = performance.memory;
        const usedMB = Math.round(memory.usedJSHeapSize / 1048576);
        const totalMB = Math.round(memory.totalJSHeapSize / 1048576);
        const limitMB = Math.round(memory.jsHeapSizeLimit / 1048576);
        
        // Alert if memory usage is high
        if (usedMB > limitMB * 0.8) {
          this.captureMessage(`High memory usage: ${usedMB}MB / ${limitMB}MB`, 'warning', {
            type: 'memory_warning',
            used: usedMB,
            total: totalMB,
            limit: limitMB
          });
        }
        
        // Update Sentry context
        this.setContext('memory', {
          used: usedMB,
          total: totalMB,
          limit: limitMB
        });
      }, 30000); // Check every 30 seconds
    }
  }

  setupUserContext() {
    // Set basic user context
    this.setUser({
      id: this.generateUserId(),
      ip_address: '{{auto}}' // Let Sentry determine IP
    });
    
    // Track user interactions
    this.setupUserInteractionTracking();
  }

  setupUserInteractionTracking() {
    // Track page views
    this.addBreadcrumb({
      message: 'Page loaded',
      category: 'navigation',
      level: 'info',
      data: {
        url: window.location.href,
        referrer: document.referrer
      }
    });
    
    // Track clicks on important elements
    document.addEventListener('click', (event) => {
      const target = event.target;
      
      if (target.matches('button, .btn, a[href], [role="button"]')) {
        this.addBreadcrumb({
          message: 'User interaction',
          category: 'ui.click',
          level: 'info',
          data: {
            element: target.tagName,
            text: target.textContent?.trim().substring(0, 50),
            href: target.href,
            id: target.id,
            className: target.className
          }
        });
      }
    });
    
    // Track form submissions
    document.addEventListener('submit', (event) => {
      const form = event.target;
      
      this.addBreadcrumb({
        message: 'Form submission',
        category: 'ui.form',
        level: 'info',
        data: {
          formId: form.id,
          action: form.action,
          method: form.method
        }
      });
    });
  }

  setupCustomIntegrations() {
    // Integration with other systems
    if (window.performanceMonitor) {
      this.setTag('performance_monitoring', 'enabled');
    }
    
    if (window.accessibilityFocusSystem) {
      this.setTag('accessibility_features', 'enabled');
    }
    
    if (window.theatreAnimationSystem) {
      this.setTag('advanced_animations', 'enabled');
    }
  }

  // Public API methods
  captureError(error, context = {}) {
    if (!this.isEnabled || !this.isInitialized) {
      console.error('Sentry Error:', error, context);
      return;
    }
    
    window.Sentry.withScope((scope) => {
      // Add context
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value);
      });
      
      // Add custom tags
      this.customTags.forEach((value, key) => {
        scope.setTag(key, value);
      });
      
      window.Sentry.captureException(error);
    });
  }

  captureMessage(message, level = 'info', context = {}) {
    if (!this.isEnabled || !this.isInitialized) {
      console.log(`Sentry Message [${level}]:`, message, context);
      return;
    }
    
    window.Sentry.withScope((scope) => {
      scope.setLevel(level);
      
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value);
      });
      
      this.customTags.forEach((value, key) => {
        scope.setTag(key, value);
      });
      
      window.Sentry.captureMessage(message);
    });
  }

  capturePerformanceMetric(metric) {
    if (!this.isEnabled || !this.isInitialized) return;
    
    window.Sentry.addBreadcrumb({
      message: `Performance metric: ${metric.name}`,
      category: 'performance',
      level: 'info',
      data: {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta
      }
    });
    
    // Capture as custom measurement
    if (window.Sentry.setMeasurement) {
      window.Sentry.setMeasurement(metric.name, metric.value, metric.unit || 'millisecond');
    }
  }

  addBreadcrumb(breadcrumb) {
    if (!this.isEnabled || !this.isInitialized) return;
    
    window.Sentry.addBreadcrumb(breadcrumb);
  }

  setUser(user) {
    if (!this.isEnabled || !this.isInitialized) return;
    
    this.userContext = { ...this.userContext, ...user };
    window.Sentry.setUser(this.userContext);
  }

  setTag(key, value) {
    this.customTags.set(key, value);
    
    if (this.isInitialized) {
      window.Sentry.setTag(key, value);
    }
  }

  setContext(key, context) {
    if (!this.isEnabled || !this.isInitialized) return;
    
    window.Sentry.setContext(key, context);
  }

  // Utility methods
  beforeSend(event, hint) {
    // Filter out development errors
    if (this.config.environment === 'development') {
      console.log('Sentry Event (dev):', event, hint);
      return null; // Don't send in development
    }
    
    // Filter out known non-critical errors
    const error = hint.originalException;
    if (error && typeof error.message === 'string') {
      const ignoredMessages = [
        'Script error',
        'Non-Error promise rejection captured',
        'ResizeObserver loop limit exceeded'
      ];
      
      if (ignoredMessages.some(msg => error.message.includes(msg))) {
        return null;
      }
    }
    
    return event;
  }

  beforeSendTransaction(event) {
    // Filter out development transactions
    if (this.config.environment === 'development') {
      return null;
    }
    
    return event;
  }

  generateUserId() {
    // Generate anonymous user ID
    let userId = localStorage.getItem('sentry-user-id');
    if (!userId) {
      userId = 'user-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('sentry-user-id', userId);
    }
    return userId;
  }

  getBrowserInfo() {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  setupFallbackErrorHandling() {
    console.log('🔄 Setting up fallback error handling...');
    
    // Basic error logging
    window.addEventListener('error', (event) => {
      console.error('Global Error:', event.error);
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled Promise Rejection:', event.reason);
    });
  }

  // Control methods
  enable() {
    this.isEnabled = true;
  }

  disable() {
    this.isEnabled = false;
  }

  // Cleanup
  destroy() {
    this.customTags.clear();
    this.breadcrumbs = [];
    this.userContext = {};
  }
}

// Initialize Sentry Monitoring System when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.sentryMonitoringSystem = new SentryMonitoringSystem();
});

export default SentryMonitoringSystem;
