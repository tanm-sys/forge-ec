// ===== MAIN APPLICATION JAVASCRIPT WITH FIREBASE INTEGRATION =====

// Firebase services will be loaded dynamically when available

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
      console.warn('⚠️ Firebase initialization failed, continuing with fallback:', error.message);
      this.firebaseInitialized = false;
      // Still create auth modal for UI consistency, but without Firebase functionality
      this.createAuthModal();
      this.setupFallbackAuth();
    }
  }

  setupFirebaseAuth() {
    // Initialize Firebase Authentication
    this.initializeAuth();
    this.createAuthModal();
    this.setupAuthEventListeners();
  }

  async initializeAuth() {
    if (!window.firebaseAuth) {
      console.warn('Firebase Auth not available');
      return;
    }

    try {
      // Import Firebase Auth functions dynamically with timeout
      console.log('📦 Loading Firebase Auth module...');

      const authModulePromise = import('https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js');
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Auth module load timeout')), 5000);
      });

      const authModule = await Promise.race([authModulePromise, timeoutPromise]);
      this.authModule = authModule;
      console.log('✅ Firebase Auth module loaded successfully');

      // Set up auth state listener with error handling
      try {
        authModule.onAuthStateChanged(window.firebaseAuth, (user) => {
          this.currentUser = user;
          this.updateAuthUI();

          if (user) {
            console.log('👤 User signed in:', user.email);
          } else {
            console.log('👤 User signed out');
          }
        });
      } catch (listenerError) {
        console.warn('Failed to set up auth state listener:', listenerError);
      }
    } catch (error) {
      console.warn('Failed to load Firebase Auth module:', error);
      this.authModule = null;
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
                <div class="social-auth">
                  <button class="social-btn google-btn" id="google-signin">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </button>

                  <button class="social-btn github-btn" id="github-signin">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    Continue with GitHub
                  </button>
                </div>

                <div class="divider">
                  <span>or</span>
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

        // Social auth buttons
        if (e.target.matches('#google-signin') || e.target.closest('#google-signin')) {
          e.preventDefault();
          this.handleGoogleSignIn();
          return;
        }

        if (e.target.matches('#github-signin') || e.target.closest('#github-signin')) {
          e.preventDefault();
          this.handleGitHubSignIn();
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

      // Reduce loading time and ensure it always hides
      setTimeout(() => {
        loadingScreen.classList.add('hidden');
        console.log('✅ Loading screen hidden');

        setTimeout(() => {
          loadingScreen.remove();
          console.log('🗑️ Loading screen removed from DOM');
        }, 500);
      }, 1000); // Reduced from 2 seconds to 1 second
    } else {
      console.warn('⚠️ Loading screen element not found');
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
    if (!this.authModule || !window.firebaseAuth) {
      console.warn('Firebase Auth not available');
      this.showAuthFeedback('Authentication service not available', 'error');
      return;
    }

    try {
      console.log('🔐 Attempting Google sign-in...');
      this.showAuthFeedback('Connecting to Google...', 'info');

      const provider = new this.authModule.GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');

      // Add timeout to prevent hanging
      const signInPromise = this.authModule.signInWithPopup(window.firebaseAuth, provider);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Google sign-in timeout')), 30000);
      });

      await Promise.race([signInPromise, timeoutPromise]);

      this.hideAuthModal();
      this.showAuthFeedback('Signed in with Google!', 'success');
      console.log('✅ Google sign-in successful');
    } catch (error) {
      console.error('❌ Google sign-in failed:', error);
      this.handleAuthError(error);
    }
  }

  async handleGitHubSignIn() {
    if (!this.authModule || !window.firebaseAuth) {
      console.warn('Firebase Auth not available');
      this.showAuthFeedback('Authentication service not available', 'error');
      return;
    }

    try {
      console.log('🔐 Attempting GitHub sign-in...');
      this.showAuthFeedback('Connecting to GitHub...', 'info');

      const provider = new this.authModule.GithubAuthProvider();
      provider.addScope('user:email');

      // Add timeout to prevent hanging
      const signInPromise = this.authModule.signInWithPopup(window.firebaseAuth, provider);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('GitHub sign-in timeout')), 30000);
      });

      await Promise.race([signInPromise, timeoutPromise]);

      this.hideAuthModal();
      this.showAuthFeedback('Signed in with GitHub!', 'success');
      console.log('✅ GitHub sign-in successful');
    } catch (error) {
      console.error('❌ GitHub sign-in failed:', error);
      this.handleAuthError(error);
    }
  }

  async handleEmailSignIn(e) {
    if (!this.authModule || !window.firebaseAuth) {
      console.warn('Firebase Auth not available, using fallback');
      if (this.fallbackMode) {
        const email = document.getElementById('signin-email').value;
        const password = document.getElementById('signin-password').value;
        this.handleFallbackAuth('sign-in', email, password);
      } else {
        this.showAuthFeedback('Authentication service not available', 'error');
      }
      return;
    }

    const email = document.getElementById('signin-email').value;
    const password = document.getElementById('signin-password').value;

    if (!email || !password) {
      this.showAuthFeedback('Please enter both email and password', 'error');
      return;
    }

    try {
      console.log('🔐 Attempting email sign-in...');
      await this.authModule.signInWithEmailAndPassword(window.firebaseAuth, email, password);
      this.hideAuthModal();
      this.showAuthFeedback('Welcome back!', 'success');
      console.log('✅ Email sign-in successful');
    } catch (error) {
      console.error('❌ Email sign-in failed:', error);
      this.handleAuthError(error);
    }
  }

  async handleEmailSignUp(e) {
    if (!this.authModule || !window.firebaseAuth) {
      console.warn('Firebase Auth not available, using fallback');
      if (this.fallbackMode) {
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        this.handleFallbackAuth('sign-up', email, password, name);
      } else {
        this.showAuthFeedback('Authentication service not available', 'error');
      }
      return;
    }

    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    if (!name || !email || !password) {
      this.showAuthFeedback('Please fill in all fields', 'error');
      return;
    }

    if (password.length < 6) {
      this.showAuthFeedback('Password must be at least 6 characters', 'error');
      return;
    }

    try {
      console.log('🔐 Attempting email sign-up...');
      const userCredential = await this.authModule.createUserWithEmailAndPassword(window.firebaseAuth, email, password);
      const user = userCredential.user;

      // Update profile with display name
      await this.authModule.updateProfile(user, { displayName: name });

      this.hideAuthModal();
      this.showAuthFeedback('Account created successfully!', 'success');
      console.log('✅ Email sign-up successful');
    } catch (error) {
      console.error('❌ Email sign-up failed:', error);
      this.handleAuthError(error);
    }
  }

  async handleSignOut() {
    if (!this.authModule || !window.firebaseAuth) {
      console.warn('Firebase Auth not available');
      return;
    }

    try {
      await this.authModule.signOut(window.firebaseAuth);
      this.showAuthFeedback('Signed out successfully', 'info');
    } catch (error) {
      this.handleAuthError(error);
    }
  }

  updateAuthUI() {
    const authTrigger = document.getElementById('auth-trigger');
    const userMenuTrigger = document.getElementById('user-menu-trigger');

    if (this.currentUser) {
      // User is signed in
      if (authTrigger) authTrigger.style.display = 'none';
      if (userMenuTrigger) {
        userMenuTrigger.style.display = 'flex';
        this.updateUserProfile();
      }
    } else {
      // User is not signed in
      if (authTrigger) authTrigger.style.display = 'block';
      if (userMenuTrigger) userMenuTrigger.style.display = 'none';
    }
  }

  updateUserProfile() {
    const user = this.currentUser;
    if (!user) return;

    const userInfo = document.querySelector('#user-menu-trigger .user-info');
    if (userInfo) {
      userInfo.innerHTML = `
        <img src="${user.photoURL || '/assets/default-avatar.png'}" alt="${user.displayName}" class="user-avatar">
        <span class="user-name">${user.displayName || user.email}</span>
      `;
    }
  }

  toggleUserMenu() {
    // This will be implemented when user menu is added
    console.log('User menu toggle');
  }

  handleAuthError(error) {
    let message = 'An authentication error occurred';
    let isConfigurationError = false;

    switch (error.code) {
      case 'auth/configuration-not-found':
        message = 'Authentication service is not properly configured. Please contact support.';
        isConfigurationError = true;
        console.error('🔧 Firebase Auth Configuration Error:', {
          error: error.code,
          message: error.message,
          suggestion: 'Check Firebase Console > Authentication > Sign-in method'
        });
        break;
      case 'auth/user-not-found':
        message = 'No account found with this email address';
        break;
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        message = 'Incorrect email or password';
        break;
      case 'auth/email-already-in-use':
        message = 'An account with this email already exists';
        break;
      case 'auth/weak-password':
        message = 'Password should be at least 6 characters';
        break;
      case 'auth/invalid-email':
        message = 'Invalid email address';
        break;
      case 'auth/popup-closed-by-user':
        message = 'Sign-in popup was closed';
        break;
      case 'auth/popup-blocked':
        message = 'Sign-in popup was blocked by your browser';
        break;
      case 'auth/cancelled-popup-request':
        message = 'Sign-in was cancelled';
        break;
      case 'auth/network-request-failed':
        message = 'Network error. Please check your connection and try again.';
        break;
      default:
        message = error.message || 'An unexpected error occurred';
    }

    this.showAuthFeedback(message, 'error');

    // Log detailed error information for debugging
    console.error('🚨 Authentication Error:', {
      code: error.code,
      message: error.message,
      isConfigurationError,
      timestamp: new Date().toISOString()
    });

    // If it's a configuration error, also log helpful debugging info
    if (isConfigurationError) {
      console.error('🔍 Debug Info:', {
        firebaseApp: !!window.firebaseApp,
        firebaseAuth: !!window.firebaseAuth,
        authModule: !!this.authModule,
        projectId: window.firebaseApp?.options?.projectId,
        authDomain: window.firebaseApp?.options?.authDomain
      });
    }
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
    console.log('🔄 Setting up fallback authentication system');
    this.fallbackMode = true;
    this.setupAuthEventListeners();
  }

  handleFallbackAuth(type, email, password, name = null) {
    // Simulate authentication for demo purposes
    console.log(`🔄 Fallback ${type} attempt:`, { email, name });

    // Show informational message about Firebase configuration
    const message = `Demo mode: Firebase Authentication needs to be configured. Please check the configuration guide.`;
    this.showAuthFeedback(message, 'warning');

    // Log configuration guidance
    console.warn('🔧 Firebase Configuration Required:', {
      issue: 'Authentication service not configured',
      solution: 'Enable Authentication in Firebase Console',
      guide: 'See FIREBASE_AUTH_CONFIGURATION_GUIDE.md for detailed instructions'
    });

    return false;
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.forgeECApp = new ForgeECApp();
});

// Export for use in other modules
window.ForgeECApp = ForgeECApp;

// Global function to show Firebase Auth modal
window.showFirebaseAuth = function() {
  if (window.forgeECApp && typeof window.forgeECApp.showAuthModal === 'function') {
    window.forgeECApp.showAuthModal();
  } else {
    console.warn('Forge EC App not initialized or auth modal not available');
  }
};
