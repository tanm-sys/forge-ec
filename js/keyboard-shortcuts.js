/**
 * Keyboard Shortcuts System
 * Provides comprehensive keyboard navigation and shortcuts
 */

class KeyboardShortcutSystem {
  constructor() {
    this.shortcuts = new Map();
    this.isHelpModalOpen = false;
    this.helpModal = null;
    
    this.init();
  }

  init() {
    console.log('⌨️ Initializing Keyboard Shortcut System...');
    
    this.registerShortcuts();
    this.createHelpModal();
    this.setupEventListeners();
    
    console.log('✅ Keyboard Shortcut System initialized');
  }

  registerShortcuts() {
    // Navigation shortcuts
    this.addShortcut('Alt+H', 'Go to Home', () => this.navigateToSection('home'));
    this.addShortcut('Alt+F', 'Go to Features', () => this.navigateToSection('features'));
    this.addShortcut('Alt+A', 'Go to About', () => this.navigateToSection('about'));
    this.addShortcut('Alt+D', 'Go to Documentation', () => this.navigateToSection('docs'));
    this.addShortcut('Alt+E', 'Go to Examples', () => this.navigateToSection('examples'));
    this.addShortcut('Alt+C', 'Go to Contact', () => this.navigateToSection('contact'));
    
    // Utility shortcuts
    this.addShortcut('Alt+T', 'Toggle Theme', () => this.toggleTheme());
    this.addShortcut('Alt+S', 'Focus Search', () => this.focusSearch());
    this.addShortcut('Alt+M', 'Focus Main Content', () => this.focusMainContent());
    this.addShortcut('Alt+N', 'Focus Navigation', () => this.focusNavigation());
    
    // Help and accessibility
    this.addShortcut('Alt+?', 'Show Keyboard Shortcuts', () => this.showHelp());
    this.addShortcut('Escape', 'Close Modal/Menu', () => this.closeActiveModal());
    
    // Developer shortcuts
    this.addShortcut('Alt+Shift+D', 'Toggle Debug Mode', () => this.toggleDebugMode());
    this.addShortcut('Alt+Shift+P', 'Show Performance Stats', () => this.showPerformanceStats());
  }

  addShortcut(keys, description, action) {
    this.shortcuts.set(keys, { description, action });
  }

  setupEventListeners() {
    document.addEventListener('keydown', (e) => {
      const keyCombo = this.getKeyCombo(e);
      
      if (this.shortcuts.has(keyCombo)) {
        e.preventDefault();
        const shortcut = this.shortcuts.get(keyCombo);
        shortcut.action();
        
        // Announce to screen reader
        if (window.accessibilityFocusSystem) {
          window.accessibilityFocusSystem.announceToScreenReader(
            `Keyboard shortcut activated: ${shortcut.description}`
          );
        }
      }
    });
  }

  getKeyCombo(event) {
    const parts = [];
    
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');
    if (event.metaKey) parts.push('Meta');
    
    // Handle special keys
    let key = event.key;
    if (key === ' ') key = 'Space';
    if (key === 'ArrowUp') key = 'Up';
    if (key === 'ArrowDown') key = 'Down';
    if (key === 'ArrowLeft') key = 'Left';
    if (key === 'ArrowRight') key = 'Right';
    
    parts.push(key);
    
    return parts.join('+');
  }

  // Navigation actions
  navigateToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      // Update active nav link
      this.updateActiveNavLink(sectionId);
      
      // Focus the section for screen readers
      section.setAttribute('tabindex', '-1');
      section.focus();
      
      // Remove tabindex after focus
      setTimeout(() => {
        section.removeAttribute('tabindex');
      }, 100);
    }
  }

  updateActiveNavLink(sectionId) {
    // Remove active class from all nav links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
    });
    
    // Add active class to current section link
    const activeLink = document.querySelector(`[data-section="${sectionId}"]`);
    if (activeLink) {
      activeLink.classList.add('active');
    }
  }

  toggleTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.click();
    }
  }

  focusSearch() {
    const searchInput = document.querySelector('input[type="search"], .search-input');
    if (searchInput) {
      searchInput.focus();
    } else {
      // If no search input exists, announce that
      if (window.accessibilityFocusSystem) {
        window.accessibilityFocusSystem.announceToScreenReader('No search input available');
      }
    }
  }

  focusMainContent() {
    const mainContent = document.querySelector('main, #main-content, .main-content');
    if (mainContent) {
      mainContent.setAttribute('tabindex', '-1');
      mainContent.focus();
      setTimeout(() => mainContent.removeAttribute('tabindex'), 100);
    }
  }

  focusNavigation() {
    const navigation = document.querySelector('nav, #main-navigation, .navbar');
    if (navigation) {
      const firstLink = navigation.querySelector('a, button');
      if (firstLink) {
        firstLink.focus();
      }
    }
  }

  closeActiveModal() {
    // Close any open modals
    const activeModals = document.querySelectorAll('.modal.active, .modal.show, [aria-modal="true"]');
    activeModals.forEach(modal => {
      modal.classList.remove('active', 'show');
      modal.setAttribute('aria-hidden', 'true');
    });
    
    // Close mobile menu if open
    const mobileMenu = document.querySelector('.nav-menu.active');
    if (mobileMenu) {
      mobileMenu.classList.remove('active');
      const menuToggle = document.querySelector('[aria-controls="nav-menu"]');
      if (menuToggle) {
        menuToggle.setAttribute('aria-expanded', 'false');
      }
    }
    
    // Close help modal if open
    if (this.isHelpModalOpen) {
      this.hideHelp();
    }
  }

  toggleDebugMode() {
    document.body.classList.toggle('debug-mode');
    const isDebug = document.body.classList.contains('debug-mode');
    
    if (isDebug) {
      this.showDebugInfo();
    } else {
      this.hideDebugInfo();
    }
    
    console.log(`Debug mode ${isDebug ? 'enabled' : 'disabled'}`);
  }

  showDebugInfo() {
    // Add debug styles
    const debugStyle = document.createElement('style');
    debugStyle.id = 'debug-styles';
    debugStyle.textContent = `
      .debug-mode * {
        outline: 1px solid rgba(255, 0, 0, 0.3) !important;
      }
      .debug-mode .debug-info {
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px;
        border-radius: 4px;
        font-family: monospace;
        font-size: 12px;
        z-index: 10000;
      }
    `;
    document.head.appendChild(debugStyle);
    
    // Add debug info panel
    const debugInfo = document.createElement('div');
    debugInfo.className = 'debug-info';
    debugInfo.innerHTML = `
      <div>Viewport: ${window.innerWidth}x${window.innerHeight}</div>
      <div>User Agent: ${navigator.userAgent.split(' ')[0]}</div>
      <div>Performance: ${window.performance ? 'Available' : 'Not Available'}</div>
    `;
    document.body.appendChild(debugInfo);
  }

  hideDebugInfo() {
    const debugStyle = document.getElementById('debug-styles');
    const debugInfo = document.querySelector('.debug-info');
    
    if (debugStyle) debugStyle.remove();
    if (debugInfo) debugInfo.remove();
  }

  showPerformanceStats() {
    if (window.performanceMonitor) {
      window.performanceMonitor.showStats();
    } else {
      console.log('Performance monitor not available');
    }
  }

  // Help modal functionality
  createHelpModal() {
    this.helpModal = document.createElement('div');
    this.helpModal.className = 'keyboard-help-modal';
    this.helpModal.setAttribute('role', 'dialog');
    this.helpModal.setAttribute('aria-labelledby', 'help-modal-title');
    this.helpModal.setAttribute('aria-hidden', 'true');
    
    this.helpModal.innerHTML = `
      <div class="help-modal-backdrop"></div>
      <div class="help-modal-content">
        <div class="help-modal-header">
          <h2 id="help-modal-title">Keyboard Shortcuts</h2>
          <button class="help-modal-close" aria-label="Close help modal">×</button>
        </div>
        <div class="help-modal-body">
          ${this.generateShortcutsList()}
        </div>
      </div>
    `;
    
    // Add styles
    this.addHelpModalStyles();
    
    // Add event listeners
    this.setupHelpModalEvents();
    
    document.body.appendChild(this.helpModal);
  }

  generateShortcutsList() {
    let html = '<div class="shortcuts-grid">';
    
    this.shortcuts.forEach((shortcut, keys) => {
      html += `
        <div class="shortcut-item">
          <kbd class="shortcut-keys">${keys.replace(/\+/g, ' + ')}</kbd>
          <span class="shortcut-description">${shortcut.description}</span>
        </div>
      `;
    });
    
    html += '</div>';
    return html;
  }

  addHelpModalStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .keyboard-help-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10000;
        display: none;
      }
      
      .keyboard-help-modal.active {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .help-modal-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
      }
      
      .help-modal-content {
        position: relative;
        background: var(--color-surface, white);
        border-radius: 8px;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      }
      
      .help-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        border-bottom: 1px solid var(--color-border, #e5e7eb);
      }
      
      .help-modal-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
      }
      
      .help-modal-body {
        padding: 20px;
      }
      
      .shortcuts-grid {
        display: grid;
        gap: 12px;
      }
      
      .shortcut-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
      }
      
      .shortcut-keys {
        background: var(--color-muted, #f3f4f6);
        padding: 4px 8px;
        border-radius: 4px;
        font-family: monospace;
        font-size: 12px;
        border: 1px solid var(--color-border, #d1d5db);
      }
      
      .shortcut-description {
        flex: 1;
        margin-left: 16px;
        color: var(--color-text-secondary, #6b7280);
      }
    `;
    
    document.head.appendChild(style);
  }

  setupHelpModalEvents() {
    const closeBtn = this.helpModal.querySelector('.help-modal-close');
    const backdrop = this.helpModal.querySelector('.help-modal-backdrop');
    
    closeBtn.addEventListener('click', () => this.hideHelp());
    backdrop.addEventListener('click', () => this.hideHelp());
    
    this.helpModal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideHelp();
      }
    });
  }

  showHelp() {
    this.helpModal.classList.add('active');
    this.helpModal.setAttribute('aria-hidden', 'false');
    this.isHelpModalOpen = true;
    
    // Focus the close button
    const closeBtn = this.helpModal.querySelector('.help-modal-close');
    closeBtn.focus();
    
    // Announce to screen reader
    if (window.accessibilityFocusSystem) {
      window.accessibilityFocusSystem.announceToScreenReader('Keyboard shortcuts help opened');
    }
  }

  hideHelp() {
    this.helpModal.classList.remove('active');
    this.helpModal.setAttribute('aria-hidden', 'true');
    this.isHelpModalOpen = false;
    
    // Announce to screen reader
    if (window.accessibilityFocusSystem) {
      window.accessibilityFocusSystem.announceToScreenReader('Keyboard shortcuts help closed');
    }
  }

  // Cleanup
  destroy() {
    if (this.helpModal) {
      this.helpModal.remove();
    }
    
    this.shortcuts.clear();
  }
}

// Initialize Keyboard Shortcut System when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.keyboardShortcutSystem = new KeyboardShortcutSystem();
});

export default KeyboardShortcutSystem;
