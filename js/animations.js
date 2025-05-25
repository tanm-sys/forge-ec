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
        this.setupAdvancedInteractions();
        this.setupMorphingEffects();
        this.setupTextAnimations();
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

    // Advanced Interactions
    setupAdvancedInteractions() {
        // Enhanced card hover effects
        const cards = document.querySelectorAll('.feature-card, .performance-card');
        cards.forEach(card => {
            card.addEventListener('mouseenter', (e) => {
                this.addMagneticEffect(card, e);
                this.addGlowEffect(card);
            });

            card.addEventListener('mouseleave', () => {
                this.removeMagneticEffect(card);
                this.removeGlowEffect(card);
            });

            card.addEventListener('mousemove', (e) => {
                this.updateMagneticEffect(card, e);
            });
        });

        // Enhanced button interactions
        const buttons = document.querySelectorAll('.btn');
        buttons.forEach(button => {
            button.addEventListener('mouseenter', () => {
                this.addButtonGlow(button);
            });

            button.addEventListener('mouseleave', () => {
                this.removeButtonGlow(button);
            });
        });
    }

    // Morphing Effects
    setupMorphingEffects() {
        const morphElements = document.querySelectorAll('.hero-visual, .code-preview');
        morphElements.forEach(element => {
            element.addEventListener('mouseenter', () => {
                element.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg) scale(1.02)';
                element.style.filter = 'brightness(1.1)';
            });

            element.addEventListener('mouseleave', () => {
                element.style.transform = 'perspective(1000px) rotateY(-5deg) rotateX(5deg) scale(1)';
                element.style.filter = 'brightness(1)';
            });
        });
    }

    // Text Animations
    setupTextAnimations() {
        // Typewriter effect for hero title
        const heroTitle = document.querySelector('.hero-title');
        if (heroTitle) {
            this.typewriterEffect(heroTitle);
        }

        // Animated gradient text
        const gradientTexts = document.querySelectorAll('.gradient-text');
        gradientTexts.forEach(text => {
            this.animateGradientText(text);
        });
    }

    // Helper Methods
    addMagneticEffect(element, event) {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const deltaX = (event.clientX - centerX) * 0.1;
        const deltaY = (event.clientY - centerY) * 0.1;

        element.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.02)`;
    }

    updateMagneticEffect(element, event) {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const deltaX = (event.clientX - centerX) * 0.05;
        const deltaY = (event.clientY - centerY) * 0.05;

        element.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.02)`;
    }

    removeMagneticEffect(element) {
        element.style.transform = '';
    }

    addGlowEffect(element) {
        element.style.boxShadow = 'var(--shadow-glow), var(--shadow-float)';
    }

    removeGlowEffect(element) {
        element.style.boxShadow = '';
    }

    addButtonGlow(button) {
        button.style.boxShadow = 'var(--shadow-glow)';
        button.style.filter = 'brightness(1.1)';
    }

    removeButtonGlow(button) {
        button.style.boxShadow = '';
        button.style.filter = '';
    }

    typewriterEffect(element) {
        const text = element.textContent;
        element.textContent = '';
        let i = 0;

        const typeInterval = setInterval(() => {
            element.textContent += text.charAt(i);
            i++;
            if (i > text.length) {
                clearInterval(typeInterval);
            }
        }, 100);
    }

    animateGradientText(element) {
        element.style.backgroundSize = '200% 200%';
        element.style.animation = 'shimmer 3s ease-in-out infinite';
    }
}

// CSS for additional animations
const additionalCSS = `
@keyframes float {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    33% { transform: translateY(-10px) rotate(1deg); }
    66% { transform: translateY(-5px) rotate(-1deg); }
}

@keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
}

@keyframes magneticPull {
    0% { transform: scale(1); }
    50% { transform: scale(1.02); }
    100% { transform: scale(1.01); }
}

@keyframes glowPulse {
    0%, 100% {
        box-shadow: 0 0 5px rgba(37, 99, 235, 0.5);
        filter: brightness(1);
    }
    50% {
        box-shadow: 0 0 20px rgba(37, 99, 235, 0.8), 0 0 30px rgba(37, 99, 235, 0.6);
        filter: brightness(1.1);
    }
}

.animate-in {
    animation: slideUpFade 0.8s cubic-bezier(0.25, 1, 0.5, 1) forwards;
}

@keyframes slideUpFade {
    from {
        opacity: 0;
        transform: translateY(40px) scale(0.95);
        filter: blur(2px);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
        filter: blur(0);
    }
}

.ripple {
    position: absolute;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.2) 70%, transparent 100%);
    transform: scale(0);
    animation: rippleEffect 0.8s cubic-bezier(0.25, 1, 0.5, 1);
    pointer-events: none;
}

@keyframes rippleEffect {
    0% {
        transform: scale(0);
        opacity: 1;
    }
    50% {
        opacity: 0.8;
    }
    100% {
        transform: scale(4);
        opacity: 0;
    }
}

.magnetic-hover {
    transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
}

.glow-effect {
    animation: glowPulse 2s ease-in-out infinite;
}

.shimmer-text {
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8), transparent);
    background-size: 200% 100%;
    animation: shimmer 2s ease-in-out infinite;
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
