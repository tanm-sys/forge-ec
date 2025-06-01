// ===== ADVANCED ANIMATIONS CONTROLLER =====

class AnimationController {
  constructor() {
    this.observers = new Map();
    this.animationQueue = [];
    this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.init();
  }

  init() {
    this.setupIntersectionObserver();
    this.setupScrollAnimations();
    this.setupHoverAnimations();
    this.setupClickAnimations();
    this.setupTypewriterEffects();
    this.setupCharAnimations(); // New setup call

    // Listen for reduced motion preference changes
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      this.isReducedMotion = e.matches;
      this.updateAnimationsForAccessibility();
    });
  }

  setupIntersectionObserver() {
    const observerOptions = {
      threshold: [0.1, 0.3, 0.5, 0.7, 0.9],
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.triggerAnimation(entry.target, entry.intersectionRatio);
        }
      });
    }, observerOptions);

    // Observe elements with animation classes
    const animatedElements = document.querySelectorAll([
      '.animate-on-scroll',
      '.stagger-item',
      '.reveal-mask',
      '.counter-animate',
      '.animate-title-by-char' // Add new class to observer targets
    ].join(', '));

    animatedElements.forEach(el => observer.observe(el));
    this.observers.set('scroll', observer);
  }

  triggerAnimation(element, ratio) {
    if (this.isReducedMotion) return;

    const animationType = this.getAnimationType(element);

    switch (animationType) {
      case 'fadeInUp':
        this.animateFadeInUp(element);
        break;
      case 'stagger':
        this.animateStagger(element);
        break;
      case 'reveal':
        this.animateReveal(element);
        break;
      case 'counter':
        this.animateCounter(element);
        break;
      case 'typewriter':
        this.animateTypewriter(element);
        break;
      case 'titleChars': // New animation type
        this.animateTitleChars(element);
        break;
      default:
        this.animateDefault(element);
    }
  }

  getAnimationType(element) {
    if (element.classList.contains('animate-title-by-char')) return 'titleChars'; // Check for new class first
    if (element.classList.contains('stagger-item')) return 'stagger';
    if (element.classList.contains('reveal-mask')) return 'reveal';
    if (element.classList.contains('counter-animate')) return 'counter';
    if (element.classList.contains('typewriter')) return 'typewriter';
    return 'fadeInUp';
  }

  animateTitleChars(element) {
    if (this.isReducedMotion || element.classList.contains('chars-animated')) return;
    element.classList.add('chars-animated'); // Mark as processed

    const text = element.textContent.trim();
    element.innerHTML = ''; // Clear original text

    text.split('').forEach((char, index) => {
      const span = document.createElement('span');
      span.textContent = char === ' ' ? '\u00A0' : char; // Use non-breaking space for spaces
      span.style.display = 'inline-block';
      span.style.opacity = '0';
      span.style.transform = 'translateY(20px) scale(0.8)';
      // More sophisticated animation could vary X/Y/rotation slightly
      span.style.transition = 'opacity 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      span.style.transitionDelay = `${index * 0.03}s`; // Stagger delay
      element.appendChild(span);

      // Trigger animation
      requestAnimationFrame(() => {
        requestAnimationFrame(() => { // Double rAF for some browsers to ensure transition picks up
          span.style.opacity = '1';
          span.style.transform = 'translateY(0) scale(1)';
        });
      });
    });
     // Add a class to indicate the parent has had its chars animated, for potential parent-level styling
    element.classList.add('title-chars-processed');
  }

  animateFadeInUp(element) {
    if (element.classList.contains('animated')) return;

    element.style.opacity = '0';
    element.style.transform = 'translateY(30px)';
    element.style.transition = 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

    requestAnimationFrame(() => {
      element.style.opacity = '1';
      element.style.transform = 'translateY(0)';
      element.classList.add('animated');
    });
  }

  animateStagger(element) {
    const parent = element.closest('.stagger-container') || element.parentElement;
    const items = parent.querySelectorAll('.stagger-item');

    items.forEach((item, index) => {
      if (item.classList.contains('animated')) return;

      setTimeout(() => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(30px)';
        item.style.transition = 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

        requestAnimationFrame(() => {
          item.style.opacity = '1';
          item.style.transform = 'translateY(0)';
          item.classList.add('animated');
        });
      }, index * 100);
    });
  }

  animateReveal(element) {
    if (element.classList.contains('revealed')) return;

    const content = element.querySelector('.reveal-content');
    if (!content) return;

    content.style.transform = 'translateY(100%)';
    content.style.transition = 'transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

    requestAnimationFrame(() => {
      content.style.transform = 'translateY(0)';
      element.classList.add('revealed');
    });
  }

  animateCounter(element) {
    if (element.classList.contains('counted')) return;

    const targetValue = parseInt(element.dataset.target) || 0;
    const duration = parseInt(element.dataset.duration) || 2000;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.floor(targetValue * easeOut);

      element.textContent = this.formatCounterValue(currentValue, element.dataset.format);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        element.textContent = this.formatCounterValue(targetValue, element.dataset.format);
        element.classList.add('counted');
      }
    };

    requestAnimationFrame(animate);
  }

  formatCounterValue(value, format) {
    switch (format) {
      case 'percentage':
        return value + '%';
      case 'currency':
        return '$' + value.toLocaleString();
      case 'number':
      default:
        return value.toLocaleString();
    }
  }

  animateTypewriter(element) {
    if (element.classList.contains('typed')) return;

    const text = element.textContent;
    const speed = parseInt(element.dataset.speed) || 50;

    element.textContent = '';
    element.classList.add('typing');

    let i = 0;
    const typeInterval = setInterval(() => {
      element.textContent += text.charAt(i);
      i++;

      if (i >= text.length) {
        clearInterval(typeInterval);
        element.classList.remove('typing');
        element.classList.add('typed');
      }
    }, speed);
  }

  animateDefault(element) {
    if (element.classList.contains('animated')) return;

    element.classList.add('animated');
  }

  setupScrollAnimations() {
    // Register with main app's scroll system instead of creating duplicate handler
    if (window.forgeECApp) {
      // Hook into main app's scroll updates
      const originalUpdateScrollEffects = window.forgeECApp.updateScrollEffects;
      window.forgeECApp.updateScrollEffects = (scrollY, direction) => {
        originalUpdateScrollEffects.call(window.forgeECApp, scrollY, direction);
        this.updateScrollAnimations(scrollY);
      };
    } else {
      // Fallback: create own handler if main app not available
      let ticking = false;
      const scrollHandler = () => {
        if (!ticking) {
          requestAnimationFrame(() => {
            this.updateScrollAnimations();
            ticking = false;
          });
          ticking = true;
        }
      };

      window.addEventListener('scroll', scrollHandler, { passive: true });
      this.scrollHandler = scrollHandler;
    }
  }

  updateScrollAnimations(scrollY = window.scrollY) {
    const windowHeight = window.innerHeight;

    // Skip parallax if main app handles it to avoid conflicts
    if (!window.forgeECApp || !window.forgeECApp.updateParallax) {
      // Parallax effects with performance optimization
      const parallaxElements = document.querySelectorAll('.parallax:not(.main-parallax)');
      if (parallaxElements.length > 0) {
        parallaxElements.forEach(element => {
          const speed = parseFloat(element.dataset.speed) || 0.5;
          const yPos = -(scrollY * speed);

          // Use transform3d for hardware acceleration
          element.style.transform = `translate3d(0, ${yPos}px, 0)`;

          // Add will-change for smooth scrolling
          if (!element.style.willChange) {
            element.style.willChange = 'transform';
          }
        });
      }
    }

    // Progress bars based on scroll with performance optimization
    const progressBars = document.querySelectorAll('.scroll-progress');
    if (progressBars.length > 0) {
      const maxScroll = document.body.scrollHeight - windowHeight;
      const progress = maxScroll > 0 ? (scrollY / maxScroll) * 100 : 0;
      const clampedProgress = Math.min(Math.max(progress, 0), 100);

      progressBars.forEach(bar => {
        // Use transform instead of width for better performance
        bar.style.transform = `scaleX(${clampedProgress / 100})`;
        bar.style.transformOrigin = 'left';

        if (!bar.style.willChange) {
          bar.style.willChange = 'transform';
        }
      });
    }
  }

  setupHoverAnimations() {
    // Enhanced Magnetic Interaction System
    this.setupAdvancedMagneticEffects();

    // Morphing Blob Button System
    this.setupMorphingButtons();

    // Tilt effects (existing) - Commented out as .tilt elements are not used in current HTML
    // this.setupTiltEffects();
  }

  setupAdvancedMagneticEffects() {
    const magneticElements = document.querySelectorAll('.magnetic');
    if (magneticElements.length === 0) return; // No elements to setup
    const magneticRadius = 100; // 100px magnetic field radius

    magneticElements.forEach(element => {
      // Add magnetic field indicator
      element.style.position = 'relative';
      element.style.transition = 'transform 150ms cubic-bezier(0.25, 0.46, 0.45, 0.94)';

      // Enhanced magnetic interaction
      const handleMouseMove = (e) => {
        if (this.isReducedMotion) return;

        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const deltaX = e.clientX - centerX;
        const deltaY = e.clientY - centerY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance < magneticRadius) {
          // Calculate magnetic force (stronger when closer)
          const force = Math.max(0, (magneticRadius - distance) / magneticRadius);
          const magneticStrength = force * 0.3; // Adjust magnetic strength

          const moveX = deltaX * magneticStrength;
          const moveY = deltaY * magneticStrength;

          // Apply magnetic distortion
          element.style.transform = `translate(${moveX}px, ${moveY}px) scale(${1 + force * 0.05})`;
          element.style.filter = `brightness(${1 + force * 0.2})`;

          // Add magnetic glow effect
          element.style.boxShadow = `0 0 ${force * 20}px rgba(59, 130, 246, ${force * 0.3})`;

          // Affect nearby elements
          this.applyMagneticField(element, e.clientX, e.clientY, force);
        }
      };

      const handleMouseLeave = () => {
        // Spring-back animation with physics
        element.style.transition = 'all 300ms cubic-bezier(0.34, 1.56, 0.64, 1)';
        element.style.transform = 'translate(0, 0) scale(1)';
        element.style.filter = 'brightness(1)';
        element.style.boxShadow = '';

        // Reset nearby elements
        this.resetMagneticField(element);

        // Restore normal transition after spring-back
        setTimeout(() => {
          element.style.transition = 'transform 150ms cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        }, 300);
      };

      // Use global mouse tracking for better performance
      document.addEventListener('mousemove', handleMouseMove);
      element.addEventListener('mouseleave', handleMouseLeave);

      // Store cleanup function
      element._magneticCleanup = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        element.removeEventListener('mouseleave', handleMouseLeave);
      };
    });
  }

  applyMagneticField(sourceElement, mouseX, mouseY, force) {
    // PERF: Querying all .magnetic elements on every mousemove of any magnetic element can be costly
    // if there are many such elements. Consider optimizing if performance issues arise,
    // e.g., by caching these elements or using a more spatially-aware query.
    const nearbyElements = document.querySelectorAll('.magnetic');
    const fieldRadius = 150;

    nearbyElements.forEach(element => {
      if (element === sourceElement) return;

      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = mouseX - centerX;
      const deltaY = mouseY - centerY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance < fieldRadius) {
        const fieldForce = Math.max(0, (fieldRadius - distance) / fieldRadius) * force * 0.2;
        const bendX = deltaX * fieldForce * 0.1;
        const bendY = deltaY * fieldForce * 0.1;

        element.style.transform = `translate(${bendX}px, ${bendY}px) rotate(${fieldForce * 2}deg)`;
        element.style.filter = `hue-rotate(${fieldForce * 10}deg)`;
      }
    });
  }

  resetMagneticField(sourceElement) {
    const nearbyElements = document.querySelectorAll('.magnetic');

    nearbyElements.forEach(element => {
      if (element === sourceElement) return;

      element.style.transition = 'all 200ms ease-out';
      element.style.transform = 'translate(0, 0) rotate(0deg)';
      element.style.filter = '';
    });
  }

  setupMorphingButtons() {
    const morphButtons = document.querySelectorAll('.cta-button, .btn-primary');

    morphButtons.forEach(button => {
      // Add morphing capability
      button.classList.add('morph-button');

      button.addEventListener('mouseenter', () => {
        if (this.isReducedMotion) return;

        // Transform to blob shape
        button.style.clipPath = 'polygon(20% 0%, 80% 0%, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0% 80%, 0% 20%)';
        button.style.transition = 'clip-path 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      });

      button.addEventListener('mouseleave', () => {
        // Return to rectangle
        button.style.clipPath = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';
      });

      button.addEventListener('click', (e) => {
        if (this.isReducedMotion) return;

        // Create ripple with blob deformation
        this.createBlobRipple(button, e);
      });
    });
  }

  createBlobRipple(button, event) {
    const rect = button.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Create ripple element
    const ripple = document.createElement('div');
    ripple.className = 'blob-ripple';
    ripple.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: 0;
      height: 0;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.4);
      transform: translate(-50%, -50%);
      animation: blobRipple 600ms ease-out;
      pointer-events: none;
      z-index: 1;
    `;

    button.appendChild(ripple);

    // Deform button during ripple
    button.style.clipPath = 'polygon(10% 10%, 90% 5%, 95% 90%, 5% 95%)';

    setTimeout(() => {
      ripple.remove();
      button.style.clipPath = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';
    }, 600);
  }

  setupTiltEffects() {
    // Tilt effects - Commented out as .tilt elements are not used in current HTML
    // const tiltElements = document.querySelectorAll('.tilt');
    // if (tiltElements.length > 0) {
    //   tiltElements.forEach(element => {
    //     element.addEventListener('mousemove', (e) => {
    //       if (this.isReducedMotion) return;
    //       const rect = element.getBoundingClientRect();
    //       const x = e.clientX - rect.left;
    //       const y = e.clientY - rect.top;
    //       const centerX = rect.width / 2;
    //       const centerY = rect.height / 2;
    //       const rotateX = (y - centerY) / centerY * -10;
    //       const rotateY = (x - centerX) / centerX * 10;
    //       element.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    //     });
    //     element.addEventListener('mouseleave', () => {
    //       element.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
    //     });
    //   });
    // } // else { console.log("No .tilt elements found for setupTiltEffects."); }
  }

  setupClickAnimations() {
    // Ripple effects (general .ripple class - this might be the old one, review if it's still used)
    // This will be superseded or complemented by the new quick press ripple for standard buttons.
    const rippleElements = document.querySelectorAll('.ripple');
    if (rippleElements.length > 0) {
      rippleElements.forEach(element => {
        element.addEventListener('click', (e) => {
          if (this.isReducedMotion || element.classList.contains('morph-button')) return; // Don't apply to morph buttons if they have their own
          this.createQuickRipple(element, e, 'rgba(255, 255, 255, 0.3)', 'ripple-animation'); // Default ripple
        });
      });
    } // else { console.log("No general .ripple elements found for click animations."); }

    // Button press effects (new system)
    const buttons = document.querySelectorAll('button, .btn');

    buttons.forEach(button => {
      // Skip morph buttons if they have their own complex ripple/feedback
      if (button.classList.contains('morph-button')) return;

      button.addEventListener('mousedown', (e) => {
        if (this.isReducedMotion) return;
        
        // Scale effect
        button.style.transition = 'transform 0.1s ease-out'; // Ensure quick transition for press
        button.style.transform = 'scale(0.95)';
        
        // Create and append quick press ripple
        this.createQuickRipple(button, e);
      });

      const mouseUpOrLeaveHandler = () => {
        button.style.transition = 'transform 0.15s ease-out'; // Slightly slower revert
        button.style.transform = 'scale(1)';
      };

      button.addEventListener('mouseup', mouseUpOrLeaveHandler);
      button.addEventListener('mouseleave', (e) => {
        // Only revert scale if mouse button is not pressed (e.g. dragged out while pressed)
        if (e.buttons === 0) {
          mouseUpOrLeaveHandler();
        }
      });
    });
  }

  createQuickRipple(button, event, rippleColor = 'rgba(255, 255, 255, 0.4)', animationName = 'quickPressRipple') {
    const rect = button.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Remove any existing ripples to prevent clutter if events fire rapidly
    const existingRipple = button.querySelector('.quick-press-ripple-effect, .ripple-effect');
    if (existingRipple) {
      existingRipple.remove();
    }

    const ripple = document.createElement('span');
    // Use a more specific class if 'ripple-effect' is used by the older system
    ripple.className = animationName === 'quickPressRipple' ? 'quick-press-ripple-effect' : 'ripple-effect'; 
    
    let size = Math.max(rect.width, rect.height) * 1.5; // Ripple size based on button
    if(animationName === 'ripple-animation') { // old .ripple class might expect fixed size
        size = 20; // keep old fixed size for compatibility
    }


    ripple.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: ${size}px; /* Dynamic size */
      height: ${size}px; /* Dynamic size */
      border-radius: 50%;
      background: ${rippleColor};
      transform: translate(-50%, -50%) scale(0); /* Start from center, scaled down */
      animation: ${animationName} 0.3s ease-out forwards;
      pointer-events: none;
    `;
    // Ensure button has position relative or absolute for ripple positioning
    if (getComputedStyle(button).position === 'static') {
        button.style.position = 'relative';
    }
    button.style.overflow = 'hidden'; // Contain ripple

    button.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 300); // Duration of quickPressRipple
  }


  setupTypewriterEffects() {
    const typewriterElements = document.querySelectorAll('.typewriter-auto');

    typewriterElements.forEach(element => {
      const text = element.textContent;
      const speed = parseInt(element.dataset.speed) || 100;
      const delay = parseInt(element.dataset.delay) || 0;

      setTimeout(() => {
        this.animateTypewriter(element);
      }, delay);
    });
  }

  // Method to create custom animations
  createCustomAnimation(element, keyframes, options = {}) {
    if (this.isReducedMotion) return;

    const defaultOptions = {
      duration: 1000,
      easing: 'ease-out',
      fill: 'forwards'
    };

    const animationOptions = { ...defaultOptions, ...options };

    return element.animate(keyframes, animationOptions);
  }

  // Method to animate elements in sequence
  animateSequence(elements, animationConfig) {
    if (this.isReducedMotion) return Promise.resolve();

    return elements.reduce((promise, element, index) => {
      return promise.then(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            const animation = this.createCustomAnimation(
              element,
              animationConfig.keyframes,
              animationConfig.options
            );

            if (animation) {
              animation.addEventListener('finish', resolve);
            } else {
              resolve();
            }
          }, animationConfig.delay * index);
        });
      });
    }, Promise.resolve());
  }

  // Method to update animations for accessibility
  updateAnimationsForAccessibility() {
    if (this.isReducedMotion) {
      // Disable all animations
      // NOTE: This primarily affects CSS animations/transitions that USE these variables.
      // JS-driven animations check this.isReducedMotion directly.
      // CSS keyframe animations defined in advancedAnimationsCSS do not currently use these variables.
      document.documentElement.style.setProperty('--animation-duration', '0.01ms');
      document.documentElement.style.setProperty('--transition-duration', '0.01ms');

      // Remove animation classes and set final states for common scroll animations
      const animatedElements = document.querySelectorAll('.animate-on-scroll, .stagger-item');
      animatedElements.forEach(element => {
        element.style.opacity = '1';
        element.style.transform = 'none';
      });
    } else {
      // Re-enable animations
      document.documentElement.style.removeProperty('--animation-duration');
      document.documentElement.style.removeProperty('--transition-duration');
    }
  }

  // Method to pause all animations
  pauseAnimations() {
    document.documentElement.style.animationPlayState = 'paused';
  }

  // Method to resume all animations
  resumeAnimations() {
    document.documentElement.style.animationPlayState = 'running';
  }

  // Method to cleanup observers
  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}

// CSS for advanced animations
const advancedAnimationsCSS = `
  @keyframes ripple-animation {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }

  @keyframes blobRipple {
    0% {
      width: 0;
      height: 0;
      opacity: 0.6; /* Start a bit more subtle */
    }
    70% { /* Hold opacity a bit longer, then fade fast */
      opacity: 0.2;
    }
    100% {
      width: 200px; /* Keep size, could be made dynamic in JS later */
      height: 200px;
      opacity: 0;
    }
  }

  /* Morphing button styles */
  .morph-button {
    position: relative;
    overflow: hidden;
    clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%);
    transition: clip-path 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }

  /* Enhanced magnetic effects */
  .magnetic {
    will-change: transform, filter, box-shadow;
    backface-visibility: hidden;
    transform-style: preserve-3d;
  }

  /* Volumetric shadow system */
  .volumetric-shadow {
    position: relative;
  }

  .volumetric-shadow::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: inherit;
    filter: blur(10px);
    opacity: 0.3;
    z-index: -1;
    transform: translateY(5px);
    transition: all 200ms ease-out;
  }

  .volumetric-shadow:hover::before {
    transform: translateY(10px) scale(1.05);
    opacity: 0.5;
  }

  /* Advanced glassmorphism with light streaks */
  .glass-enhanced {
    position: relative;
    overflow: hidden;
  }

  .glass-enhanced::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
      45deg,
      transparent 30%,
      rgba(255, 255, 255, 0.1) 50%,
      transparent 70%
    );
    transform: translateX(-100%) translateY(-100%) rotate(45deg);
    transition: transform 600ms ease-out;
    pointer-events: none;
  }

  .glass-enhanced:hover::before {
    transform: translateX(100%) translateY(100%) rotate(45deg);
  }

  /* Holographic rainbow edge effects */
  .holographic-border {
    position: relative;
    border-radius: inherit;
  }

  .holographic-border::after {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: linear-gradient(
      45deg,
      #ff0080, #ff8c00, #40e0d0, #ff0080
    );
    border-radius: inherit;
    z-index: -1;
    opacity: 0;
    transition: opacity 300ms ease-out;
    animation: holographicShift 3s linear infinite;
  }

  .holographic-border:hover::after {
    opacity: 0.6;
  }

  @keyframes holographicShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  /* Performance optimizations */
  .gpu-layer {
    transform: translateZ(0);
    will-change: transform;
    backface-visibility: hidden;
  }

  /* Reduced motion fallbacks */
  @media (prefers-reduced-motion: reduce) {
    .morph-button {
      clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%) !important;
    }

    .magnetic {
      transform: none !important;
      filter: none !important;
      box-shadow: none !important;
    }

    .glass-enhanced::before,
    .holographic-border::after {
      display: none;
    }
  }
`;

// Inject CSS
const style = document.createElement('style');
style.textContent = advancedAnimationsCSS;
document.head.appendChild(style);

// Initialize animation controller
document.addEventListener('DOMContentLoaded', () => {
  window.animationController = new AnimationController();
});

// Export for use in other modules
window.AnimationController = AnimationController;
