/**
 * Documentation Portal JavaScript
 * Handles interactive features for the Forge EC documentation
 */

class DocsPortal {
  constructor() {
    this.isLoaded = false;
    this.currentTheme = localStorage.getItem('theme') || 'light';
    this.readingProgress = 0;
    this.bookmarks = JSON.parse(localStorage.getItem('forge-ec-bookmarks') || '[]');
    
    this.init();
  }

  async init() {
    try {
      console.log('📚 Initializing Forge EC Documentation Portal...');

      // Initialize core functionality with individual error handling
      try {
        this.updateLoadingProgress(10);
        this.setupEventListeners();
      } catch (error) {
        console.warn('Event listeners setup failed:', error);
      }

      try {
        this.updateLoadingProgress(30);
        this.initializeTheme();
      } catch (error) {
        console.warn('Theme initialization failed:', error);
      }

      try {
        this.updateLoadingProgress(50);
        this.setupScrollEffects();
      } catch (error) {
        console.warn('Scroll effects setup failed:', error);
      }

      try {
        this.updateLoadingProgress(70);
        this.setupTableOfContents();
      } catch (error) {
        console.warn('Table of contents setup failed:', error);
      }

      try {
        this.updateLoadingProgress(80);
        this.setupCodeBlocks();
      } catch (error) {
        console.warn('Code blocks setup failed:', error);
      }

      try {
        this.updateLoadingProgress(90);
        this.setupBookmarks();
      } catch (error) {
        console.warn('Bookmarks setup failed:', error);
      }

      // Initialize Firebase if available (with timeout)
      try {
        this.updateLoadingProgress(95);
        await this.initializeFirebaseWithTimeout();
      } catch (error) {
        console.warn('Firebase initialization failed:', error);
      }

      this.updateLoadingProgress(100);

      // Hide loading screen
      this.hideLoadingScreen();

      console.log('📚 Forge EC Documentation Portal initialized successfully!');
    } catch (error) {
      console.error('Critical error initializing documentation portal:', error);
      // Still hide loading screen even if there's a critical error
      this.hideLoadingScreen();
    }
  }

  async initializeFirebaseWithTimeout() {
    return new Promise((resolve) => {
      let resolved = false;

      const safeResolve = () => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      };

      // Set a timeout to ensure loading screen is hidden even if Firebase fails
      const timeout = setTimeout(() => {
        console.warn('Firebase initialization timeout - continuing without Firebase features');
        safeResolve();
      }, 2000); // Reduced to 2 seconds for faster loading

      // Check if Firebase is already initialized
      if (window.firebaseInitialized) {
        clearTimeout(timeout);
        try {
          this.setupFirebaseFeatures();
        } catch (error) {
          console.warn('Firebase features setup failed:', error);
        }
        safeResolve();
        return;
      }

      // Listen for Firebase ready event
      const handleFirebaseReady = () => {
        clearTimeout(timeout);
        window.removeEventListener('firebaseReady', handleFirebaseReady);
        try {
          this.setupFirebaseFeatures();
        } catch (error) {
          console.warn('Firebase features setup failed:', error);
        }
        safeResolve();
      };

      window.addEventListener('firebaseReady', handleFirebaseReady);

      // Also check periodically in case the event was missed
      const checkInterval = setInterval(() => {
        if (window.firebaseInitialized) {
          clearTimeout(timeout);
          clearInterval(checkInterval);
          window.removeEventListener('firebaseReady', handleFirebaseReady);
          try {
            this.setupFirebaseFeatures();
          } catch (error) {
            console.warn('Firebase features setup failed:', error);
          }
          safeResolve();
        }
      }, 50); // Check more frequently

      // Additional safety timeout to prevent infinite waiting
      setTimeout(() => {
        clearTimeout(timeout);
        clearInterval(checkInterval);
        window.removeEventListener('firebaseReady', handleFirebaseReady);
        console.warn('Firebase initialization abandoned - forcing resolution');
        safeResolve();
      }, 4000); // Absolute maximum wait time
    });
  }

  updateLoadingProgress(progress) {
    const loadingBar = document.getElementById('loading-bar');
    if (loadingBar) {
      loadingBar.style.width = `${progress}%`;
    }
  }

  hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen && !this.isLoaded) {
      try {
        console.log('📚 Documentation portal loaded - hiding loading screen');
        loadingScreen.style.opacity = '0';
        loadingScreen.style.pointerEvents = 'none';
        loadingScreen.style.transition = 'opacity 0.3s ease-out';

        setTimeout(() => {
          if (loadingScreen.parentNode) {
            loadingScreen.style.display = 'none';
            // Remove from DOM completely to prevent any interference
            setTimeout(() => {
              if (loadingScreen.parentNode) {
                loadingScreen.remove();
              }
            }, 100);
          }
          this.isLoaded = true;
        }, 300);
      } catch (error) {
        console.warn('Error hiding loading screen:', error);
        // Force hide even if there's an error
        if (loadingScreen.parentNode) {
          loadingScreen.style.display = 'none';
          loadingScreen.remove();
        }
        this.isLoaded = true;
      }
    }
  }

  setupEventListeners() {
    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => this.toggleTheme());
    }

    // Mobile menu toggle
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const navMenu = document.getElementById('nav-menu');
    if (mobileMenuToggle && navMenu) {
      mobileMenuToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        mobileMenuToggle.classList.toggle('active');
      });
    }

    // Bookmark button
    const bookmarkBtn = document.getElementById('bookmark-btn');
    if (bookmarkBtn) {
      bookmarkBtn.addEventListener('click', () => this.toggleBookmark());
    }

    // Scroll events
    window.addEventListener('scroll', () => {
      this.updateReadingProgress();
      this.updateActiveTableOfContents();
    });

    // Copy buttons
    document.addEventListener('click', (e) => {
      if (e.target.closest('.copy-btn')) {
        this.handleCopyCode(e.target.closest('.copy-btn'));
      }
    });
  }

  initializeTheme() {
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    this.updateThemeIcon();
  }

  toggleTheme() {
    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    localStorage.setItem('theme', this.currentTheme);
    this.updateThemeIcon();
  }

  updateThemeIcon() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      const sunIcon = themeToggle.querySelector('.sun-icon');
      const moonIcon = themeToggle.querySelector('.moon-icon');
      
      if (this.currentTheme === 'dark') {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
      } else {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
      }
    }
  }

  setupScrollEffects() {
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(anchor.getAttribute('href'));
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      });
    });
  }

  setupTableOfContents() {
    const tocLinks = document.querySelectorAll('.toc-link');
    const sections = document.querySelectorAll('.docs-section[id]');
    
    if (tocLinks.length === 0 || sections.length === 0) return;

    // Create intersection observer for active section tracking
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          tocLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${id}`) {
              link.classList.add('active');
            }
          });
        }
      });
    }, {
      rootMargin: '-20% 0px -70% 0px'
    });

    sections.forEach(section => observer.observe(section));
  }

  updateActiveTableOfContents() {
    // This is handled by the intersection observer in setupTableOfContents
  }

  updateReadingProgress() {
    const progressBar = document.getElementById('reading-progress');
    if (!progressBar) return;

    const article = document.querySelector('.docs-article');
    if (!article) return;

    const articleTop = article.offsetTop;
    const articleHeight = article.offsetHeight;
    const windowHeight = window.innerHeight;
    const scrollTop = window.pageYOffset;

    const progress = Math.min(
      Math.max((scrollTop - articleTop + windowHeight) / articleHeight, 0),
      1
    );

    progressBar.style.width = `${progress * 100}%`;
    this.readingProgress = progress;
  }

  setupCodeBlocks() {
    // Initialize syntax highlighting if Prism is available
    if (window.Prism) {
      Prism.highlightAll();
    }

    // Setup copy functionality
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', () => this.handleCopyCode(btn));
    });
  }

  async handleCopyCode(button) {
    const copyData = button.getAttribute('data-copy');
    if (!copyData) return;

    try {
      await navigator.clipboard.writeText(copyData);
      
      // Visual feedback
      const originalText = button.innerHTML;
      button.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M9 12l2 2 4-4M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"/>
        </svg>
      `;
      button.style.background = 'var(--success-bg)';
      button.style.color = 'var(--success-text)';
      button.style.borderColor = 'var(--success-border)';

      setTimeout(() => {
        button.innerHTML = originalText;
        button.style.background = '';
        button.style.color = '';
        button.style.borderColor = '';
      }, 2000);

    } catch (err) {
      console.error('Failed to copy code:', err);
      
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = copyData;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  }

  setupBookmarks() {
    const currentUrl = window.location.pathname;
    const bookmarkBtn = document.getElementById('bookmark-btn');
    
    if (!bookmarkBtn) return;

    // Check if current page is bookmarked
    const isBookmarked = this.bookmarks.includes(currentUrl);
    this.updateBookmarkButton(isBookmarked);
  }

  toggleBookmark() {
    const currentUrl = window.location.pathname;
    const currentTitle = document.title;
    const isBookmarked = this.bookmarks.includes(currentUrl);

    if (isBookmarked) {
      this.bookmarks = this.bookmarks.filter(url => url !== currentUrl);
    } else {
      this.bookmarks.push(currentUrl);
    }

    localStorage.setItem('forge-ec-bookmarks', JSON.stringify(this.bookmarks));
    this.updateBookmarkButton(!isBookmarked);

    // Track bookmark action in Firebase if available
    if (window.firebaseDb && window.firebaseAuth?.currentUser) {
      this.trackBookmarkAction(currentUrl, currentTitle, !isBookmarked);
    }
  }

  updateBookmarkButton(isBookmarked) {
    const bookmarkBtn = document.getElementById('bookmark-btn');
    if (!bookmarkBtn) return;

    if (isBookmarked) {
      bookmarkBtn.style.background = 'var(--accent-primary)';
      bookmarkBtn.style.color = 'white';
      bookmarkBtn.style.borderColor = 'var(--accent-primary)';
      bookmarkBtn.setAttribute('aria-label', 'Remove bookmark');
    } else {
      bookmarkBtn.style.background = '';
      bookmarkBtn.style.color = '';
      bookmarkBtn.style.borderColor = '';
      bookmarkBtn.setAttribute('aria-label', 'Bookmark this page');
    }
  }

  setupFirebaseFeatures() {
    if (!window.firebaseDb || !window.firebaseAuth) return;

    // Track page view
    this.trackPageView();

    // Setup reading progress tracking
    this.setupReadingProgressTracking();
  }

  async trackPageView() {
    try {
      const { doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js');
      
      const pageData = {
        url: window.location.pathname,
        title: document.title,
        timestamp: serverTimestamp(),
        userAgent: navigator.userAgent,
        referrer: document.referrer
      };

      const docRef = doc(window.firebaseDb, 'page_views', `${Date.now()}_${Math.random()}`);
      await setDoc(docRef, pageData);
      
    } catch (error) {
      console.warn('Failed to track page view:', error);
    }
  }

  async trackBookmarkAction(url, title, isBookmarked) {
    try {
      const { doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js');
      
      const bookmarkData = {
        url,
        title,
        action: isBookmarked ? 'add' : 'remove',
        timestamp: serverTimestamp(),
        userId: window.firebaseAuth.currentUser?.uid
      };

      const docRef = doc(window.firebaseDb, 'bookmarks', `${Date.now()}_${Math.random()}`);
      await setDoc(docRef, bookmarkData);
      
    } catch (error) {
      console.warn('Failed to track bookmark action:', error);
    }
  }

  setupReadingProgressTracking() {
    let progressTrackingInterval;
    
    const trackProgress = () => {
      if (this.readingProgress > 0.1 && window.firebaseAuth?.currentUser) {
        this.saveReadingProgress();
      }
    };

    // Track progress every 10 seconds
    progressTrackingInterval = setInterval(trackProgress, 10000);

    // Track when user leaves the page
    window.addEventListener('beforeunload', () => {
      clearInterval(progressTrackingInterval);
      if (this.readingProgress > 0.1) {
        this.saveReadingProgress();
      }
    });
  }

  async saveReadingProgress() {
    try {
      const { doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js');
      
      const progressData = {
        url: window.location.pathname,
        progress: this.readingProgress,
        timestamp: serverTimestamp(),
        userId: window.firebaseAuth.currentUser?.uid
      };

      const docRef = doc(window.firebaseDb, 'reading_progress', 
        `${window.firebaseAuth.currentUser.uid}_${btoa(window.location.pathname)}`);
      await setDoc(docRef, progressData);
      
    } catch (error) {
      console.warn('Failed to save reading progress:', error);
    }
  }
}

// Initialize documentation portal when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  try {
    window.docsPortal = new DocsPortal();
  } catch (error) {
    console.error('Failed to initialize DocsPortal:', error);
    // Emergency loading screen hide
    setTimeout(() => {
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) {
        loadingScreen.style.display = 'none';
        if (loadingScreen.parentNode) {
          loadingScreen.remove();
        }
      }
    }, 1000);
  }
});

// Emergency fallback - hide loading screen after 5 seconds no matter what
setTimeout(() => {
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen && loadingScreen.style.display !== 'none') {
    console.warn('🚨 Emergency fallback: Force hiding loading screen');
    loadingScreen.style.display = 'none';
    if (loadingScreen.parentNode) {
      loadingScreen.remove();
    }
  }
}, 5000);

// Export for potential external use
window.DocsPortal = DocsPortal;
