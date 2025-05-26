/**
 * Firebase Authentication Service
 * Handles user authentication and profile management
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  updatePassword
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase-config.js';

class FirebaseAuthService {
  constructor() {
    this.currentUser = null;
    this.authStateListeners = [];
    this.isInitialized = false;
    
    // Initialize auth state listener
    this.initAuthStateListener();
    
    console.log('🔐 Firebase Authentication Service initialized');
  }

  // Initialize authentication state listener
  initAuthStateListener() {
    onAuthStateChanged(auth, async (user) => {
      this.currentUser = user;
      
      if (user) {
        // Update user profile in Firestore
        await this.updateUserProfile(user);
        console.log('👤 User signed in:', user.email);
      } else {
        console.log('👤 User signed out');
      }
      
      // Notify all listeners
      this.authStateListeners.forEach(callback => callback(user));
      
      if (!this.isInitialized) {
        this.isInitialized = true;
        this.showAuthUI();
      }
    });
  }

  // Email/Password Authentication
  async signInWithEmail(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      this.showAuthFeedback('Welcome back!', 'success');
      return userCredential.user;
    } catch (error) {
      this.handleAuthError(error);
      throw error;
    }
  }

  async signUpWithEmail(email, password, displayName) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update profile with display name
      await updateProfile(user, { displayName });
      
      // Send email verification
      await sendEmailVerification(user);
      
      // Create user document in Firestore
      await this.createUserDocument(user);
      
      this.showAuthFeedback('Account created! Please check your email for verification.', 'success');
      return user;
    } catch (error) {
      this.handleAuthError(error);
      throw error;
    }
  }

  // Social Authentication
  async signInWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      
      const result = await signInWithPopup(auth, provider);
      await this.createUserDocument(result.user);
      
      this.showAuthFeedback('Signed in with Google!', 'success');
      return result.user;
    } catch (error) {
      this.handleAuthError(error);
      throw error;
    }
  }

  async signInWithGitHub() {
    try {
      const provider = new GithubAuthProvider();
      provider.addScope('user:email');
      
      const result = await signInWithPopup(auth, provider);
      await this.createUserDocument(result.user);
      
      this.showAuthFeedback('Signed in with GitHub!', 'success');
      return result.user;
    } catch (error) {
      this.handleAuthError(error);
      throw error;
    }
  }

  // Sign out
  async signOut() {
    try {
      await signOut(auth);
      this.showAuthFeedback('Signed out successfully', 'info');
    } catch (error) {
      this.handleAuthError(error);
      throw error;
    }
  }

  // Password reset
  async resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      this.showAuthFeedback('Password reset email sent!', 'success');
      return true;
    } catch (error) {
      this.handleAuthError(error);
      throw error;
    }
  }

  // User profile management
  async createUserDocument(user) {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        const userData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '',
          photoURL: user.photoURL || '',
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
          preferences: {
            theme: 'auto',
            emailNotifications: true,
            bookmarkNotifications: false
          },
          stats: {
            documentsRead: 0,
            bookmarksCount: 0,
            commentsCount: 0
          }
        };
        
        await setDoc(userRef, userData);
        console.log('📝 User document created');
      }
    } catch (error) {
      console.error('Error creating user document:', error);
    }
  }

  async updateUserProfile(user) {
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        lastLoginAt: serverTimestamp(),
        email: user.email,
        displayName: user.displayName || '',
        photoURL: user.photoURL || ''
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
    }
  }

  async getUserProfile(uid = null) {
    try {
      const userId = uid || this.currentUser?.uid;
      if (!userId) return null;
      
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return userSnap.data();
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  // Auth state management
  onAuthStateChange(callback) {
    this.authStateListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.authStateListeners.indexOf(callback);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }

  // UI Management
  showAuthUI() {
    const authModal = document.getElementById('auth-modal');
    const authButtons = document.querySelectorAll('.auth-required');
    
    if (this.currentUser) {
      // User is signed in
      authButtons.forEach(btn => {
        btn.style.display = 'block';
        btn.disabled = false;
      });
      
      this.updateUserUI();
    } else {
      // User is not signed in
      authButtons.forEach(btn => {
        btn.style.display = 'none';
        btn.disabled = true;
      });
    }
  }

  updateUserUI() {
    const userElements = document.querySelectorAll('.user-info');
    const user = this.currentUser;
    
    userElements.forEach(element => {
      if (user) {
        element.innerHTML = `
          <div class="user-profile">
            <img src="${user.photoURL || '/assets/default-avatar.png'}" alt="${user.displayName}" class="user-avatar">
            <span class="user-name">${user.displayName || user.email}</span>
          </div>
        `;
      } else {
        element.innerHTML = '';
      }
    });
  }

  // Error handling
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
      case 'auth/cancelled-popup-request':
        message = 'Only one popup request is allowed at a time';
        break;
      default:
        message = error.message;
    }
    
    this.showAuthFeedback(message, 'error');
    console.error('Auth Error:', error);
  }

  showAuthFeedback(message, type = 'info') {
    // Create or update feedback element
    let feedback = document.getElementById('auth-feedback');
    
    if (!feedback) {
      feedback = document.createElement('div');
      feedback.id = 'auth-feedback';
      feedback.className = 'auth-feedback';
      document.body.appendChild(feedback);
    }
    
    feedback.className = `auth-feedback ${type}`;
    feedback.textContent = message;
    feedback.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      feedback.style.display = 'none';
    }, 5000);
  }

  // Utility methods
  isAuthenticated() {
    return !!this.currentUser;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  getCurrentUserId() {
    return this.currentUser?.uid || null;
  }
}

// Export singleton instance
export const firebaseAuthService = new FirebaseAuthService();
export default firebaseAuthService;
