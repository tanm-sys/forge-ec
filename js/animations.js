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
      '.counter-animate'
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
      default:
        this.animateDefault(element);
    }
  }

  getAnimationType(element) {
    if (element.classList.contains('stagger-item')) return 'stagger';
    if (element.classList.contains('reveal-mask')) return 'reveal';
    if (element.classList.contains('counter-animate')) return 'counter';
    if (element.classList.contains('typewriter')) return 'typewriter';
    return 'fadeInUp';
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
    let ticking = false;

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          this.updateScrollAnimations();
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  updateScrollAnimations() {
    const scrollY = window.scrollY;
    const windowHeight = window.innerHeight;

    // Parallax effects
    const parallaxElements = document.querySelectorAll('.parallax');
    parallaxElements.forEach(element => {
      const speed = parseFloat(element.dataset.speed) || 0.5;
      const yPos = -(scrollY * speed);
      element.style.transform = `translateY(${yPos}px)`;
    });

    // Progress bars based on scroll
    const progressBars = document.querySelectorAll('.scroll-progress');
    progressBars.forEach(bar => {
      const progress = (scrollY / (document.body.scrollHeight - windowHeight)) * 100;
      bar.style.width = `${Math.min(progress, 100)}%`;
    });
  }

  setupHoverAnimations() {
    // Magnetic hover effects
    const magneticElements = document.querySelectorAll('.magnetic');
    
    magneticElements.forEach(element => {
      element.addEventListener('mouseenter', () => {
        if (this.isReducedMotion) return;
        element.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      });

      element.addEventListener('mousemove', (e) => {
        if (this.isReducedMotion) return;
        
        const rect = element.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        
        const moveX = x * 0.1;
        const moveY = y * 0.1;
        
        element.style.transform = `translate(${moveX}px, ${moveY}px)`;
      });

      element.addEventListener('mouseleave', () => {
        element.style.transform = 'translate(0, 0)';
      });
    });

    // Tilt effects
    const tiltElements = document.querySelectorAll('.tilt');
    
    tiltElements.forEach(element => {
      element.addEventListener('mousemove', (e) => {
        if (this.isReducedMotion) return;
        
        const rect = element.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = (y - centerY) / centerY * -10;
        const rotateY = (x - centerX) / centerX * 10;
        
        element.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      });

      element.addEventListener('mouseleave', () => {
        element.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
      });
    });
  }

  setupClickAnimations() {
    // Ripple effects
    const rippleElements = document.querySelectorAll('.ripple');
    
    rippleElements.forEach(element => {
      element.addEventListener('click', (e) => {
        if (this.isReducedMotion) return;
        
        const rect = element.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const ripple = document.createElement('span');
        ripple.className = 'ripple-effect';
        ripple.style.cssText = `
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
          transform: scale(0);
          animation: ripple-animation 0.6s linear;
          left: ${x - 10}px;
          top: ${y - 10}px;
          width: 20px;
          height: 20px;
          pointer-events: none;
        `;
        
        element.appendChild(ripple);
        
        setTimeout(() => {
          ripple.remove();
        }, 600);
      });
    });

    // Button press effects
    const buttons = document.querySelectorAll('button, .btn');
    
    buttons.forEach(button => {
      button.addEventListener('mousedown', () => {
        if (this.isReducedMotion) return;
        button.style.transform = 'scale(0.95)';
      });

      button.addEventListener('mouseup', () => {
        button.style.transform = 'scale(1)';
      });

      button.addEventListener('mouseleave', () => {
        button.style.transform = 'scale(1)';
      });
    });
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
      document.documentElement.style.setProperty('--animation-duration', '0.01ms');
      document.documentElement.style.setProperty('--transition-duration', '0.01ms');
      
      // Remove animation classes
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

// CSS for ripple animation
const rippleCSS = `
  @keyframes ripple-animation {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
`;

// Inject CSS
const style = document.createElement('style');
style.textContent = rippleCSS;
document.head.appendChild(style);

// Initialize animation controller
document.addEventListener('DOMContentLoaded', () => {
  window.animationController = new AnimationController();
});

// Export for use in other modules
window.AnimationController = AnimationController;
