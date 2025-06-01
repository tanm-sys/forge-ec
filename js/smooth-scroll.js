/**
 * @fileoverview Smooth Scroll System - Lenis integration with enhanced performance
 * @version 1.0.0
 * @author Forge EC Team
 * @description Advanced smooth scrolling system using Lenis with performance optimization,
 * accessibility support, and seamless integration with existing animations.
 */

/**
 * @typedef {Object} SmoothScrollConfig
 * @property {number} duration - Scroll animation duration
 * @property {Function} easing - Easing function
 * @property {boolean} smooth - Enable smooth scrolling
 * @property {number} smoothTouch - Touch scroll smoothness
 * @property {boolean} syncTouch - Sync touch scrolling
 * @property {number} touchMultiplier - Touch scroll multiplier
 * @property {boolean} infinite - Enable infinite scroll
 * @property {Function} onScroll - Scroll callback
 */

/**
 * @typedef {Object} ScrollTarget
 * @property {HTMLElement} element - Target element
 * @property {number} offset - Scroll offset
 * @property {number} duration - Animation duration
 * @property {Function} callback - Completion callback
 */

/**
 * Smooth Scroll System Class
 * Manages smooth scrolling with Lenis integration and performance optimization
 */
class SmoothScrollSystem {
  /**
   * @param {SmoothScrollConfig} config - Configuration options
   */
  constructor(config = {}) {
    /** @type {SmoothScrollConfig} */
    this.config = {
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smooth: true,
      smoothTouch: false,
      syncTouch: false,
      touchMultiplier: 1.5,
      infinite: false,
      onScroll: this.handleScroll.bind(this),
      ...config
    };

    /** @type {Object|null} */
    this.lenis = null;
    
    /** @type {boolean} */
    this.isEnabled = true;
    
    /** @type {boolean} */
    this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    /** @type {number} */
    this.rafId = null;
    
    /** @type {Map<string, Function>} */
    this.scrollListeners = new Map();

    this.init();
  }

  /**
   * Initialize smooth scroll system
   * @returns {Promise<void>}
   */
  async init() {
    try {
      console.log('🚀 Initializing Smooth Scroll System...');

      // Check for reduced motion preference
      this.setupReducedMotionListener();

      // Load Lenis library
      await this.loadLenis();

      // Initialize Lenis if not in reduced motion mode
      if (!this.isReducedMotion && this.isEnabled) {
        this.initializeLenis();
      }

      // Setup scroll event integration
      this.setupScrollIntegration();

      // Setup navigation integration
      this.setupNavigationIntegration();

      console.log('✅ Smooth Scroll System initialized successfully');
    } catch (error) {
      console.warn('⚠️ Smooth Scroll System initialization failed:', error);
      this.setupFallbackScrolling();
    }
  }

  /**
   * Load Lenis library dynamically
   * @returns {Promise<void>}
   */
  async loadLenis() {
    try {
      // Check if Lenis is already loaded
      if (window.Lenis) {
        console.log('✅ Lenis already available');
        return;
      }

      console.log('📦 Loading Lenis smooth scroll library...');
      
      // Load Lenis from CDN
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@studio-freight/lenis@1.0.42/dist/lenis.min.js';
      script.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        script.onload = () => {
          if (window.Lenis) {
            console.log('✅ Lenis library loaded successfully');
            resolve();
          } else {
            reject(new Error('Lenis not available after loading'));
          }
        };
        script.onerror = () => reject(new Error('Failed to load Lenis script'));
        document.head.appendChild(script);
      });
    } catch (error) {
      console.warn('⚠️ Failed to load Lenis library:', error);
      throw error;
    }
  }

  /**
   * Initialize Lenis smooth scrolling
   */
  initializeLenis() {
    try {
      if (!window.Lenis) {
        throw new Error('Lenis library not available');
      }

      this.lenis = new window.Lenis({
        duration: this.config.duration,
        easing: this.config.easing,
        smooth: this.config.smooth,
        smoothTouch: this.config.smoothTouch,
        syncTouch: this.config.syncTouch,
        touchMultiplier: this.config.touchMultiplier,
        infinite: this.config.infinite,
        onScroll: this.config.onScroll
      });

      // Start the animation loop
      this.startAnimationLoop();

      console.log('✅ Lenis smooth scrolling initialized');
    } catch (error) {
      console.warn('⚠️ Lenis initialization failed:', error);
      this.setupFallbackScrolling();
    }
  }

  /**
   * Start the Lenis animation loop
   */
  startAnimationLoop() {
    const raf = (time) => {
      if (this.lenis && this.isEnabled) {
        this.lenis.raf(time);
      }
      this.rafId = requestAnimationFrame(raf);
    };
    
    this.rafId = requestAnimationFrame(raf);
  }

  /**
   * Setup reduced motion preference listener
   */
  setupReducedMotionListener() {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleChange = (e) => {
      this.isReducedMotion = e.matches;
      
      if (this.isReducedMotion) {
        this.disable();
        console.log('🔇 Smooth scrolling disabled due to reduced motion preference');
      } else if (this.isEnabled) {
        this.enable();
        console.log('🔊 Smooth scrolling enabled');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    this.isReducedMotion = mediaQuery.matches;
  }

  /**
   * Handle scroll events
   * @param {Object} data - Scroll data from Lenis
   */
  handleScroll(data) {
    // Update scroll position for other systems
    if (window.forgeECApp && window.forgeECApp.updateScrollEffects) {
      window.forgeECApp.updateScrollEffects();
    }

    // Trigger custom scroll listeners
    this.scrollListeners.forEach((callback, name) => {
      try {
        callback(data);
      } catch (error) {
        console.warn(`⚠️ Scroll listener '${name}' failed:`, error);
      }
    });

    // Update enhanced transitions if available
    if (window.enhancedTransitions && window.enhancedTransitions.detectCurrentSection) {
      window.enhancedTransitions.detectCurrentSection();
    }
  }

  /**
   * Setup scroll event integration with existing systems
   */
  setupScrollIntegration() {
    // Integrate with animation controller
    if (window.animationController) {
      this.addScrollListener('animations', (data) => {
        // Trigger scroll-based animations
        const scrollY = data.scroll || window.scrollY;
        window.animationController.updateScrollAnimations?.(scrollY);
      });
    }

    // Integrate with performance monitoring
    if (window.performanceMonitor) {
      this.addScrollListener('performance', (data) => {
        // Mark scroll performance points
        window.performanceMonitor.mark?.('scroll-update');
      });
    }
  }

  /**
   * Setup navigation integration for smooth anchor scrolling
   */
  setupNavigationIntegration() {
    // Handle navigation links
    const navLinks = document.querySelectorAll('a[href^="#"]');
    
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        const targetId = href.substring(1);
        
        if (targetId && !this.isReducedMotion) {
          e.preventDefault();
          this.scrollToElement(targetId);
        }
      });
    });

    // Handle enhanced transitions integration
    if (window.enhancedTransitions) {
      this.addScrollListener('enhanced-transitions', (data) => {
        // Sync with enhanced transitions system
        if (!window.enhancedTransitions.isTransitioning) {
          window.enhancedTransitions.detectCurrentSection?.();
        }
      });
    }
  }

  /**
   * Scroll to element smoothly
   * @param {string|HTMLElement} target - Target element or selector
   * @param {Object} options - Scroll options
   * @returns {Promise<void>}
   */
  async scrollToElement(target, options = {}) {
    try {
      const element = typeof target === 'string' ? document.getElementById(target) : target;
      
      if (!element) {
        console.warn(`⚠️ Scroll target not found: ${target}`);
        return;
      }

      const offset = options.offset || -70; // Account for navbar
      const duration = options.duration || this.config.duration * 1000;

      if (this.lenis && !this.isReducedMotion) {
        // Use Lenis smooth scrolling
        this.lenis.scrollTo(element, {
          offset,
          duration: duration / 1000,
          easing: this.config.easing,
          onComplete: options.callback
        });
      } else {
        // Fallback to native smooth scrolling
        const targetPosition = element.offsetTop + offset;
        
        window.scrollTo({
          top: targetPosition,
          behavior: this.isReducedMotion ? 'auto' : 'smooth'
        });

        if (options.callback) {
          setTimeout(options.callback, duration);
        }
      }

      // Mark performance point
      if (window.performanceMonitor) {
        window.performanceMonitor.mark?.('scroll-to-element');
      }
    } catch (error) {
      console.warn('⚠️ Scroll to element failed:', error);
    }
  }

  /**
   * Add scroll event listener
   * @param {string} name - Listener name
   * @param {Function} callback - Callback function
   */
  addScrollListener(name, callback) {
    this.scrollListeners.set(name, callback);
  }

  /**
   * Remove scroll event listener
   * @param {string} name - Listener name
   */
  removeScrollListener(name) {
    this.scrollListeners.delete(name);
  }

  /**
   * Enable smooth scrolling
   */
  enable() {
    this.isEnabled = true;
    
    if (!this.isReducedMotion && !this.lenis) {
      this.initializeLenis();
    }
  }

  /**
   * Disable smooth scrolling
   */
  disable() {
    this.isEnabled = false;
    
    if (this.lenis) {
      this.lenis.destroy();
      this.lenis = null;
    }

    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Setup fallback scrolling for when Lenis fails
   */
  setupFallbackScrolling() {
    console.log('🔄 Setting up fallback smooth scrolling...');
    
    // Use CSS scroll-behavior as fallback
    document.documentElement.style.scrollBehavior = this.isReducedMotion ? 'auto' : 'smooth';
    
    // Setup basic scroll event handling
    let ticking = false;
    
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          this.handleScroll({ scroll: window.scrollY });
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  /**
   * Get current scroll position
   * @returns {number} Current scroll position
   */
  getScrollY() {
    return this.lenis ? this.lenis.scroll : window.scrollY;
  }

  /**
   * Check if smooth scrolling is active
   * @returns {boolean} True if smooth scrolling is active
   */
  isActive() {
    return this.isEnabled && !this.isReducedMotion && !!this.lenis;
  }

  /**
   * Cleanup smooth scroll system
   */
  cleanup() {
    this.disable();
    this.scrollListeners.clear();
  }
}

// Initialize smooth scroll system when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.smoothScrollSystem = new SmoothScrollSystem({
    onScroll: (data) => {
      // Custom scroll handling for Forge EC
      if (window.forgeECApp) {
        window.forgeECApp.scrollPosition = data.scroll || window.scrollY;
      }
    }
  });
});

// Export for use in other modules
window.SmoothScrollSystem = SmoothScrollSystem;
