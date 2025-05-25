// About page specific JavaScript

document.addEventListener('DOMContentLoaded', function() {
    initSkillBars();
    initProjectCards();
    initContactForm();
    initScrollAnimations();
    initModernAnimations();
    initMagneticHover();
    initProfileImage();
    initTypingAnimation();
    initSmoothScrolling();
    loadGitHubStats();
});

// Skill Bar Animations
function initSkillBars() {
    const skillBars = document.querySelectorAll('.skill-progress');

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const progressBar = entry.target;
                const progress = progressBar.getAttribute('data-progress');

                // Animate the progress bar
                setTimeout(() => {
                    progressBar.style.width = progress + '%';
                }, 200);

                // Unobserve after animation
                observer.unobserve(progressBar);
            }
        });
    }, {
        threshold: 0.5,
        rootMargin: '0px 0px -50px 0px'
    });

    skillBars.forEach(bar => {
        observer.observe(bar);
    });
}

// Project Card Interactions
function initProjectCards() {
    const projectCards = document.querySelectorAll('.project-card');

    projectCards.forEach(card => {
        // Add hover effect for project stats
        const stats = card.querySelectorAll('.project-stats .stat');

        card.addEventListener('mouseenter', function() {
            stats.forEach((stat, index) => {
                setTimeout(() => {
                    stat.style.transform = 'translateY(-2px)';
                    stat.style.transition = 'transform 0.2s ease-out';
                }, index * 50);
            });
        });

        card.addEventListener('mouseleave', function() {
            stats.forEach(stat => {
                stat.style.transform = 'translateY(0)';
            });
        });

        // Add click tracking for project links
        const projectLinks = card.querySelectorAll('.project-link');
        projectLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                const projectTitle = card.querySelector('.project-title').textContent;
                const linkType = this.textContent.trim();

                // Track click event (you can replace this with your analytics)
                console.log(`Project link clicked: ${projectTitle} - ${linkType}`);

                // Add visual feedback
                this.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    this.style.transform = 'scale(1)';
                }, 150);
            });
        });
    });
}

// Contact Form and Interactions
function initContactForm() {
    const contactItems = document.querySelectorAll('.contact-item');

    contactItems.forEach(item => {
        item.addEventListener('click', function() {
            const contactDetails = this.querySelector('.contact-details p').textContent;

            // Handle different contact types
            if (contactDetails.includes('@')) {
                // Email
                window.location.href = `mailto:${contactDetails}`;
            } else if (contactDetails.includes('linkedin.com')) {
                // LinkedIn
                window.open(`https://${contactDetails}`, '_blank');
            } else if (contactDetails.includes('github.com')) {
                // GitHub
                window.open(`https://${contactDetails}`, '_blank');
            }

            // Add click animation
            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 150);
        });

        // Add cursor pointer for clickable items
        item.style.cursor = 'pointer';
    });

    // Availability status animation
    const statusIndicator = document.querySelector('.status-indicator.available');
    if (statusIndicator) {
        setInterval(() => {
            statusIndicator.style.transform = 'scale(1.2)';
            setTimeout(() => {
                statusIndicator.style.transform = 'scale(1)';
            }, 200);
        }, 3000);
    }
}

// Enhanced Scroll Animations
function initScrollAnimations() {
    const animatedElements = document.querySelectorAll(
        '.skill-category, .project-card, .contact-item, .profile-section'
    );

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');

                // Stagger animation for skill categories
                if (entry.target.classList.contains('skill-category')) {
                    const skillItems = entry.target.querySelectorAll('.skill-item');
                    skillItems.forEach((item, index) => {
                        setTimeout(() => {
                            item.style.opacity = '1';
                            item.style.transform = 'translateY(0)';
                        }, index * 100);
                    });
                }

                // Stagger animation for project stats
                if (entry.target.classList.contains('project-card')) {
                    const stats = entry.target.querySelectorAll('.project-stats .stat');
                    stats.forEach((stat, index) => {
                        setTimeout(() => {
                            stat.style.opacity = '1';
                            stat.style.transform = 'translateX(0)';
                        }, index * 100);
                    });
                }
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    animatedElements.forEach(el => {
        // Set initial state
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'all 0.6s ease-out';

        // Set initial state for child elements
        if (el.classList.contains('skill-category')) {
            const skillItems = el.querySelectorAll('.skill-item');
            skillItems.forEach(item => {
                item.style.opacity = '0';
                item.style.transform = 'translateY(20px)';
                item.style.transition = 'all 0.4s ease-out';
            });
        }

        if (el.classList.contains('project-card')) {
            const stats = el.querySelectorAll('.project-stats .stat');
            stats.forEach(stat => {
                stat.style.opacity = '0';
                stat.style.transform = 'translateX(-20px)';
                stat.style.transition = 'all 0.4s ease-out';
            });
        }

        observer.observe(el);
    });

    // Add CSS class for animated elements
    const style = document.createElement('style');
    style.textContent = `
        .animate-in {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(style);
}

// Profile Image Interaction
function initProfileImage() {
    const profileImg = document.querySelector('.profile-img');

    if (profileImg) {
        profileImg.addEventListener('click', function() {
            // Add a fun easter egg
            this.style.transform = 'rotate(360deg) scale(1.1)';
            this.style.transition = 'transform 0.8s ease-in-out';

            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 800);
        });
    }
}

// Typing Animation for Profile Title
function initTypingAnimation() {
    const profileTitle = document.querySelector('.profile-title');

    if (profileTitle) {
        const text = profileTitle.textContent;
        const titles = [
            'Cryptography Developer',
            'Security Researcher',
            'Rust Enthusiast',
            'Open Source Contributor'
        ];

        let currentIndex = 0;
        let charIndex = 0;
        let isDeleting = false;

        function typeWriter() {
            const currentTitle = titles[currentIndex];

            if (isDeleting) {
                profileTitle.textContent = currentTitle.substring(0, charIndex - 1);
                charIndex--;
            } else {
                profileTitle.textContent = currentTitle.substring(0, charIndex + 1);
                charIndex++;
            }

            let typeSpeed = isDeleting ? 50 : 100;

            if (!isDeleting && charIndex === currentTitle.length) {
                typeSpeed = 2000; // Pause at end
                isDeleting = true;
            } else if (isDeleting && charIndex === 0) {
                isDeleting = false;
                currentIndex = (currentIndex + 1) % titles.length;
                typeSpeed = 500; // Pause before next title
            }

            setTimeout(typeWriter, typeSpeed);
        }

        // Start typing animation after a delay
        setTimeout(typeWriter, 1000);
    }
}

// GitHub Stats Integration
async function loadGitHubStats() {
    try {
        const [userResponse, reposResponse] = await Promise.all([
            fetch('https://api.github.com/users/tanm-sys'),
            fetch('https://api.github.com/users/tanm-sys/repos?per_page=100')
        ]);

        const userData = await userResponse.json();
        const reposData = await reposResponse.json();

        // Count crypto-related repositories
        const cryptoKeywords = ['crypt', 'crypto', 'security', 'cipher', 'encrypt', 'forge', 'secure'];
        const cryptoRepos = reposData.filter(repo =>
            cryptoKeywords.some(keyword =>
                repo.name.toLowerCase().includes(keyword) ||
                (repo.description && repo.description.toLowerCase().includes(keyword))
            )
        );

        // Update stats with real data
        const statsElements = document.querySelectorAll('.profile-stats .stat-number');
        if (statsElements.length >= 3) {
            statsElements[1].textContent = userData.public_repos;
            statsElements[2].textContent = cryptoRepos.length;
        }

        // Update project stats if available
        const forgeEcRepo = reposData.find(repo => repo.name === 'forge-ec');
        if (forgeEcRepo) {
            const projectStats = document.querySelectorAll('.project-card.featured .project-stats .stat-value');
            if (projectStats.length >= 2) {
                projectStats[0].textContent = new Date(forgeEcRepo.created_at).getFullYear();
                projectStats[1].textContent = forgeEcRepo.updated_at ? 'Active' : 'Archived';
            }
        }

    } catch (error) {
        console.log('Could not load GitHub stats:', error);
        // Fallback to static values - stats remain as set in HTML
    }
}

// Smooth scrolling for internal links
function initSmoothScrolling() {
    const links = document.querySelectorAll('a[href^="#"]');

    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();

            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                const navbarHeight = document.querySelector('.navbar').offsetHeight;
                const targetPosition = targetElement.offsetTop - navbarHeight - 20;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Modern Animations
function initModernAnimations() {
    // Animate elements on scroll with modern effects
    const animatedElements = document.querySelectorAll('.animate-on-scroll, .animate-slide-in-blur, .animate-bounce-in');

    const animationObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0) scale(1)';
                entry.target.classList.add('animated');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    animatedElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px) scale(0.95)';
        element.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
        animationObserver.observe(element);
    });

    // Staggered animations
    const staggeredElements = document.querySelectorAll('[class*="stagger-"]');
    staggeredElements.forEach((element, index) => {
        const staggerClass = Array.from(element.classList).find(cls => cls.startsWith('stagger-'));
        const staggerIndex = staggerClass ? parseInt(staggerClass.split('-')[1]) : 0;
        element.style.animationDelay = `${staggerIndex * 0.2}s`;
        element.style.transitionDelay = `${staggerIndex * 0.2}s`;
    });
}

// Magnetic Hover Effect
function initMagneticHover() {
    const magneticElements = document.querySelectorAll('.magnetic-hover');

    magneticElements.forEach(element => {
        element.addEventListener('mousemove', function(e) {
            const rect = this.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const deltaX = (e.clientX - centerX) * 0.1;
            const deltaY = (e.clientY - centerY) * 0.1;

            this.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.02)`;
        });

        element.addEventListener('mouseleave', function() {
            this.style.transform = 'translate(0, 0) scale(1)';
        });
    });
}

// Add some interactive effects
document.addEventListener('mousemove', function(e) {
    const profileImg = document.querySelector('.profile-img');

    if (profileImg) {
        const rect = profileImg.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const deltaX = (e.clientX - centerX) / 50;
        const deltaY = (e.clientY - centerY) / 50;

        profileImg.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    }
});

// Reset profile image position when mouse leaves
document.addEventListener('mouseleave', function() {
    const profileImg = document.querySelector('.profile-img');

    if (profileImg) {
        profileImg.style.transform = 'translate(0, 0)';
    }
});

// Add keyboard navigation
document.addEventListener('keydown', function(e) {
    // Press 'c' to scroll to contact section
    if (e.key === 'c' && !e.ctrlKey && !e.metaKey) {
        const contactSection = document.querySelector('.contact-section');
        if (contactSection) {
            contactSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    // Press 'p' to scroll to projects section
    if (e.key === 'p' && !e.ctrlKey && !e.metaKey) {
        const projectsSection = document.querySelector('.projects-section');
        if (projectsSection) {
            projectsSection.scrollIntoView({ behavior: 'smooth' });
        }
    }
});
