/**
 * @fileoverview Scroll Coordinator - Centralized scroll event management
 * @version 1.0.0
 * @author Forge EC Team
 * @description Centralized system for managing all scroll events to prevent
 * conflicts, improve performance, and coordinate between different modules.
 */

/**
 * @typedef {Object} ScrollData
 * @property {number} scrollY - Current scroll position
 * @property {string} direction - Scroll direction ('up' or 'down')
 * @property {number} velocity - Scroll velocity
 * @property {number} progress - Scroll progress (0-1)
 * @property {boolean} isScrolling - Whether currently scrolling
 */

/**
 * Centralized Scroll Coordinator Class
 * Manages all scroll events and coordinates between different systems
 */
class ScrollCoordinator {
  constructor() {
    /** @type {number} */
    this.scrollY = 0;
    
    /** @type {number} */
    this.lastScrollY = 0;
    
    /** @type {string} */
    this.direction = 'down';
    
    /** @type {number} */
    this.velocity = 0;
    
    /** @type {boolean} */
    this.isScrolling = false;
    
    /** @type {number} */
    this.scrollTimeout = null;
    
    /** @type {Map<string, Function>} */
    this.subscribers = new Map();
    
    /** @type {boolean} */
    this.isEnabled = true;
    
    /** @type {boolean} */
    this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    /** @type {number} */
    this.rafId = null;
    
    /** @type {Array<number>} */
    this.velocityHistory = [];
    
    this.init();
  }

  /**
   * Initialize scroll coordinator
   */
  init() {
    console.log('🎯 Initializing Scroll Coordinator...');
    
    // Setup reduced motion listener
    this.setupReducedMotionListener();
    
    // Setup main scroll handler
    this.setupScrollHandler();
    
    // Setup performance monitoring
    this.setupPerformanceMonitoring();
    
    console.log('✅ Scroll Coordinator initialized');
  }

  /**
   * Setup reduced motion preference listener
   */
  setupReducedMotionListener() {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleChange = (e) => {
      this.isReducedMotion = e.matches;
      console.log(`🔄 Reduced motion: ${this.isReducedMotion ? 'enabled' : 'disabled'}`);
    };

    mediaQuery.addEventListener('change', handleChange);
    this.isReducedMotion = mediaQuery.matches;
  }

  /**
   * Setup main scroll handler with performance optimization
   */
  setupScrollHandler() {
    let ticking = false;
    
    const scrollHandler = () => {
      if (!ticking && this.isEnabled) {
        this.rafId = requestAnimationFrame(() => {
          this.updateScrollData();
          this.notifySubscribers();
          ticking = false;
        });
        ticking = true;
      }
    };

    // Use passive listener for better performance
    window.addEventListener('scroll', scrollHandler, { passive: true });
    
    // Store handler for cleanup
    this.scrollHandler = scrollHandler;
  }

  /**
   * Update scroll data with performance calculations
   */
  updateScrollData() {
    const currentScrollY = window.scrollY;
    const currentTime = performance.now();
    
    // Calculate direction
    this.direction = currentScrollY > this.lastScrollY ? 'down' : 'up';
    
    // Calculate velocity
    const deltaY = currentScrollY - this.lastScrollY;
    const deltaTime = currentTime - (this.lastUpdateTime || currentTime);
    this.velocity = deltaTime > 0 ? Math.abs(deltaY / deltaTime) : 0;
    
    // Store velocity history for smoothing
    this.velocityHistory.push(this.velocity);
    if (this.velocityHistory.length > 5) {
      this.velocityHistory.shift();
    }
    
    // Calculate scroll progress
    const maxScroll = document.body.scrollHeight - window.innerHeight;
    const progress = maxScroll > 0 ? currentScrollY / maxScroll : 0;
    
    // Update scroll state
    this.lastScrollY = this.scrollY;
    this.scrollY = currentScrollY;
    this.isScrolling = true;
    this.lastUpdateTime = currentTime;
    
    // Clear scrolling state after delay
    clearTimeout(this.scrollTimeout);
    this.scrollTimeout = setTimeout(() => {
      this.isScrolling = false;
      this.velocity = 0;
      this.notifySubscribers(); // Notify about scroll end
    }, 150);
    
    // Performance monitoring
    if (window.performanceMonitor) {
      window.performanceMonitor.mark?.('scroll-coordinator-update');
    }
  }

  /**
   * Notify all subscribers with current scroll data
   */
  notifySubscribers() {
    if (!this.isEnabled) return;
    
    const scrollData = {
      scrollY: this.scrollY,
      direction: this.direction,
      velocity: this.getSmoothedVelocity(),
      progress: this.getScrollProgress(),
      isScrolling: this.isScrolling,
      isReducedMotion: this.isReducedMotion
    };

    this.subscribers.forEach((callback, name) => {
      try {
        callback(scrollData);
      } catch (error) {
        console.warn(`⚠️ Scroll subscriber '${name}' failed:`, error);
      }
    });
  }

  /**
   * Get smoothed velocity from history
   * @returns {number} Smoothed velocity
   */
  getSmoothedVelocity() {
    if (this.velocityHistory.length === 0) return 0;
    
    const sum = this.velocityHistory.reduce((a, b) => a + b, 0);
    return sum / this.velocityHistory.length;
  }

  /**
   * Get scroll progress (0-1)
   * @returns {number} Scroll progress
   */
  getScrollProgress() {
    const maxScroll = document.body.scrollHeight - window.innerHeight;
    return maxScroll > 0 ? Math.min(Math.max(this.scrollY / maxScroll, 0), 1) : 0;
  }

  /**
   * Subscribe to scroll events
   * @param {string} name - Subscriber name
   * @param {Function} callback - Callback function
   */
  subscribe(name, callback) {
    this.subscribers.set(name, callback);
    console.log(`📝 Scroll subscriber '${name}' registered`);
  }

  /**
   * Unsubscribe from scroll events
   * @param {string} name - Subscriber name
   */
  unsubscribe(name) {
    this.subscribers.delete(name);
    console.log(`🗑️ Scroll subscriber '${name}' removed`);
  }

  /**
   * Enable scroll coordination
   */
  enable() {
    this.isEnabled = true;
    console.log('✅ Scroll coordination enabled');
  }

  /**
   * Disable scroll coordination
   */
  disable() {
    this.isEnabled = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    console.log('⏸️ Scroll coordination disabled');
  }

  /**
   * Setup performance monitoring
   */
  setupPerformanceMonitoring() {
    // Monitor scroll performance
    let frameCount = 0;
    let lastTime = performance.now();
    
    const monitorPerformance = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        
        if (fps < 50) {
          console.warn(`⚠️ Scroll performance warning: ${fps} FPS`);
        }
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      if (this.isEnabled) {
        requestAnimationFrame(monitorPerformance);
      }
    };
    
    requestAnimationFrame(monitorPerformance);
  }

  /**
   * Get current scroll data
   * @returns {ScrollData} Current scroll data
   */
  getCurrentScrollData() {
    return {
      scrollY: this.scrollY,
      direction: this.direction,
      velocity: this.getSmoothedVelocity(),
      progress: this.getScrollProgress(),
      isScrolling: this.isScrolling,
      isReducedMotion: this.isReducedMotion
    };
  }

  /**
   * Cleanup scroll coordinator
   */
  cleanup() {
    this.disable();
    this.subscribers.clear();
    
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler);
    }
    
    clearTimeout(this.scrollTimeout);
    console.log('🧹 Scroll Coordinator cleaned up');
  }
}

// Initialize scroll coordinator when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.scrollCoordinator = new ScrollCoordinator();
});

// Export for use in other modules
window.ScrollCoordinator = ScrollCoordinator;
