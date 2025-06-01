class ForgeECApp {
    constructor() {
        this.isLoaded = false;
        this.currentTheme = 'light';
        this.scrollPosition = 0;
        this.isScrolling = false;
        this.currentUser = null;
        this.authEventListenersSetup = false;
        this.fallbackMode = false;
        this.focusTrapHandler = null;
        this.isAuthModalOpen = false;

        this.init();
    }

    async init() {
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

        this.updateLoadingProgress(60);
        await this.initializeFirebase();

        this.updateLoadingProgress(80);
        await this.loadGitHubData();

        this.updateLoadingProgress(90);
        this.initScrollAnimations();

        this.hideLoadingScreen();
        console.log('Forge EC website with Firebase initialized successfully!');
    }

    async initializeFirebase() {
        try {
            console.log('Initializing Firebase services...');
            if (window.firebaseInitialized) {
                this.setupFirebaseAuth();
                this.firebaseInitialized = true;
                console.log('Firebase services already initialized');
            } else {
                const firebaseReady = new Promise((resolve, reject) => {
                    let resolved = false;
                    let checkCount = 0;
                    const maxChecks = 100;

                    const checkFirebase = () => {
                        if (resolved) return;
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

                    const handleFirebaseReady = () => {
                        if (!resolved) {
                            resolved = true;
                            resolve();
                        }
                    };

                    window.addEventListener('firebaseReady', handleFirebaseReady, { once: true });
                    setTimeout(checkFirebase, 100);
                });

                await firebaseReady;

                if (window.firebaseInitialized) {
                    this.setupFirebaseAuth();
                    this.firebaseInitialized = true;
                    console.log('Firebase services initialized successfully (delayed)');
                } else {
                    throw new Error('Firebase failed to initialize within timeout');
                }
            }
        } catch (error) {
            console.warn(`Firebase initialization failed: ${error.message}. Falling back to localStorage authentication.`);
            this.firebaseInitialized = false;
            this.createAuthModal();
            this.setupFallbackAuth();
        }
    }

    setupFirebaseAuth() {
        if (this.firebaseInitialized && window.firebaseAuth) {
            this.initializeAuth();
            this.createAuthModal();
            this.setupAuthEventListeners();
        } else {
            console.log('Firebase not initialized, Firebase Auth setup skipped.');
            if (!document.getElementById('auth-modal')) {
                this.createAuthModal();
            }
            this.setupAuthEventListeners();
        }
    }

    async initializeAuth() {
        if (!window.firebaseAuth) {
            console.warn('Firebase Auth service is not available. Firebase auth features will be disabled.');
            this.authModule = null;
            return;
        }

        try {
            const authModulePromise = import('https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js');
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Auth module load timeout')), 5000);
            });

            const authModule = await Promise.race([authModulePromise, timeoutPromise]);
            this.authModule = authModule;
            console.log('Firebase Auth module loaded successfully');

            try {
                authModule.onAuthStateChanged(window.firebaseAuth, (user) => {
                    this.currentUser = user;
                    this.updateAuthUI();

                    if (user) {
                        console.log('Firebase user signed in:', user.email);
                    } else {
                        console.log('Firebase user signed out or no user.');
                    }
                });
            } catch (listenerError) {
                console.warn('Failed to set up Firebase auth state listener:', listenerError);
            }
        } catch (error) {
            console.warn('Failed to load Firebase Auth module:', error);
            this.authModule = null;
        }
    }

    createAuthModal() {
        const existingModal = document.getElementById('auth-modal');
        if (existingModal) return;

        const existingAuthForms = document.querySelectorAll('#email-signin-form, #email-signup-form');
        if (existingAuthForms.length > 0) {
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
                            <div id="signin-form" class="auth-form active">
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
    }

    setupAuthEventListeners() {
        if (this.authEventListenersSetup) return;

        this.authClickHandler = (e) => {
            try {
                if (e.target.matches('#auth-trigger') || e.target.closest('#auth-trigger')) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showAuthModal();
                    return;
                }

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

                if (e.target.matches('.auth-tab')) {
                    e.preventDefault();
                    this.switchAuthTab(e.target.dataset.tab);
                    return;
                }

                if (e.target.matches('#forgot-password')) {
                    e.preventDefault();
                    this.handleForgotPassword();
                    return;
                }

                if (e.target.matches('#user-menu-btn') || e.target.closest('#user-menu-btn')) {
                    e.preventDefault();
                    this.toggleUserMenu();
                    return;
                }

                if (e.target.matches('#user-signout') || e.target.closest('#user-signout') ||
                    e.target.matches('#user-signout-dropdown') || e.target.closest('#user-signout-dropdown')) {
                    e.preventDefault();
                    this.handleSignOut();
                    this.closeUserMenu();
                    return;
                }
            } catch (error) {
                console.error('Error in auth click handler:', error);
            }
        };

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

        document.addEventListener('click', this.authClickHandler);
        document.addEventListener('submit', this.authSubmitHandler);
        this.authEventListenersSetup = true;
    }

    initializeTheme() {
        const savedTheme = localStorage.getItem('forge-ec-theme');
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        this.currentTheme = savedTheme || systemTheme;
        this.applyTheme(this.currentTheme);

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
        console.log(`Theme switched to: ${this.currentTheme}`);
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.setAttribute('aria-label', `Switch to ${theme === 'light' ? 'dark' : 'light'} theme`);
        }
    }

    setupScrollEffects() {
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
        if (navbar) {
            if (scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }
        this.updateActiveNavigation(scrollY);
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
            const offsetTop = section.offsetTop - 80;
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    }

    setupAnimations() {
        if (window.animationController) {
            console.log('AnimationController found, main.js setupAnimations will rely on it.');
        } else {
            console.warn('AnimationController not found. Advanced animations might not work.');
        }
        this.initScrollAnimations();
    }

    async loadGitHubData() {
        try {
            console.log('Initializing GitHub data loading...');
            if (window.forgeGitHubAPI) {
                window.forgeGitHubAPI.loadRepositoryData().catch(error => {
                    console.warn('GitHub data loading failed:', error);
                });
            } else {
                console.warn('GitHubAPI not available, will retry when loaded');
                const checkGitHubAPI = () => {
                    if (window.forgeGitHubAPI) {
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
            this.updateLoadingProgress(100);
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
                loadingScreen.setAttribute('aria-hidden', 'true');
                console.log('Loading screen hidden');
                setTimeout(() => {
                    loadingScreen.remove();
                    console.log('Loading screen removed from DOM');
                    this.announceToScreenReader('Page loaded successfully');
                }, 500);
            }, 1000);
        } else {
            console.warn('Loading screen element not found');
        }
    }

    updateLoadingProgress(percentage) {
        const progressBar = document.querySelector('.loading-progress');
        const progressBarFill = document.querySelector('.progress-bar');
        if (progressBar && progressBarFill) {
            progressBar.setAttribute('aria-valuenow', percentage);
            progressBarFill.style.width = `${percentage}%`;
            if (percentage === 100) {
                progressBar.setAttribute('aria-label', 'Loading complete');
            } else {
                progressBar.setAttribute('aria-label', `Loading ${percentage}% complete`);
            }
        }
    }

    initScrollAnimations() {
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
        button.classList.add('copied-feedback');
        button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.classList.remove('copied-feedback');
        }, 2000);
    }

    createLiveDemoModal() {
        const existingModal = document.getElementById('live-demo-modal');
        if (existingModal) return existingModal;
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
        const closeButton = newModal.querySelector('#live-demo-modal-close');
        closeButton.addEventListener('click', () => this.closeLiveDemoModal());
        const examplesLink = newModal.querySelector('#live-demo-examples-link');
        examplesLink.addEventListener('click', () => this.closeLiveDemoModal());
        return newModal;
    }

    openLiveDemo() {
        console.log('Opening live demo modal...');
        const modal = this.createLiveDemoModal();
        if (modal) {
            modal.setAttribute('aria-hidden', 'false');
            requestAnimationFrame(() => {
                modal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
                modal.style.opacity = '0';
                requestAnimationFrame(() => {
                    modal.style.transition = 'opacity 0.3s ease';
                    modal.style.opacity = '1';
                });
                const closeButton = modal.querySelector('#live-demo-modal-close');
                this.manageFocus(closeButton);
            });
            document.addEventListener('keydown', this.handleLiveDemoEscapeKey, true);
            document.addEventListener('click', this.handleClickOutsideLiveDemo, true);
        }
    }

    closeLiveDemoModal() {
        console.log('Closing live demo modal...');
        const modal = document.getElementById('live-demo-modal');
        if (modal) {
            modal.setAttribute('aria-hidden', 'true');
            modal.style.transition = 'opacity 0.3s ease';
            modal.style.opacity = '0';
            setTimeout(() => {
                modal.style.display = 'none';
                document.body.style.overflow = '';
            }, 300);
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
            this.closeLiveDemoModal();
        }
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
        const mobileBreakpoint = 768;
        const isMobile = window.innerWidth < mobileBreakpoint;
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
            document.body.style.overflow = 'hidden';
            const firstNavLink = navMenu.querySelector('.nav-link');
            if (firstNavLink) {
                setTimeout(() => {
                    this.manageFocus(firstNavLink);
                    this.announceToScreenReader('Navigation menu opened');
                }, 100);
            }
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
            document.body.style.overflow = '';
            this.manageFocus(mobileMenuToggle);
            this.announceToScreenReader('Navigation menu closed');
            this.removeFocusTrap();
        }
    }

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
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'k':
                case '/':
                    e.preventDefault();
                    const searchInput = document.getElementById('docs-search');
                    if (searchInput) {
                        searchInput.focus();
                    }
                    break;
            }
        }
        if (e.key === 't' && !e.ctrlKey && !e.metaKey) {
            const activeElement = document.activeElement;
            if (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
                this.toggleTheme();
            }
        }
    }

    showAuthModal() {
        console.log('Showing authentication modal...');
        if (this.isAuthModalOpen) return;
        const modal = document.getElementById('auth-modal');
        if (!modal) {
            console.warn('Auth modal not found, creating...');
            this.createAuthModal();
            setTimeout(() => this.showAuthModal(), 100);
            return;
        }
        this.isAuthModalOpen = true;
        requestAnimationFrame(() => {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            modal.style.opacity = '0';
            requestAnimationFrame(() => {
                modal.style.transition = 'opacity 0.3s ease';
                modal.style.opacity = '1';
                const activeForm = modal.querySelector('.auth-form.active');
                if (activeForm) {
                    const firstInput = activeForm.querySelector('input:not([type="hidden"]), button[type="submit"]');
                    if (firstInput) {
                        this.manageFocus(firstInput);
                    }
                }
            });
        });
    }

    hideAuthModal() {
        console.log('Hiding authentication modal...');
        const modal = document.getElementById('auth-modal');
        if (modal) {
            modal.style.transition = 'opacity 0.3s ease';
            modal.style.opacity = '0';
            setTimeout(() => {
                modal.style.display = 'none';
                document.body.style.overflow = '';
                this.isAuthModalOpen = false;
            }, 300);
        } else {
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
        if (!user || user.password !== password) {
            this.handleAuthError('Invalid email or password.');
            return;
        }
        localStorage.setItem('forgeECCurrentUser', JSON.stringify({ email: user.email, name: user.name }));
        this.currentUser = { email: user.email, name: user.name };
        this.updateAuthUI();
        this.hideAuthModal();
        this.showAuthFeedback('Signed in successfully!', 'success');
        console.log('User signed in:', user.email);
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
        const newUser = { name, email, password };
        users.push(newUser);
        localStorage.setItem('forgeECUsers', JSON.stringify(users));
        localStorage.setItem('forgeECCurrentUser', JSON.stringify({ email: newUser.email, name: newUser.name }));
        this.currentUser = { email: newUser.email, name: newUser.name };
        this.updateAuthUI();
        this.hideAuthModal();
        this.showAuthFeedback('Account created successfully!', 'success');
        console.log('User account created:', newUser.email);
    }

    async handleForgotPassword() {
        this.showAuthFeedback('Password reset is not available in this version.', 'info');
        console.log('Password reset clicked (feature disabled)');
    }

    async handleSignOut() {
        localStorage.removeItem('forgeECCurrentUser');
        this.currentUser = null;
        this.updateAuthUI();
        this.showAuthFeedback('Signed out successfully', 'info');
        console.log('User signed out');
    }

    updateAuthUI() {
        const authTrigger = document.getElementById('auth-trigger');
        const userMenuTrigger = document.getElementById('user-menu-trigger');
        if (this.currentUser) {
            if (authTrigger) authTrigger.style.display = 'none';
            if (userMenuTrigger) {
                userMenuTrigger.style.display = 'flex';
                this.updateUserProfile();
                this.ensureUserMenuDropdown();
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
        const userInfo = userMenuTrigger.querySelector('.user-info');
        if (userInfo) {
            userInfo.innerHTML = `
                <img src="/assets/default-avatar.png" alt="${user.name || user.email}" class="user-avatar">
                <span class="user-name">${user.name || user.email}</span>
            `;
        }
        this.ensureUserMenuDropdown();
    }

    ensureUserMenuDropdown() {
        const userMenuTrigger = document.getElementById('user-menu-trigger');
        if (!userMenuTrigger) return;
        let dropdown = userMenuTrigger.querySelector('.user-menu');
        if (!dropdown) {
            const userName = this.currentUser ? this.currentUser.name || 'User' : 'User';
            const userEmail = this.currentUser ? this.currentUser.email : 'user@example.com';
            const dropdownHTML = `
                <div class="user-menu">
                    <div class="user-menu-header">
                        <img src="/assets/default-avatar.png" alt="User Avatar" class="user-avatar-dropdown">
                        <div class="user-menu-details">
                            <span class="user-menu-dropdown-name">${userName}</span>
                            <span class="user-menu-dropdown-email">${userEmail}</span>
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
            dropdown = userMenuTrigger.querySelector('.user-menu');
            const profileLink = dropdown.querySelector('#user-profile');
            if (profileLink) profileLink.addEventListener('click', (e) => {
                e.preventDefault(); this.handleUserProfileClick(); this.closeUserMenu();
            });
            const settingsLink = dropdown.querySelector('#user-settings');
            if (settingsLink) settingsLink.addEventListener('click', (e) => {
                e.preventDefault(); this.handleUserSettingsClick(); this.closeUserMenu();
            });
            const signOutLink = dropdown.querySelector('#user-signout-dropdown');
            if (signOutLink) signOutLink.addEventListener('click', (e) => {
                this.closeUserMenu();
            });
        }
        return dropdown;
    }

    toggleUserMenu() {
        const userMenuTrigger = document.getElementById('user-menu-trigger');
        if (!userMenuTrigger) return;
        const dropdown = this.ensureUserMenuDropdown();
        if (!dropdown) return;
        const menuButton = document.getElementById('user-menu-btn');
        const isOpen = dropdown.classList.contains('active');
        if (isOpen) {
            this.closeUserMenu();
        } else {
            dropdown.classList.add('active');
            if (menuButton) menuButton.setAttribute('aria-expanded', 'true');
            document.addEventListener('click', this.handleClickOutsideUserMenu, true);
            document.addEventListener('keydown', this.handleEscapeKeyUserMenu, true);
        }
    }

    closeUserMenu() {
        const userMenuTrigger = document.getElementById('user-menu-trigger');
        if (!userMenuTrigger) return;
        const dropdown = userMenuTrigger.querySelector('.user-menu');
        const menuButton = document.getElementById('user-menu-btn');
        if (dropdown && dropdown.classList.contains('active')) {
            dropdown.classList.remove('active');
            if (menuButton) menuButton.setAttribute('aria-expanded', 'false');
            document.removeEventListener('click', this.handleClickOutsideUserMenu, true);
            document.removeEventListener('keydown', this.handleEscapeKeyUserMenu, true);
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
        let message = typeof errorMessage === 'string' ? errorMessage : 'An authentication error occurred. Please try again.';
        this.showAuthFeedback(message, 'error');
        console.error('Authentication Error:', message);
    }

    showAuthFeedback(message, type = 'info') {
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
        setTimeout(() => {
            feedback.style.display = 'none';
        }, 5000);
    }

    setupFallbackAuth() {
        console.log('Setting up fallback localStorage authentication system. Full authentication features require Firebase.');
        this.fallbackMode = true;
        if (!this.authEventListenersSetup) {
            this.setupAuthEventListeners();
        }
        const storedUser = localStorage.getItem('forgeECCurrentUser');
        if (storedUser) {
            try {
                this.currentUser = JSON.parse(storedUser);
                console.log('Active user found in localStorage (fallback mode):', this.currentUser.email);
            } catch (e) {
                console.error('Error parsing stored user from localStorage', e);
                localStorage.removeItem('forgeECCurrentUser');
                this.currentUser = null;
            }
        } else {
            this.currentUser = null;
        }
        this.updateAuthUI();
        console.warn("Application is in fallback authentication mode. User data is stored locally in the browser. Full features require Firebase setup.");
        this.showAuthFeedback("Using basic offline mode. Online features may be limited.", "info");
    }

    announceToScreenReader(message) {
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
        liveRegion.textContent = '';
        setTimeout(() => {
            liveRegion.textContent = message;
        }, 100);
    }

    manageFocus(element) {
        if (element && typeof element.focus === 'function') {
            element.focus();
            if (!element.classList.contains('focus-visible')) {
                element.style.outline = '2px solid var(--color-primary)';
                element.style.outlineOffset = '2px';
                const removeFocusIndicator = () => {
                    element.style.outline = '';
                    element.style.outlineOffset = '';
                    element.removeEventListener('blur', removeFocusIndicator);
                };
                element.addEventListener('blur', removeFocusIndicator);
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.forgeECApp = new ForgeECApp();
});

window.ForgeECApp = ForgeECApp;

window.showAuthModal = function() {
    if (window.forgeECApp && typeof window.forgeECApp.showAuthModal === 'function') {
        window.forgeECApp.showAuthModal();
    } else {
        console.warn('Forge EC App not initialized or auth modal not available');
    }
};