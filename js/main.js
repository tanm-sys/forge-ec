// ===== MAIN APPLICATION JAVASCRIPT WITH FIREBASE INTEGRATION =====

import { firebaseAuthService } from './firebase-auth.js';
import { firebaseDocsService } from './firebase-docs.js';
import { firebaseAnalyticsService } from './firebase-analytics.js';
import { firebaseUI } from './firebase-ui.js';

class ForgeECApp {
  constructor() {
    this.isLoaded = false;
    this.currentTheme = 'light';
    this.scrollPosition = 0;
    this.isScrolling = false;
    this.firebaseInitialized = false;

    this.init();
  }

  async init() {
    // Initialize core functionality
    this.setupEventListeners();
    this.initializeTheme();
    this.setupScrollEffects();
    this.setupNavigation();
    this.setupAnimations();

    // Initialize Firebase services
    await this.initializeFirebase();

    // Load external data
    await this.loadGitHubData();

    // Hide loading screen
    this.hideLoadingScreen();

    // Initialize scroll-triggered animations
    this.initScrollAnimations();

    console.log('🦀 Forge EC website with Firebase initialized successfully!');
  }

  async initializeFirebase() {
    try {
      console.log('🔥 Initializing Firebase services...');

      // Firebase services are already initialized via imports
      // Set up Firebase-specific event tracking
      this.setupFirebaseTracking();

      // Initialize real-time documentation updates
      this.setupRealtimeDocumentation();

      this.firebaseInitialized = true;
      console.log('✅ Firebase services initialized successfully');
    } catch (error) {
      console.warn('⚠️ Firebase initialization failed, continuing with fallback:', error);
      this.firebaseInitialized = false;
    }
  }

  setupFirebaseTracking() {
    // Track theme changes
    const originalToggleTheme = this.toggleTheme.bind(this);
    this.toggleTheme = () => {
      originalToggleTheme();
      firebaseAnalyticsService.trackThemeToggle(this.currentTheme);
    };

    // Track section navigation
    const originalScrollToSection = this.scrollToSection.bind(this);
    this.scrollToSection = (sectionId) => {
      originalScrollToSection(sectionId);
      firebaseAnalyticsService.trackPageView(sectionId);
    };

    // Track code copying
    const originalCopyToClipboard = this.copyToClipboard.bind(this);
    this.copyToClipboard = (button) => {
      originalCopyToClipboard(button);
      const codeType = button.closest('.code-block')?.querySelector('.code-title')?.textContent || 'unknown';
      firebaseAnalyticsService.trackCodeCopy(codeType, this.getCurrentSection());
    };
  }

  setupRealtimeDocumentation() {
    // Subscribe to documentation updates
    firebaseDocsService.subscribeToDocumentation(null, (docs) => {
      console.log('📚 Documentation updated:', docs.length, 'documents');
      this.updateDocumentationUI(docs);
    });
  }

  updateDocumentationUI(docs) {
    // Update documentation search with new content
    if (window.docsSearch) {
      // Add Firebase docs to search
      docs.forEach(doc => {
        window.docsSearch.addDoc({
          id: doc.id,
          title: doc.title,
          description: doc.description || doc.content?.substring(0, 200) || '',
          category: doc.category,
          level: doc.level || 'Intermediate',
          keywords: doc.keywords || [],
          url: `#${doc.id}`
        });
      });
    }
  }

  getCurrentSection() {
    const hash = window.location.hash.substring(1);
    if (hash) return hash;

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

  setupEventListeners() {
    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => this.toggleTheme());
    }

    // Mobile menu toggle with enhanced functionality
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const navMenu = document.getElementById('nav-menu');
    if (mobileMenuToggle && navMenu) {
      mobileMenuToggle.addEventListener('click', () => {
        this.toggleMobileMenu();
      });

      // Close mobile menu when clicking outside
      document.addEventListener('click', (e) => {
        if (!navMenu.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
          this.closeMobileMenu();
        }
      });

      // Close mobile menu on escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.closeMobileMenu();
        }
      });

      // Close mobile menu when clicking nav links
      const navLinks = navMenu.querySelectorAll('.nav-link');
      navLinks.forEach(link => {
        link.addEventListener('click', () => {
          this.closeMobileMenu();
        });
      });
    }

    // Navigation links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        this.scrollToSection(targetId);
        this.setActiveNavLink(link);
      });
    });

    // CTA buttons
    const getStartedBtn = document.getElementById('get-started-btn');
    const liveDemoBtn = document.getElementById('live-demo-btn');

    if (getStartedBtn) {
      getStartedBtn.addEventListener('click', () => this.scrollToSection('docs'));
    }

    if (liveDemoBtn) {
      liveDemoBtn.addEventListener('click', () => this.openLiveDemo());
    }

    // Copy buttons
    const copyButtons = document.querySelectorAll('.copy-btn');
    copyButtons.forEach(btn => {
      btn.addEventListener('click', () => this.copyToClipboard(btn));
    });

    // Window events
    window.addEventListener('scroll', () => this.handleScroll());
    window.addEventListener('resize', () => this.handleResize());

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));
  }

  initializeTheme() {
    // Check for saved theme or system preference
    const savedTheme = localStorage.getItem('forge-ec-theme');
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

    this.currentTheme = savedTheme || systemTheme;
    this.applyTheme(this.currentTheme);

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem('forge-ec-theme')) {
        this.currentTheme = e.matches ? 'dark' : 'light';
        this.applyTheme(this.currentTheme);
      }
    });
  }

  toggleTheme() {
    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.applyTheme(this.currentTheme);
    localStorage.setItem('forge-ec-theme', this.currentTheme);
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);

    // Update theme toggle icon
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.setAttribute('aria-label', `Switch to ${theme === 'light' ? 'dark' : 'light'} theme`);
    }
  }

  setupScrollEffects() {
    // Throttled scroll handler
    let ticking = false;

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          this.updateScrollEffects();
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  updateScrollEffects() {
    const scrollY = window.scrollY;
    const navbar = document.getElementById('navbar');

    // Update navbar appearance
    if (navbar) {
      if (scrollY > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    }

    // Update parallax effects
    this.updateParallax(scrollY);

    // Update active navigation
    this.updateActiveNavigation(scrollY);
  }

  updateParallax(scrollY) {
    const parallaxElements = document.querySelectorAll('.parallax');

    parallaxElements.forEach(element => {
      const speed = element.dataset.speed || 0.5;
      const yPos = -(scrollY * speed);
      element.style.transform = `translateY(${yPos}px)`;
    });
  }

  updateActiveNavigation(scrollY) {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    let currentSection = '';

    sections.forEach(section => {
      const sectionTop = section.offsetTop - 100;
      const sectionHeight = section.offsetHeight;

      if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
        currentSection = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${currentSection}`) {
        link.classList.add('active');
      }
    });
  }

  setupNavigation() {
    // Smooth scrolling for anchor links
    const links = document.querySelectorAll('a[href^="#"]');

    links.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        if (targetId) {
          this.scrollToSection(targetId);
        }
      });
    });
  }

  scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
      const offsetTop = section.offsetTop - 80; // Account for fixed navbar

      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      });
    }
  }

  setActiveNavLink(activeLink) {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => link.classList.remove('active'));
    activeLink.classList.add('active');
  }

  setupAnimations() {
    // Initialize intersection observer for scroll animations
    this.observeElements();

    // Setup magnetic hover effects
    this.setupMagneticEffects();

    // Setup ripple effects
    this.setupRippleEffects();
  }

  observeElements() {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animated');

          // Add stagger effect for child elements
          const staggerItems = entry.target.querySelectorAll('.stagger-item');
          staggerItems.forEach((item, index) => {
            setTimeout(() => {
              item.classList.add('animated');
            }, index * 100);
          });
        }
      });
    }, observerOptions);

    // Observe elements with animation classes
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    animatedElements.forEach(el => this.observer.observe(el));
  }

  setupMagneticEffects() {
    const magneticElements = document.querySelectorAll('.magnetic');

    magneticElements.forEach(element => {
      element.addEventListener('mousemove', (e) => {
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
  }

  setupRippleEffects() {
    const rippleElements = document.querySelectorAll('.ripple');

    rippleElements.forEach(element => {
      element.addEventListener('click', (e) => {
        const rect = element.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const ripple = document.createElement('span');
        ripple.className = 'ripple-effect';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';

        element.appendChild(ripple);

        setTimeout(() => {
          ripple.remove();
        }, 600);
      });
    });
  }

  async loadGitHubData() {
    try {
      console.log('🚀 Initializing GitHub data loading...');

      // Load GitHub data asynchronously without blocking page load
      if (window.GitHubAPI) {
        // Don't await this to prevent blocking page initialization
        window.GitHubAPI.loadRepositoryData().catch(error => {
          console.warn('GitHub data loading failed:', error);
        });
      } else {
        console.warn('GitHubAPI not available, will retry when loaded');

        // Retry when GitHubAPI becomes available
        const checkGitHubAPI = () => {
          if (window.GitHubAPI) {
            console.log('🔄 GitHubAPI now available, loading data...');
            window.GitHubAPI.loadRepositoryData().catch(error => {
              console.warn('GitHub data loading failed on retry:', error);
            });
          } else {
            setTimeout(checkGitHubAPI, 100);
          }
        };
        setTimeout(checkGitHubAPI, 100);
      }
    } catch (error) {
      console.warn('Failed to initialize GitHub data loading:', error);
    }
  }

  hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      setTimeout(() => {
        loadingScreen.classList.add('hidden');
        setTimeout(() => {
          loadingScreen.remove();
        }, 500);
      }, 2000); // Show loading for at least 2 seconds
    }
  }

  initScrollAnimations() {
    // Initialize scroll-triggered animations after loading
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    animatedElements.forEach((element, index) => {
      setTimeout(() => {
        if (this.isElementInViewport(element)) {
          element.classList.add('animated');
        }
      }, index * 100);
    });
  }

  isElementInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  copyToClipboard(button) {
    const textToCopy = button.getAttribute('data-copy');

    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        this.showCopyFeedback(button);
      });
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = textToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      this.showCopyFeedback(button);
    }
  }

  showCopyFeedback(button) {
    const originalHTML = button.innerHTML;
    button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 6L9 17l-5-5"/></svg>';
    button.style.color = 'var(--color-success)';

    setTimeout(() => {
      button.innerHTML = originalHTML;
      button.style.color = '';
    }, 2000);
  }

  openLiveDemo() {
    // This will open a modal with live demo
    console.log('Opening live demo...');
    // Implementation will be added later
  }

  handleScroll() {
    this.scrollPosition = window.scrollY;

    if (!this.isScrolling) {
      this.isScrolling = true;
      requestAnimationFrame(() => {
        this.updateScrollEffects();
        this.isScrolling = false;
      });
    }
  }

  handleResize() {
    // Handle responsive behavior
    const mobileBreakpoint = 768;
    const isMobile = window.innerWidth < mobileBreakpoint;

    // Update mobile menu state
    const navMenu = document.getElementById('nav-menu');
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');

    if (!isMobile && navMenu) {
      navMenu.classList.remove('active');
      if (mobileMenuToggle) {
        mobileMenuToggle.classList.remove('active');
      }
    }
  }

  toggleMobileMenu() {
    const navMenu = document.getElementById('nav-menu');
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');

    if (navMenu && mobileMenuToggle) {
      const isActive = navMenu.classList.contains('active');

      if (isActive) {
        this.closeMobileMenu();
      } else {
        this.openMobileMenu();
      }
    }
  }

  openMobileMenu() {
    const navMenu = document.getElementById('nav-menu');
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');

    if (navMenu && mobileMenuToggle) {
      navMenu.classList.add('active');
      mobileMenuToggle.classList.add('active');
      mobileMenuToggle.setAttribute('aria-expanded', 'true');

      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden';

      // Focus first nav link for accessibility
      const firstNavLink = navMenu.querySelector('.nav-link');
      if (firstNavLink) {
        setTimeout(() => firstNavLink.focus(), 100);
      }
    }
  }

  closeMobileMenu() {
    const navMenu = document.getElementById('nav-menu');
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');

    if (navMenu && mobileMenuToggle) {
      navMenu.classList.remove('active');
      mobileMenuToggle.classList.remove('active');
      mobileMenuToggle.setAttribute('aria-expanded', 'false');

      // Restore body scroll
      document.body.style.overflow = '';
    }
  }

  handleKeyboard(e) {
    // Keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'k':
          e.preventDefault();
          // Focus search if available
          const searchInput = document.getElementById('docs-search');
          if (searchInput) {
            searchInput.focus();
          }
          break;
        case '/':
          e.preventDefault();
          // Focus search if available
          const docsSearch = document.getElementById('docs-search');
          if (docsSearch) {
            docsSearch.focus();
          }
          break;
      }
    }

    // Theme toggle with 't' key
    if (e.key === 't' && !e.ctrlKey && !e.metaKey) {
      const activeElement = document.activeElement;
      if (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
        this.toggleTheme();
      }
    }
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.forgeECApp = new ForgeECApp();
});

// Export for use in other modules
window.ForgeECApp = ForgeECApp;
