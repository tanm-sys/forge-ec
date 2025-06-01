/**
 * Micro-Interactions System using Popmotion
 * Provides smooth, performant micro-interactions and hover effects
 */

class MicroInteractionSystem {
  constructor() {
    this.isInitialized = false;
    this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.activeAnimations = new Map();
    this.hoverEffects = new Map();
    this.clickEffects = new Map();
    
    this.init();
  }

  async init() {
    try {
      console.log('✨ Initializing Micro-Interaction System...');
      
      // Load Popmotion library
      await this.loadPopmotion();
      
      // Setup interaction handlers
      this.setupHoverEffects();
      this.setupClickEffects();
      this.setupFormInteractions();
      
      // Setup reduced motion handling
      this.setupReducedMotionHandling();
      
      this.isInitialized = true;
      console.log('✅ Micro-Interaction System initialized successfully');
      
    } catch (error) {
      console.warn('⚠️ Micro-Interaction System initialization failed:', error);
      this.setupFallbackInteractions();
    }
  }

  async loadPopmotion() {
    if (window.popmotion) return;
    
    try {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/popmotion@11.0.5/dist/popmotion.global.min.js';
      
      await new Promise((resolve, reject) => {
        script.onload = () => {
          if (window.popmotion) {
            resolve();
          } else {
            reject(new Error('Popmotion not available after loading'));
          }
        };
        script.onerror = reject;
        document.head.appendChild(script);
      });
      
    } catch (error) {
      throw new Error('Failed to load Popmotion library');
    }
  }

  setupHoverEffects() {
    // Magnetic hover effect for buttons
    this.setupMagneticHover();
    
    // Scale hover effect for cards
    this.setupScaleHover();
    
    // Glow hover effect for interactive elements
    this.setupGlowHover();
  }

  setupMagneticHover() {
    const magneticElements = document.querySelectorAll('.magnetic-hover, .btn-primary, .btn-secondary');
    
    magneticElements.forEach(element => {
      let isHovering = false;
      
      const handleMouseMove = (e) => {
        if (this.isReducedMotion || !isHovering) return;
        
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const deltaX = (e.clientX - centerX) * 0.3;
        const deltaY = (e.clientY - centerY) * 0.3;
        
        // Stop any existing animation
        if (this.activeAnimations.has(element)) {
          this.activeAnimations.get(element).stop();
        }
        
        // Create smooth magnetic animation
        if (window.popmotion) {
          const animation = window.popmotion.animate({
            from: {
              x: parseFloat(element.style.transform?.match(/translateX\(([^)]+)\)/)?.[1] || 0),
              y: parseFloat(element.style.transform?.match(/translateY\(([^)]+)\)/)?.[1] || 0)
            },
            to: { x: deltaX, y: deltaY },
            duration: 300,
            ease: window.popmotion.easeOut,
            onUpdate: ({ x, y }) => {
              element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
            }
          });
          
          this.activeAnimations.set(element, animation);
        }
      };
      
      const handleMouseEnter = () => {
        isHovering = true;
        element.addEventListener('mousemove', handleMouseMove);
      };
      
      const handleMouseLeave = () => {
        isHovering = false;
        element.removeEventListener('mousemove', handleMouseMove);
        
        // Return to original position
        if (!this.isReducedMotion && window.popmotion) {
          const animation = window.popmotion.animate({
            from: {
              x: parseFloat(element.style.transform?.match(/translateX\(([^)]+)\)/)?.[1] || 0),
              y: parseFloat(element.style.transform?.match(/translateY\(([^)]+)\)/)?.[1] || 0)
            },
            to: { x: 0, y: 0 },
            duration: 500,
            ease: window.popmotion.easeOut,
            onUpdate: ({ x, y }) => {
              element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
            }
          });
          
          this.activeAnimations.set(element, animation);
        }
      };
      
      element.addEventListener('mouseenter', handleMouseEnter);
      element.addEventListener('mouseleave', handleMouseLeave);
      
      this.hoverEffects.set(element, { handleMouseEnter, handleMouseLeave, handleMouseMove });
    });
  }

  setupScaleHover() {
    const scaleElements = document.querySelectorAll('.scale-hover, .card, .feature-card');
    
    scaleElements.forEach(element => {
      const handleMouseEnter = () => {
        if (this.isReducedMotion || !window.popmotion) return;
        
        const animation = window.popmotion.animate({
          from: 1,
          to: 1.05,
          duration: 300,
          ease: window.popmotion.easeOut,
          onUpdate: (scale) => {
            element.style.transform = `scale(${scale})`;
          }
        });
        
        this.activeAnimations.set(element, animation);
      };
      
      const handleMouseLeave = () => {
        if (this.isReducedMotion || !window.popmotion) return;
        
        const animation = window.popmotion.animate({
          from: 1.05,
          to: 1,
          duration: 300,
          ease: window.popmotion.easeOut,
          onUpdate: (scale) => {
            element.style.transform = `scale(${scale})`;
          }
        });
        
        this.activeAnimations.set(element, animation);
      };
      
      element.addEventListener('mouseenter', handleMouseEnter);
      element.addEventListener('mouseleave', handleMouseLeave);
      
      this.hoverEffects.set(element, { handleMouseEnter, handleMouseLeave });
    });
  }

  setupGlowHover() {
    const glowElements = document.querySelectorAll('.glow-hover, .code-block, .nav-link');
    
    glowElements.forEach(element => {
      const handleMouseEnter = () => {
        if (this.isReducedMotion || !window.popmotion) return;
        
        const animation = window.popmotion.animate({
          from: 0,
          to: 1,
          duration: 400,
          ease: window.popmotion.easeOut,
          onUpdate: (intensity) => {
            const glowColor = getComputedStyle(element).getPropertyValue('--glow-color') || '#3b82f6';
            element.style.boxShadow = `0 0 ${intensity * 20}px ${glowColor}${Math.round(intensity * 255).toString(16).padStart(2, '0')}`;
          }
        });
        
        this.activeAnimations.set(element, animation);
      };
      
      const handleMouseLeave = () => {
        if (this.isReducedMotion || !window.popmotion) return;
        
        const animation = window.popmotion.animate({
          from: 1,
          to: 0,
          duration: 400,
          ease: window.popmotion.easeOut,
          onUpdate: (intensity) => {
            const glowColor = getComputedStyle(element).getPropertyValue('--glow-color') || '#3b82f6';
            element.style.boxShadow = `0 0 ${intensity * 20}px ${glowColor}${Math.round(intensity * 255).toString(16).padStart(2, '0')}`;
          }
        });
        
        this.activeAnimations.set(element, animation);
      };
      
      element.addEventListener('mouseenter', handleMouseEnter);
      element.addEventListener('mouseleave', handleMouseLeave);
      
      this.hoverEffects.set(element, { handleMouseEnter, handleMouseLeave });
    });
  }

  setupClickEffects() {
    const clickElements = document.querySelectorAll('button, .btn, .clickable');
    
    clickElements.forEach(element => {
      const handleClick = (e) => {
        if (this.isReducedMotion || !window.popmotion) return;
        
        // Ripple effect
        this.createRippleEffect(element, e);
        
        // Scale feedback
        const animation = window.popmotion.animate({
          from: 1,
          to: 0.95,
          duration: 150,
          ease: window.popmotion.easeOut,
          onUpdate: (scale) => {
            element.style.transform = `scale(${scale})`;
          },
          onComplete: () => {
            window.popmotion.animate({
              from: 0.95,
              to: 1,
              duration: 150,
              ease: window.popmotion.easeOut,
              onUpdate: (scale) => {
                element.style.transform = `scale(${scale})`;
              }
            });
          }
        });
        
        this.activeAnimations.set(element, animation);
      };
      
      element.addEventListener('click', handleClick);
      this.clickEffects.set(element, handleClick);
    });
  }

  createRippleEffect(element, event) {
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    const ripple = document.createElement('div');
    ripple.style.cssText = `
      position: absolute;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.3);
      pointer-events: none;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      transform: scale(0);
      z-index: 1000;
    `;
    
    element.style.position = 'relative';
    element.style.overflow = 'hidden';
    element.appendChild(ripple);
    
    if (window.popmotion) {
      window.popmotion.animate({
        from: 0,
        to: 1,
        duration: 600,
        ease: window.popmotion.easeOut,
        onUpdate: (scale) => {
          ripple.style.transform = `scale(${scale})`;
          ripple.style.opacity = 1 - scale;
        },
        onComplete: () => {
          ripple.remove();
        }
      });
    }
  }

  setupFormInteractions() {
    const formInputs = document.querySelectorAll('input, textarea, select');
    
    formInputs.forEach(input => {
      const handleFocus = () => {
        if (this.isReducedMotion || !window.popmotion) return;
        
        const label = input.parentElement.querySelector('label');
        if (label) {
          window.popmotion.animate({
            from: 1,
            to: 0.9,
            duration: 200,
            ease: window.popmotion.easeOut,
            onUpdate: (scale) => {
              label.style.transform = `scale(${scale}) translateY(-10px)`;
            }
          });
        }
      };
      
      const handleBlur = () => {
        if (this.isReducedMotion || input.value || !window.popmotion) return;
        
        const label = input.parentElement.querySelector('label');
        if (label) {
          window.popmotion.animate({
            from: 0.9,
            to: 1,
            duration: 200,
            ease: window.popmotion.easeOut,
            onUpdate: (scale) => {
              label.style.transform = `scale(${scale}) translateY(0)`;
            }
          });
        }
      };
      
      input.addEventListener('focus', handleFocus);
      input.addEventListener('blur', handleBlur);
    });
  }

  setupReducedMotionHandling() {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleReducedMotion = (e) => {
      this.isReducedMotion = e.matches;
      
      if (this.isReducedMotion) {
        this.stopAllAnimations();
      }
    };
    
    mediaQuery.addEventListener('change', handleReducedMotion);
    handleReducedMotion(mediaQuery);
  }

  stopAllAnimations() {
    this.activeAnimations.forEach(animation => {
      if (animation && animation.stop) {
        animation.stop();
      }
    });
    this.activeAnimations.clear();
  }

  setupFallbackInteractions() {
    console.log('🔄 Setting up fallback micro-interactions...');
    
    // Use CSS transitions as fallback
    document.documentElement.classList.add('popmotion-fallback');
  }

  // Cleanup
  destroy() {
    this.stopAllAnimations();
    
    // Remove event listeners
    this.hoverEffects.forEach((handlers, element) => {
      Object.values(handlers).forEach(handler => {
        element.removeEventListener('mouseenter', handler);
        element.removeEventListener('mouseleave', handler);
        element.removeEventListener('mousemove', handler);
      });
    });
    
    this.clickEffects.forEach((handler, element) => {
      element.removeEventListener('click', handler);
    });
    
    this.hoverEffects.clear();
    this.clickEffects.clear();
  }
}

// Initialize Micro-Interaction System when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.microInteractionSystem = new MicroInteractionSystem();
});

export default MicroInteractionSystem;
