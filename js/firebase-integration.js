/**
 * Firebase Integration for Forge EC
 * Simplified integration that works with CDN Firebase SDK
 */

class ForgeECFirebase {
  constructor() {
    this.isReady = false;
    this.currentUser = null;
    this.services = {};

    // Wait for Firebase to be ready
    if (window.firebaseApp) {
      this.init();
    } else {
      window.addEventListener('firebaseReady', () => this.init());
    }
  }

  async init() {
    try {
      // Get Firebase services from global window object
      this.services = {
        app: window.firebaseApp,
        auth: window.firebaseAuth,
        db: window.firebaseDb,
        functions: window.firebaseFunctions,
        analytics: window.firebaseAnalytics,
        performance: window.firebasePerformance
      };

      // Set up authentication state listener
      this.setupAuthListener();

      // Set up UI components
      this.setupUI();

      // Track initial page view
      this.trackPageView();

      this.isReady = true;
      console.log('🔥 Forge EC Firebase integration ready');

      // Dispatch ready event
      window.dispatchEvent(new CustomEvent('forgeFirebaseReady'));

    } catch (error) {
      console.warn('Firebase integration failed:', error);
    }
  }

  // Authentication Methods
  setupAuthListener() {
    if (!this.services.auth) return;

    this.services.auth.onAuthStateChanged((user) => {
      this.currentUser = user;
      this.updateAuthUI(user);

      if (user) {
        console.log('👤 User signed in:', user.email);
        this.trackEvent('user_login', { method: 'firebase' });
      } else {
        console.log('👤 User signed out');
      }
    });
  }

  async signInWithGoogle() {
    try {
      if (!this.services.auth) {
        throw new Error('Firebase Auth not initialized');
      }

      const provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');

      const result = await this.services.auth.signInWithPopup(provider);
      this.showMessage('Signed in with Google!', 'success');
      return result.user;
    } catch (error) {
      this.handleAuthError(error);
      throw error;
    }
  }

  async signInWithGitHub() {
    try {
      if (!this.services.auth) {
        throw new Error('Firebase Auth not initialized');
      }

      const provider = new firebase.auth.GithubAuthProvider();
      provider.addScope('user:email');

      const result = await this.services.auth.signInWithPopup(provider);
      this.showMessage('Signed in with GitHub!', 'success');
      return result.user;
    } catch (error) {
      this.handleAuthError(error);
      throw error;
    }
  }

  async signInWithEmail(email, password) {
    try {
      if (!this.services.auth) {
        throw new Error('Firebase Auth not initialized');
      }

      const userCredential = await this.services.auth.signInWithEmailAndPassword(email, password);
      this.showMessage('Welcome back!', 'success');
      return userCredential.user;
    } catch (error) {
      this.handleAuthError(error);
      throw error;
    }
  }

  async signUpWithEmail(email, password, displayName) {
    try {
      if (!this.services.auth) {
        throw new Error('Firebase Auth not initialized');
      }

      const userCredential = await this.services.auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;

      // Update profile with display name
      if (displayName) {
        await user.updateProfile({ displayName });
      }

      // Send email verification
      await user.sendEmailVerification();

      this.showMessage('Account created! Please check your email for verification.', 'success');
      return user;
    } catch (error) {
      this.handleAuthError(error);
      throw error;
    }
  }

  async signOut() {
    try {
      if (!this.services.auth) {
        throw new Error('Firebase Auth not initialized');
      }

      await this.services.auth.signOut();
      this.showMessage('Signed out successfully', 'info');
    } catch (error) {
      this.handleAuthError(error);
      throw error;
    }
  }

  // Firestore Methods
  async saveUserBookmark(docId, title, category) {
    if (!this.currentUser || !this.services.db) return false;

    try {
      const bookmark = {
        userId: this.currentUser.uid,
        docId: docId,
        title: title,
        category: category,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      await this.services.db.collection('bookmarks').add(bookmark);
      this.showMessage('Bookmark saved!', 'success');
      return true;
    } catch (error) {
      console.error('Error saving bookmark:', error);
      this.showMessage('Failed to save bookmark', 'error');
      return false;
    }
  }

  async getUserBookmarks() {
    if (!this.currentUser || !this.services.db) return [];

    try {
      const { collection, query, where, orderBy, getDocs } = await import('https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js');

      const q = query(
        collection(this.services.db, 'bookmarks'),
        where('userId', '==', this.currentUser.uid),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      return [];
    }
  }

  async submitFeedback(docId, rating, feedback, category) {
    if (!this.currentUser || !this.services.db) return false;

    try {
      const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js');

      const feedbackData = {
        docId: docId,
        userId: this.currentUser.uid,
        rating: rating,
        feedback: feedback,
        category: category,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(this.services.db, 'feedback'), feedbackData);
      this.showMessage('Thank you for your feedback!', 'success');
      return true;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      this.showMessage('Failed to submit feedback', 'error');
      return false;
    }
  }

  // Analytics Methods
  trackEvent(eventName, parameters = {}) {
    if (!this.services.analytics) return;

    try {
      this.services.analytics.logEvent(eventName, {
        ...parameters,
        timestamp: Date.now()
      });
    } catch (error) {
      console.warn('Analytics tracking failed:', error);
    }
  }

  trackPageView(pageName = null) {
    const page = pageName || this.getCurrentPage();
    this.trackEvent('page_view', {
      page_title: document.title,
      page_location: window.location.href,
      page_path: window.location.pathname,
      section: page
    });
  }

  trackDocumentationView(docId, category, title) {
    this.trackEvent('documentation_view', {
      doc_id: docId,
      doc_category: category,
      doc_title: title
    });
  }

  trackSearch(query, results) {
    this.trackEvent('documentation_search', {
      search_term: query,
      search_results: results
    });
  }

  // UI Methods
  setupUI() {
    this.createAuthButton();
    this.createUserMenu();
    this.setupEventListeners();
  }

  createAuthButton() {
    const authButton = document.getElementById('auth-trigger');
    if (authButton) {
      authButton.addEventListener('click', () => this.showAuthModal());
    }
  }

  createUserMenu() {
    // User menu will be created when user signs in
  }

  setupEventListeners() {
    // Set up global event listeners for Firebase features
    document.addEventListener('click', (e) => {
      if (e.target.matches('.bookmark-btn')) {
        this.handleBookmarkClick(e.target);
      }

      if (e.target.matches('.feedback-btn')) {
        this.handleFeedbackClick(e.target);
      }
    });
  }

  updateAuthUI(user) {
    const authTrigger = document.getElementById('auth-trigger');
    const userMenuTrigger = document.getElementById('user-menu-trigger');
    const authRequired = document.querySelectorAll('.auth-required');

    if (user) {
      // User is signed in
      if (authTrigger) authTrigger.style.display = 'none';
      if (userMenuTrigger) {
        userMenuTrigger.style.display = 'flex';
        this.updateUserProfile(user);
      }

      authRequired.forEach(element => {
        element.style.display = 'block';
        element.disabled = false;
      });
    } else {
      // User is not signed in
      if (authTrigger) authTrigger.style.display = 'block';
      if (userMenuTrigger) userMenuTrigger.style.display = 'none';

      authRequired.forEach(element => {
        element.style.display = 'none';
        element.disabled = true;
      });
    }
  }

  updateUserProfile(user) {
    const userInfo = document.querySelector('.user-info');
    if (userInfo) {
      userInfo.innerHTML = `
        <img src="${user.photoURL || '/assets/default-avatar.png'}" alt="${user.displayName}" class="user-avatar" style="width: 32px; height: 32px; border-radius: 50%; margin-right: 8px;">
        <span class="user-name">${user.displayName || user.email}</span>
      `;
    }
  }

  // Utility Methods
  getCurrentPage() {
    const hash = window.location.hash.substring(1);
    return hash || 'home';
  }

  handleAuthError(error) {
    let message = 'An authentication error occurred';

    switch (error.code) {
      case 'auth/user-not-found':
        message = 'No account found with this email address';
        break;
      case 'auth/wrong-password':
        message = 'Incorrect password';
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
      default:
        message = error.message;
    }

    this.showMessage(message, 'error');
    console.error('Auth Error:', error);
  }

  showMessage(message, type = 'info') {
    // Create or update message element
    let messageEl = document.getElementById('firebase-message');

    if (!messageEl) {
      messageEl = document.createElement('div');
      messageEl.id = 'firebase-message';
      messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 16px;
        border-radius: 8px;
        color: white;
        font-size: 14px;
        font-weight: 500;
        z-index: 10001;
        backdrop-filter: blur(10px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: none;
      `;
      document.body.appendChild(messageEl);
    }

    // Set message type styles
    const colors = {
      success: 'rgba(16, 185, 129, 0.9)',
      error: 'rgba(239, 68, 68, 0.9)',
      info: 'rgba(59, 130, 246, 0.9)'
    };

    messageEl.style.background = colors[type] || colors.info;
    messageEl.textContent = message;
    messageEl.style.display = 'block';

    // Auto-hide after 5 seconds
    setTimeout(() => {
      messageEl.style.display = 'none';
    }, 5000);
  }

  showAuthModal() {
    // Simple auth modal - you can enhance this
    const email = prompt('Enter your email:');
    if (email) {
      const password = prompt('Enter your password:');
      if (password) {
        this.signInWithEmail(email, password).catch(() => {
          const createAccount = confirm('Account not found. Create new account?');
          if (createAccount) {
            const name = prompt('Enter your name:');
            this.signUpWithEmail(email, password, name);
          }
        });
      }
    }
  }

  // Public API
  isAuthenticated() {
    return !!this.currentUser;
  }

  getCurrentUser() {
    return this.currentUser;
  }
}

// Initialize Firebase integration
window.forgeFirebase = new ForgeECFirebase();

// Export for global access
window.ForgeECFirebase = ForgeECFirebase;
