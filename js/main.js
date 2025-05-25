// Main JavaScript for Forge EC Website

document.addEventListener('DOMContentLoaded', function() {
    // Check if this is the documentation page - if so, don't initialize main.js functionality
    if (window.location.pathname.includes('/docs/') || document.querySelector('.docs-layout')) {
        console.log('Documentation page detected, skipping main.js initialization');
        return;
    }

    // Remove loading class immediately to prevent stuck loading screen
    document.body.classList.remove('loading');

    // Hide page loader immediately
    const pageLoader = document.getElementById('page-loader');
    const progressBar = document.getElementById('loading-progress');

    if (pageLoader) {
        pageLoader.style.opacity = '0';
        pageLoader.style.visibility = 'hidden';
        setTimeout(() => {
            pageLoader.remove();
        }, 100);
    }

    if (progressBar) {
        progressBar.style.width = '100%';
        setTimeout(() => {
            progressBar.remove();
        }, 100);
    }

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
    initEnhancedCodeBlocks();
    initFeedbackForm();
    initContributorAnimations();
    initPremiumAnimations();
    initPerformanceOptimizations();
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

    // Mobile menu toggle with accessibility
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            const isExpanded = navMenu.classList.contains('active');

            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');

            // Update ARIA attributes
            navToggle.setAttribute('aria-expanded', !isExpanded);

            // Focus management
            if (!isExpanded) {
                // Menu is opening - focus first link
                const firstLink = navMenu.querySelector('.nav-link');
                if (firstLink) {
                    setTimeout(() => firstLink.focus(), 100);
                }
            }
        });

        // Handle escape key to close menu
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
                navToggle.classList.remove('active');
                navToggle.setAttribute('aria-expanded', 'false');
                navToggle.focus();
            }
        });
    }

    // Close mobile menu when clicking on a link
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
            navToggle.setAttribute('aria-expanded', 'false');
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        if (!navbar.contains(e.target) && navMenu.classList.contains('active')) {
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
            navToggle.setAttribute('aria-expanded', 'false');
        }
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

        // Hide/show navbar on scroll (only on desktop)
        if (window.innerWidth > 768) {
            if (scrollTop > lastScrollTop && scrollTop > 200) {
                navbar.style.transform = 'translateY(-100%)';
            } else {
                navbar.style.transform = 'translateY(0)';
            }
        }

        lastScrollTop = scrollTop;
    }, { passive: true });
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

// Enhanced Code Blocks
function initEnhancedCodeBlocks() {
    // Enhanced copy functionality
    const enhancedCopyButtons = document.querySelectorAll('.enhanced-copy-btn');

    enhancedCopyButtons.forEach(button => {
        button.addEventListener('click', async function() {
            const textToCopy = this.getAttribute('data-copy') ||
                              this.closest('.enhanced-code-block').querySelector('code').textContent;

            try {
                await navigator.clipboard.writeText(textToCopy);

                // Enhanced visual feedback
                const copyIcon = this.querySelector('.copy-icon');
                const checkIcon = this.querySelector('.check-icon');
                const copyText = this.querySelector('.copy-text');

                // Add copied class for styling
                this.classList.add('copied');

                // Update text
                if (copyText) {
                    copyText.textContent = 'Copied!';
                }

                // Reset after 2 seconds
                setTimeout(() => {
                    this.classList.remove('copied');
                    if (copyText) {
                        copyText.textContent = 'Copy';
                    }
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

                // Visual feedback for fallback
                this.classList.add('copied');
                setTimeout(() => {
                    this.classList.remove('copied');
                }, 2000);
            }
        });
    });

    // Line numbers toggle
    const lineNumbersToggle = document.querySelectorAll('.line-numbers-toggle');

    lineNumbersToggle.forEach(button => {
        button.addEventListener('click', function() {
            const codeBlock = this.closest('.enhanced-code-block');
            const preElement = codeBlock.querySelector('pre');

            if (preElement.classList.contains('line-numbers')) {
                preElement.classList.remove('line-numbers');
                this.style.opacity = '0.5';
            } else {
                preElement.classList.add('line-numbers');
                this.style.opacity = '1';
            }
        });
    });
}

// Feedback Form
function initFeedbackForm() {
    const feedbackForm = document.getElementById('feedback-form');

    if (feedbackForm) {
        feedbackForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const submitButton = this.querySelector('button[type="submit"]');
            const btnText = submitButton.querySelector('.btn-text');
            const btnLoading = submitButton.querySelector('.btn-loading');

            // Show loading state
            btnText.style.display = 'none';
            btnLoading.style.display = 'inline';
            submitButton.disabled = true;

            // Get form data
            const formData = new FormData(this);
            const feedbackData = {
                type: formData.get('type'),
                message: formData.get('message'),
                email: formData.get('email') || 'anonymous',
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent
            };

            try {
                // Simulate API call (replace with actual endpoint)
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Show success message
                showFeedbackMessage('Thank you for your feedback! We appreciate your input.', 'success');

                // Reset form
                this.reset();

            } catch (error) {
                console.error('Error submitting feedback:', error);
                showFeedbackMessage('Sorry, there was an error submitting your feedback. Please try again.', 'error');
            } finally {
                // Reset button state
                btnText.style.display = 'inline';
                btnLoading.style.display = 'none';
                submitButton.disabled = false;
            }
        });
    }
}

function showFeedbackMessage(message, type) {
    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `feedback-message feedback-message-${type}`;
    messageEl.textContent = message;

    // Style the message
    messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        color: white;
        font-weight: 600;
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        ${type === 'success' ? 'background: #10b981;' : 'background: #ef4444;'}
    `;

    document.body.appendChild(messageEl);

    // Animate in
    setTimeout(() => {
        messageEl.style.transform = 'translateX(0)';
    }, 100);

    // Remove after 5 seconds
    setTimeout(() => {
        messageEl.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(messageEl);
        }, 300);
    }, 5000);
}

// Contributor Animations
function initContributorAnimations() {
    // Animate contributor stats on scroll
    const contributorStats = document.querySelectorAll('.contributor-stats .counter');

    if (contributorStats.length > 0) {
        const observer = new IntersectionObserver(function(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const target = parseInt(entry.target.getAttribute('data-target'));
                    animateCounter(entry.target, 0, target, 2000);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        contributorStats.forEach(stat => {
            observer.observe(stat);
        });
    }

    // Add hover effects to contributor cards
    const contributorCards = document.querySelectorAll('.contributor-card');

    contributorCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            const avatar = this.querySelector('.avatar-img');
            if (avatar) {
                avatar.style.transform = 'scale(1.1) rotate(5deg)';
            }
        });

        card.addEventListener('mouseleave', function() {
            const avatar = this.querySelector('.avatar-img');
            if (avatar) {
                avatar.style.transform = '';
            }
        });
    });

    // Animate visual aids on scroll
    const visualCards = document.querySelectorAll('.visual-card');

    if (visualCards.length > 0) {
        const visualObserver = new IntersectionObserver(function(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';

                    // Animate SVG elements
                    const svgElements = entry.target.querySelectorAll('.curve-path, .point-p, .point-q, .point-r');
                    svgElements.forEach((el, index) => {
                        setTimeout(() => {
                            el.style.opacity = '1';
                            el.style.transform = 'scale(1)';
                        }, index * 200);
                    });
                }
            });
        }, { threshold: 0.3 });

        visualCards.forEach(card => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            card.style.transition = 'all 0.6s ease';

            // Hide SVG elements initially
            const svgElements = card.querySelectorAll('.curve-path, .point-p, .point-q, .point-r');
            svgElements.forEach(el => {
                el.style.opacity = '0';
                el.style.transform = 'scale(0.8)';
                el.style.transition = 'all 0.4s ease';
            });

            visualObserver.observe(card);
        });
    }
}

function animateCounter(element, start, end, duration) {
    const startTime = performance.now();

    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const current = Math.floor(start + (end - start) * easeOutQuart);

        element.textContent = current;

        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = end;
        }
    }

    requestAnimationFrame(updateCounter);
}

// Premium Animations
function initPremiumAnimations() {
    // Enhanced button hover effects
    const buttons = document.querySelectorAll('.btn');

    buttons.forEach(button => {
        button.addEventListener('mouseenter', function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Create ripple effect
            const ripple = document.createElement('div');
            ripple.style.cssText = `
                position: absolute;
                left: ${x}px;
                top: ${y}px;
                width: 0;
                height: 0;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.1);
                transform: translate(-50%, -50%);
                animation: ripple 0.6s ease-out;
                pointer-events: none;
                z-index: 0;
            `;

            this.appendChild(ripple);

            setTimeout(() => {
                if (ripple.parentNode) {
                    ripple.parentNode.removeChild(ripple);
                }
            }, 600);
        });

        // Add magnetic effect for large buttons
        if (button.classList.contains('btn-lg') || button.classList.contains('btn-xl')) {
            button.addEventListener('mousemove', function(e) {
                const rect = this.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;

                const distance = Math.sqrt(x * x + y * y);
                const maxDistance = 50;

                if (distance < maxDistance) {
                    const strength = (maxDistance - distance) / maxDistance;
                    const moveX = x * strength * 0.1;
                    const moveY = y * strength * 0.1;

                    this.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.02)`;
                }
            });

            button.addEventListener('mouseleave', function() {
                this.style.transform = '';
            });
        }
    });

    // Enhanced card animations
    const cards = document.querySelectorAll('.feature-card, .visual-card, .community-card');

    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            // Add subtle glow effect
            this.style.filter = 'brightness(1.02) saturate(1.05)';
        });

        card.addEventListener('mouseleave', function() {
            this.style.filter = '';
        });

        // Parallax effect on mouse move
        card.addEventListener('mousemove', function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = (y - centerY) / centerY * 2;
            const rotateY = (centerX - x) / centerX * 2;

            this.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
        });

        card.addEventListener('mouseleave', function() {
            this.style.transform = '';
        });
    });
}

// Enhanced Smooth Scrolling
function initSmoothScrolling() {
    // Enhanced smooth scrolling with easing
    const links = document.querySelectorAll('a[href^="#"]');

    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();

            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                const headerHeight = document.querySelector('.navbar').offsetHeight;
                const targetPosition = targetElement.offsetTop - headerHeight - 20;

                // Custom easing function
                const easeInOutCubic = (t) => {
                    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
                };

                const startPosition = window.pageYOffset;
                const distance = targetPosition - startPosition;
                const duration = Math.min(Math.abs(distance) / 2, 1000);
                let startTime = null;

                function animation(currentTime) {
                    if (startTime === null) startTime = currentTime;
                    const timeElapsed = currentTime - startTime;
                    const progress = Math.min(timeElapsed / duration, 1);
                    const ease = easeInOutCubic(progress);

                    window.scrollTo(0, startPosition + distance * ease);

                    if (progress < 1) {
                        requestAnimationFrame(animation);
                    }
                }

                requestAnimationFrame(animation);
            }
        });
    });
}

// Performance Optimizations
function initPerformanceOptimizations() {
    // Optimize animations for 60fps
    let ticking = false;

    function updateAnimations() {
        // Batch DOM updates
        requestAnimationFrame(() => {
            // Update any ongoing animations
            ticking = false;
        });
    }

    // Throttle scroll events
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(updateAnimations);
            ticking = true;
        }

        // Debounce scroll end
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            document.body.classList.add('scroll-ended');
            setTimeout(() => {
                document.body.classList.remove('scroll-ended');
            }, 100);
        }, 150);
    }, { passive: true });

    // Optimize images with Intersection Observer
    const images = document.querySelectorAll('img[data-src]');

    if (images.length > 0) {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.add('loaded');
                    imageObserver.unobserve(img);
                }
            });
        }, {
            rootMargin: '50px'
        });

        images.forEach(img => imageObserver.observe(img));
    }

    // Preload critical resources
    const criticalResources = [
        '/css/style.css',
        '/js/main.js'
    ];

    criticalResources.forEach(resource => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = resource;
        link.as = resource.endsWith('.css') ? 'style' : 'script';
        document.head.appendChild(link);
    });

    // Add loading states for better perceived performance
    const forms = document.querySelectorAll('form');

    forms.forEach(form => {
        form.addEventListener('submit', function() {
            const submitBtn = this.querySelector('button[type="submit"]');
            if (submitBtn && !submitBtn.disabled) {
                submitBtn.classList.add('loading');
                submitBtn.disabled = true;

                // Re-enable after 3 seconds as fallback
                setTimeout(() => {
                    submitBtn.classList.remove('loading');
                    submitBtn.disabled = false;
                }, 3000);
            }
        });
    });
}

// Add CSS for ripple animation
const rippleCSS = `
@keyframes ripple {
    0% {
        width: 0;
        height: 0;
        opacity: 1;
    }
    100% {
        width: 200px;
        height: 200px;
        opacity: 0;
    }
}

.btn.loading::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 20px;
    height: 20px;
    margin: -10px 0 0 -10px;
    border: 2px solid transparent;
    border-top-color: currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.scroll-ended {
    scroll-behavior: smooth;
}

img.loaded {
    opacity: 1;
    transition: opacity 0.3s ease;
}

img[data-src] {
    opacity: 0;
}
`;

// Inject CSS
const style = document.createElement('style');
style.textContent = rippleCSS;
document.head.appendChild(style);

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
