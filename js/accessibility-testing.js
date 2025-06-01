/**
 * Accessibility Testing System using Axe-core
 * Provides automated WCAG 2.1 AA compliance testing
 */

class AccessibilityTestingSystem {
  constructor() {
    this.isInitialized = false;
    this.isEnabled = process.env.NODE_ENV === 'development' || window.location.search.includes('a11y-test=true');
    this.testResults = new Map();
    this.violations = [];
    this.config = {
      rules: {
        // Enable all WCAG 2.1 AA rules
        'wcag2a': { enabled: true },
        'wcag2aa': { enabled: true },
        'wcag21aa': { enabled: true },
        // Additional best practices
        'best-practice': { enabled: true }
      },
      tags: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'],
      resultTypes: ['violations', 'incomplete', 'passes']
    };
    
    this.init();
  }

  async init() {
    if (!this.isEnabled) {
      console.log('♿ Accessibility testing disabled (production mode)');
      return;
    }
    
    try {
      console.log('♿ Initializing Accessibility Testing System...');
      
      // Load Axe-core library
      await this.loadAxeCore();
      
      // Configure Axe
      this.configureAxe();
      
      // Setup automated testing
      this.setupAutomatedTesting();
      
      // Setup manual testing tools
      this.setupManualTestingTools();
      
      // Setup reporting
      this.setupReporting();
      
      // Run initial test
      await this.runFullAccessibilityTest();
      
      this.isInitialized = true;
      console.log('✅ Accessibility Testing System initialized successfully');
      
    } catch (error) {
      console.warn('⚠️ Accessibility Testing System initialization failed:', error);
    }
  }

  async loadAxeCore() {
    if (window.axe) return;
    
    try {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/axe-core@4.8.4/axe.min.js';
      
      await new Promise((resolve, reject) => {
        script.onload = () => {
          if (window.axe) {
            resolve();
          } else {
            reject(new Error('Axe-core not available after loading'));
          }
        };
        script.onerror = reject;
        document.head.appendChild(script);
      });
      
    } catch (error) {
      throw new Error('Failed to load Axe-core library');
    }
  }

  configureAxe() {
    if (!window.axe) return;
    
    // Configure Axe with custom rules and settings
    window.axe.configure({
      rules: this.config.rules,
      locale: 'en',
      reporter: 'v2'
    });
    
    // Add custom rules for Forge EC specific patterns
    this.addCustomRules();
  }

  addCustomRules() {
    // Custom rule for cryptography-specific content
    window.axe.configure({
      rules: {
        'crypto-content-accessible': {
          enabled: true,
          tags: ['custom', 'best-practice'],
          metadata: {
            description: 'Ensures cryptographic content is accessible',
            help: 'Cryptographic examples should have proper labels and descriptions'
          }
        }
      }
    });
  }

  setupAutomatedTesting() {
    // Test on page load
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => this.runFullAccessibilityTest(), 1000);
    });
    
    // Test on dynamic content changes
    this.setupMutationObserver();
    
    // Test on route changes (SPA behavior)
    this.setupRouteChangeDetection();
    
    // Periodic testing
    if (this.isEnabled) {
      setInterval(() => {
        this.runIncrementalTest();
      }, 30000); // Test every 30 seconds
    }
  }

  setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      let shouldTest = false;
      
      mutations.forEach((mutation) => {
        // Test if significant DOM changes occurred
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check for interactive elements or content sections
              if (node.matches('button, input, select, textarea, [role], section, article, main')) {
                shouldTest = true;
              }
            }
          });
        }
        
        // Test if attributes that affect accessibility changed
        if (mutation.type === 'attributes') {
          const accessibilityAttributes = [
            'aria-label', 'aria-labelledby', 'aria-describedby', 'aria-expanded',
            'aria-hidden', 'role', 'tabindex', 'alt', 'title'
          ];
          
          if (accessibilityAttributes.includes(mutation.attributeName)) {
            shouldTest = true;
          }
        }
      });
      
      if (shouldTest) {
        // Debounce testing
        clearTimeout(this.mutationTestTimeout);
        this.mutationTestTimeout = setTimeout(() => {
          this.runIncrementalTest();
        }, 500);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        'aria-label', 'aria-labelledby', 'aria-describedby', 'aria-expanded',
        'aria-hidden', 'role', 'tabindex', 'alt', 'title', 'class'
      ]
    });
  }

  setupRouteChangeDetection() {
    // Listen for hash changes
    window.addEventListener('hashchange', () => {
      setTimeout(() => this.runFullAccessibilityTest(), 500);
    });
    
    // Listen for history API changes
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      setTimeout(() => window.accessibilityTestingSystem?.runFullAccessibilityTest(), 500);
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      setTimeout(() => window.accessibilityTestingSystem?.runFullAccessibilityTest(), 500);
    };
  }

  setupManualTestingTools() {
    // Create accessibility testing panel
    this.createTestingPanel();
    
    // Add keyboard shortcuts for testing
    this.setupTestingShortcuts();
    
    // Add visual indicators for violations
    this.setupViolationIndicators();
  }

  createTestingPanel() {
    const panel = document.createElement('div');
    panel.id = 'a11y-testing-panel';
    panel.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 300px;
      max-height: 400px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 15px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 12px;
      z-index: 10000;
      overflow-y: auto;
      display: none;
    `;
    
    panel.innerHTML = `
      <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 10px;">
        <h3 style="margin: 0; font-size: 14px;">Accessibility Testing</h3>
        <button id="a11y-close" style="background: none; border: none; color: white; cursor: pointer;">×</button>
      </div>
      <div id="a11y-results"></div>
      <div style="margin-top: 10px;">
        <button id="a11y-run-test" style="background: #007cba; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Run Test</button>
        <button id="a11y-export" style="background: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-left: 5px;">Export</button>
      </div>
    `;
    
    document.body.appendChild(panel);
    
    // Setup panel event listeners
    document.getElementById('a11y-close').addEventListener('click', () => {
      panel.style.display = 'none';
    });
    
    document.getElementById('a11y-run-test').addEventListener('click', () => {
      this.runFullAccessibilityTest();
    });
    
    document.getElementById('a11y-export').addEventListener('click', () => {
      this.exportResults();
    });
  }

  setupTestingShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+Shift+A: Toggle accessibility panel
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        this.toggleTestingPanel();
      }
      
      // Ctrl+Shift+T: Run accessibility test
      if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        this.runFullAccessibilityTest();
      }
    });
  }

  setupViolationIndicators() {
    // Add CSS for violation indicators
    const style = document.createElement('style');
    style.textContent = `
      .a11y-violation {
        outline: 3px solid #ff0000 !important;
        outline-offset: 2px !important;
        position: relative !important;
      }
      
      .a11y-violation::after {
        content: '⚠️';
        position: absolute;
        top: -10px;
        right: -10px;
        background: #ff0000;
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        z-index: 10001;
      }
    `;
    
    document.head.appendChild(style);
  }

  setupReporting() {
    // Setup integration with Sentry for violation reporting
    if (window.sentryMonitoringSystem) {
      this.sentryIntegration = true;
    }
    
    // Setup console reporting
    this.consoleReporting = true;
  }

  async runFullAccessibilityTest() {
    if (!window.axe || !this.isEnabled) return;
    
    try {
      console.log('🔍 Running full accessibility test...');
      
      const results = await window.axe.run(document, {
        tags: this.config.tags,
        resultTypes: this.config.resultTypes
      });
      
      this.processTestResults(results);
      this.updateTestingPanel(results);
      this.reportViolations(results);
      
      console.log(`✅ Accessibility test completed: ${results.violations.length} violations found`);
      
    } catch (error) {
      console.error('❌ Accessibility test failed:', error);
      
      if (this.sentryIntegration) {
        window.sentryMonitoringSystem.captureError(error, {
          type: 'accessibility_test_error'
        });
      }
    }
  }

  async runIncrementalTest() {
    if (!window.axe || !this.isEnabled) return;
    
    try {
      // Test only recently changed elements
      const recentlyChanged = document.querySelectorAll('[data-recently-changed]');
      
      if (recentlyChanged.length === 0) return;
      
      const results = await window.axe.run(recentlyChanged, {
        tags: this.config.tags,
        resultTypes: ['violations']
      });
      
      if (results.violations.length > 0) {
        this.processTestResults(results);
        this.reportViolations(results);
      }
      
      // Clean up markers
      recentlyChanged.forEach(el => {
        el.removeAttribute('data-recently-changed');
      });
      
    } catch (error) {
      console.warn('⚠️ Incremental accessibility test failed:', error);
    }
  }

  processTestResults(results) {
    this.violations = results.violations;
    this.testResults.set(Date.now(), results);
    
    // Clear previous violation indicators
    document.querySelectorAll('.a11y-violation').forEach(el => {
      el.classList.remove('a11y-violation');
    });
    
    // Add violation indicators
    results.violations.forEach(violation => {
      violation.nodes.forEach(node => {
        const element = document.querySelector(node.target[0]);
        if (element) {
          element.classList.add('a11y-violation');
          element.setAttribute('data-a11y-violation', violation.id);
          element.setAttribute('title', `A11y Violation: ${violation.help}`);
        }
      });
    });
  }

  updateTestingPanel(results) {
    const panel = document.getElementById('a11y-testing-panel');
    const resultsDiv = document.getElementById('a11y-results');
    
    if (!panel || !resultsDiv) return;
    
    let html = `
      <div style="margin-bottom: 10px;">
        <strong>Test Results:</strong><br>
        Violations: ${results.violations.length}<br>
        Incomplete: ${results.incomplete.length}<br>
        Passes: ${results.passes.length}
      </div>
    `;
    
    if (results.violations.length > 0) {
      html += '<div><strong>Violations:</strong></div>';
      results.violations.forEach((violation, index) => {
        html += `
          <div style="margin: 5px 0; padding: 5px; background: rgba(255, 0, 0, 0.2); border-radius: 4px;">
            <strong>${violation.id}</strong><br>
            <small>${violation.description}</small><br>
            <small>Impact: ${violation.impact}</small><br>
            <small>Nodes: ${violation.nodes.length}</small>
          </div>
        `;
      });
    }
    
    resultsDiv.innerHTML = html;
  }

  reportViolations(results) {
    if (results.violations.length === 0) return;
    
    // Console reporting
    if (this.consoleReporting) {
      console.group('♿ Accessibility Violations');
      results.violations.forEach(violation => {
        console.error(`${violation.id}: ${violation.description}`);
        console.log('Help:', violation.help);
        console.log('Impact:', violation.impact);
        console.log('Nodes:', violation.nodes);
      });
      console.groupEnd();
    }
    
    // Sentry reporting
    if (this.sentryIntegration) {
      window.sentryMonitoringSystem.captureMessage(
        `Accessibility violations detected: ${results.violations.length} issues`,
        'warning',
        {
          type: 'accessibility_violations',
          violations: results.violations.map(v => ({
            id: v.id,
            impact: v.impact,
            description: v.description,
            nodeCount: v.nodes.length
          }))
        }
      );
    }
  }

  toggleTestingPanel() {
    const panel = document.getElementById('a11y-testing-panel');
    if (panel) {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }
  }

  exportResults() {
    const results = Array.from(this.testResults.values());
    const exportData = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      results: results
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accessibility-report-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }

  // Public API
  getViolations() {
    return this.violations;
  }

  getTestResults() {
    return Array.from(this.testResults.values());
  }

  enable() {
    this.isEnabled = true;
  }

  disable() {
    this.isEnabled = false;
  }

  // Cleanup
  destroy() {
    this.testResults.clear();
    this.violations = [];
    
    const panel = document.getElementById('a11y-testing-panel');
    if (panel) {
      panel.remove();
    }
    
    document.querySelectorAll('.a11y-violation').forEach(el => {
      el.classList.remove('a11y-violation');
      el.removeAttribute('data-a11y-violation');
    });
  }
}

// Initialize Accessibility Testing System when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.accessibilityTestingSystem = new AccessibilityTestingSystem();
});

export default AccessibilityTestingSystem;
