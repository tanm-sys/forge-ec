// ===== MAIN APPLICATION JAVASCRIPT WITH LOCALSTORAGE AUTH =====

// IMPORTANT: This is a client-side authentication system using localStorage.
// It is NOT secure for sensitive data and is intended for demonstration or
// simple personalization purposes on static sites only.
// User credentials are stored in the browser and are susceptible to XSS attacks.

class ForgeECApp {
  constructor() {
    this.isLoaded = false;
    this.currentTheme = 'light';
    this.scrollPosition = 0;
    this.isScrolling = false;

    this.init();
  }

  async init() {
    // Initialize core functionality
    this.updateLoadingProgress(10);
    this.setupEventListeners();

    this.updateLoadingProgress(20);
    this.initializeTheme();

    this.updateLoadingProgress(30);
    this.setupScrollEffects();

    this.updateLoadingProgress(40);
    this.setupNavigation();

    this.updateLoadingProgress(50);
    this.setupAnimations();

    // Initialize Firebase services
    this.updateLoadingProgress(60);
    await this.initializeFirebase();

    // Load external data
    this.updateLoadingProgress(80);
    await this.loadGitHubData();

    // Initialize scroll-triggered animations
    this.updateLoadingProgress(90);
    this.initScrollAnimations();

    // Hide loading screen
    this.hideLoadingScreen();

    console.log('🦀 Forge EC website with Firebase initialized successfully!');
  }

  async initializeFirebase() {
    try {
      console.log('🔥 Initializing Firebase services...');

      // Wait for Firebase to be ready with improved timeout handling
      if (window.firebaseInitialized) {
        // Firebase services are already initialized
        this.setupFirebaseAuth();
        this.firebaseInitialized = true;
        console.log('✅ Firebase services already initialized');
      } else {
        // Wait for Firebase ready event with race condition protection
        const firebaseReady = new Promise((resolve, reject) => {
          let resolved = false;
          let checkCount = 0;
          const maxChecks = 100; // Maximum 10 seconds (100 * 100ms)

          const checkFirebase = () => {
            if (resolved) return; // Prevent multiple resolutions

            checkCount++;
            if (window.firebaseInitialized) {
              resolved = true;
              resolve();
            } else if (checkCount >= maxChecks) {
              resolved = true;
              reject(new Error('Firebase initialization timeout'));
            } else {
              setTimeout(checkFirebase, 100);
            }
          };

          // Listen for Firebase ready event
          const handleFirebaseReady = () => {
            if (!resolved) {
              resolved = true;
              resolve();
            }
          };

          window.addEventListener('firebaseReady', handleFirebaseReady, { once: true });

          // Start checking periodically
          setTimeout(checkFirebase, 100);
        });

        await firebaseReady;

        if (window.firebaseInitialized) {
          this.setupFirebaseAuth();
          this.firebaseInitialized = true;
          console.log('✅ Firebase services initialized successfully (delayed)');
        } else {
          throw new Error('Firebase failed to initialize within timeout');
        }
      }
    } catch (error) {
      console.warn(`⚠️ Firebase initialization failed: ${error.message}. Falling back to localStorage authentication. Some features may be limited.`);
      this.firebaseInitialized = false;
      // Still create auth modal for UI consistency, but without Firebase functionality
      this.createAuthModal(); // Ensure modal is created for fallback
      this.setupFallbackAuth();
    }
  }

  setupFirebaseAuth() {
    // Initialize Firebase Authentication
    if (this.firebaseInitialized && window.firebaseAuth) {
      this.initializeAuth();
      this.createAuthModal(); // Create modal if not already created
      this.setupAuthEventListeners(); // Setup listeners for Firebase auth
    } else {
      console.log('Firebase not initialized, Firebase Auth setup skipped.');
      // Fallback auth should have already been set up by initializeFirebase
      // but ensure modal and listeners are ready for localStorage auth
      if (!document.getElementById('auth-modal')) {
        this.createAuthModal();
      }
      this.setupAuthEventListeners(); // Ensure listeners are setup for fallback
    }
  }

  async initializeAuth() {
    if (!window.firebaseAuth) {
      console.warn('Firebase Auth service (window.firebaseAuth) is not available. Firebase auth features will be disabled.');
      this.authModule = null;
      // No need to call setupFallbackAuth here as initializeFirebase handles it
      return;
    }

    try {
      // Import Firebase Auth functions dynamically with timeout
      console.log('📦 Loading Firebase Auth module...');

      const authModulePromise = import('https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js');
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Auth module load timeout')), 5000); // 5-second timeout
      });

      const authModule = await Promise.race([authModulePromise, timeoutPromise]);
      this.authModule = authModule;
      console.log('✅ Firebase Auth module loaded successfully');

      // Set up auth state listener with error handling
      try {
        authModule.onAuthStateChanged(window.firebaseAuth, (user) => {
          this.currentUser = user;
          this.updateAuthUI(); // This will handle UI for both Firebase and fallback users

          if (user) {
            console.log('👤 Firebase user signed in:', user.email);
          } else {
            console.log('👤 Firebase user signed out or no user.');
          }
        });
      } catch (listenerError) {
        console.warn('⚠️ Failed to set up Firebase auth state listener:', listenerError);
        // Potentially fallback or notify user if this is critical
      }
    } catch (error) {
      console.warn('⚠️ Failed to load Firebase Auth module:', error);
      this.authModule = null;
      // Fallback to localStorage auth should be handled by initializeFirebase
    }
  }

  createAuthModal() {
    // Prevent duplicate modal creation
    const existingModal = document.getElementById('auth-modal');
    if (existingModal) {
      console.log('🔄 Auth modal already exists, skipping creation');
      return;
    }

    // Also check for any existing modals with auth forms to prevent ID conflicts
    const existingAuthForms = document.querySelectorAll('#email-signin-form, #email-signup-form');
    if (existingAuthForms.length > 0) {
      console.log('🔄 Auth forms already exist, removing duplicates before creating new modal');
      existingAuthForms.forEach(form => {
        const modal = form.closest('.modal-overlay');
        if (modal) modal.remove();
      });
    }

    const modalHTML = `
      <div id="auth-modal" class="modal-overlay" style="display: none;">
        <div class="modal-content glass-enhanced">
          <div class="modal-header">
            <h3 class="modal-title">Sign In to Forge EC</h3>
            <button class="modal-close" id="auth-modal-close">&times;</button>
          </div>

          <div class="modal-body">
            <div class="auth-tabs">
              <button class="auth-tab active" data-tab="signin">Sign In</button>
              <button class="auth-tab" data-tab="signup">Sign Up</button>
            </div>

            <div class="auth-content">
              <!-- Sign In Form -->
              <div id="signin-form" class="auth-form active">
                <!-- Social auth buttons removed -->
                <div class="divider">
                  <span>Sign in with your email</span>
                </div>

                <form id="email-signin-form">
                  <div class="form-group">
                    <input type="email" id="signin-email" placeholder="Email address" required>
                  </div>
                  <div class="form-group">
                    <input type="password" id="signin-password" placeholder="Password" required>
                  </div>
                  <button type="submit" class="auth-submit-btn">Sign In</button>
                </form>

                <div class="auth-links">
                  <a href="#" id="forgot-password">Forgot password?</a>
                </div>
              </div>

              <!-- Sign Up Form -->
              <div id="signup-form" class="auth-form">
                 <div class="divider">
                  <span>Create an account</span>
                </div>
                <form id="email-signup-form">
                  <div class="form-group">
                    <input type="text" id="signup-name" placeholder="Full name" required>
                  </div>
                  <div class="form-group">
                    <input type="email" id="signup-email" placeholder="Email address" required>
                  </div>
                  <div class="form-group">
                    <input type="password" id="signup-password" placeholder="Password (min 6 characters)" required>
                  </div>
                  <button type="submit" class="auth-submit-btn">Create Account</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    console.log('✅ Auth modal created successfully');
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

  setupAuthEventListeners() {
    // Prevent multiple event listener registrations
    if (this.authEventListenersSetup) {
      console.log('🔄 Auth event listeners already setup, skipping...');
      return;
    }

    console.log('🎯 Setting up authentication event listeners...');

    // Create a single delegated event listener for all auth-related clicks
    this.authClickHandler = (e) => {
      try {
        // Auth trigger button
        if (e.target.matches('#auth-trigger') || e.target.closest('#auth-trigger')) {
          e.preventDefault();
          e.stopPropagation();
          console.log('🔐 Auth trigger clicked');
          this.showAuthModal();
          return;
        }

        // Modal close events
        if (e.target.matches('#auth-modal-close')) {
          e.preventDefault();
          this.hideAuthModal();
          return;
        }

        if (e.target.matches('#auth-modal') && !e.target.closest('.modal-content')) {
          e.preventDefault();
          this.hideAuthModal();
          return;
        }

        // Tab switching
        if (e.target.matches('.auth-tab')) {
          e.preventDefault();
          this.switchAuthTab(e.target.dataset.tab);
          return;
        }

        // Social auth buttons are removed, so no listeners for them.

        // Forgot password link
        if (e.target.matches('#forgot-password')) {
          e.preventDefault();
          this.handleForgotPassword();
          return;
        }

        // User menu events
        if (e.target.matches('#user-menu-btn') || e.target.closest('#user-menu-btn')) {
          e.preventDefault();
          this.toggleUserMenu();
          return;
        }

        if (e.target.matches('#user-signout') || e.target.closest('#user-signout')) {
          e.preventDefault();
          this.handleSignOut();
          return;
        }
      } catch (error) {
        console.error('Error in auth click handler:', error);
      }
    };

    // Form submission handler
    this.authSubmitHandler = (e) => {
      try {
        if (e.target.matches('#email-signin-form')) {
          e.preventDefault();
          this.handleEmailSignIn(e);
          return;
        }

        if (e.target.matches('#email-signup-form')) {
          e.preventDefault();
          this.handleEmailSignUp(e);
          return;
        }
      } catch (error) {
        console.error('Error in auth submit handler:', error);
      }
    };

    // Register event listeners
    document.addEventListener('click', this.authClickHandler);
    document.addEventListener('submit', this.authSubmitHandler);

    // Mark as setup to prevent duplicates
    this.authEventListenersSetup = true;
    console.log('✅ Auth event listeners setup complete');
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
    // Use centralized scroll system if available
    if (window.smoothScrollSystem) {
      window.smoothScrollSystem.addScrollListener('main-app', (data) => {
        this.updateScrollEffects(data.scroll || window.scrollY);
      });
      return;
    }

    // Fallback: Optimized throttled scroll handler
    let ticking = false;
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Skip if scroll position hasn't changed significantly
      if (Math.abs(currentScrollY - lastScrollY) < 1) return;

      if (!ticking) {
        requestAnimationFrame(() => {
          this.updateScrollEffects(currentScrollY);
          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
  }

  updateScrollEffects(scrollY = window.scrollY) {
    const navbar = document.getElementById('navbar');

    // Update navbar appearance with will-change optimization
    if (navbar) {
      if (scrollY > 50) {
        if (!navbar.classList.contains('scrolled')) {
          navbar.style.willChange = 'transform, backdrop-filter';
          navbar.classList.add('scrolled');
        }
      } else {
        if (navbar.classList.contains('scrolled')) {
          navbar.classList.remove('scrolled');
          // Remove will-change after transition
          setTimeout(() => {
            navbar.style.willChange = 'auto';
          }, 300);
        }
      }
    }

    // Update parallax effects with performance optimization
    this.updateParallax(scrollY);

    // Update active navigation
    this.updateActiveNavigation(scrollY);
  }

  updateParallax(scrollY) {
    const parallaxElements = document.querySelectorAll('.parallax');

    // Use will-change for better performance
    parallaxElements.forEach(element => {
      const speed = parseFloat(element.dataset.speed) || 0.5;
      const yPos = -(scrollY * speed);

      // Only update if element is in viewport or near it
      const rect = element.getBoundingClientRect();
      const isNearViewport = rect.bottom > -200 && rect.top < window.innerHeight + 200;

      if (isNearViewport) {
        if (!element.style.willChange) {
          element.style.willChange = 'transform';
        }
        element.style.transform = `translate3d(0, ${yPos}px, 0)`;
      } else if (element.style.willChange) {
        element.style.willChange = 'auto';
      }
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
      if (window.forgeGitHubAPI) {
        // Don't await this to prevent blocking page initialization
        window.forgeGitHubAPI.loadRepositoryData().catch(error => {
          console.warn('GitHub data loading failed:', error);
        });
      } else {
        console.warn('GitHubAPI not available, will retry when loaded');

        // Retry when GitHubAPI becomes available
        const checkGitHubAPI = () => {
          if (window.forgeGitHubAPI) {
            console.log('🔄 GitHubAPI now available, loading data...');
            window.forgeGitHubAPI.loadRepositoryData().catch(error => {
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
      console.log('🎯 Hiding loading screen...');

      // Update progress bar to 100% before hiding
      this.updateLoadingProgress(100);

      // Reduce loading time and ensure it always hides
      setTimeout(() => {
        loadingScreen.classList.add('hidden');
        // Announce to screen readers that loading is complete
        loadingScreen.setAttribute('aria-hidden', 'true');
        console.log('✅ Loading screen hidden');

        setTimeout(() => {
          loadingScreen.remove();
          console.log('🗑️ Loading screen removed from DOM');

          // Announce that the page is ready
          this.announceToScreenReader('Page loaded successfully');
        }, 500);
      }, 1000); // Reduced from 2 seconds to 1 second
    } else {
      console.warn('⚠️ Loading screen element not found');
    }
  }

  updateLoadingProgress(percentage) {
    try {
      const progressBar = document.querySelector('.loading-progress');
      const progressBarFill = document.querySelector('.progress-bar');

      if (progressBar && progressBarFill) {
        progressBar.setAttribute('aria-valuenow', percentage);
        progressBarFill.style.width = `${percentage}%`;

        // Update screen reader announcement
        if (percentage === 100) {
          progressBar.setAttribute('aria-label', 'Loading complete');
        } else {
          progressBar.setAttribute('aria-label', `Loading ${percentage}% complete`);
        }
      }
    } catch (error) {
      console.warn('Failed to update loading progress:', error);
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

  createLiveDemoModal() {
    // Prevent duplicate modal creation
    const existingModal = document.getElementById('live-demo-modal');
    if (existingModal) {
      return existingModal;
    }

    const modalId = 'live-demo-modal';
    const titleId = 'live-demo-modal-title';

    const modalHTML = `
      <div id="${modalId}" class="modal-overlay" style="display: none;" role="dialog" aria-modal="true" aria-labelledby="${titleId}">
        <div class="modal-content glass-enhanced">
          <div class="modal-header">
            <h3 class="modal-title" id="${titleId}">Forge EC - Live Demo</h3>
            <button class="modal-close" id="live-demo-modal-close" aria-label="Close live demo modal">&times;</button>
          </div>
          <div class="modal-body">
            <p>Interactive live demo coming soon!</p>
            <p>Explore our code examples in the <a href="#examples" id="live-demo-examples-link">Examples section</a> for now.</p>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const newModal = document.getElementById('live-demo-modal');

    // Add event listener for the close button
    const closeButton = newModal.querySelector('#live-demo-modal-close');
    closeButton.addEventListener('click', () => this.closeLiveDemoModal());

    // Add event listener for the examples link to also close the modal
    const examplesLink = newModal.querySelector('#live-demo-examples-link');
    examplesLink.addEventListener('click', () => this.closeLiveDemoModal());


    console.log('✅ Live Demo modal created successfully');
    return newModal;
  }

  openLiveDemo() {
    console.log('🚀 Opening live demo modal...');
    const modal = this.createLiveDemoModal(); // Ensures modal is created

    if (modal) {
      modal.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(() => {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Prevent background scrolling

        modal.style.opacity = '0';
        requestAnimationFrame(() => {
          modal.style.transition = 'opacity 0.3s ease';
          modal.style.opacity = '1';
        });

        const closeButton = modal.querySelector('#live-demo-modal-close');
        if(closeButton) this.manageFocus(closeButton); // Focus the close button or first focusable element

      });

      // Add event listeners for Escape key and click outside
      document.addEventListener('keydown', this.handleLiveDemoEscapeKey, true);
      document.addEventListener('click', this.handleClickOutsideLiveDemo, true);
    }
  }

  closeLiveDemoModal() {
    console.log('🚪 Closing live demo modal...');
    const modal = document.getElementById('live-demo-modal');
    if (modal) {
      modal.setAttribute('aria-hidden', 'true');
      // Add fade-out animation
      modal.style.transition = 'opacity 0.3s ease';
      modal.style.opacity = '0';

      setTimeout(() => {
        modal.style.display = 'none';
        document.body.style.overflow = ''; // Restore background scrolling
      }, 300); // Duration of the opacity transition

      document.removeEventListener('keydown', this.handleLiveDemoEscapeKey, true);
      document.removeEventListener('click', this.handleClickOutsideLiveDemo, true);
    }
  }

  handleLiveDemoEscapeKey = (event) => {
    if (event.key === 'Escape') {
      this.closeLiveDemoModal();
    }
  }

  handleClickOutsideLiveDemo = (event) => {
    const modalContent = document.querySelector('#live-demo-modal .modal-content');
    if (modalContent && !modalContent.contains(event.target) && event.target.id !== 'live-demo-btn' && !event.target.closest('#live-demo-btn')) {
      // Check if the click is outside modal-content AND not on the trigger button
      this.closeLiveDemoModal();
    }
  }

  handleScroll() {
    // This method is kept for backward compatibility
    // Actual scroll handling is now done through setupScrollEffects()
    this.scrollPosition = window.scrollY;
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

      // Update ARIA label
      mobileMenuToggle.setAttribute('aria-label', 'Close navigation menu');

      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden';

      // Focus first nav link for accessibility
      const firstNavLink = navMenu.querySelector('.nav-link');
      if (firstNavLink) {
        setTimeout(() => {
          this.manageFocus(firstNavLink);
          this.announceToScreenReader('Navigation menu opened');
        }, 100);
      }

      // Trap focus within the menu
      this.trapFocus(navMenu);
    }
  }

  closeMobileMenu() {
    const navMenu = document.getElementById('nav-menu');
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');

    if (navMenu && mobileMenuToggle) {
      navMenu.classList.remove('active');
      mobileMenuToggle.classList.remove('active');
      mobileMenuToggle.setAttribute('aria-expanded', 'false');

      // Update ARIA label
      mobileMenuToggle.setAttribute('aria-label', 'Open navigation menu');

      // Restore body scroll
      document.body.style.overflow = '';

      // Return focus to menu toggle
      this.manageFocus(mobileMenuToggle);
      this.announceToScreenReader('Navigation menu closed');

      // Remove focus trap
      this.removeFocusTrap();
    }
  }

  // Focus trapping for accessibility
  trapFocus(container) {
    const focusableElements = container.querySelectorAll(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    this.focusTrapHandler = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', this.focusTrapHandler);
  }

  removeFocusTrap() {
    if (this.focusTrapHandler) {
      document.removeEventListener('keydown', this.focusTrapHandler);
      this.focusTrapHandler = null;
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

  // Authentication Methods
  showAuthModal() {
    try {
      console.log('🔐 Showing authentication modal...');

      // Prevent multiple modal openings
      if (this.isAuthModalOpen) {
        console.log('🔄 Auth modal already open, skipping...');
        return;
      }

      const modal = document.getElementById('auth-modal');
      if (!modal) {
        console.warn('⚠️ Auth modal not found, creating...');
        this.createAuthModal();
        // Try again after creation
        setTimeout(() => this.showAuthModal(), 100);
        return;
      }

      // Set loading state
      this.isAuthModalOpen = true;

      // Show modal with smooth animation
      requestAnimationFrame(() => {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        // Add fade-in animation
        modal.style.opacity = '0';
        requestAnimationFrame(() => {
          modal.style.transition = 'opacity 0.3s ease';
          modal.style.opacity = '1';

          // Focus the first visible input field in the active form
          const activeForm = modal.querySelector('.auth-form.active');
          if (activeForm) {
            const firstInput = activeForm.querySelector('input:not([type="hidden"]), button[type="submit"]');
            if (firstInput) {
              this.manageFocus(firstInput);
            }
          }
        });

        console.log('✅ Auth modal displayed successfully');
      });
    } catch (error) {
      console.error('❌ Error showing auth modal:', error);
      this.isAuthModalOpen = false;
    }
  }

  hideAuthModal() {
    try {
      console.log('🔐 Hiding authentication modal...');

      const modal = document.getElementById('auth-modal');
      if (modal) {
        // Add fade-out animation
        modal.style.transition = 'opacity 0.3s ease';
        modal.style.opacity = '0';

        setTimeout(() => {
          modal.style.display = 'none';
          document.body.style.overflow = '';
          this.isAuthModalOpen = false;
          console.log('✅ Auth modal hidden successfully');
        }, 300);
      } else {
        this.isAuthModalOpen = false;
      }
    } catch (error) {
      console.error('❌ Error hiding auth modal:', error);
      this.isAuthModalOpen = false;
    }
  }

  switchAuthTab(tab) {
    const tabs = document.querySelectorAll('.auth-tab');
    const forms = document.querySelectorAll('.auth-form');

    tabs.forEach(t => t.classList.remove('active'));
    forms.forEach(f => f.classList.remove('active'));

    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    document.getElementById(`${tab}-form`).classList.add('active');
  }

  async handleGoogleSignIn() {
    // Firebase specific logic removed
    this.showAuthFeedback('Google Sign-In is currently not available.', 'info');
    console.log('🔐 Google Sign-In clicked (feature disabled)');
  }

  async handleGitHubSignIn() {
    // Firebase specific logic removed
    this.showAuthFeedback('GitHub Sign-In is currently not available.', 'info');
    console.log('🔐 GitHub Sign-In clicked (feature disabled)');
  }

  async handleEmailSignIn(e) {
    const emailInput = document.getElementById('signin-email');
    const passwordInput = document.getElementById('signin-password');

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      this.handleAuthError('Please enter both email and password.');
      return;
    }

    let users = [];
    try {
      users = JSON.parse(localStorage.getItem('forgeECUsers')) || [];
    } catch (error) {
      console.error('Error parsing forgeECUsers from localStorage:', error);
      this.handleAuthError('Error accessing user data. Please try again or clear site data.');
      return;
    }

    const user = users.find(u => u.email === email);

    if (!user || user.password !== password) { // IMPORTANT: Never store/compare plain text passwords in a real app!
      this.handleAuthError('Invalid email or password.');
      return;
    }

    localStorage.setItem('forgeECCurrentUser', JSON.stringify({ email: user.email, name: user.name }));
    this.currentUser = { email: user.email, name: user.name };
    this.updateAuthUI();
    this.hideAuthModal();
    this.showAuthFeedback('Signed in successfully!', 'success');
    console.log('👤 User signed in:', user.email);
  }

  async handleEmailSignUp(e) {
    const nameInput = document.getElementById('signup-name');
    const emailInput = document.getElementById('signup-email');
    const passwordInput = document.getElementById('signup-password');

    const name = nameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value.trim();

    if (!name || !email || !password) {
      this.handleAuthError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      this.handleAuthError('Password must be at least 6 characters long.');
      return;
    }

    let users = [];
    try {
      users = JSON.parse(localStorage.getItem('forgeECUsers')) || [];
    } catch (error) {
      console.error('Error parsing forgeECUsers from localStorage:', error);
      this.handleAuthError('Error accessing user data. Please try again or clear site data.');
      return;
    }

    if (users.find(u => u.email === email)) {
      this.handleAuthError('An account with this email address already exists.');
      return;
    }

    const newUser = { name, email, password }; // IMPORTANT: Never store plain text passwords in a real app!
    users.push(newUser);
    localStorage.setItem('forgeECUsers', JSON.stringify(users));

    localStorage.setItem('forgeECCurrentUser', JSON.stringify({ email: newUser.email, name: newUser.name }));
    this.currentUser = { email: newUser.email, name: newUser.name };
    this.updateAuthUI();
    this.hideAuthModal();
    this.showAuthFeedback('Account created successfully!', 'success');
    console.log('👤 User account created:', newUser.email);
  }

  async handleForgotPassword() {
    this.showAuthFeedback('Password reset is not available in this version.', 'info');
    console.log('🔐 Password reset clicked (feature disabled)');
  }

  async handleSignOut() {
    localStorage.removeItem('forgeECCurrentUser');
    this.currentUser = null;
    this.updateAuthUI();
    this.showAuthFeedback('Signed out successfully', 'info');
    console.log('👤 User signed out');
  }

  updateAuthUI() {
    const storedUser = localStorage.getItem('forgeECCurrentUser');
    if (storedUser) {
      try {
        this.currentUser = JSON.parse(storedUser);
      } catch (error) {
        console.error('Error parsing forgeECCurrentUser from localStorage:', error);
        localStorage.removeItem('forgeECCurrentUser'); // Clear corrupted data
        this.currentUser = null;
      }
    } else {
      this.currentUser = null;
    }

    const authTrigger = document.getElementById('auth-trigger');
    const userMenuTrigger = document.getElementById('user-menu-trigger');

    if (this.currentUser) {
      if (authTrigger) authTrigger.style.display = 'none';
      if (userMenuTrigger) {
        userMenuTrigger.style.display = 'flex';
        this.updateUserProfile(); // This will also call ensureUserMenuDropdown

        // Set initial aria-expanded state for the menu button
        const menuButton = document.getElementById('user-menu-btn');
        if (menuButton) {
          // Check if dropdown exists and is visible to set correct initial state,
          // though it should typically be hidden initially.
          const dropdown = userMenuTrigger.querySelector('.user-menu-dropdown');
          const isDropdownVisible = dropdown && dropdown.style.display === 'block';
          menuButton.setAttribute('aria-expanded', isDropdownVisible ? 'true' : 'false');
        }
      }
    } else {
      if (authTrigger) authTrigger.style.display = 'block';
      if (userMenuTrigger) userMenuTrigger.style.display = 'none';
    }
  }

  updateUserProfile() {
    const user = this.currentUser;
    if (!user) return;

    const userMenuTrigger = document.getElementById('user-menu-trigger');
    if (!userMenuTrigger) return;

    let userInfo = userMenuTrigger.querySelector('.user-info');
    if (userInfo) { // Should always exist as per index.html structure
      userInfo.innerHTML = `
        <img src="/assets/default-avatar.png" alt="${user.name || user.email}" class="user-avatar">
        <span class="user-name">${user.name || user.email}</span>
      `;
    }

    // Ensure the dropdown menu is created
    this.ensureUserMenuDropdown();

    // Populate dropdown header if needed (already done by user-info for trigger)
    const dropdownUserEmail = userMenuTrigger.querySelector('.user-menu-dropdown-email');
    if (dropdownUserEmail) {
        dropdownUserEmail.textContent = user.email;
    }
    const dropdownUserName = userMenuTrigger.querySelector('.user-menu-dropdown-name');
     if (dropdownUserName) {
        dropdownUserName.textContent = user.name || 'User';
    }
  }

  ensureUserMenuDropdown() {
    const userMenuTrigger = document.getElementById('user-menu-trigger');
    if (!userMenuTrigger) return;

    let dropdown = userMenuTrigger.querySelector('.user-menu-dropdown');
    if (!dropdown) {
      const dropdownHTML = `
        <div class="user-menu-dropdown" style="display: none;">
          <div class="user-menu-header">
            <img src="/assets/default-avatar.png" alt="User Avatar" class="user-avatar-dropdown">
            <div class="user-menu-details">
              <span class="user-menu-dropdown-name">${this.currentUser.name || 'User'}</span>
              <span class="user-menu-dropdown-email">${this.currentUser.email}</span>
            </div>
          </div>
          <ul class="user-menu-list">
            <li><a href="#" id="user-profile">Profile</a></li>
            <li><a href="#" id="user-settings">Settings</a></li>
            <li><hr class="user-menu-divider"></li>
            <li><a href="#" id="user-signout-dropdown">Sign Out</a></li>
          </ul>
        </div>
      `;
      userMenuTrigger.insertAdjacentHTML('beforeend', dropdownHTML);
      // Re-query for the dropdown after inserting it
      dropdown = userMenuTrigger.querySelector('.user-menu-dropdown');

      // Add event listeners for the new items
      dropdown.querySelector('#user-profile').addEventListener('click', (e) => {
        e.preventDefault(); this.handleUserProfileClick(); this.closeUserMenu();
      });
      dropdown.querySelector('#user-settings').addEventListener('click', (e) => {
        e.preventDefault(); this.handleUserSettingsClick(); this.closeUserMenu();
      });
      // The #user-signout-dropdown will be handled by the main authClickHandler
      // but we need to ensure it also closes the menu.
       dropdown.querySelector('#user-signout-dropdown').addEventListener('click', (e) => {
        // Signout is handled by authClickHandler, just ensure menu closes
        this.closeUserMenu();
      });
    }
    return dropdown;
  }

  toggleUserMenu() {
    const userMenuTrigger = document.getElementById('user-menu-trigger');
    if (!userMenuTrigger) return;

    const dropdown = this.ensureUserMenuDropdown(); // Ensure dropdown exists
    if (!dropdown) return;

    const menuButton = document.getElementById('user-menu-btn');
    const isOpen = dropdown.style.display === 'block';

    if (isOpen) {
      this.closeUserMenu();
    } else {
      dropdown.style.display = 'block';
      menuButton.setAttribute('aria-expanded', 'true');
      // Add event listeners for click outside and Escape key
      document.addEventListener('click', this.handleClickOutsideUserMenu, true);
      document.addEventListener('keydown', this.handleEscapeKeyUserMenu, true);
      console.log('User menu opened');
    }
  }

  closeUserMenu() {
    const userMenuTrigger = document.getElementById('user-menu-trigger');
    if (!userMenuTrigger) return;

    const dropdown = userMenuTrigger.querySelector('.user-menu-dropdown');
    const menuButton = document.getElementById('user-menu-btn');

    if (dropdown && dropdown.style.display === 'block') {
      dropdown.style.display = 'none';
      if (menuButton) menuButton.setAttribute('aria-expanded', 'false');
      document.removeEventListener('click', this.handleClickOutsideUserMenu, true);
      document.removeEventListener('keydown', this.handleEscapeKeyUserMenu, true);
      console.log('User menu closed');
    }
  }

  handleClickOutsideUserMenu = (event) => {
    const userMenuTrigger = document.getElementById('user-menu-trigger');
    if (userMenuTrigger && !userMenuTrigger.contains(event.target)) {
      this.closeUserMenu();
    }
  }

  handleEscapeKeyUserMenu = (event) => {
    if (event.key === 'Escape') {
      this.closeUserMenu();
    }
  }

  handleUserProfileClick() {
    alert('Profile page coming soon!');
    console.log('User profile clicked');
  }

  handleUserSettingsClick() {
    alert('Settings page coming soon!');
    console.log('User settings clicked');
  }

  handleAuthError(errorMessage) {
    // Simplified error handling
    let message = typeof errorMessage === 'string' ? errorMessage : 'An authentication error occurred. Please try again.';
    this.showAuthFeedback(message, 'error');
    console.error('🚨 Authentication Error:', message);
  }

  showAuthFeedback(message, type = 'info') {
    // Create or update feedback element
    let feedback = document.getElementById('auth-feedback');

    if (!feedback) {
      feedback = document.createElement('div');
      feedback.id = 'auth-feedback';
      feedback.className = 'auth-feedback';
      document.body.appendChild(feedback);
    }

    feedback.className = `auth-feedback ${type}`;
    feedback.textContent = message;
    feedback.style.display = 'block';

    // Auto-hide after 5 seconds
    setTimeout(() => {
      feedback.style.display = 'none';
    }, 5000);
  }

  // Fallback Authentication System (when Firebase is not available)
  setupFallbackAuth() {
    console.log('🔄 Setting up fallback localStorage authentication system. Full authentication features require Firebase.');
    this.fallbackMode = true; // Indicate that we are in fallback mode

    // Ensure auth event listeners are set up for localStorage operations
    // This might be redundant if setupAuthEventListeners is called elsewhere,
    // but it's a safeguard.
    if (!this.authEventListenersSetup) {
        this.setupAuthEventListeners();
    }

    // Check for an existing user in localStorage and update UI
    // This is important if Firebase fails after the app has been used with localStorage auth
    const storedUser = localStorage.getItem('forgeECCurrentUser');
    if (storedUser) {
      try {
        this.currentUser = JSON.parse(storedUser);
        console.log('👤 Active user found in localStorage (fallback mode):', this.currentUser.email);
      } catch (e) {
        console.error('Error parsing stored user from localStorage', e);
        localStorage.removeItem('forgeECCurrentUser');
        this.currentUser = null;
      }
    } else {
      this.currentUser = null;
    }
    this.updateAuthUI(); // Update UI based on localStorage user state

    // Inform the user that they are in a limited functionality mode
    // This could be a dismissible banner or a console message for developers
    console.warn("🔧 Application is in fallback authentication mode. User data is stored locally in the browser. Full features require Firebase setup.");
    // Optionally, show a non-intrusive UI notification if appropriate
    this.showAuthFeedback("Using basic offline mode. Online features may be limited.", "info");
  }

  // Accessibility helper methods
  announceToScreenReader(message) {
    try {
      // Create or update live region for screen reader announcements
      let liveRegion = document.getElementById('sr-live-region');

      if (!liveRegion) {
        liveRegion = document.createElement('div');
        liveRegion.id = 'sr-live-region';
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.style.cssText = `
          position: absolute;
          left: -10000px;
          width: 1px;
          height: 1px;
          overflow: hidden;
        `;
        document.body.appendChild(liveRegion);
      }

      // Clear and set new message
      liveRegion.textContent = '';
      setTimeout(() => {
        liveRegion.textContent = message;
      }, 100);

      console.log('📢 Screen reader announcement:', message);
    } catch (error) {
      console.warn('Failed to announce to screen reader:', error);
    }
  }

  // Enhanced focus management
  manageFocus(element) {
    try {
      if (element && typeof element.focus === 'function') {
        element.focus();

        // Add focus indicator if not present
        if (!element.classList.contains('focus-visible')) {
          element.style.outline = '2px solid var(--color-primary)';
          element.style.outlineOffset = '2px';

          // Remove custom outline when element loses focus
          const removeFocusIndicator = () => {
            element.style.outline = '';
            element.style.outlineOffset = '';
            element.removeEventListener('blur', removeFocusIndicator);
          };

          element.addEventListener('blur', removeFocusIndicator);
        }
      }
    } catch (error) {
      console.warn('Failed to manage focus:', error);
    }
  }

  handleFallbackAuth(type, email, password, name = null) {
    // This function is designed to be called if we want to *prevent* localStorage auth
    // and only show a message. However, the current flow falls back to localStorage.
    // For now, it will just log and show a message if called directly,
    // but it's not part of the primary sign-in/sign-up flow for localStorage.
    console.log(`🔄 Fallback auth action (${type}) triggered for:`, { email, name });

    const message = `Firebase is not available. Authentication is in local mode. If you expected Firebase, please check your configuration.`;
    this.showAuthFeedback(message, 'warning');

    console.warn('🔧 Firebase Configuration Note:', {
      message: 'The application is currently using localStorage for authentication as Firebase is not available or failed to initialize.',
      details: 'This is expected if Firebase is not configured. For full Firebase features, please set up Firebase Authentication in your project.',
      guide: 'Refer to FIREBASE_AUTH_CONFIGURATION_GUIDE.md for more details.'
    });

    // Returning false indicates that this function itself doesn't perform an auth action,
    // but rather informs about the state.
    return false;
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.forgeECApp = new ForgeECApp();
});

// Export for use in other modules
window.ForgeECApp = ForgeECApp;

// Global function to show Auth modal (no longer Firebase specific)
window.showAuthModal = function() {
  if (window.forgeECApp && typeof window.forgeECApp.showAuthModal === 'function') {
    window.forgeECApp.showAuthModal();
  } else {
    console.warn('Forge EC App not initialized or auth modal not available');
  }
};
