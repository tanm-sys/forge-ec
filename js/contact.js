/**
 * Contact Form Handler
 * Handles form validation, submission, and user feedback
 */

class ContactForm {
  constructor() {
    this.form = document.getElementById('contact-form');
    this.submitButton = document.getElementById('contact-submit');
    this.successMessage = document.getElementById('contact-success');
    
    this.init();
  }

  init() {
    if (!this.form) return;

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
    
    if (!this.validateForm()) {
      return;
    }

    const formData = new FormData(this.form);
    const data = Object.fromEntries(formData.entries());
    
    this.setLoading(true);
    
    try {
      // Simulate form submission (replace with actual endpoint)
      await this.submitForm(data);
      this.showSuccess();
      this.form.reset();
    } catch (error) {
      console.error('Form submission error:', error);
      this.showError('Failed to send message. Please try again or contact us directly.');
    } finally {
      this.setLoading(false);
    }
  }

  async submitForm(data) {
    // For now, we'll simulate a successful submission
    // In production, this would send to a real endpoint
    console.log('📧 Form submission data:', data);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // For demonstration, we'll create a mailto link as fallback
    const subject = encodeURIComponent(`Forge EC Contact: ${data.subject}`);
    const body = encodeURIComponent(`
Name: ${data.name}
Email: ${data.email}
Subject: ${data.subject}

Message:
${data.message}

${data.newsletter ? 'Subscribed to newsletter: Yes' : 'Subscribed to newsletter: No'}
    `);
    
    // Open email client as fallback
    const mailtoLink = `mailto:tanmayspatil2006@gmail.com?subject=${subject}&body=${body}`;
    
    // Store the mailto link for potential use
    this.mailtoFallback = mailtoLink;
    
    return { success: true };
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
    const submitText = this.submitButton.querySelector('.submit-text');
    const submitLoading = this.submitButton.querySelector('.submit-loading');
    const submitIcon = this.submitButton.querySelector('.submit-icon');

    if (loading) {
      submitText.style.display = 'none';
      submitIcon.style.display = 'none';
      submitLoading.style.display = 'flex';
      this.submitButton.disabled = true;
    } else {
      submitText.style.display = 'block';
      submitIcon.style.display = 'block';
      submitLoading.style.display = 'none';
      this.submitButton.disabled = false;
    }
  }

  showSuccess() {
    this.successMessage.style.display = 'flex';
    
    // Hide success message after 5 seconds
    setTimeout(() => {
      this.successMessage.style.display = 'none';
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
