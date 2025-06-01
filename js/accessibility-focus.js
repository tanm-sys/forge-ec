/**
 * Accessibility Focus Management System
 * Implements focus-trap and WCAG 2.1 AA compliance features
 */

class AccessibilityFocusSystem {
  constructor() {
    this.isInitialized = false;
    this.focusTraps = new Map();
    this.focusHistory = [];
    this.announcements = [];
    this.skipLinks = new Map();
    
    this.init();
  }

  async init() {
    try {
      console.log('♿ Initializing Accessibility Focus System...');
      
      // Load focus-trap library
      await this.loadFocusTrap();
      
      // Setup focus management
      this.setupFocusTraps();
      this.setupSkipLinks();
      this.setupKeyboardNavigation();
      this.setupScreenReaderSupport();
      this.setupFocusIndicators();
      
      // Setup ARIA live regions
      this.setupLiveRegions();
      
      this.isInitialized = true;
      console.log('✅ Accessibility Focus System initialized successfully');
      
    } catch (error) {
      console.warn('⚠️ Accessibility Focus System initialization failed:', error);
      this.setupFallbackAccessibility();
    }
  }

  async loadFocusTrap() {
    if (window.focusTrap) return;
    
    try {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/focus-trap@7.5.4/dist/focus-trap.umd.js';
      
      await new Promise((resolve, reject) => {
        script.onload = () => {
          if (window.focusTrap) {
            resolve();
          } else {
            reject(new Error('focus-trap not available after loading'));
          }
        };
        script.onerror = reject;
        document.head.appendChild(script);
      });
      
    } catch (error) {
      throw new Error('Failed to load focus-trap library');
    }
  }

  setupFocusTraps() {
    // Modal focus traps
    this.setupModalFocusTraps();
    
    // Navigation focus traps
    this.setupNavigationFocusTraps();
    
    // Form focus traps
    this.setupFormFocusTraps();
  }

  setupModalFocusTraps() {
    const modals = document.querySelectorAll('.modal, [role="dialog"]');
    
    modals.forEach(modal => {
      const trap = window.focusTrap.createFocusTrap(modal, {
        onActivate: () => {
          this.saveCurrentFocus();
          this.announceToScreenReader(`Dialog opened: ${this.getModalTitle(modal)}`);
        },
        onDeactivate: () => {
          this.restorePreviousFocus();
          this.announceToScreenReader('Dialog closed');
        },
        clickOutsideDeactivates: true,
        escapeDeactivates: true,
        returnFocusOnDeactivate: true,
        allowOutsideClick: (event) => {
          // Allow clicks on overlay to close modal
          return event.target === modal;
        }
      });
      
      this.focusTraps.set(modal, trap);
      
      // Setup modal event listeners
      this.setupModalEventListeners(modal, trap);
    });
  }

  setupModalEventListeners(modal, trap) {
    // Activate trap when modal is shown
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          if (modal.classList.contains('active') || modal.classList.contains('show')) {
            trap.activate();
          } else {
            trap.deactivate();
          }
        }
      });
    });
    
    observer.observe(modal, { attributes: true });
    
    // Handle escape key
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        trap.deactivate();
        this.closeModal(modal);
      }
    });
  }

  setupNavigationFocusTraps() {
    const navMenus = document.querySelectorAll('.nav-menu, [role="menu"]');
    
    navMenus.forEach(menu => {
      const trap = window.focusTrap.createFocusTrap(menu, {
        onActivate: () => {
          this.saveCurrentFocus();
          this.announceToScreenReader('Navigation menu opened');
        },
        onDeactivate: () => {
          this.restorePreviousFocus();
          this.announceToScreenReader('Navigation menu closed');
        },
        escapeDeactivates: true,
        clickOutsideDeactivates: true
      });
      
      this.focusTraps.set(menu, trap);
      
      // Setup menu toggle
      const menuToggle = document.querySelector(`[aria-controls="${menu.id}"]`);
      if (menuToggle) {
        menuToggle.addEventListener('click', () => {
          const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
          
          if (isExpanded) {
            trap.deactivate();
          } else {
            trap.activate();
          }
        });
      }
    });
  }

  setupFormFocusTraps() {
    const forms = document.querySelectorAll('form[data-focus-trap]');
    
    forms.forEach(form => {
      const trap = window.focusTrap.createFocusTrap(form, {
        escapeDeactivates: false,
        clickOutsideDeactivates: false,
        returnFocusOnDeactivate: false
      });
      
      this.focusTraps.set(form, trap);
      
      // Activate on form focus
      form.addEventListener('focusin', () => {
        if (!trap.active) {
          trap.activate();
        }
      });
      
      // Deactivate on form submission or cancel
      form.addEventListener('submit', () => {
        trap.deactivate();
      });
      
      const cancelButton = form.querySelector('[data-cancel]');
      if (cancelButton) {
        cancelButton.addEventListener('click', () => {
          trap.deactivate();
        });
      }
    });
  }

  setupSkipLinks() {
    // Create skip links container
    const skipLinksContainer = document.createElement('div');
    skipLinksContainer.className = 'skip-links';
    skipLinksContainer.setAttribute('aria-label', 'Skip navigation links');
    
    // Main content skip link
    const skipToMain = this.createSkipLink('Skip to main content', '#main-content');
    skipLinksContainer.appendChild(skipToMain);
    
    // Navigation skip link
    const skipToNav = this.createSkipLink('Skip to navigation', '#main-navigation');
    skipLinksContainer.appendChild(skipToNav);
    
    // Footer skip link
    const skipToFooter = this.createSkipLink('Skip to footer', '#footer');
    skipLinksContainer.appendChild(skipToFooter);
    
    // Insert at the beginning of body
    document.body.insertBefore(skipLinksContainer, document.body.firstChild);
  }

  createSkipLink(text, target) {
    const link = document.createElement('a');
    link.href = target;
    link.textContent = text;
    link.className = 'skip-link';
    
    // Style skip link
    link.style.cssText = `
      position: absolute;
      top: -40px;
      left: 6px;
      background: var(--color-primary);
      color: white;
      padding: 8px;
      text-decoration: none;
      border-radius: 4px;
      z-index: 10000;
      transition: top 0.3s;
    `;
    
    // Show on focus
    link.addEventListener('focus', () => {
      link.style.top = '6px';
    });
    
    link.addEventListener('blur', () => {
      link.style.top = '-40px';
    });
    
    // Handle click
    link.addEventListener('click', (e) => {
      e.preventDefault();
      this.focusElement(target);
    });
    
    this.skipLinks.set(target, link);
    return link;
  }

  setupKeyboardNavigation() {
    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Alt + M: Focus main content
      if (e.altKey && e.key === 'm') {
        e.preventDefault();
        this.focusElement('#main-content');
        this.announceToScreenReader('Focused main content');
      }
      
      // Alt + N: Focus navigation
      if (e.altKey && e.key === 'n') {
        e.preventDefault();
        this.focusElement('#main-navigation');
        this.announceToScreenReader('Focused navigation');
      }
      
      // Alt + S: Focus search
      if (e.altKey && e.key === 's') {
        e.preventDefault();
        this.focusElement('#search-input');
        this.announceToScreenReader('Focused search');
      }
      
      // Escape: Close any open modals or menus
      if (e.key === 'Escape') {
        this.closeAllModalsAndMenus();
      }
    });
    
    // Arrow key navigation for menus
    this.setupArrowKeyNavigation();
  }

  setupArrowKeyNavigation() {
    const menus = document.querySelectorAll('[role="menu"], .nav-menu');
    
    menus.forEach(menu => {
      menu.addEventListener('keydown', (e) => {
        const menuItems = menu.querySelectorAll('[role="menuitem"], .nav-link');
        const currentIndex = Array.from(menuItems).indexOf(document.activeElement);
        
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            const nextIndex = (currentIndex + 1) % menuItems.length;
            menuItems[nextIndex].focus();
            break;
            
          case 'ArrowUp':
            e.preventDefault();
            const prevIndex = (currentIndex - 1 + menuItems.length) % menuItems.length;
            menuItems[prevIndex].focus();
            break;
            
          case 'Home':
            e.preventDefault();
            menuItems[0].focus();
            break;
            
          case 'End':
            e.preventDefault();
            menuItems[menuItems.length - 1].focus();
            break;
        }
      });
    });
  }

  setupScreenReaderSupport() {
    // Setup ARIA live regions for announcements
    this.createLiveRegion('polite');
    this.createLiveRegion('assertive');
    
    // Setup dynamic content announcements
    this.setupDynamicContentAnnouncements();
    
    // Setup form validation announcements
    this.setupFormValidationAnnouncements();
  }

  createLiveRegion(politeness) {
    const liveRegion = document.createElement('div');
    liveRegion.id = `live-region-${politeness}`;
    liveRegion.setAttribute('aria-live', politeness);
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
    
    document.body.appendChild(liveRegion);
    return liveRegion;
  }

  setupLiveRegions() {
    // Create announcement queue processor
    setInterval(() => {
      if (this.announcements.length > 0) {
        const announcement = this.announcements.shift();
        this.processAnnouncement(announcement);
      }
    }, 1000);
  }

  announceToScreenReader(message, priority = 'polite') {
    this.announcements.push({ message, priority, timestamp: Date.now() });
  }

  processAnnouncement(announcement) {
    const liveRegion = document.getElementById(`live-region-${announcement.priority}`);
    if (liveRegion) {
      liveRegion.textContent = announcement.message;
      
      // Clear after announcement
      setTimeout(() => {
        liveRegion.textContent = '';
      }, 1000);
    }
  }

  setupDynamicContentAnnouncements() {
    // Observe dynamic content changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const announcement = node.getAttribute('data-announce');
              if (announcement) {
                this.announceToScreenReader(announcement);
              }
            }
          });
        }
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
  }

  setupFormValidationAnnouncements() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
      form.addEventListener('submit', (e) => {
        const invalidFields = form.querySelectorAll(':invalid');
        
        if (invalidFields.length > 0) {
          e.preventDefault();
          this.announceToScreenReader(`Form has ${invalidFields.length} validation errors`, 'assertive');
          invalidFields[0].focus();
        }
      });
      
      // Real-time validation announcements
      const inputs = form.querySelectorAll('input, textarea, select');
      inputs.forEach(input => {
        input.addEventListener('invalid', () => {
          const errorMessage = input.validationMessage || 'Invalid input';
          this.announceToScreenReader(errorMessage, 'assertive');
        });
      });
    });
  }

  setupFocusIndicators() {
    // Enhanced focus indicators
    const style = document.createElement('style');
    style.textContent = `
      .focus-visible {
        outline: 3px solid var(--color-primary);
        outline-offset: 2px;
        border-radius: 4px;
      }
      
      .skip-link:focus {
        outline: 3px solid #ffffff;
        outline-offset: 2px;
      }
      
      [data-focus-trap] *:focus {
        outline: 2px solid var(--color-accent);
        outline-offset: 1px;
      }
    `;
    
    document.head.appendChild(style);
    
    // Add focus-visible polyfill behavior
    document.addEventListener('keydown', () => {
      document.body.classList.add('using-keyboard');
    });
    
    document.addEventListener('mousedown', () => {
      document.body.classList.remove('using-keyboard');
    });
  }

  // Utility methods
  saveCurrentFocus() {
    this.focusHistory.push(document.activeElement);
  }

  restorePreviousFocus() {
    const previousFocus = this.focusHistory.pop();
    if (previousFocus && previousFocus.focus) {
      previousFocus.focus();
    }
  }

  focusElement(selector) {
    const element = document.querySelector(selector);
    if (element) {
      element.focus();
      
      // Ensure element is visible
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  getModalTitle(modal) {
    const title = modal.querySelector('h1, h2, h3, [role="heading"]');
    return title ? title.textContent.trim() : 'Modal dialog';
  }

  closeModal(modal) {
    modal.classList.remove('active', 'show');
    modal.setAttribute('aria-hidden', 'true');
  }

  closeAllModalsAndMenus() {
    // Close all active focus traps
    this.focusTraps.forEach((trap, element) => {
      if (trap.active) {
        trap.deactivate();
      }
    });
    
    // Close modals
    const activeModals = document.querySelectorAll('.modal.active, .modal.show');
    activeModals.forEach(modal => this.closeModal(modal));
    
    // Close menus
    const openMenus = document.querySelectorAll('[aria-expanded="true"]');
    openMenus.forEach(menu => {
      menu.setAttribute('aria-expanded', 'false');
    });
  }

  setupFallbackAccessibility() {
    console.log('🔄 Setting up fallback accessibility features...');
    
    // Basic keyboard navigation without focus-trap
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllModalsAndMenus();
      }
    });
  }

  // Cleanup
  destroy() {
    this.focusTraps.forEach(trap => {
      if (trap.active) {
        trap.deactivate();
      }
    });
    
    this.focusTraps.clear();
    this.focusHistory = [];
    this.announcements = [];
  }
}

// Initialize Accessibility Focus System when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.accessibilityFocusSystem = new AccessibilityFocusSystem();
});

export default AccessibilityFocusSystem;
