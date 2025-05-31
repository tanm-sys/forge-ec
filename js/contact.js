/**
 * Enhanced Contact Form Handler with Firebase Integration
 * Handles form validation, submission via Firebase Cloud Functions, and user feedback
 */

class ContactForm {
  constructor() {
    this.form = document.getElementById('contact-form');
    this.submitButton = document.getElementById('contact-submit');
    this.successMessage = document.getElementById('contact-success');
    this.isSubmitting = false;
    this.rateLimiter = (fn) => fn(); // Placeholder, effectively disabling rate limiting by immediate execution
    console.warn('Contact form rate limiter is currently a pass-through. Implement proper rate limiting if needed.');

    this.init();
  }

  init() {
    if (!this.form) {
      console.warn("ContactForm: form element not found.");
      return;
    }
    if (!this.submitButton) {
      console.warn("ContactForm: submitButton element not found.");
      // Form might still be somewhat usable if submitted via Enter key, but button interactions will fail.
    }
    if (!this.successMessage) {
      console.warn("ContactForm: successMessage element not found. Success feedback will not be shown.");
    }

    // Add event listeners
    this.form.addEventListener('submit', this.handleSubmit.bind(this));

    // Add real-time validation
    const inputs = this.form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.addEventListener('blur', () => this.validateField(input));
      input.addEventListener('input', () => this.clearError(input));
    });

    console.log('✅ Contact form initialized');
  }

  async handleSubmit(event) {
    event.preventDefault();

    if (this.isSubmitting) {
      return;
    }

    if (!this.validateForm()) {
      return;
    }

    const formData = new FormData(this.form);
    const data = Object.fromEntries(formData.entries());

    // Add user information if authenticated
    const currentUser = window.firebaseAuth ? window.firebaseAuth.currentUser : null;
    if (currentUser) {
      data.userId = currentUser.uid;
      data.userEmail = currentUser.email;
      data.userName = currentUser.displayName || data.name;
    }

    this.isSubmitting = true;
    this.setLoading(true);

    try {
      // Use rate limiter to prevent spam
      await this.rateLimiter(async () => {
        await this.submitForm(data);
      });

      this.showSuccess();
      this.form.reset();

      // Track successful submission
      console.log('📧 Contact form submitted successfully');
    } catch (error) {
      console.error('Form submission error:', error);

      let errorMessage = 'Failed to send message. Please try again later.';

      if (error.message.includes('Rate limit')) {
        errorMessage = 'Too many submissions. Please wait a few minutes before trying again.';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }

      this.showError(errorMessage);

      // Show fallback option
      this.showFallbackOption(data);
    } finally {
      this.isSubmitting = false;
      this.setLoading(false);
    }
  }

  async submitForm(data) {
    try {
      // Try Firebase Cloud Function first
      // Check if the global firebaseFunctions object and a potential sendContactEmail method exist
      if (!window.firebaseFunctions || typeof window.firebaseFunctions.sendContactEmail !== 'function') {
          console.warn('Global firebaseFunctions.sendContactEmail method not found. This might indicate that the method was not exposed from the consolidated Firebase setup, or it relied on "firebase/functions" and `httpsCallable` which are not automatically on `window.firebaseFunctions`. Fallback will be triggered.');
          throw new Error('Firebase sendContactEmail function not available globally as expected.');
      }
      // Assuming sendContactEmail was a method attached to the global functions instance by the removed firebase-functions.js
      const result = await window.firebaseFunctions.sendContactEmail(data); 

      if (result.success) {
        console.log('📧 Email sent successfully via Firebase:', result.messageId);
        return result;
      } else {
        throw new Error('Firebase function returned failure');
      }
    } catch (firebaseError) {
      console.warn('Firebase submission failed, trying fallback:', firebaseError);

      // Fallback to mailto link
      const subject = encodeURIComponent(`Forge EC Contact: ${data.subject}`);
      const body = encodeURIComponent(`
Name: ${data.name}
Email: ${data.email}
Subject: ${data.subject}

Message:
${data.message}

${data.newsletter ? 'Subscribed to newsletter: Yes' : 'Subscribed to newsletter: No'}

---
Sent via Forge EC website contact form
User ID: ${data.userId || 'Anonymous'}
Timestamp: ${new Date().toISOString()}
      `);

      // Create mailto link as fallback
      const mailtoLink = `mailto:tanmayspatil2006@gmail.com?subject=${subject}&body=${body}`;
      this.mailtoFallback = mailtoLink;

      // For development/fallback, we'll simulate success
      // In production, you might want to store this in a backup system
      console.log('📧 Using mailto fallback. User action required to send.');

      // The actual "submission" here is providing the mailto link.
      // The form isn't "successful" in the sense of auto-sending.
      // We trigger the fallback UI here, and handleSubmit will show a generic error.
      this.showFallbackOption(data, mailtoLink); // Pass mailtoLink directly

      // Throw an error to indicate that automatic submission failed and fallback is active.
      // This ensures handleSubmit shows an error message guiding the user to the fallback.
      throw new Error('Firebase submission failed; mailto fallback prepared.');
    }
  }

  showFallbackOption(data, mailtoLink) { // mailtoLink passed as argument
    if (!mailtoLink) { // Ensure mailtoLink is valid
        console.warn('showFallbackOption called without a mailtoLink.');
        return;
    }
    // Create fallback message
    let fallbackElement = this.form.querySelector('.form-fallback');

    if (!fallbackElement) {
      fallbackElement = document.createElement('div');
      fallbackElement.className = 'form-fallback';
      // Styles are okay, but consider moving to CSS if more complex
      fallbackElement.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        padding: var(--space-4);
        background: rgba(59, 130, 246, 0.1); /* blue-500/10 */
        border: 1px solid rgba(59, 130, 246, 0.3); /* blue-500/30 */
        border-radius: var(--radius-lg);
        color: #3b82f6; /* blue-500 */
        font-size: var(--text-sm);
        margin-top: var(--space-4);
      `;
      this.form.appendChild(fallbackElement);
    }

    // Ensure the mailtoLink is properly escaped for use in HTML attribute
    const escapedMailtoLink = mailtoLink.replace(/'/g, '&apos;').replace(/"/g, '&quot;');

    fallbackElement.innerHTML = `
      <div style="display: flex; align-items: center; gap: var(--space-2);">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width: 16px; height: 16px;">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
        <strong>Automatic submission failed.</strong>
      </div>
      <p>You can send your message directly using your email client:</p>
      <button type="button" class="btn-secondary" onclick="window.open('${escapedMailtoLink}', '_blank')">
        Open Email Client
      </button>
    `;
    // Fallback should persist until user interacts or dismisses, removing auto-hide.
    // setTimeout(() => {
    //   if (fallbackElement.parentNode) {
    //     fallbackElement.remove();
    //   }
    // }, 10000); // Consider making this longer or manual dismissal
  }

  validateForm() {
    const requiredFields = this.form.querySelectorAll('[required]');
    let isValid = true;

    requiredFields.forEach(field => {
      if (!this.validateField(field)) {
        isValid = false;
      }
    });

    return isValid;
  }

  validateField(field) {
    const value = field.value.trim();
    const fieldName = field.name;
    let isValid = true;
    let errorMessage = '';

    // Clear previous error
    this.clearError(field);

    // Required field validation
    if (field.hasAttribute('required') && !value) {
      errorMessage = 'This field is required';
      isValid = false;
    }
    // Email validation
    else if (field.type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        errorMessage = 'Please enter a valid email address';
        isValid = false;
      }
    }
    // Name validation
    else if (fieldName === 'name' && value) {
      if (value.length < 2) {
        errorMessage = 'Name must be at least 2 characters long';
        isValid = false;
      }
    }
    // Message validation
    else if (fieldName === 'message' && value) {
      if (value.length < 10) {
        errorMessage = 'Message must be at least 10 characters long';
        isValid = false;
      }
    }

    if (!isValid) {
      this.showFieldError(field, errorMessage);
    }

    return isValid;
  }

  showFieldError(field, message) {
    const errorElement = document.getElementById(`${field.name}-error`);
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.classList.add('show');
    }

    field.style.borderColor = '#ef4444';
  }

  clearError(field) {
    const errorElement = document.getElementById(`${field.name}-error`);
    if (errorElement) {
      errorElement.classList.remove('show');
    }

    field.style.borderColor = '';
  }

  setLoading(loading) {
    if (!this.submitButton) return; // Guard against null submitButton

    const submitText = this.submitButton.querySelector('.submit-text');
    const submitLoading = this.submitButton.querySelector('.submit-loading');
    const submitIcon = this.submitButton.querySelector('.submit-icon');

    // It's possible these inner elements also might not exist if markup is changed
    if (loading) {
      if (submitText) submitText.style.display = 'none';
      if (submitIcon) submitIcon.style.display = 'none';
      if (submitLoading) submitLoading.style.display = 'flex';
      this.submitButton.disabled = true;
    } else {
      if (submitText) submitText.style.display = 'block';
      if (submitIcon) submitIcon.style.display = 'block';
      if (submitLoading) submitLoading.style.display = 'none';
      this.submitButton.disabled = false;
    }
  }

  showSuccess() {
    if (!this.successMessage) return; // Guard against null successMessage

    this.successMessage.style.display = 'flex';

    // Hide success message after 5 seconds
    setTimeout(() => {
      if (this.successMessage) this.successMessage.style.display = 'none';
    }, 5000);

    // Scroll to success message
    this.successMessage.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  }

  showError(message) {
    // Create or update error message
    let errorElement = this.form.querySelector('.form-error-general');

    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.className = 'form-error-general';
      errorElement.style.cssText = `
        display: flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-3) var(--space-4);
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        border-radius: var(--radius-lg);
        color: #ef4444;
        font-size: var(--text-sm);
        font-weight: 500;
        margin-top: var(--space-4);
      `;

      this.form.appendChild(errorElement);
    }

    errorElement.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width: 16px; height: 16px;">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
      <span>${message}</span>
    `;

    // Hide error message after 5 seconds
    setTimeout(() => {
      if (errorElement.parentNode) {
        errorElement.remove();
      }
    }, 5000);
  }
}

// Initialize contact form when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ContactForm();
});

// Export for potential external use
window.ContactForm = ContactForm;
