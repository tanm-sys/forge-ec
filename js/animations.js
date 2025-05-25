/**
 * Enhanced Animations and Interactions for Forge EC Website
 * Provides smooth animations, scroll effects, and interactive elements
 */

class ForgeAnimations {
    constructor() {
        this.init();
    }

    init() {
        this.setupPageLoadAnimations();
        this.setupScrollAnimations();
        this.setupNavbarEffects();
        this.setupThemeToggle();
        this.setupCounterAnimations();
        this.setupParallaxEffects();
        this.setupIntersectionObserver();
    }

    // Page Load Animations
    setupPageLoadAnimations() {
        document.addEventListener('DOMContentLoaded', () => {
            // Remove loading class to start animations
            setTimeout(() => {
                document.body.classList.remove('loading');
            }, 100);

            // Animate elements on page load
            this.animateOnLoad();
        });
    }

    animateOnLoad() {
        const elements = document.querySelectorAll('.fade-in, .slide-up, .slide-in-left, .slide-in-right, .scale-in');
        elements.forEach((el, index) => {
            el.style.animationDelay = `${index * 0.1}s`;
        });
    }

    // Scroll-triggered Animations
    setupScrollAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, observerOptions);

        // Observe elements for scroll animations
        const animateElements = document.querySelectorAll('.animate-on-scroll');
        animateElements.forEach(el => observer.observe(el));
    }

    // Enhanced Navbar Effects
    setupNavbarEffects() {
        const navbar = document.querySelector('.navbar');
        let lastScrollY = window.scrollY;

        window.addEventListener('scroll', () => {
            const currentScrollY = window.scrollY;

            // Add scrolled class for glass morphism effect
            if (currentScrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }

            // Hide/show navbar on scroll
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                navbar.style.transform = 'translateY(-100%)';
            } else {
                navbar.style.transform = 'translateY(0)';
            }

            lastScrollY = currentScrollY;
        });

        // Active nav link highlighting
        this.updateActiveNavLink();
    }

    updateActiveNavLink() {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-link');

        window.addEventListener('scroll', () => {
            let current = '';
            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.clientHeight;
                if (scrollY >= (sectionTop - 200)) {
                    current = section.getAttribute('id');
                }
            });

            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${current}`) {
                    link.classList.add('active');
                }
            });
        });
    }

    // Enhanced Theme Toggle
    setupThemeToggle() {
        const themeToggle = document.querySelector('.theme-toggle');
        if (!themeToggle) return;

        themeToggle.addEventListener('click', () => {
            themeToggle.classList.add('switching');
            
            // Remove switching class after animation
            setTimeout(() => {
                themeToggle.classList.remove('switching');
            }, 600);
        });
    }

    // Animated Counters
    setupCounterAnimations() {
        const counters = document.querySelectorAll('.stat-number, .counter');
        
        const animateCounter = (counter) => {
            const target = parseInt(counter.getAttribute('data-target') || counter.textContent.replace(/\D/g, ''));
            const duration = 2000;
            const increment = target / (duration / 16);
            let current = 0;

            const updateCounter = () => {
                current += increment;
                if (current < target) {
                    counter.textContent = Math.floor(current);
                    requestAnimationFrame(updateCounter);
                } else {
                    counter.textContent = target;
                }
            };

            updateCounter();
        };

        const counterObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateCounter(entry.target);
                    counterObserver.unobserve(entry.target);
                }
            });
        });

        counters.forEach(counter => counterObserver.observe(counter));
    }

    // Parallax Effects
    setupParallaxEffects() {
        const parallaxElements = document.querySelectorAll('.parallax');
        
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            
            parallaxElements.forEach(element => {
                const rate = scrolled * -0.5;
                element.style.transform = `translateY(${rate}px)`;
            });
        });
    }

    // Intersection Observer for various animations
    setupIntersectionObserver() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Add animation classes based on element type
                    if (entry.target.classList.contains('feature-card')) {
                        entry.target.style.animationDelay = `${Array.from(entry.target.parentNode.children).indexOf(entry.target) * 0.1}s`;
                        entry.target.classList.add('animate-in');
                    }
                    
                    if (entry.target.classList.contains('project-card')) {
                        entry.target.style.animationDelay = `${Array.from(entry.target.parentNode.children).indexOf(entry.target) * 0.15}s`;
                        entry.target.classList.add('animate-in');
                    }
                }
            });
        }, observerOptions);

        // Observe cards and other elements
        const cards = document.querySelectorAll('.feature-card, .project-card, .testimonial-card');
        cards.forEach(card => observer.observe(card));
    }

    // Smooth scroll to sections
    static smoothScrollTo(target) {
        const element = document.querySelector(target);
        if (element) {
            const offsetTop = element.offsetTop - 80; // Account for fixed navbar
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    }

    // Add floating animation to elements
    static addFloatingAnimation(selector) {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el, index) => {
            el.style.animation = `float ${3 + (index % 3)}s ease-in-out infinite`;
            el.style.animationDelay = `${index * 0.5}s`;
        });
    }

    // Ripple effect for buttons
    static addRippleEffect(button, event) {
        const ripple = document.createElement('span');
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.classList.add('ripple');
        
        button.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }
}

// CSS for additional animations
const additionalCSS = `
@keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
}

.animate-in {
    animation: slideUpFade 0.6s ease-out forwards;
}

@keyframes slideUpFade {
    from {
        opacity: 0;
        transform: translateY(30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.ripple {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.6);
    transform: scale(0);
    animation: rippleEffect 0.6s linear;
    pointer-events: none;
}

@keyframes rippleEffect {
    to {
        transform: scale(4);
        opacity: 0;
    }
}
`;

// Inject additional CSS
const style = document.createElement('style');
style.textContent = additionalCSS;
document.head.appendChild(style);

// Initialize animations when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ForgeAnimations();
});

// Export for use in other modules
window.ForgeAnimations = ForgeAnimations;
