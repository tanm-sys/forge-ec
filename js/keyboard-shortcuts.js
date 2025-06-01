/**
 * Keyboard Shortcuts System for Forge EC Website
 * Provides comprehensive keyboard navigation and shortcuts
 */

class KeyboardShortcutSystem {
  constructor() {
    this.shortcuts = new Map();
    this.isEnabled = true;
    this.helpModalOpen = false;
    this.currentContext = 'global';
    this.contexts = new Map();
    
    this.init();
  }

  init() {
    console.log('⌨️ Initializing Keyboard Shortcut System...');
    
    // Setup global shortcuts
    this.setupGlobalShortcuts();
    
    // Setup context-specific shortcuts
    this.setupContextualShortcuts();
    
    // Setup help system
    this.setupHelpSystem();
    
    // Setup event listeners
    this.setupEventListeners();
    
    console.log('✅ Keyboard Shortcut System initialized successfully');
  }

  setupGlobalShortcuts() {
    // Navigation shortcuts
    this.registerShortcut('global', 'Alt+H', 'Go to home', () => {
      this.navigateToSection('#hero');
    });
    
    this.registerShortcut('global', 'Alt+A', 'Go to about', () => {
      this.navigateToSection('#about');
    });
    
    this.registerShortcut('global', 'Alt+D', 'Go to documentation', () => {
      this.navigateToSection('#documentation');
    });
    
    this.registerShortcut('global', 'Alt+E', 'Go to examples', () => {
      this.navigateToSection('#examples');
    });
    
    this.registerShortcut('global', 'Alt+C', 'Go to contact', () => {
      this.navigateToSection('#contact');
    });
    
    // Utility shortcuts
    this.registerShortcut('global', 'Alt+S', 'Focus search', () => {
      this.focusSearch();
    });
    
    this.registerShortcut('global', 'Alt+T', 'Toggle theme', () => {
      this.toggleTheme();
    });
    
    this.registerShortcut('global', 'Alt+M', 'Toggle mobile menu', () => {
      this.toggleMobileMenu();
    });
    
    // Accessibility shortcuts
    this.registerShortcut('global', 'Alt+1', 'Focus main content', () => {
      this.focusElement('#main-content');
    });
    
    this.registerShortcut('global', 'Alt+2', 'Focus navigation', () => {
      this.focusElement('#main-navigation');
    });
    
    this.registerShortcut('global', 'Alt+3', 'Focus footer', () => {
      this.focusElement('#footer');
    });
    
    // Help and settings
    this.registerShortcut('global', '?', 'Show keyboard shortcuts help', () => {
      this.showHelpModal();
    });
    
    this.registerShortcut('global', 'Escape', 'Close modals/menus', () => {
      this.closeAllOverlays();
    });
  }

  setupContextualShortcuts() {
    // Documentation context
    this.registerShortcut('documentation', 'J', 'Next section', () => {
      this.navigateDocumentation('next');
    });
    
    this.registerShortcut('documentation', 'K', 'Previous section', () => {
      this.navigateDocumentation('previous');
    });
    
    this.registerShortcut('documentation', 'G G', 'Go to top', () => {
      this.scrollToTop();
    });
    
    this.registerShortcut('documentation', 'G E', 'Go to end', () => {
      this.scrollToBottom();
    });
    
    // Code examples context
    this.registerShortcut('examples', 'C', 'Copy code', () => {
      this.copyCurrentCode();
    });
    
    this.registerShortcut('examples', 'R', 'Run example', () => {
      this.runCurrentExample();
    });
    
    this.registerShortcut('examples', 'F', 'Toggle fullscreen', () => {
      this.toggleCodeFullscreen();
    });
    
    // Modal context
    this.registerShortcut('modal', 'Tab', 'Next focusable element', (e) => {
      this.handleModalTabNavigation(e, 'forward');
    });
    
    this.registerShortcut('modal', 'Shift+Tab', 'Previous focusable element', (e) => {
      this.handleModalTabNavigation(e, 'backward');
    });
    
    this.registerShortcut('modal', 'Enter', 'Activate focused element', () => {
      this.activateFocusedElement();
    });
  }

  setupHelpSystem() {
    // Create help modal
    this.createHelpModal();
    
    // Setup help content
    this.updateHelpContent();
  }

  createHelpModal() {
    const modal = document.createElement('div');
    modal.id = 'keyboard-shortcuts-help';
    modal.className = 'modal keyboard-help-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-labelledby', 'help-modal-title');
    modal.setAttribute('aria-hidden', 'true');
    
    modal.innerHTML = `
      <div class="modal-overlay" aria-hidden="true"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2 id="help-modal-title">Keyboard Shortcuts</h2>
          <button class="modal-close" aria-label="Close help modal">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <div id="shortcuts-content"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" data-action="close">Close</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Setup modal event listeners
    modal.querySelector('.modal-close').addEventListener('click', () => {
      this.hideHelpModal();
    });
    
    modal.querySelector('[data-action="close"]').addEventListener('click', () => {
      this.hideHelpModal();
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.classList.contains('modal-overlay')) {
        this.hideHelpModal();
      }
    });
  }

  updateHelpContent() {
    const content = document.getElementById('shortcuts-content');
    if (!content) return;
    
    let html = '';
    
    // Group shortcuts by context
    const contextGroups = new Map();
    this.shortcuts.forEach((shortcut, key) => {
      if (!contextGroups.has(shortcut.context)) {
        contextGroups.set(shortcut.context, []);
      }
      contextGroups.get(shortcut.context).push(shortcut);
    });
    
    contextGroups.forEach((shortcuts, context) => {
      html += `
        <div class="shortcut-group">
          <h3>${this.getContextDisplayName(context)}</h3>
          <div class="shortcuts-list">
      `;
      
      shortcuts.forEach(shortcut => {
        html += `
          <div class="shortcut-item">
            <div class="shortcut-keys">
              ${this.formatShortcutKeys(shortcut.keys)}
            </div>
            <div class="shortcut-description">
              ${shortcut.description}
            </div>
          </div>
        `;
      });
      
      html += `
          </div>
        </div>
      `;
    });
    
    content.innerHTML = html;
  }

  formatShortcutKeys(keys) {
    return keys.split('+').map(key => {
      return `<kbd>${key.trim()}</kbd>`;
    }).join(' + ');
  }

  getContextDisplayName(context) {
    const displayNames = {
      'global': 'Global Shortcuts',
      'documentation': 'Documentation',
      'examples': 'Code Examples',
      'modal': 'Modal Navigation'
    };
    
    return displayNames[context] || context;
  }

  setupEventListeners() {
    let keySequence = [];
    let sequenceTimeout = null;
    
    document.addEventListener('keydown', (e) => {
      if (!this.isEnabled) return;
      
      // Build key combination string
      const modifiers = [];
      if (e.ctrlKey) modifiers.push('Ctrl');
      if (e.altKey) modifiers.push('Alt');
      if (e.shiftKey) modifiers.push('Shift');
      if (e.metaKey) modifiers.push('Meta');
      
      const key = e.key;
      const combination = [...modifiers, key].join('+');
      
      // Handle key sequences (like "G G")
      if (modifiers.length === 0 && key.length === 1) {
        keySequence.push(key.toUpperCase());
        
        // Clear sequence timeout
        if (sequenceTimeout) {
          clearTimeout(sequenceTimeout);
        }
        
        // Set new timeout
        sequenceTimeout = setTimeout(() => {
          keySequence = [];
        }, 1000);
        
        // Check for sequence matches
        const sequence = keySequence.join(' ');
        if (this.executeShortcut(sequence, e)) {
          keySequence = [];
          return;
        }
      } else {
        // Clear sequence for modifier combinations
        keySequence = [];
      }
      
      // Check for direct combination matches
      this.executeShortcut(combination, e);
    });
    
    // Context detection
    this.setupContextDetection();
  }

  setupContextDetection() {
    // Detect current context based on page section or active elements
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.id;
          this.updateContext(sectionId);
        }
      });
    }, { threshold: 0.5 });
    
    // Observe main sections
    const sections = document.querySelectorAll('section[id]');
    sections.forEach(section => observer.observe(section));
    
    // Detect modal context
    const modalObserver = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const target = mutation.target;
          if (target.classList.contains('modal')) {
            if (target.classList.contains('active') || target.classList.contains('show')) {
              this.updateContext('modal');
            } else if (this.currentContext === 'modal') {
              this.updateContext('global');
            }
          }
        }
      });
    });
    
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      modalObserver.observe(modal, { attributes: true });
    });
  }

  registerShortcut(context, keys, description, handler) {
    const shortcutKey = `${context}:${keys}`;
    this.shortcuts.set(shortcutKey, {
      context,
      keys,
      description,
      handler
    });
  }

  executeShortcut(combination, event) {
    // Try current context first
    const contextKey = `${this.currentContext}:${combination}`;
    if (this.shortcuts.has(contextKey)) {
      event.preventDefault();
      this.shortcuts.get(contextKey).handler(event);
      this.announceShortcut(this.shortcuts.get(contextKey).description);
      return true;
    }
    
    // Try global context
    const globalKey = `global:${combination}`;
    if (this.shortcuts.has(globalKey)) {
      event.preventDefault();
      this.shortcuts.get(globalKey).handler(event);
      this.announceShortcut(this.shortcuts.get(globalKey).description);
      return true;
    }
    
    return false;
  }

  updateContext(newContext) {
    if (newContext !== this.currentContext) {
      this.currentContext = newContext;
      console.log(`🎯 Context changed to: ${newContext}`);
    }
  }

  // Shortcut action implementations
  navigateToSection(selector) {
    const element = document.querySelector(selector);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      
      // Focus the section for screen readers
      if (element.tabIndex === -1) {
        element.tabIndex = -1;
      }
      element.focus();
    }
  }

  focusSearch() {
    const searchInput = document.querySelector('#search-input, [type="search"]');
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  }

  toggleTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.click();
    }
  }

  toggleMobileMenu() {
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    if (menuToggle) {
      menuToggle.click();
    }
  }

  focusElement(selector) {
    const element = document.querySelector(selector);
    if (element) {
      element.focus();
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  navigateDocumentation(direction) {
    const sections = document.querySelectorAll('.docs-section');
    const currentSection = document.querySelector('.docs-section.active');
    
    if (!currentSection || sections.length === 0) return;
    
    const currentIndex = Array.from(sections).indexOf(currentSection);
    let targetIndex;
    
    if (direction === 'next') {
      targetIndex = (currentIndex + 1) % sections.length;
    } else {
      targetIndex = (currentIndex - 1 + sections.length) % sections.length;
    }
    
    sections[targetIndex].scrollIntoView({ behavior: 'smooth' });
    sections[targetIndex].focus();
  }

  copyCurrentCode() {
    const activeCodeBlock = document.querySelector('.code-block.active, .code-block:focus-within');
    if (activeCodeBlock) {
      const code = activeCodeBlock.querySelector('code');
      if (code) {
        navigator.clipboard.writeText(code.textContent);
        this.announceShortcut('Code copied to clipboard');
      }
    }
  }

  runCurrentExample() {
    const runButton = document.querySelector('.code-block.active .run-button, .code-block:focus-within .run-button');
    if (runButton) {
      runButton.click();
    }
  }

  toggleCodeFullscreen() {
    const activeCodeBlock = document.querySelector('.code-block.active, .code-block:focus-within');
    if (activeCodeBlock) {
      activeCodeBlock.classList.toggle('fullscreen');
    }
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  scrollToBottom() {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }

  closeAllOverlays() {
    // Close modals
    const activeModals = document.querySelectorAll('.modal.active, .modal.show');
    activeModals.forEach(modal => {
      modal.classList.remove('active', 'show');
      modal.setAttribute('aria-hidden', 'true');
    });
    
    // Close dropdowns
    const openDropdowns = document.querySelectorAll('.dropdown.open');
    openDropdowns.forEach(dropdown => {
      dropdown.classList.remove('open');
    });
    
    // Close mobile menu
    const mobileMenu = document.querySelector('.mobile-menu.open');
    if (mobileMenu) {
      mobileMenu.classList.remove('open');
    }
  }

  showHelpModal() {
    const modal = document.getElementById('keyboard-shortcuts-help');
    if (modal) {
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
      
      // Focus first focusable element
      const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (firstFocusable) {
        firstFocusable.focus();
      }
      
      this.helpModalOpen = true;
    }
  }

  hideHelpModal() {
    const modal = document.getElementById('keyboard-shortcuts-help');
    if (modal) {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
      this.helpModalOpen = false;
    }
  }

  announceShortcut(description) {
    if (window.accessibilityFocusSystem) {
      window.accessibilityFocusSystem.announceToScreenReader(description);
    }
  }

  // Enable/disable shortcuts
  enable() {
    this.isEnabled = true;
  }

  disable() {
    this.isEnabled = false;
  }

  // Cleanup
  destroy() {
    this.shortcuts.clear();
    this.contexts.clear();
    
    const helpModal = document.getElementById('keyboard-shortcuts-help');
    if (helpModal) {
      helpModal.remove();
    }
  }
}

// Initialize Keyboard Shortcut System when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.keyboardShortcutSystem = new KeyboardShortcutSystem();
});

export default KeyboardShortcutSystem;
