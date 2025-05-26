/**
 * Firebase Documentation Service
 * Handles Firestore operations for documentation content and user interactions
 */

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { db } from './firebase-config.js';

class FirebaseDocsService {
  constructor() {
    this.collections = {
      docs: 'documentation',
      comments: 'comments',
      bookmarks: 'bookmarks',
      analytics: 'doc_analytics',
      feedback: 'feedback'
    };
    
    this.cache = new Map();
    this.listeners = new Map();
    
    console.log('📚 Firebase Documentation Service initialized');
  }

  // Documentation Content Management
  async getDocumentation(category = null) {
    try {
      const cacheKey = `docs_${category || 'all'}`;
      
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      let q = collection(db, this.collections.docs);
      
      if (category) {
        q = query(q, where('category', '==', category));
      }
      
      q = query(q, orderBy('order', 'asc'), orderBy('createdAt', 'desc'));

      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      this.cache.set(cacheKey, docs);
      return docs;
    } catch (error) {
      console.error('Error fetching documentation:', error);
      return this.getFallbackDocs(category);
    }
  }

  async getDocumentById(docId) {
    try {
      const docRef = doc(db, this.collections.docs, docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        // Track view
        this.trackDocumentView(docId);
        
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      } else {
        throw new Error('Document not found');
      }
    } catch (error) {
      console.error('Error fetching document:', error);
      return null;
    }
  }

  // Real-time documentation updates
  subscribeToDocumentation(category, callback) {
    const cacheKey = `docs_${category || 'all'}`;
    
    let q = collection(db, this.collections.docs);
    
    if (category) {
      q = query(q, where('category', '==', category));
    }
    
    q = query(q, orderBy('order', 'asc'), orderBy('updatedAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      this.cache.set(cacheKey, docs);
      callback(docs);
    }, (error) => {
      console.error('Error in documentation subscription:', error);
      callback(this.getFallbackDocs(category));
    });

    this.listeners.set(cacheKey, unsubscribe);
    return unsubscribe;
  }

  // User Comments and Feedback
  async addComment(docId, userId, content, parentId = null) {
    try {
      const comment = {
        docId,
        userId,
        content,
        parentId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        likes: 0,
        isEdited: false,
        isDeleted: false
      };

      const docRef = await addDoc(collection(db, this.collections.comments), comment);
      
      // Update document comment count
      await this.updateDocumentStats(docId, { comments: increment(1) });
      
      return docRef.id;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }

  async getComments(docId) {
    try {
      const q = query(
        collection(db, this.collections.comments),
        where('docId', '==', docId),
        where('isDeleted', '==', false),
        orderBy('createdAt', 'asc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching comments:', error);
      return [];
    }
  }

  // User Bookmarks
  async addBookmark(userId, docId, section = null) {
    try {
      const bookmark = {
        userId,
        docId,
        section,
        createdAt: serverTimestamp(),
        title: '', // Will be populated from doc data
        category: ''
      };

      // Get document info for bookmark
      const docData = await this.getDocumentById(docId);
      if (docData) {
        bookmark.title = docData.title;
        bookmark.category = docData.category;
      }

      await addDoc(collection(db, this.collections.bookmarks), bookmark);
      return true;
    } catch (error) {
      console.error('Error adding bookmark:', error);
      return false;
    }
  }

  async getUserBookmarks(userId) {
    try {
      const q = query(
        collection(db, this.collections.bookmarks),
        where('userId', '==', userId),
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

  async removeBookmark(userId, docId) {
    try {
      const q = query(
        collection(db, this.collections.bookmarks),
        where('userId', '==', userId),
        where('docId', '==', docId)
      );

      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      return true;
    } catch (error) {
      console.error('Error removing bookmark:', error);
      return false;
    }
  }

  // Analytics and Tracking
  async trackDocumentView(docId, userId = null) {
    try {
      const analytics = {
        docId,
        userId,
        action: 'view',
        timestamp: serverTimestamp(),
        userAgent: navigator.userAgent,
        referrer: document.referrer
      };

      await addDoc(collection(db, this.collections.analytics), analytics);
      
      // Update document view count
      await this.updateDocumentStats(docId, { views: increment(1) });
    } catch (error) {
      console.error('Error tracking document view:', error);
    }
  }

  async trackSearchQuery(query, userId = null, results = 0) {
    try {
      const searchAnalytics = {
        query,
        userId,
        results,
        timestamp: serverTimestamp()
      };

      await addDoc(collection(db, this.collections.analytics), searchAnalytics);
    } catch (error) {
      console.error('Error tracking search:', error);
    }
  }

  // Document Statistics
  async updateDocumentStats(docId, stats) {
    try {
      const docRef = doc(db, this.collections.docs, docId);
      await updateDoc(docRef, {
        ...stats,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating document stats:', error);
    }
  }

  // Feedback System
  async submitFeedback(docId, userId, rating, feedback, type = 'general') {
    try {
      const feedbackData = {
        docId,
        userId,
        rating,
        feedback,
        type,
        createdAt: serverTimestamp(),
        isResolved: false
      };

      await addDoc(collection(db, this.collections.feedback), feedbackData);
      return true;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      return false;
    }
  }

  // Fallback documentation data
  getFallbackDocs(category) {
    const fallbackDocs = [
      {
        id: 'quick-start',
        title: 'Quick Start Guide',
        category: 'Getting Started',
        level: 'Beginner',
        content: 'Get up and running with Forge EC in under 5 minutes...',
        order: 1
      },
      {
        id: 'api-signatures',
        title: 'Signatures Module',
        category: 'API Reference',
        level: 'Intermediate',
        content: 'ECDSA, EdDSA, and Schnorr signature implementations...',
        order: 1
      }
    ];

    if (category) {
      return fallbackDocs.filter(doc => doc.category === category);
    }
    
    return fallbackDocs;
  }

  // Cleanup
  destroy() {
    // Unsubscribe from all listeners
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
    this.cache.clear();
  }
}

// Export singleton instance
export const firebaseDocsService = new FirebaseDocsService();
export default firebaseDocsService;
