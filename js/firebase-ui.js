/**
 * Firebase UI Components
 * Handles user interface for authentication and user features
 */

import { firebaseAuthService } from './firebase-auth.js';
import { firebaseDocsService } from './firebase-docs.js';

class FirebaseUI {
  constructor() {
    this.isInitialized = false;
    this.currentUser = null;
    
    this.init();
    console.log('🎨 Firebase UI initialized');
  }

  async init() {
    // Wait for auth service to initialize
    firebaseAuthService.onAuthStateChange((user) => {
      this.currentUser = user;
      this.updateUI();
    });

    // Create UI components
    this.createAuthModal();
    this.createUserMenu();
    this.createBookmarkButton();
    this.createFeedbackModal();
    
    // Setup event listeners
    this.setupEventListeners();
    
    this.isInitialized = true;
  }

  // Authentication Modal
  createAuthModal() {
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
              <!-- Sign In Form -->
              <div id="signin-form" class="auth-form active">
                <div class="social-auth">
                  <button class="social-btn google-btn" id="google-signin">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </button>
                  
                  <button class="social-btn github-btn" id="github-signin">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    Continue with GitHub
                  </button>
                </div>
                
                <div class="divider">
                  <span>or</span>
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
              
              <!-- Sign Up Form -->
              <div id="signup-form" class="auth-form">
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

  // User Menu
  createUserMenu() {
    const userMenuHTML = `
      <div id="user-menu" class="user-menu" style="display: none;">
        <div class="user-menu-content glass-enhanced">
          <div class="user-profile-section">
            <div class="user-avatar-container">
              <img id="user-avatar" src="" alt="User Avatar" class="user-avatar">
            </div>
            <div class="user-info">
              <div id="user-display-name" class="user-name"></div>
              <div id="user-email" class="user-email"></div>
            </div>
          </div>
          
          <div class="user-menu-items">
            <a href="#" id="view-bookmarks" class="menu-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
              My Bookmarks
            </a>
            
            <a href="#" id="reading-progress" class="menu-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M9 11l3 3 8-8"/>
                <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
                <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
              </svg>
              Reading Progress
            </a>
            
            <a href="#" id="user-settings" class="menu-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              Settings
            </a>
            
            <div class="menu-divider"></div>
            
            <a href="#" id="user-signout" class="menu-item signout">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16,17 21,12 16,7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sign Out
            </a>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', userMenuHTML);
  }

  // Bookmark Button
  createBookmarkButton() {
    const bookmarkHTML = `
      <button id="bookmark-btn" class="bookmark-btn auth-required" style="display: none;" title="Bookmark this section">
        <svg class="bookmark-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
        </svg>
      </button>
    `;

    // Add to documentation sections
    const docSections = document.querySelectorAll('.docs-category, .doc-card');
    docSections.forEach(section => {
      if (!section.querySelector('.bookmark-btn')) {
        section.insertAdjacentHTML('afterbegin', bookmarkHTML);
      }
    });
  }

  // Feedback Modal
  createFeedbackModal() {
    const feedbackHTML = `
      <div id="feedback-modal" class="modal-overlay" style="display: none;">
        <div class="modal-content glass-enhanced">
          <div class="modal-header">
            <h3 class="modal-title">Document Feedback</h3>
            <button class="modal-close" id="feedback-modal-close">&times;</button>
          </div>
          
          <div class="modal-body">
            <form id="feedback-form">
              <div class="form-group">
                <label for="feedback-rating">How helpful was this documentation?</label>
                <div class="rating-stars" id="feedback-rating">
                  <span class="star" data-rating="1">★</span>
                  <span class="star" data-rating="2">★</span>
                  <span class="star" data-rating="3">★</span>
                  <span class="star" data-rating="4">★</span>
                  <span class="star" data-rating="5">★</span>
                </div>
              </div>
              
              <div class="form-group">
                <label for="feedback-category">Category</label>
                <select id="feedback-category" required>
                  <option value="">Select category</option>
                  <option value="accuracy">Accuracy</option>
                  <option value="clarity">Clarity</option>
                  <option value="completeness">Completeness</option>
                  <option value="examples">Examples</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div class="form-group">
                <label for="feedback-text">Your feedback</label>
                <textarea id="feedback-text" placeholder="Tell us how we can improve this documentation..." rows="4"></textarea>
              </div>
              
              <div class="form-actions">
                <button type="button" class="btn-secondary" id="feedback-cancel">Cancel</button>
                <button type="submit" class="btn-primary">Submit Feedback</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', feedbackHTML);
  }

  // Event Listeners
  setupEventListeners() {
    // Auth modal events
    this.setupAuthModalEvents();
    
    // User menu events
    this.setupUserMenuEvents();
    
    // Bookmark events
    this.setupBookmarkEvents();
    
    // Feedback events
    this.setupFeedbackEvents();
  }

  setupAuthModalEvents() {
    // Modal open/close
    document.addEventListener('click', (e) => {
      if (e.target.matches('.auth-trigger')) {
        this.showAuthModal();
      }
    });

    const authModal = document.getElementById('auth-modal');
    const closeBtn = document.getElementById('auth-modal-close');
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hideAuthModal());
    }

    if (authModal) {
      authModal.addEventListener('click', (e) => {
        if (e.target === authModal) {
          this.hideAuthModal();
        }
      });
    }

    // Tab switching
    document.addEventListener('click', (e) => {
      if (e.target.matches('.auth-tab')) {
        this.switchAuthTab(e.target.dataset.tab);
      }
    });

    // Social auth buttons
    const googleBtn = document.getElementById('google-signin');
    const githubBtn = document.getElementById('github-signin');

    if (googleBtn) {
      googleBtn.addEventListener('click', () => this.handleGoogleSignIn());
    }

    if (githubBtn) {
      githubBtn.addEventListener('click', () => this.handleGitHubSignIn());
    }

    // Email forms
    const signinForm = document.getElementById('email-signin-form');
    const signupForm = document.getElementById('email-signup-form');

    if (signinForm) {
      signinForm.addEventListener('submit', (e) => this.handleEmailSignIn(e));
    }

    if (signupForm) {
      signupForm.addEventListener('submit', (e) => this.handleEmailSignUp(e));
    }
  }

  // Continue with more methods...
  updateUI() {
    const authTriggers = document.querySelectorAll('.auth-trigger');
    const authRequired = document.querySelectorAll('.auth-required');
    const userMenuTrigger = document.getElementById('user-menu-trigger');

    if (this.currentUser) {
      // User is signed in
      authTriggers.forEach(btn => btn.style.display = 'none');
      authRequired.forEach(element => {
        element.style.display = 'block';
        element.disabled = false;
      });

      this.updateUserProfile();
      
      if (userMenuTrigger) {
        userMenuTrigger.style.display = 'block';
      }
    } else {
      // User is not signed in
      authTriggers.forEach(btn => btn.style.display = 'block');
      authRequired.forEach(element => {
        element.style.display = 'none';
        element.disabled = true;
      });

      if (userMenuTrigger) {
        userMenuTrigger.style.display = 'none';
      }
    }
  }

  updateUserProfile() {
    const user = this.currentUser;
    if (!user) return;

    const userAvatar = document.getElementById('user-avatar');
    const userDisplayName = document.getElementById('user-display-name');
    const userEmail = document.getElementById('user-email');

    if (userAvatar) {
      userAvatar.src = user.photoURL || '/assets/default-avatar.png';
      userAvatar.alt = user.displayName || user.email;
    }

    if (userDisplayName) {
      userDisplayName.textContent = user.displayName || 'User';
    }

    if (userEmail) {
      userEmail.textContent = user.email;
    }
  }

  // Modal management
  showAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  }

  hideAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = '';
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

  // Authentication handlers
  async handleGoogleSignIn() {
    try {
      await firebaseAuthService.signInWithGoogle();
      this.hideAuthModal();
    } catch (error) {
      console.error('Google sign-in error:', error);
    }
  }

  async handleGitHubSignIn() {
    try {
      await firebaseAuthService.signInWithGitHub();
      this.hideAuthModal();
    } catch (error) {
      console.error('GitHub sign-in error:', error);
    }
  }

  async handleEmailSignIn(e) {
    e.preventDefault();
    
    const email = document.getElementById('signin-email').value;
    const password = document.getElementById('signin-password').value;

    try {
      await firebaseAuthService.signInWithEmail(email, password);
      this.hideAuthModal();
    } catch (error) {
      console.error('Email sign-in error:', error);
    }
  }

  async handleEmailSignUp(e) {
    e.preventDefault();
    
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    try {
      await firebaseAuthService.signUpWithEmail(email, password, name);
      this.hideAuthModal();
    } catch (error) {
      console.error('Email sign-up error:', error);
    }
  }
}

// Export singleton instance
export const firebaseUI = new FirebaseUI();
export default firebaseUI;
