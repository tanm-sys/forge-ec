// Main JavaScript for Forge EC Website

document.addEventListener('DOMContentLoaded', function() {
    // Check if this is the documentation page - if so, don't initialize main.js functionality
    if (window.location.pathname.includes('/docs/') || document.querySelector('.docs-layout')) {
        console.log('Documentation page detected, skipping main.js initialization');
        return;
    }

    // Add loading class initially
    document.body.classList.add('loading');

    // Initialize loading progress
    initLoadingProgress();

    // Initialize all components
    initThemeToggle();
    initNavigation();
    initTabs();
    initCopyButtons();
    initScrollAnimations();
    initSmoothScrolling();
    initPerformanceSection();
    initEnhancedInteractions();
    initAdvancedEffects();
    initLoadingAnimations();
    initMicroInteractions();

    // Remove loading class after a short delay to trigger animations
    setTimeout(() => {
        document.body.classList.remove('loading');
        hidePageLoader();
    }, 1500);
});

// Loading Progress and Page Loader
function initLoadingProgress() {
    const progressBar = document.getElementById('loading-progress');
    let progress = 0;

    const updateProgress = () => {
        progress += Math.random() * 15;
        if (progress > 90) progress = 90;

        progressBar.style.width = progress + '%';

        if (progress < 90) {
            setTimeout(updateProgress, 100 + Math.random() * 200);
        }
    };

    updateProgress();
}

function hidePageLoader() {
    const pageLoader = document.getElementById('page-loader');
    const progressBar = document.getElementById('loading-progress');

    // Complete the progress bar
    progressBar.style.width = '100%';
    progressBar.classList.add('complete');

    // Hide the page loader
    setTimeout(() => {
        pageLoader.classList.add('hidden');

        // Remove the loader from DOM after animation
        setTimeout(() => {
            pageLoader.remove();
            progressBar.remove();
        }, 500);
    }, 300);
}

// Theme Toggle Functionality
function initThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = themeToggle.querySelector('.theme-icon');

    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    themeToggle.addEventListener('click', function(e) {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        // Add switching animation class
        themeToggle.classList.add('switching');

        // Add ripple effect if ForgeAnimations is available
        if (window.ForgeAnimations) {
            ForgeAnimations.addRippleEffect(themeToggle, e);
        }

        // Smooth theme transition
        document.documentElement.style.transition = 'all 0.3s ease';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);

        // Remove transition and switching class after animation
        setTimeout(() => {
            document.documentElement.style.transition = '';
            themeToggle.classList.remove('switching');
        }, 600);
    });

    function updateThemeIcon(theme) {
        themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
}

// Navigation Functionality
function initNavigation() {
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    const navbar = document.getElementById('navbar');

    // Mobile menu toggle
    if (navToggle) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
        });
    }

    // Close mobile menu when clicking on a link
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
        });
    });

    // Navbar scroll effect
    let lastScrollTop = 0;
    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        if (scrollTop > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        // Hide/show navbar on scroll
        if (scrollTop > lastScrollTop && scrollTop > 200) {
            navbar.style.transform = 'translateY(-100%)';
        } else {
            navbar.style.transform = 'translateY(0)';
        }

        lastScrollTop = scrollTop;
    });
}

// Tab Functionality
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');

            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked button and corresponding content
            this.classList.add('active');
            const targetContent = document.getElementById(targetTab + '-tab');
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
}

// Copy Button Functionality
function initCopyButtons() {
    const copyButtons = document.querySelectorAll('.copy-btn');

    copyButtons.forEach(button => {
        button.addEventListener('click', async function() {
            const textToCopy = this.getAttribute('data-copy') ||
                              this.closest('.code-block').querySelector('code').textContent;

            try {
                await navigator.clipboard.writeText(textToCopy);

                // Visual feedback
                const originalText = this.textContent;
                this.textContent = 'Copied!';
                this.classList.add('copied');

                setTimeout(() => {
                    this.textContent = originalText;
                    this.classList.remove('copied');
                }, 2000);

            } catch (err) {
                console.error('Failed to copy text: ', err);

                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = textToCopy;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);

                // Visual feedback
                const originalText = this.textContent;
                this.textContent = 'Copied!';
                this.classList.add('copied');

                setTimeout(() => {
                    this.textContent = originalText;
                    this.classList.remove('copied');
                }, 2000);
            }
        });
    });
}

// Scroll Animations
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
            }
        });
    }, observerOptions);

    // Observe elements that should animate on scroll
    const animatedElements = document.querySelectorAll('.scroll-reveal, .feature-card, .performance-card');
    animatedElements.forEach(el => {
        el.classList.add('scroll-reveal');
        observer.observe(el);
    });
}

// Smooth Scrolling for Anchor Links
function initSmoothScrolling() {
    const anchorLinks = document.querySelectorAll('a[href^="#"]');

    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                e.preventDefault();

                const navbarHeight = document.getElementById('navbar').offsetHeight;
                const targetPosition = targetElement.offsetTop - navbarHeight - 20;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Performance Section with Dynamic Data
function initPerformanceSection() {
    // Add performance section to homepage if it doesn't exist
    if (!document.getElementById('performance')) {
        addPerformanceSection();
    }

    // Animate performance metrics
    const performanceCards = document.querySelectorAll('.performance-card');
    performanceCards.forEach(card => {
        const metrics = card.querySelectorAll('.metric-value');

        const observer = new IntersectionObserver(function(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateMetrics(metrics);
                    observer.unobserve(entry.target);
                }
            });
        });

        observer.observe(card);
    });
}

function addPerformanceSection() {
    // Only add performance section if we're on a page that has a footer
    const footer = document.querySelector('.footer');
    if (!footer) {
        console.log('No footer found, skipping performance section');
        return;
    }

    const performanceHTML = `
        <section id="performance" class="performance">
            <div class="container">
                <div class="section-header">
                    <h2 class="section-title">Performance Benchmarks</h2>
                    <p class="section-subtitle">
                        Optimized implementations with constant-time operations
                    </p>
                </div>

                <div class="performance-grid">
                    <div class="performance-card">
                        <h3 class="performance-title">ECDSA secp256k1</h3>
                        <div class="performance-metric">
                            <span class="metric-name">Sign</span>
                            <span class="metric-value" data-value="45000">45,000 ops/sec</span>
                        </div>
                        <div class="performance-metric">
                            <span class="metric-name">Verify</span>
                            <span class="metric-value" data-value="15000">15,000 ops/sec</span>
                        </div>
                        <div class="performance-metric">
                            <span class="metric-name">Key Generation</span>
                            <span class="metric-value" data-value="50000">50,000 ops/sec</span>
                        </div>
                    </div>

                    <div class="performance-card">
                        <h3 class="performance-title">Ed25519</h3>
                        <div class="performance-metric">
                            <span class="metric-name">Sign</span>
                            <span class="metric-value" data-value="60000">60,000 ops/sec</span>
                        </div>
                        <div class="performance-metric">
                            <span class="metric-name">Verify</span>
                            <span class="metric-value" data-value="20000">20,000 ops/sec</span>
                        </div>
                        <div class="performance-metric">
                            <span class="metric-name">Key Generation</span>
                            <span class="metric-value" data-value="80000">80,000 ops/sec</span>
                        </div>
                    </div>

                    <div class="performance-card">
                        <h3 class="performance-title">X25519 ECDH</h3>
                        <div class="performance-metric">
                            <span class="metric-name">Key Exchange</span>
                            <span class="metric-value" data-value="25000">25,000 ops/sec</span>
                        </div>
                        <div class="performance-metric">
                            <span class="metric-name">Scalar Mult</span>
                            <span class="metric-value" data-value="30000">30,000 ops/sec</span>
                        </div>
                        <div class="performance-metric">
                            <span class="metric-name">Memory Usage</span>
                            <span class="metric-value">~2KB</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    `;

    // Insert before footer
    footer.insertAdjacentHTML('beforebegin', performanceHTML);
}

function animateMetrics(metrics) {
    metrics.forEach(metric => {
        const finalValue = metric.getAttribute('data-value');
        if (finalValue && !isNaN(finalValue)) {
            animateNumber(metric, 0, parseInt(finalValue), 2000);
        }
    });
}

function animateNumber(element, start, end, duration) {
    const startTime = performance.now();
    const originalText = element.textContent;

    function updateNumber(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const current = Math.floor(start + (end - start) * easeOutQuart);

        element.textContent = current.toLocaleString() + ' ops/sec';

        if (progress < 1) {
            requestAnimationFrame(updateNumber);
        } else {
            element.textContent = originalText;
        }
    }

    requestAnimationFrame(updateNumber);
}

// Utility Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Error Handling
window.addEventListener('error', function(e) {
    console.error('JavaScript error:', e.error);
});

// Enhanced Interactions
function initEnhancedInteractions() {
    // Add ripple effect to all buttons
    const buttons = document.querySelectorAll('.btn, .theme-toggle, .copy-btn');
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            if (window.ForgeAnimations) {
                ForgeAnimations.addRippleEffect(this, e);
            }
        });
    });

    // Add floating animation to feature cards
    if (window.ForgeAnimations) {
        ForgeAnimations.addFloatingAnimation('.feature-card');
    }

    // Enhanced hover effects for cards
    const cards = document.querySelectorAll('.feature-card, .performance-card, .project-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px) scale(1.02)';
            this.style.boxShadow = 'var(--shadow-2xl)';
        });

        card.addEventListener('mouseleave', function() {
            this.style.transform = '';
            this.style.boxShadow = '';
        });
    });

    // Smooth scroll for navigation links
    const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('href');
            if (window.ForgeAnimations) {
                ForgeAnimations.smoothScrollTo(target);
            }
        });
    });
}

// Advanced Effects
function initAdvancedEffects() {
    // Parallax scrolling for hero background
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const parallaxElements = document.querySelectorAll('.parallax');

        parallaxElements.forEach(element => {
            const speed = element.dataset.speed || 0.5;
            const yPos = -(scrolled * speed);
            element.style.transform = `translateY(${yPos}px)`;
        });
    });

    // Mouse tracking for interactive elements
    document.addEventListener('mousemove', (e) => {
        const interactiveElements = document.querySelectorAll('.hero-visual, .code-preview');

        interactiveElements.forEach(element => {
            const rect = element.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = (y - centerY) / 10;
            const rotateY = (centerX - x) / 10;

            element.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });
    });
}

// Loading Animations
function initLoadingAnimations() {
    // Staggered animation for feature cards
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
        card.classList.add('animate-bounce-in');
    });

    // Progressive image loading
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        img.addEventListener('load', () => {
            img.classList.add('animate-fade-in');
        });
    });
}

// Micro Interactions
function initMicroInteractions() {
    // Enhanced button hover effects
    const buttons = document.querySelectorAll('.btn, .copy-btn, .tab-btn');
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px) scale(1.02)';
            this.style.boxShadow = 'var(--shadow-lg)';
        });

        button.addEventListener('mouseleave', function() {
            this.style.transform = '';
            this.style.boxShadow = '';
        });

        button.addEventListener('mousedown', function() {
            this.style.transform = 'translateY(0) scale(0.98)';
        });

        button.addEventListener('mouseup', function() {
            this.style.transform = 'translateY(-2px) scale(1.02)';
        });
    });

    // Enhanced link hover effects
    const links = document.querySelectorAll('.nav-link, .footer-section a');
    links.forEach(link => {
        link.addEventListener('mouseenter', function() {
            this.style.transform = 'translateX(5px)';
        });

        link.addEventListener('mouseleave', function() {
            this.style.transform = '';
        });
    });

    // Card tilt effect
    const cards = document.querySelectorAll('.feature-card, .performance-card');
    cards.forEach(card => {
        card.addEventListener('mousemove', function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = (y - centerY) / 20;
            const rotateY = (centerX - x) / 20;

            this.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
        });

        card.addEventListener('mouseleave', function() {
            this.style.transform = '';
        });
    });

    // Smooth counter animations
    const counters = document.querySelectorAll('.stat-number');
    const animateCounters = () => {
        counters.forEach(counter => {
            const target = parseInt(counter.getAttribute('data-target') || counter.textContent);
            const current = parseInt(counter.textContent) || 0;
            const increment = target / 100;

            if (current < target) {
                counter.textContent = Math.ceil(current + increment);
                setTimeout(animateCounters, 20);
            } else {
                counter.textContent = target;
            }
        });
    };

    // Trigger counter animation when in view
    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounters();
                counterObserver.unobserve(entry.target);
            }
        });
    });

    counters.forEach(counter => {
        counterObserver.observe(counter);
    });
}

// Performance Monitoring
if ('performance' in window) {
    window.addEventListener('load', function() {
        setTimeout(() => {
            const perfData = performance.getEntriesByType('navigation')[0];
            console.log('Page load time:', perfData.loadEventEnd - perfData.loadEventStart, 'ms');
        }, 0);
    });
}
