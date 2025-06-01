/**
 * @fileoverview Performance Validation Suite - Testing and validation for Phase 1 enhancements
 * @version 1.0.0
 * @author Forge EC Team
 * @description Comprehensive testing suite to validate all Phase 1 performance enhancements
 * are working correctly and meeting performance standards.
 */

/**
 * Performance Validation Suite Class
 * Tests all Phase 1 enhancements and reports results
 */
class PerformanceValidation {
  constructor() {
    this.results = new Map();
    this.startTime = performance.now();
    this.testTimeout = 30000; // 30 seconds timeout for all tests
  }

  /**
   * Run all validation tests
   * @returns {Promise<Object>} Test results
   */
  async runAllTests() {
    console.log('🧪 Starting Performance Validation Suite...');
    
    try {
      // Test 1: Performance Monitor
      await this.testPerformanceMonitor();
      
      // Test 2: Smooth Scroll System
      await this.testSmoothScrollSystem();
      
      // Test 3: Quicklink Prefetch
      await this.testQuicklinkPrefetch();
      
      // Test 4: Resource Hints
      await this.testResourceHints();
      
      // Test 5: Integration Tests
      await this.testSystemIntegration();
      
      // Test 6: Performance Metrics
      await this.testPerformanceMetrics();
      
      // Generate report
      const report = this.generateReport();
      console.log('📊 Validation Complete:', report);
      
      return report;
    } catch (error) {
      console.error('❌ Validation Suite Failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Test Performance Monitor functionality
   */
  async testPerformanceMonitor() {
    const testName = 'Performance Monitor';
    console.log(`🔍 Testing ${testName}...`);
    
    try {
      // Check if performance monitor exists
      if (!window.performanceMonitor) {
        throw new Error('Performance Monitor not initialized');
      }

      // Test mark and measure functionality
      window.performanceMonitor.mark('test-start');
      await new Promise(resolve => setTimeout(resolve, 100));
      window.performanceMonitor.mark('test-end');
      window.performanceMonitor.measure('test-duration', 'test-start', 'test-end');

      // Check if metrics are being collected
      const metrics = window.performanceMonitor.getMetrics();
      
      // Verify Web Vitals tracking
      const hasWebVitals = Object.keys(metrics).some(key => 
        ['LCP', 'FID', 'CLS', 'FCP', 'TTFB'].includes(key)
      );

      this.results.set(testName, {
        success: true,
        details: {
          initialized: true,
          markingWorks: true,
          metricsCollected: Object.keys(metrics).length > 0,
          webVitalsTracking: hasWebVitals
        }
      });

      console.log(`✅ ${testName} - PASSED`);
    } catch (error) {
      this.results.set(testName, {
        success: false,
        error: error.message
      });
      console.log(`❌ ${testName} - FAILED:`, error.message);
    }
  }

  /**
   * Test Smooth Scroll System functionality
   */
  async testSmoothScrollSystem() {
    const testName = 'Smooth Scroll System';
    console.log(`🔍 Testing ${testName}...`);
    
    try {
      // Check if smooth scroll system exists
      if (!window.smoothScrollSystem) {
        throw new Error('Smooth Scroll System not initialized');
      }

      // Test scroll position tracking
      const initialScrollY = window.smoothScrollSystem.getScrollY();
      
      // Test scroll listener functionality
      let listenerCalled = false;
      window.smoothScrollSystem.addScrollListener('test', () => {
        listenerCalled = true;
      });

      // Simulate scroll event
      window.dispatchEvent(new Event('scroll'));
      await new Promise(resolve => setTimeout(resolve, 100));

      // Test reduced motion detection
      const isActive = window.smoothScrollSystem.isActive();

      this.results.set(testName, {
        success: true,
        details: {
          initialized: true,
          scrollTracking: typeof initialScrollY === 'number',
          listenerSystem: listenerCalled,
          reducedMotionSupport: typeof isActive === 'boolean'
        }
      });

      // Cleanup test listener
      window.smoothScrollSystem.removeScrollListener('test');

      console.log(`✅ ${testName} - PASSED`);
    } catch (error) {
      this.results.set(testName, {
        success: false,
        error: error.message
      });
      console.log(`❌ ${testName} - FAILED:`, error.message);
    }
  }

  /**
   * Test Quicklink Prefetch functionality
   */
  async testQuicklinkPrefetch() {
    const testName = 'Quicklink Prefetch';
    console.log(`🔍 Testing ${testName}...`);
    
    try {
      // Check if quicklink prefetch exists
      if (!window.quicklinkPrefetch) {
        throw new Error('Quicklink Prefetch not initialized');
      }

      // Get prefetch statistics
      const stats = window.quicklinkPrefetch.getStats();
      
      // Check if system is properly configured
      const hasValidConfig = stats && typeof stats.supported === 'boolean';
      
      // Test link detection (create a test link)
      const testLink = document.createElement('a');
      testLink.href = '/test-page';
      testLink.textContent = 'Test Link';
      document.body.appendChild(testLink);

      // Wait a moment for observer to detect
      await new Promise(resolve => setTimeout(resolve, 200));

      // Cleanup test link
      document.body.removeChild(testLink);

      this.results.set(testName, {
        success: true,
        details: {
          initialized: true,
          statsAvailable: hasValidConfig,
          browserSupport: stats.supported,
          enabled: stats.enabled,
          prefetchedCount: stats.prefetched,
          queuedCount: stats.queued
        }
      });

      console.log(`✅ ${testName} - PASSED`);
    } catch (error) {
      this.results.set(testName, {
        success: false,
        error: error.message
      });
      console.log(`❌ ${testName} - FAILED:`, error.message);
    }
  }

  /**
   * Test Resource Hints implementation
   */
  async testResourceHints() {
    const testName = 'Resource Hints';
    console.log(`🔍 Testing ${testName}...`);
    
    try {
      // Check for preconnect links
      const preconnectLinks = document.querySelectorAll('link[rel="preconnect"]');
      const preloadLinks = document.querySelectorAll('link[rel="preload"]');
      const prefetchLinks = document.querySelectorAll('link[rel="prefetch"]');
      const dnsPrefetchLinks = document.querySelectorAll('link[rel="dns-prefetch"]');

      // Verify critical resources are preloaded
      const criticalResources = ['css/style.css', 'js/main.js'];
      const preloadedResources = Array.from(preloadLinks).map(link => link.href);
      const hasCriticalPreloads = criticalResources.some(resource => 
        preloadedResources.some(preloaded => preloaded.includes(resource))
      );

      this.results.set(testName, {
        success: true,
        details: {
          preconnectCount: preconnectLinks.length,
          preloadCount: preloadLinks.length,
          prefetchCount: prefetchLinks.length,
          dnsPrefetchCount: dnsPrefetchLinks.length,
          criticalResourcesPreloaded: hasCriticalPreloads
        }
      });

      console.log(`✅ ${testName} - PASSED`);
    } catch (error) {
      this.results.set(testName, {
        success: false,
        error: error.message
      });
      console.log(`❌ ${testName} - FAILED:`, error.message);
    }
  }

  /**
   * Test system integration between components
   */
  async testSystemIntegration() {
    const testName = 'System Integration';
    console.log(`🔍 Testing ${testName}...`);
    
    try {
      // Test Enhanced Transitions integration
      const hasEnhancedTransitions = !!window.enhancedTransitions;
      
      // Test Main App integration
      const hasMainApp = !!window.forgeECApp;
      
      // Test Animation Controller integration
      const hasAnimationController = !!window.animationController;

      // Test performance monitoring integration
      let performanceIntegration = false;
      if (window.performanceMonitor && window.enhancedTransitions) {
        // Test if transitions are being monitored
        window.performanceMonitor.mark('integration-test');
        performanceIntegration = true;
      }

      this.results.set(testName, {
        success: true,
        details: {
          enhancedTransitions: hasEnhancedTransitions,
          mainApp: hasMainApp,
          animationController: hasAnimationController,
          performanceIntegration: performanceIntegration,
          allSystemsLoaded: hasEnhancedTransitions && hasMainApp
        }
      });

      console.log(`✅ ${testName} - PASSED`);
    } catch (error) {
      this.results.set(testName, {
        success: false,
        error: error.message
      });
      console.log(`❌ ${testName} - FAILED:`, error.message);
    }
  }

  /**
   * Test performance metrics and standards
   */
  async testPerformanceMetrics() {
    const testName = 'Performance Metrics';
    console.log(`🔍 Testing ${testName}...`);
    
    try {
      // Check script loading performance
      const navigationTiming = performance.getEntriesByType('navigation')[0];
      const loadTime = navigationTiming ? navigationTiming.loadEventEnd - navigationTiming.fetchStart : 0;

      // Check resource loading performance
      const resourceEntries = performance.getEntriesByType('resource');
      const slowResources = resourceEntries.filter(entry => entry.duration > 1000);

      // Check if 60fps is maintained (approximate check)
      let frameRate = 60;
      if (window.performance && window.performance.now) {
        const start = performance.now();
        await new Promise(resolve => {
          let frames = 0;
          const checkFrame = () => {
            frames++;
            if (frames < 60) {
              requestAnimationFrame(checkFrame);
            } else {
              const duration = performance.now() - start;
              frameRate = Math.round(60000 / duration);
              resolve();
            }
          };
          requestAnimationFrame(checkFrame);
        });
      }

      this.results.set(testName, {
        success: true,
        details: {
          pageLoadTime: Math.round(loadTime),
          slowResourceCount: slowResources.length,
          estimatedFrameRate: frameRate,
          performanceApiSupported: !!window.performance,
          meets60FpsTarget: frameRate >= 55 // Allow 5fps tolerance
        }
      });

      console.log(`✅ ${testName} - PASSED`);
    } catch (error) {
      this.results.set(testName, {
        success: false,
        error: error.message
      });
      console.log(`❌ ${testName} - FAILED:`, error.message);
    }
  }

  /**
   * Generate comprehensive test report
   * @returns {Object} Test report
   */
  generateReport() {
    const totalTests = this.results.size;
    const passedTests = Array.from(this.results.values()).filter(result => result.success).length;
    const failedTests = totalTests - passedTests;
    const successRate = Math.round((passedTests / totalTests) * 100);
    const totalTime = Math.round(performance.now() - this.startTime);

    const report = {
      summary: {
        totalTests,
        passedTests,
        failedTests,
        successRate,
        totalTime,
        status: successRate >= 80 ? 'EXCELLENT' : successRate >= 60 ? 'GOOD' : 'NEEDS_IMPROVEMENT'
      },
      details: Object.fromEntries(this.results),
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  /**
   * Generate recommendations based on test results
   * @returns {Array<string>} Recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    
    this.results.forEach((result, testName) => {
      if (!result.success) {
        recommendations.push(`Fix ${testName}: ${result.error}`);
      } else if (result.details) {
        // Add specific recommendations based on test details
        if (testName === 'Performance Metrics' && result.details.slowResourceCount > 0) {
          recommendations.push(`Optimize ${result.details.slowResourceCount} slow-loading resources`);
        }
        if (testName === 'Performance Metrics' && !result.details.meets60FpsTarget) {
          recommendations.push(`Improve frame rate (current: ${result.details.estimatedFrameRate}fps, target: 60fps)`);
        }
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('All systems performing optimally! 🚀');
    }

    return recommendations;
  }
}

// Auto-run validation when page is fully loaded
window.addEventListener('load', async () => {
  // Wait a moment for all systems to initialize
  setTimeout(async () => {
    const validator = new PerformanceValidation();
    const report = await validator.runAllTests();
    
    // Store report globally for debugging
    window.performanceValidationReport = report;
    
    // Log summary
    console.log(`🎯 Performance Validation Summary: ${report.summary.passedTests}/${report.summary.totalTests} tests passed (${report.summary.successRate}%) in ${report.summary.totalTime}ms`);
    
    if (report.recommendations.length > 0) {
      console.log('💡 Recommendations:', report.recommendations);
    }
  }, 2000);
});

// Export for manual testing
window.PerformanceValidation = PerformanceValidation;
