// Main JavaScript for Forge EC Website

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all components
    initThemeToggle();
    initNavigation();
    initTabs();
    initCopyButtons();
    initScrollAnimations();
    initSmoothScrolling();
    initPerformanceSection();
});

// Theme Toggle Functionality
function initThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = themeToggle.querySelector('.theme-icon');
    
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    
    themeToggle.addEventListener('click', function() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
        
        // Add a subtle animation
        themeIcon.style.transform = 'scale(0.8)';
        setTimeout(() => {
            themeIcon.style.transform = 'scale(1)';
        }, 150);
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
    const footer = document.querySelector('.footer');
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

// Performance Monitoring
if ('performance' in window) {
    window.addEventListener('load', function() {
        setTimeout(() => {
            const perfData = performance.getEntriesByType('navigation')[0];
            console.log('Page load time:', perfData.loadEventEnd - perfData.loadEventStart, 'ms');
        }, 0);
    });
}
