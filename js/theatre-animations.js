/**
 * Theatre.js Animation System for Forge EC Website
 * Provides complex, timeline-based animations while maintaining 60fps performance
 */

class TheatreAnimationSystem {
  constructor() {
    this.isInitialized = false;
    this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.project = null;
    this.sheets = new Map();
    this.activeAnimations = new Set();
    this.performanceMonitor = window.performanceMonitor;
    
    this.init();
  }

  async init() {
    try {
      console.log('🎭 Initializing Theatre.js Animation System...');
      
      // Load Theatre.js libraries
      await this.loadTheatreLibraries();
      
      // Initialize Theatre project
      this.initializeProject();
      
      // Setup animation sheets
      this.setupAnimationSheets();
      
      // Setup performance monitoring
      this.setupPerformanceMonitoring();
      
      // Setup reduced motion handling
      this.setupReducedMotionHandling();
      
      this.isInitialized = true;
      console.log('✅ Theatre.js Animation System initialized successfully');
      
    } catch (error) {
      console.warn('⚠️ Theatre.js initialization failed:', error);
      this.setupFallbackAnimations();
    }
  }

  async loadTheatreLibraries() {
    if (window.theatre) return;
    
    try {
      // Load Theatre.js core
      const coreScript = document.createElement('script');
      coreScript.src = 'https://unpkg.com/@theatre/core@0.5.1/dist/index.js';
      coreScript.type = 'module';
      
      await new Promise((resolve, reject) => {
        coreScript.onload = resolve;
        coreScript.onerror = reject;
        document.head.appendChild(coreScript);
      });
      
    } catch (error) {
      throw new Error('Failed to load Theatre.js libraries');
    }
  }

  initializeProject() {
    if (!window.theatre) {
      throw new Error('Theatre.js not available');
    }
    
    this.project = window.theatre.getProject('Forge EC Animations', {
      state: this.getProjectState()
    });
  }

  getProjectState() {
    // Load saved animation state from localStorage
    const savedState = localStorage.getItem('theatre-forge-ec-state');
    return savedState ? JSON.parse(savedState) : {};
  }

  setupAnimationSheets() {
    // Hero section animations
    this.createHeroAnimations();
    
    // Feature cards animations
    this.createFeatureAnimations();
    
    // Code examples animations
    this.createCodeAnimations();
  }

  createHeroAnimations() {
    const heroSheet = this.project.sheet('Hero Section');
    this.sheets.set('hero', heroSheet);
    
    // Hero title animation
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
      const titleObject = heroSheet.object('Hero Title', {
        opacity: 0,
        y: 50,
        scale: 0.9,
        rotation: 0
      });
      
      titleObject.onValuesChange((values) => {
        if (this.isReducedMotion) return;
        
        heroTitle.style.opacity = values.opacity;
        heroTitle.style.transform = `
          translateY(${values.y}px) 
          scale(${values.scale}) 
          rotate(${values.rotation}deg)
        `;
      });
    }
  }

  createFeatureAnimations() {
    const featureSheet = this.project.sheet('Features');
    this.sheets.set('features', featureSheet);
    
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach((card, index) => {
      const cardObject = featureSheet.object(`Feature Card ${index}`, {
        opacity: 0,
        y: 100,
        rotation: 0,
        scale: 0.8
      });
      
      cardObject.onValuesChange((values) => {
        if (this.isReducedMotion) return;
        
        card.style.opacity = values.opacity;
        card.style.transform = `
          translateY(${values.y}px) 
          rotate(${values.rotation}deg) 
          scale(${values.scale})
        `;
      });
    });
  }

  createCodeAnimations() {
    const codeSheet = this.project.sheet('Code Examples');
    this.sheets.set('code', codeSheet);
    
    const codeBlocks = document.querySelectorAll('.code-block');
    codeBlocks.forEach((block, index) => {
      const blockObject = codeSheet.object(`Code Block ${index}`, {
        opacity: 0,
        x: -50,
        glowIntensity: 0
      });
      
      blockObject.onValuesChange((values) => {
        if (this.isReducedMotion) return;
        
        block.style.opacity = values.opacity;
        block.style.transform = `translateX(${values.x}px)`;
        block.style.boxShadow = `0 0 ${values.glowIntensity * 20}px rgba(59, 130, 246, ${values.glowIntensity})`;
      });
    });
  }

  setupPerformanceMonitoring() {
    if (!this.performanceMonitor) return;
    
    // Monitor animation frame rate
    let frameCount = 0;
    let lastTime = performance.now();
    
    const monitorFrameRate = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        
        if (fps < 55) {
          console.warn(`⚠️ Animation FPS dropped to ${fps}`);
          this.optimizeAnimations();
        }
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      if (this.activeAnimations.size > 0) {
        requestAnimationFrame(monitorFrameRate);
      }
    };
    
    requestAnimationFrame(monitorFrameRate);
  }

  optimizeAnimations() {
    // Reduce animation complexity if performance drops
    console.log('🔧 Optimizing animations for better performance...');
    
    // Disable blur effects
    document.documentElement.style.setProperty('--animation-blur', '0px');
  }

  setupReducedMotionHandling() {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleReducedMotion = (e) => {
      this.isReducedMotion = e.matches;
      
      if (this.isReducedMotion) {
        this.pauseAllAnimations();
      }
    };
    
    mediaQuery.addEventListener('change', handleReducedMotion);
    handleReducedMotion(mediaQuery);
  }

  pauseAllAnimations() {
    this.sheets.forEach(sheet => {
      if (sheet.sequence) {
        sheet.sequence.pause();
      }
    });
  }

  setupFallbackAnimations() {
    console.log('🔄 Setting up fallback animations...');
    
    // Use CSS animations as fallback
    document.documentElement.classList.add('theatre-fallback');
  }

  // Cleanup
  destroy() {
    this.pauseAllAnimations();
    this.sheets.clear();
    this.activeAnimations.clear();
    
    if (this.project) {
      this.project.destroy();
    }
  }
}

// Initialize Theatre.js system when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.theatreAnimationSystem = new TheatreAnimationSystem();
});

export default TheatreAnimationSystem;
