/**
 * Firebase Analytics Integration
 * Tracks user interactions and documentation usage patterns
 */

import { logEvent, setUserProperties, setUserId } from 'firebase/analytics';
import { analytics } from './firebase-config.js';
import { firebaseAuthService } from './firebase-auth.js';

class FirebaseAnalyticsService {
  constructor() {
    this.isEnabled = !!analytics;
    this.sessionStartTime = Date.now();
    this.pageViews = new Map();
    this.userInteractions = [];
    
    if (this.isEnabled) {
      this.init();
      console.log('📊 Firebase Analytics initialized');
    } else {
      console.warn('📊 Firebase Analytics not available (likely localhost)');
    }
  }

  init() {
    // Track initial page load
    this.trackPageView();
    
    // Set up user tracking
    firebaseAuthService.onAuthStateChange((user) => {
      if (user) {
        this.setUser(user);
      } else {
        this.clearUser();
      }
    });

    // Track scroll depth
    this.setupScrollTracking();
    
    // Track time on page
    this.setupTimeTracking();
    
    // Track clicks on important elements
    this.setupClickTracking();
  }

  // User Management
  setUser(user) {
    if (!this.isEnabled) return;

    try {
      setUserId(analytics, user.uid);
      
      setUserProperties(analytics, {
        user_type: 'authenticated',
        signup_method: user.providerData[0]?.providerId || 'unknown',
        email_verified: user.emailVerified
      });

      this.trackEvent('user_login', {
        method: user.providerData[0]?.providerId || 'unknown'
      });
    } catch (error) {
      console.error('Error setting user in analytics:', error);
    }
  }

  clearUser() {
    if (!this.isEnabled) return;

    try {
      setUserId(analytics, null);
      
      setUserProperties(analytics, {
        user_type: 'anonymous'
      });
    } catch (error) {
      console.error('Error clearing user in analytics:', error);
    }
  }

  // Page Tracking
  trackPageView(pageName = null) {
    if (!this.isEnabled) return;

    const page = pageName || this.getCurrentPage();
    const timestamp = Date.now();
    
    this.pageViews.set(page, timestamp);

    try {
      this.trackEvent('page_view', {
        page_title: document.title,
        page_location: window.location.href,
        page_path: window.location.pathname,
        section: page
      });
    } catch (error) {
      console.error('Error tracking page view:', error);
    }
  }

  getCurrentPage() {
    const hash = window.location.hash.substring(1);
    if (hash) {
      return hash;
    }
    
    // Detect current section based on scroll position
    const sections = document.querySelectorAll('section[id]');
    const scrollY = window.scrollY + 100;
    
    for (const section of sections) {
      const rect = section.getBoundingClientRect();
      const sectionTop = scrollY - rect.height + window.scrollY;
      const sectionBottom = sectionTop + rect.height;
      
      if (scrollY >= sectionTop && scrollY < sectionBottom) {
        return section.id;
      }
    }
    
    return 'home';
  }

  // Documentation Tracking
  trackDocumentationView(docId, category, title) {
    if (!this.isEnabled) return;

    try {
      this.trackEvent('documentation_view', {
        doc_id: docId,
        doc_category: category,
        doc_title: title,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error tracking documentation view:', error);
    }
  }

  trackDocumentationSearch(query, results, category = null) {
    if (!this.isEnabled) return;

    try {
      this.trackEvent('documentation_search', {
        search_term: query,
        search_results: results,
        search_category: category,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error tracking documentation search:', error);
    }
  }

  trackDocumentationBookmark(docId, action = 'add') {
    if (!this.isEnabled) return;

    try {
      this.trackEvent('documentation_bookmark', {
        doc_id: docId,
        action: action, // 'add' or 'remove'
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error tracking documentation bookmark:', error);
    }
  }

  trackDocumentationFeedback(docId, rating, category) {
    if (!this.isEnabled) return;

    try {
      this.trackEvent('documentation_feedback', {
        doc_id: docId,
        rating: rating,
        feedback_category: category,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error tracking documentation feedback:', error);
    }
  }

  // User Interaction Tracking
  trackButtonClick(buttonName, section = null) {
    if (!this.isEnabled) return;

    try {
      this.trackEvent('button_click', {
        button_name: buttonName,
        section: section || this.getCurrentPage(),
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error tracking button click:', error);
    }
  }

  trackLinkClick(linkUrl, linkText, isExternal = false) {
    if (!this.isEnabled) return;

    try {
      this.trackEvent('link_click', {
        link_url: linkUrl,
        link_text: linkText,
        is_external: isExternal,
        section: this.getCurrentPage(),
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error tracking link click:', error);
    }
  }

  trackFormSubmission(formName, success = true, errorMessage = null) {
    if (!this.isEnabled) return;

    try {
      this.trackEvent('form_submission', {
        form_name: formName,
        success: success,
        error_message: errorMessage,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error tracking form submission:', error);
    }
  }

  // Engagement Tracking
  setupScrollTracking() {
    let maxScroll = 0;
    let scrollMilestones = [25, 50, 75, 90, 100];
    let trackedMilestones = new Set();

    const trackScroll = () => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      );
      
      maxScroll = Math.max(maxScroll, scrollPercent);
      
      scrollMilestones.forEach(milestone => {
        if (scrollPercent >= milestone && !trackedMilestones.has(milestone)) {
          trackedMilestones.add(milestone);
          this.trackEvent('scroll_depth', {
            percent: milestone,
            page: this.getCurrentPage()
          });
        }
      });
    };

    let scrollTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(trackScroll, 100);
    });
  }

  setupTimeTracking() {
    const trackTimeOnPage = () => {
      const timeSpent = Math.round((Date.now() - this.sessionStartTime) / 1000);
      
      if (timeSpent > 0 && timeSpent % 30 === 0) { // Track every 30 seconds
        this.trackEvent('time_on_page', {
          seconds: timeSpent,
          page: this.getCurrentPage()
        });
      }
    };

    setInterval(trackTimeOnPage, 30000); // Check every 30 seconds
  }

  setupClickTracking() {
    document.addEventListener('click', (event) => {
      const target = event.target.closest('a, button');
      if (!target) return;

      const tagName = target.tagName.toLowerCase();
      
      if (tagName === 'a') {
        const href = target.href;
        const text = target.textContent.trim();
        const isExternal = href && !href.startsWith(window.location.origin);
        
        this.trackLinkClick(href, text, isExternal);
      } else if (tagName === 'button') {
        const buttonName = target.id || target.className || target.textContent.trim();
        this.trackButtonClick(buttonName);
      }
    });
  }

  // Generic Event Tracking
  trackEvent(eventName, parameters = {}) {
    if (!this.isEnabled) return;

    try {
      // Add common parameters
      const eventData = {
        ...parameters,
        page_section: this.getCurrentPage(),
        user_agent: navigator.userAgent,
        screen_resolution: `${screen.width}x${screen.height}`,
        viewport_size: `${window.innerWidth}x${window.innerHeight}`
      };

      logEvent(analytics, eventName, eventData);
      
      // Store for potential batch processing
      this.userInteractions.push({
        event: eventName,
        data: eventData,
        timestamp: Date.now()
      });

      // Keep only last 100 interactions
      if (this.userInteractions.length > 100) {
        this.userInteractions = this.userInteractions.slice(-100);
      }
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  }

  // Custom Events for Forge EC
  trackCodeCopy(codeType, section) {
    this.trackEvent('code_copy', {
      code_type: codeType,
      section: section
    });
  }

  trackThemeToggle(newTheme) {
    this.trackEvent('theme_toggle', {
      new_theme: newTheme
    });
  }

  trackGitHubStatsView() {
    this.trackEvent('github_stats_view', {
      section: 'hero'
    });
  }

  trackContactFormView() {
    this.trackEvent('contact_form_view');
  }

  trackAuthAction(action, method = null) {
    this.trackEvent('auth_action', {
      action: action, // 'signin', 'signup', 'signout'
      method: method  // 'google', 'github', 'email'
    });
  }

  // Performance Tracking
  trackPerformance() {
    if (!this.isEnabled) return;

    try {
      // Track page load performance
      window.addEventListener('load', () => {
        setTimeout(() => {
          const navigation = performance.getEntriesByType('navigation')[0];
          
          if (navigation) {
            this.trackEvent('page_performance', {
              load_time: Math.round(navigation.loadEventEnd - navigation.loadEventStart),
              dom_content_loaded: Math.round(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart),
              first_paint: Math.round(navigation.responseEnd - navigation.requestStart)
            });
          }
        }, 1000);
      });
    } catch (error) {
      console.error('Error tracking performance:', error);
    }
  }

  // Get Analytics Data (for admin dashboard)
  getSessionData() {
    return {
      sessionStartTime: this.sessionStartTime,
      currentPage: this.getCurrentPage(),
      pageViews: Object.fromEntries(this.pageViews),
      interactions: this.userInteractions.slice(-10), // Last 10 interactions
      timeSpent: Math.round((Date.now() - this.sessionStartTime) / 1000)
    };
  }
}

// Export singleton instance
export const firebaseAnalyticsService = new FirebaseAnalyticsService();
export default firebaseAnalyticsService;
