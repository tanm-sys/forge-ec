/**
 * @fileoverview Quicklink Prefetch System - Intelligent link prefetching
 * @version 1.0.0
 * @author Forge EC Team
 * @description Advanced link prefetching system with intelligent viewport detection,
 * connection-aware loading, and performance optimization for faster navigation.
 */

/**
 * @typedef {Object} PrefetchConfig
 * @property {number} delay - Delay before prefetching (ms)
 * @property {number} timeout - Prefetch timeout (ms)
 * @property {number} throttle - Throttle interval (ms)
 * @property {Array<string>} origins - Allowed origins for prefetching
 * @property {Array<string>} ignores - URL patterns to ignore
 * @property {boolean} respectDataSaver - Respect data saver preference
 * @property {boolean} respectReducedMotion - Respect reduced motion preference
 * @property {Function} onPrefetch - Prefetch callback
 * @property {Function} onError - Error callback
 */

/**
 * @typedef {Object} PrefetchEntry
 * @property {string} url - URL to prefetch
 * @property {HTMLElement} element - Link element
 * @property {number} timestamp - Prefetch timestamp
 * @property {string} status - Prefetch status (pending, success, error)
 */

/**
 * Quicklink Prefetch System Class
 * Manages intelligent link prefetching for improved navigation performance
 */
class QuicklinkPrefetch {
  /**
   * @param {PrefetchConfig} config - Configuration options
   */
  constructor(config = {}) {
    /** @type {PrefetchConfig} */
    this.config = {
      delay: 0,
      timeout: 2000,
      throttle: 100,
      origins: [window.location.origin],
      ignores: [
        /\/api\//,
        /\.pdf$/,
        /\.zip$/,
        /\.exe$/,
        /mailto:/,
        /tel:/,
        /javascript:/
      ],
      respectDataSaver: true,
      respectReducedMotion: true,
      onPrefetch: this.defaultPrefetchHandler.bind(this),
      onError: this.defaultErrorHandler.bind(this),
      ...config
    };

    /** @type {Set<string>} */
    this.prefetched = new Set();
    
    /** @type {Map<string, PrefetchEntry>} */
    this.prefetchQueue = new Map();
    
    /** @type {IntersectionObserver|null} */
    this.observer = null;
    
    /** @type {boolean} */
    this.isSupported = this.checkSupport();
    
    /** @type {boolean} */
    this.isDataSaverEnabled = this.checkDataSaver();
    
    /** @type {boolean} */
    this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.init();
  }

  /**
   * Initialize prefetch system
   * @returns {Promise<void>}
   */
  async init() {
    try {
      console.log('🚀 Initializing Quicklink Prefetch System...');

      // Check if prefetching should be enabled
      if (!this.shouldEnablePrefetching()) {
        console.log('⏸️ Prefetching disabled due to user preferences or connection');
        return;
      }

      // Setup intersection observer for viewport detection
      this.setupIntersectionObserver();

      // Setup hover-based prefetching
      this.setupHoverPrefetching();

      // Setup connection change monitoring
      this.setupConnectionMonitoring();

      // Start observing links
      this.observeLinks();

      console.log('✅ Quicklink Prefetch System initialized successfully');
    } catch (error) {
      console.warn('⚠️ Quicklink Prefetch System initialization failed:', error);
    }
  }

  /**
   * Check browser support for prefetching
   * @returns {boolean}
   */
  checkSupport() {
    return !!(
      window.IntersectionObserver &&
      window.fetch &&
      document.createElement('link').relList &&
      document.createElement('link').relList.supports &&
      document.createElement('link').relList.supports('prefetch')
    );
  }

  /**
   * Check if data saver is enabled
   * @returns {boolean}
   */
  checkDataSaver() {
    return !!(
      navigator.connection &&
      navigator.connection.saveData
    );
  }

  /**
   * Determine if prefetching should be enabled
   * @returns {boolean}
   */
  shouldEnablePrefetching() {
    // Disable if not supported
    if (!this.isSupported) {
      console.log('⚠️ Prefetching not supported in this browser');
      return false;
    }

    // Disable if data saver is enabled and we respect it
    if (this.config.respectDataSaver && this.isDataSaverEnabled) {
      console.log('📱 Prefetching disabled due to data saver mode');
      return false;
    }

    // Disable if reduced motion is preferred and we respect it
    if (this.config.respectReducedMotion && this.isReducedMotion) {
      console.log('🔇 Prefetching disabled due to reduced motion preference');
      return false;
    }

    // Check connection quality
    if (navigator.connection) {
      const connection = navigator.connection;
      const slowConnections = ['slow-2g', '2g'];
      
      if (slowConnections.includes(connection.effectiveType)) {
        console.log('📶 Prefetching disabled due to slow connection');
        return false;
      }
    }

    return true;
  }

  /**
   * Setup intersection observer for viewport-based prefetching
   */
  setupIntersectionObserver() {
    if (!window.IntersectionObserver) return;

    const options = {
      rootMargin: '200px', // Start prefetching 200px before element enters viewport
      threshold: 0
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const link = entry.target;
          const url = this.getLinkUrl(link);
          
          if (url && this.shouldPrefetch(url)) {
            this.schedulePrefetch(url, link);
          }
        }
      });
    }, options);
  }

  /**
   * Setup hover-based prefetching for immediate interaction
   */
  setupHoverPrefetching() {
    let hoverTimeout;

    document.addEventListener('mouseover', (e) => {
      const link = e.target.closest('a');
      if (!link) return;

      const url = this.getLinkUrl(link);
      if (!url || !this.shouldPrefetch(url)) return;

      // Clear any existing timeout
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }

      // Prefetch after a short delay to avoid unnecessary requests
      hoverTimeout = setTimeout(() => {
        this.schedulePrefetch(url, link, 'hover');
      }, 100);
    }, { passive: true });

    document.addEventListener('mouseout', () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
        hoverTimeout = null;
      }
    }, { passive: true });
  }

  /**
   * Setup connection change monitoring
   */
  setupConnectionMonitoring() {
    if (!navigator.connection) return;

    navigator.connection.addEventListener('change', () => {
      const connection = navigator.connection;
      
      // Pause prefetching on slow connections
      if (['slow-2g', '2g'].includes(connection.effectiveType)) {
        console.log('📶 Pausing prefetching due to slow connection');
        this.pausePrefetching();
      } else {
        console.log('📶 Resuming prefetching on faster connection');
        this.resumePrefetching();
      }
    });
  }

  /**
   * Get URL from link element
   * @param {HTMLElement} link - Link element
   * @returns {string|null} URL or null if invalid
   */
  getLinkUrl(link) {
    if (!link || link.tagName !== 'A') return null;
    
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#')) return null;

    try {
      const url = new URL(href, window.location.origin);
      return url.href;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if URL should be prefetched
   * @param {string} url - URL to check
   * @returns {boolean}
   */
  shouldPrefetch(url) {
    // Already prefetched
    if (this.prefetched.has(url)) return false;

    // Currently in queue
    if (this.prefetchQueue.has(url)) return false;

    try {
      const urlObj = new URL(url);

      // Check if origin is allowed
      if (!this.config.origins.includes(urlObj.origin)) return false;

      // Check ignore patterns
      for (const pattern of this.config.ignores) {
        if (pattern instanceof RegExp && pattern.test(url)) return false;
        if (typeof pattern === 'string' && url.includes(pattern)) return false;
      }

      // Don't prefetch current page
      if (urlObj.pathname === window.location.pathname) return false;

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Schedule URL for prefetching
   * @param {string} url - URL to prefetch
   * @param {HTMLElement} element - Link element
   * @param {string} trigger - Prefetch trigger (viewport, hover)
   */
  schedulePrefetch(url, element, trigger = 'viewport') {
    if (this.prefetchQueue.has(url)) return;

    const entry = {
      url,
      element,
      timestamp: Date.now(),
      status: 'pending',
      trigger
    };

    this.prefetchQueue.set(url, entry);

    // Schedule prefetch with delay
    setTimeout(() => {
      this.executePrefetch(entry);
    }, this.config.delay);
  }

  /**
   * Execute prefetch for URL
   * @param {PrefetchEntry} entry - Prefetch entry
   * @returns {Promise<void>}
   */
  async executePrefetch(entry) {
    try {
      const { url } = entry;

      // Check if still valid
      if (!this.prefetchQueue.has(url) || this.prefetched.has(url)) {
        return;
      }

      console.log(`🔗 Prefetching: ${url} (${entry.trigger})`);

      // Use link prefetch if supported, otherwise fetch
      if (this.isSupported) {
        await this.prefetchWithLink(url);
      } else {
        await this.prefetchWithFetch(url);
      }

      // Mark as prefetched
      this.prefetched.add(url);
      entry.status = 'success';
      
      // Remove from queue
      this.prefetchQueue.delete(url);

      // Call success callback
      this.config.onPrefetch(url, entry);

      // Mark performance point
      if (window.performanceMonitor) {
        window.performanceMonitor.mark?.(`prefetch-${entry.trigger}`);
      }

    } catch (error) {
      console.warn(`⚠️ Prefetch failed for ${entry.url}:`, error);
      entry.status = 'error';
      this.prefetchQueue.delete(entry.url);
      this.config.onError(error, entry);
    }
  }

  /**
   * Prefetch using link element
   * @param {string} url - URL to prefetch
   * @returns {Promise<void>}
   */
  prefetchWithLink(url) {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      link.crossOrigin = 'anonymous';

      const timeout = setTimeout(() => {
        reject(new Error('Prefetch timeout'));
      }, this.config.timeout);

      link.onload = () => {
        clearTimeout(timeout);
        resolve();
      };

      link.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Prefetch failed'));
      };

      document.head.appendChild(link);
    });
  }

  /**
   * Prefetch using fetch API
   * @param {string} url - URL to prefetch
   * @returns {Promise<void>}
   */
  async prefetchWithFetch(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, this.config.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        mode: 'no-cors',
        cache: 'force-cache'
      });

      clearTimeout(timeout);
      
      if (!response.ok && response.type !== 'opaque') {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  /**
   * Observe all links on the page
   */
  observeLinks() {
    if (!this.observer) return;

    const links = document.querySelectorAll('a[href]');
    links.forEach(link => {
      const url = this.getLinkUrl(link);
      if (url && this.shouldPrefetch(url)) {
        this.observer.observe(link);
      }
    });
  }

  /**
   * Pause prefetching
   */
  pausePrefetching() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  /**
   * Resume prefetching
   */
  resumePrefetching() {
    if (this.shouldEnablePrefetching()) {
      this.observeLinks();
    }
  }

  /**
   * Default prefetch success handler
   * @param {string} url - Prefetched URL
   * @param {PrefetchEntry} entry - Prefetch entry
   */
  defaultPrefetchHandler(url, entry) {
    console.log(`✅ Prefetched: ${url} (${entry.trigger})`);
  }

  /**
   * Default error handler
   * @param {Error} error - Error object
   * @param {PrefetchEntry} entry - Prefetch entry
   */
  defaultErrorHandler(error, entry) {
    console.warn(`❌ Prefetch failed: ${entry.url}`, error);
  }

  /**
   * Get prefetch statistics
   * @returns {Object} Prefetch statistics
   */
  getStats() {
    return {
      prefetched: this.prefetched.size,
      queued: this.prefetchQueue.size,
      supported: this.isSupported,
      enabled: this.shouldEnablePrefetching()
    };
  }

  /**
   * Cleanup prefetch system
   */
  cleanup() {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.prefetchQueue.clear();
    this.prefetched.clear();
  }
}

// Initialize quicklink prefetch system when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.quicklinkPrefetch = new QuicklinkPrefetch({
    origins: [
      window.location.origin,
      'https://tanm-sys.github.io' // Allow GitHub Pages
    ],
    onPrefetch: (url, entry) => {
      // Track prefetch success in analytics
      if (window.gtag) {
        window.gtag('event', 'prefetch_success', {
          event_category: 'Performance',
          event_label: entry.trigger,
          value: 1
        });
      }
    }
  });
});

// Export for use in other modules
window.QuicklinkPrefetch = QuicklinkPrefetch;
