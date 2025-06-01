// ===== ENHANCED TRANSITIONS AND VISUAL FLUIDITY SYSTEM =====

class EnhancedTransitions {
  constructor() {
    this.currentSection = 'home';
    this.isTransitioning = false;
    this.transitionDuration = 800;
    this.progressIndicator = null;
    this.init();
  }

  init() {
    this.createProgressIndicator();
    this.setupSectionTransitions();
    this.setupEnhancedHoverEffects();
    this.setupProgressiveDisclosure();
    this.setupLoadingStates();
    this.setupVisualFeedback();
  }

  createProgressIndicator() {
    // Create navigation progress indicator
    const indicator = document.createElement('div');
    indicator.className = 'nav-progress-indicator';
    indicator.id = 'nav-progress-indicator';
    document.body.appendChild(indicator);
    this.progressIndicator = indicator;
  }

  setupSectionTransitions() {
    // Add transition classes to all sections
    const sections = document.querySelectorAll('section[id]');
    sections.forEach(section => {
      section.classList.add('section-transition', 'section-morph');
    });

    // Enhanced navigation with smooth transitions
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        this.transitionToSection(targetId);
      });
    });

    // Update active section on scroll
    this.setupScrollSectionDetection();
  }

  async transitionToSection(targetId) {
    if (this.isTransitioning || targetId === this.currentSection) return;

    this.isTransitioning = true;
    const currentSectionEl = document.getElementById(this.currentSection);
    const targetSectionEl = document.getElementById(targetId);

    if (!targetSectionEl) {
      this.isTransitioning = false;
      return;
    }

    // Mark performance point
    if (window.performanceMonitor) {
      window.performanceMonitor.mark?.('section-transition-start');
    }

    // Update progress indicator
    this.updateProgressIndicator(targetId);

    // Phase 1: Transition out current section
    if (currentSectionEl) {
      currentSectionEl.classList.add('transitioning-out');
      currentSectionEl.classList.remove('active');
    }

    // Phase 2: Smooth scroll to target using enhanced smooth scroll system
    await this.smoothScrollToElement(targetSectionEl);

    // Phase 3: Transition in new section
    targetSectionEl.classList.add('transitioning-in');

    setTimeout(() => {
      targetSectionEl.classList.remove('transitioning-in');
      targetSectionEl.classList.add('active');

      if (currentSectionEl) {
        currentSectionEl.classList.remove('transitioning-out');
      }

      this.currentSection = targetId;
      this.updateActiveNavLink(targetId);
      this.isTransitioning = false;

      // Mark performance completion
      if (window.performanceMonitor) {
        window.performanceMonitor.mark?.('section-transition-end');
        window.performanceMonitor.measure?.('section-transition', 'section-transition-start', 'section-transition-end');
      }
    }, this.transitionDuration / 2);
  }

  smoothScrollToElement(element) {
    return new Promise((resolve) => {
      // Use enhanced smooth scroll system if available
      if (window.smoothScrollSystem && window.smoothScrollSystem.isActive()) {
        window.smoothScrollSystem.scrollToElement(element, {
          offset: -70,
          duration: this.transitionDuration,
          callback: resolve
        });
        return;
      }

      // Fallback to custom smooth scrolling
      const targetPosition = element.offsetTop - 70; // Account for navbar
      const startPosition = window.pageYOffset;
      const distance = targetPosition - startPosition;
      const duration = Math.min(1000, Math.abs(distance) * 0.5);
      let start = null;

      function animation(currentTime) {
        if (start === null) start = currentTime;
        const timeElapsed = currentTime - start;
        const progress = Math.min(timeElapsed / duration, 1);

        // Easing function for smooth animation
        const ease = t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
        const run = startPosition + distance * ease(progress);

        window.scrollTo(0, run);

        if (timeElapsed < duration) {
          requestAnimationFrame(animation);
        } else {
          resolve();
        }
      }

      requestAnimationFrame(animation);
    });
  }

  updateProgressIndicator(sectionId) {
    const sections = ['home', 'features', 'about', 'docs', 'examples', 'community', 'contact'];
    const currentIndex = sections.indexOf(sectionId);
    const progress = (currentIndex / (sections.length - 1)) * 100;

    this.progressIndicator.style.width = `${progress}%`;
    this.progressIndicator.classList.add('active');

    setTimeout(() => {
      this.progressIndicator.classList.remove('active');
    }, 1000);
  }

  updateActiveNavLink(sectionId) {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${sectionId}`) {
        link.classList.add('active');
      }
    });
  }

  setupScrollSectionDetection() {
    // Register with main app's scroll system to avoid duplicate handlers
    if (window.forgeECApp) {
      // Hook into main app's scroll updates
      const originalUpdateScrollEffects = window.forgeECApp.updateScrollEffects;
      window.forgeECApp.updateScrollEffects = (scrollY, direction) => {
        originalUpdateScrollEffects.call(window.forgeECApp, scrollY, direction);
        if (!this.isTransitioning) {
          this.detectCurrentSection(scrollY, direction);
        }
      };
    } else {
      // Fallback: create own handler if main app not available
      let ticking = false;
      const scrollHandler = () => {
        if (!ticking && !this.isTransitioning) {
          requestAnimationFrame(() => {
            this.detectCurrentSection();
            ticking = false;
          });
          ticking = true;
        }
      };

      window.addEventListener('scroll', scrollHandler, { passive: true });
      this.scrollHandler = scrollHandler;
    }
  }

  detectCurrentSection(scrollY = window.scrollY, direction = 'down') {
    const sections = document.querySelectorAll('section[id]');
    if (sections.length === 0) return;

    const offset = 100;
    const windowHeight = window.innerHeight;
    let newCurrentSection = '';

    // Improved section detection with direction awareness
    for (const section of sections) {
      const rect = section.getBoundingClientRect();
      const sectionTop = rect.top + scrollY;
      const sectionBottom = sectionTop + rect.height;

      // Different logic based on scroll direction for better UX
      if (direction === 'down') {
        if (scrollY + offset >= sectionTop && scrollY + offset < sectionBottom) {
          newCurrentSection = section.id;
          break;
        }
      } else {
        // When scrolling up, activate section when it's more than 50% visible
        if (rect.top <= windowHeight * 0.5 && rect.bottom >= windowHeight * 0.5) {
          newCurrentSection = section.id;
          break;
        }
      }
    }

    // Only update if section changed to avoid unnecessary DOM updates
    if (newCurrentSection && newCurrentSection !== this.currentSection) {
      this.currentSection = newCurrentSection;
      this.updateActiveNavLink(newCurrentSection);
    }
  }

  setupEnhancedHoverEffects() {
    // Apply enhanced hover effects to cards and interactive elements
    const interactiveElements = document.querySelectorAll('.feature-card, .doc-card, .team-member');
    
    interactiveElements.forEach(element => {
      element.classList.add('enhanced-hover');
      
      // Add breathing animation to important elements
      if (element.classList.contains('feature-card')) {
        element.classList.add('breathe');
      }
    });

    // Apply liquid button effects to CTA buttons
    const ctaButtons = document.querySelectorAll('.cta-button, .btn-primary');
    ctaButtons.forEach(button => {
      button.classList.add('liquid-button');
    });
  }

  setupProgressiveDisclosure() {
    // Setup progressive disclosure for expandable content
    const disclosureTriggers = document.querySelectorAll('[data-disclosure-target]');
    
    disclosureTriggers.forEach(trigger => {
      trigger.classList.add('disclosure-trigger');
      
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = trigger.dataset.disclosureTarget;
        const targetElement = document.getElementById(targetId);
        
        if (targetElement) {
          this.toggleDisclosure(trigger, targetElement);
        }
      });
    });
  }

  toggleDisclosure(trigger, target) {
    const isExpanded = trigger.classList.contains('expanded');
    
    if (isExpanded) {
      // Collapse
      trigger.classList.remove('expanded');
      target.classList.remove('expanded');
      target.style.maxHeight = '0';
    } else {
      // Expand
      trigger.classList.add('expanded');
      target.classList.add('expanded');
      target.style.maxHeight = target.scrollHeight + 'px';
    }
  }

  setupLoadingStates() {
    // Setup skeleton loaders and progressive loading
    const loadableElements = document.querySelectorAll('[data-load-delay]');
    
    loadableElements.forEach(element => {
      const delay = parseInt(element.dataset.loadDelay) || 0;
      element.classList.add('content-placeholder');
      
      setTimeout(() => {
        element.classList.add('loaded');
      }, delay);
    });

    // Setup staggered loading for lists
    const staggerContainers = document.querySelectorAll('.stagger-container');
    staggerContainers.forEach(container => {
      const items = container.querySelectorAll('.stagger-item');
      items.forEach((item, index) => {
        item.classList.add('stagger-load');
        setTimeout(() => {
          item.classList.add('loaded');
        }, index * 100);
      });
    });
  }

  setupVisualFeedback() {
    // Setup enhanced visual feedback system
    this.createFeedbackContainer();
    
    // Add pulse rings to important buttons
    const importantButtons = document.querySelectorAll('.cta-button.primary');
    importantButtons.forEach(button => {
      button.classList.add('pulse-ring');
    });
  }

  createFeedbackContainer() {
    const container = document.createElement('div');
    container.id = 'feedback-container';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      pointer-events: none;
    `;
    document.body.appendChild(container);
  }

  showFeedback(message, type = 'success') {
    const container = document.getElementById('feedback-container');
    const feedback = document.createElement('div');
    feedback.className = `feedback-${type}`;
    feedback.textContent = message;
    feedback.style.marginBottom = '10px';
    
    container.appendChild(feedback);
    
    setTimeout(() => {
      feedback.style.opacity = '0';
      feedback.style.transform = 'translateX(100px)';
      setTimeout(() => {
        container.removeChild(feedback);
      }, 300);
    }, 3000);
  }

  // Public method to trigger section transitions programmatically
  goToSection(sectionId) {
    this.transitionToSection(sectionId);
  }

  // Public method to show feedback messages
  notify(message, type = 'success') {
    this.showFeedback(message, type);
  }
}

// Initialize enhanced transitions when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.enhancedTransitions = new EnhancedTransitions();
});
