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
    // Initialize core functionality
    this.updateLoadingProgress(10);
    this.setupEventListeners();

    this.updateLoadingProgress(30);
    this.initializeTheme();

    this.updateLoadingProgress(50);
    this.setupScrollEffects();

    this.updateLoadingProgress(70);
    this.setupTableOfContents();

    this.updateLoadingProgress(80);
    this.setupCodeBlocks();

    this.updateLoadingProgress(90);
    this.setupBookmarks();

    // Initialize Firebase if available
    if (window.firebaseInitialized) {
      this.setupFirebaseFeatures();
    }

    // Hide loading screen
    this.hideLoadingScreen();
    
    console.log('📚 Forge EC Documentation Portal initialized successfully!');
  }

  updateLoadingProgress(progress) {
    const loadingBar = document.getElementById('loading-bar');
    if (loadingBar) {
      loadingBar.style.width = `${progress}%`;
    }
  }

  hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      setTimeout(() => {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
          loadingScreen.style.display = 'none';
          this.isLoaded = true;
        }, 300);
      }, 500);
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
  window.docsPortal = new DocsPortal();
});

// Export for potential external use
window.DocsPortal = DocsPortal;
