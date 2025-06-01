/**
 * Performance Tests for Forge EC Website
 * Tests Core Web Vitals and performance budgets
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

// Mock performance API
const mockPerformance = {
  now: () => Date.now(),
  mark: () => {},
  measure: () => {},
  getEntriesByType: () => [],
  memory: {
    usedJSHeapSize: 10000000,
    totalJSHeapSize: 20000000,
    jsHeapSizeLimit: 100000000
  }
};

describe('Performance Budget System', () => {
  let dom;
  let window;
  let document;
  let PerformanceBudgetSystem;

  beforeEach(async () => {
    // Setup JSDOM environment
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost:3000',
      pretendToBeVisual: true,
      resources: 'usable'
    });
    
    window = dom.window;
    document = window.document;
    
    // Mock globals
    global.window = window;
    global.document = document;
    global.performance = mockPerformance;
    global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
    global.localStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {}
    };
    
    // Import the system
    const module = await import('../js/performance-budgets.js');
    PerformanceBudgetSystem = module.default;
  });

  afterEach(() => {
    dom.window.close();
  });

  it('should initialize with default budgets', () => {
    const system = new PerformanceBudgetSystem();
    
    expect(system.budgets.has('LCP')).toBe(true);
    expect(system.budgets.has('FID')).toBe(true);
    expect(system.budgets.has('CLS')).toBe(true);
    expect(system.budgets.get('LCP').threshold).toBe(2500);
  });

  it('should record measurements correctly', () => {
    const system = new PerformanceBudgetSystem();
    
    system.recordMeasurement('LCP', 2000, 'ms');
    
    expect(system.measurements.has('LCP')).toBe(true);
    expect(system.measurements.get('LCP')).toHaveLength(1);
    expect(system.measurements.get('LCP')[0].value).toBe(2000);
  });

  it('should detect budget violations', () => {
    const system = new PerformanceBudgetSystem();
    
    // Mock console.warn to capture violations
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    system.checkBudget('LCP', 3000); // Exceeds 2500ms threshold
    
    expect(system.violations).toHaveLength(1);
    expect(system.violations[0].metric).toBe('LCP');
    expect(consoleSpy).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });

  it('should generate alerts for budget warnings', () => {
    const system = new PerformanceBudgetSystem();
    
    system.checkBudget('LCP', 2000); // 80% of 2500ms threshold
    
    expect(system.alerts).toHaveLength(1);
    expect(system.alerts[0].details.severity).toBe('critical');
  });

  it('should save and load custom budgets', () => {
    const system = new PerformanceBudgetSystem();
    
    system.setBudget('custom-metric', 1000, 'ms', 'Custom test metric');
    
    expect(system.budgets.has('custom-metric')).toBe(true);
    expect(system.budgets.get('custom-metric').threshold).toBe(1000);
  });
});

describe('Accessibility Testing System', () => {
  let dom;
  let window;
  let document;

  beforeEach(() => {
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <button>Test Button</button>
          <img src="test.jpg" alt="Test Image">
          <div role="button" tabindex="0">Custom Button</div>
        </body>
      </html>
    `, {
      url: 'http://localhost:3000',
      pretendToBeVisual: true
    });
    
    window = dom.window;
    document = window.document;
    
    global.window = window;
    global.document = document;
  });

  afterEach(() => {
    dom.window.close();
  });

  it('should detect accessibility violations', async () => {
    // Mock axe-core
    window.axe = {
      run: async () => ({
        violations: [
          {
            id: 'color-contrast',
            description: 'Elements must have sufficient color contrast',
            impact: 'serious',
            nodes: [{ target: ['button'] }]
          }
        ],
        incomplete: [],
        passes: []
      }),
      configure: () => {}
    };
    
    const { default: AccessibilityTestingSystem } = await import('../js/accessibility-testing.js');
    const system = new AccessibilityTestingSystem();
    
    await system.runFullAccessibilityTest();
    
    expect(system.violations).toHaveLength(1);
    expect(system.violations[0].id).toBe('color-contrast');
  });
});

describe('Micro-Interactions System', () => {
  let dom;
  let window;
  let document;

  beforeEach(() => {
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <button class="magnetic-hover">Test Button</button>
          <div class="card">Test Card</div>
        </body>
      </html>
    `, {
      url: 'http://localhost:3000',
      pretendToBeVisual: true
    });
    
    window = dom.window;
    document = window.document;
    
    global.window = window;
    global.document = document;
    global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
  });

  afterEach(() => {
    dom.window.close();
  });

  it('should setup hover effects on elements', async () => {
    // Mock popmotion
    window.popmotion = {
      animate: ({ onUpdate, onComplete }) => {
        onUpdate({ x: 10, y: 10 });
        if (onComplete) onComplete();
        return { stop: () => {} };
      },
      easeOut: 'easeOut'
    };
    
    const { default: MicroInteractionSystem } = await import('../js/micro-interactions.js');
    const system = new MicroInteractionSystem();
    
    expect(system.hoverEffects.size).toBeGreaterThan(0);
  });
});

describe('Keyboard Shortcuts System', () => {
  let dom;
  let window;
  let document;

  beforeEach(() => {
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <nav id="main-navigation">Navigation</nav>
          <main id="main-content">Main Content</main>
          <footer id="footer">Footer</footer>
        </body>
      </html>
    `, {
      url: 'http://localhost:3000',
      pretendToBeVisual: true
    });
    
    window = dom.window;
    document = window.document;
    
    global.window = window;
    global.document = document;
  });

  afterEach(() => {
    dom.window.close();
  });

  it('should register global shortcuts', async () => {
    const { default: KeyboardShortcutSystem } = await import('../js/keyboard-shortcuts.js');
    const system = new KeyboardShortcutSystem();
    
    expect(system.shortcuts.has('global:Alt+H')).toBe(true);
    expect(system.shortcuts.has('global:Alt+S')).toBe(true);
    expect(system.shortcuts.has('global:?')).toBe(true);
  });

  it('should execute shortcuts correctly', async () => {
    const { default: KeyboardShortcutSystem } = await import('../js/keyboard-shortcuts.js');
    const system = new KeyboardShortcutSystem();
    
    const mockEvent = {
      preventDefault: vi.fn(),
      key: 'H',
      altKey: true,
      ctrlKey: false,
      shiftKey: false,
      metaKey: false
    };
    
    const result = system.executeShortcut('Alt+H', mockEvent);
    
    expect(result).toBe(true);
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });
});

describe('Integration Tests', () => {
  it('should integrate all systems without conflicts', async () => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost:3000',
      pretendToBeVisual: true
    });
    
    global.window = dom.window;
    global.document = dom.window.document;
    global.performance = mockPerformance;
    global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
    global.localStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {}
    };
    
    // Mock external libraries
    dom.window.popmotion = {
      animate: () => ({ stop: () => {} }),
      easeOut: 'easeOut'
    };
    
    dom.window.axe = {
      run: async () => ({ violations: [], incomplete: [], passes: [] }),
      configure: () => {}
    };
    
    // Import and initialize all systems
    const systems = await Promise.all([
      import('../js/performance-budgets.js'),
      import('../js/micro-interactions.js'),
      import('../js/keyboard-shortcuts.js'),
      import('../js/accessibility-testing.js')
    ]);
    
    // Should not throw errors
    expect(() => {
      systems.forEach(({ default: System }) => {
        new System();
      });
    }).not.toThrow();
    
    dom.window.close();
  });
});
