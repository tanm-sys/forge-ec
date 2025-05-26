/**
 * Firebase Cloud Functions Client
 * Handles client-side calls to Firebase Cloud Functions
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase-config.js';

class FirebaseFunctionsService {
  constructor() {
    this.functions = {
      sendContactEmail: httpsCallable(functions, 'sendContactEmail'),
      processDocumentFeedback: httpsCallable(functions, 'processDocumentFeedback'),
      generateDocumentSummary: httpsCallable(functions, 'generateDocumentSummary'),
      moderateComment: httpsCallable(functions, 'moderateComment'),
      sendNotification: httpsCallable(functions, 'sendNotification'),
      analyzeSearchPatterns: httpsCallable(functions, 'analyzeSearchPatterns')
    };
    
    console.log('⚡ Firebase Functions Service initialized');
  }

  // Contact Form Processing
  async sendContactEmail(contactData) {
    try {
      const result = await this.functions.sendContactEmail({
        name: contactData.name,
        email: contactData.email,
        subject: contactData.subject,
        message: contactData.message,
        type: contactData.type || 'general',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        referrer: document.referrer
      });

      return result.data;
    } catch (error) {
      console.error('Error sending contact email:', error);
      throw new Error('Failed to send message. Please try again later.');
    }
  }

  // Document Feedback Processing
  async submitDocumentFeedback(feedbackData) {
    try {
      const result = await this.functions.processDocumentFeedback({
        docId: feedbackData.docId,
        userId: feedbackData.userId,
        rating: feedbackData.rating,
        feedback: feedbackData.feedback,
        category: feedbackData.category,
        timestamp: new Date().toISOString()
      });

      return result.data;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw new Error('Failed to submit feedback. Please try again later.');
    }
  }

  // Comment Moderation
  async moderateComment(commentData) {
    try {
      const result = await this.functions.moderateComment({
        commentId: commentData.commentId,
        content: commentData.content,
        userId: commentData.userId,
        docId: commentData.docId
      });

      return result.data;
    } catch (error) {
      console.error('Error moderating comment:', error);
      throw new Error('Failed to process comment. Please try again later.');
    }
  }

  // Document Summary Generation
  async generateDocumentSummary(docId) {
    try {
      const result = await this.functions.generateDocumentSummary({
        docId: docId
      });

      return result.data;
    } catch (error) {
      console.error('Error generating summary:', error);
      throw new Error('Failed to generate summary. Please try again later.');
    }
  }

  // Notification System
  async sendNotification(notificationData) {
    try {
      const result = await this.functions.sendNotification({
        userId: notificationData.userId,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        data: notificationData.data || {}
      });

      return result.data;
    } catch (error) {
      console.error('Error sending notification:', error);
      throw new Error('Failed to send notification.');
    }
  }

  // Analytics and Insights
  async analyzeSearchPatterns(timeframe = '7d') {
    try {
      const result = await this.functions.analyzeSearchPatterns({
        timeframe: timeframe
      });

      return result.data;
    } catch (error) {
      console.error('Error analyzing search patterns:', error);
      throw new Error('Failed to analyze search patterns.');
    }
  }

  // Batch Operations
  async batchProcessDocuments(operations) {
    try {
      const promises = operations.map(operation => {
        switch (operation.type) {
          case 'feedback':
            return this.submitDocumentFeedback(operation.data);
          case 'moderate':
            return this.moderateComment(operation.data);
          case 'summary':
            return this.generateDocumentSummary(operation.data.docId);
          default:
            return Promise.resolve(null);
        }
      });

      const results = await Promise.allSettled(promises);
      return results.map((result, index) => ({
        operation: operations[index],
        success: result.status === 'fulfilled',
        data: result.status === 'fulfilled' ? result.value : null,
        error: result.status === 'rejected' ? result.reason : null
      }));
    } catch (error) {
      console.error('Error in batch processing:', error);
      throw new Error('Failed to process batch operations.');
    }
  }

  // Error Handling Utilities
  handleFunctionError(error, operation = 'operation') {
    let userMessage = `Failed to complete ${operation}. Please try again later.`;
    
    if (error.code) {
      switch (error.code) {
        case 'functions/cancelled':
          userMessage = 'Operation was cancelled. Please try again.';
          break;
        case 'functions/invalid-argument':
          userMessage = 'Invalid input provided. Please check your data and try again.';
          break;
        case 'functions/deadline-exceeded':
          userMessage = 'Operation timed out. Please try again.';
          break;
        case 'functions/not-found':
          userMessage = 'Service not available. Please try again later.';
          break;
        case 'functions/permission-denied':
          userMessage = 'You do not have permission to perform this action.';
          break;
        case 'functions/resource-exhausted':
          userMessage = 'Service is temporarily unavailable. Please try again later.';
          break;
        case 'functions/unauthenticated':
          userMessage = 'Please sign in to continue.';
          break;
        default:
          userMessage = error.message || userMessage;
      }
    }
    
    return userMessage;
  }

  // Health Check
  async healthCheck() {
    try {
      // Simple function call to check if functions are available
      const result = await this.functions.analyzeSearchPatterns({ timeframe: '1d' });
      return true;
    } catch (error) {
      console.warn('Firebase Functions health check failed:', error);
      return false;
    }
  }

  // Rate Limiting Helper
  createRateLimiter(maxCalls = 10, timeWindow = 60000) {
    const calls = [];
    
    return async (functionCall) => {
      const now = Date.now();
      
      // Remove old calls outside the time window
      while (calls.length > 0 && calls[0] < now - timeWindow) {
        calls.shift();
      }
      
      // Check if we've exceeded the rate limit
      if (calls.length >= maxCalls) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      
      // Add current call timestamp
      calls.push(now);
      
      // Execute the function
      return await functionCall();
    };
  }
}

// Export singleton instance
export const firebaseFunctionsService = new FirebaseFunctionsService();
export default firebaseFunctionsService;
