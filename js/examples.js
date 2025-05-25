// ===== EXAMPLES AND DEMOS FUNCTIONALITY =====

class ExamplesController {
  constructor() {
    this.activeTab = 'ecdsa';
    this.demoRunning = false;
    this.init();
  }

  init() {
    this.setupTabNavigation();
    this.setupDemoButtons();
    this.setupCopyButtons();
  }

  setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tabId = button.getAttribute('data-tab');
        this.switchTab(tabId);
      });
    });
  }

  switchTab(tabId) {
    // Update active tab
    this.activeTab = tabId;

    // Update button states
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
      button.classList.remove('active');
      if (button.getAttribute('data-tab') === tabId) {
        button.classList.add('active');
      }
    });

    // Update panel visibility
    const tabPanels = document.querySelectorAll('.tab-panel');
    tabPanels.forEach(panel => {
      panel.classList.remove('active');
      if (panel.id === `${tabId}-panel`) {
        panel.classList.add('active');
      }
    });
  }

  setupDemoButtons() {
    const demoButtons = document.querySelectorAll('[id$="-demo-btn"]');
    
    demoButtons.forEach(button => {
      button.addEventListener('click', () => {
        const demoType = button.id.replace('-demo-btn', '');
        this.runDemo(demoType);
      });
    });
  }

  async runDemo(demoType) {
    if (this.demoRunning) return;

    this.demoRunning = true;
    const statusElement = document.getElementById(`${demoType}-status`);
    const outputElement = document.getElementById(`${demoType}-output`);
    const buttonElement = document.getElementById(`${demoType}-demo-btn`);

    // Update UI state
    buttonElement.disabled = true;
    buttonElement.querySelector('.btn-text').textContent = 'Running...';
    statusElement.textContent = 'Executing demo...';
    statusElement.style.color = 'var(--color-warning)';

    // Clear previous output
    outputElement.innerHTML = '<div class="demo-loading">Initializing cryptographic operations...</div>';

    try {
      // Simulate demo execution with realistic timing
      await this.simulateDemo(demoType, outputElement, statusElement);
      
      // Success state
      statusElement.textContent = 'Demo completed successfully';
      statusElement.style.color = 'var(--color-success)';
      
    } catch (error) {
      // Error state
      statusElement.textContent = 'Demo failed';
      statusElement.style.color = 'var(--color-error)';
      outputElement.innerHTML = `<div class="demo-error">Error: ${error.message}</div>`;
    } finally {
      // Reset button state
      buttonElement.disabled = false;
      buttonElement.querySelector('.btn-text').textContent = `Run ${this.getDemoDisplayName(demoType)} Demo`;
      this.demoRunning = false;
    }
  }

  async simulateDemo(demoType, outputElement, statusElement) {
    const steps = this.getDemoSteps(demoType);
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      
      // Update status
      statusElement.textContent = step.status;
      
      // Add step output
      const stepElement = document.createElement('div');
      stepElement.className = 'demo-step';
      stepElement.innerHTML = `
        <div class="step-header">
          <span class="step-number">${i + 1}</span>
          <span class="step-title">${step.title}</span>
        </div>
        <div class="step-output">${step.output}</div>
      `;
      
      outputElement.appendChild(stepElement);
      
      // Scroll to bottom
      outputElement.scrollTop = outputElement.scrollHeight;
      
      // Wait for realistic timing
      await this.delay(step.delay || 800);
    }
  }

  getDemoSteps(demoType) {
    const steps = {
      ecdsa: [
        {
          title: 'Generate Private Key',
          status: 'Generating ECDSA private key...',
          output: 'Private key: 0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890',
          delay: 600
        },
        {
          title: 'Derive Public Key',
          status: 'Computing public key from private key...',
          output: 'Public key: 0x04a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          delay: 400
        },
        {
          title: 'Sign Message',
          status: 'Creating ECDSA signature...',
          output: 'Message: "Hello, Forge EC ECDSA!"\nSignature: (r: 0x9876543210fedcba..., s: 0x1234567890abcdef...)',
          delay: 800
        },
        {
          title: 'Verify Signature',
          status: 'Verifying signature...',
          output: '✅ Signature verification: VALID\n🔒 Cryptographic proof confirmed',
          delay: 500
        }
      ],
      eddsa: [
        {
          title: 'Generate Ed25519 Keypair',
          status: 'Generating Ed25519 keypair...',
          output: 'Ed25519 private key: 32 bytes\nEd25519 public key: 32 bytes',
          delay: 500
        },
        {
          title: 'Sign with Ed25519',
          status: 'Creating EdDSA signature...',
          output: 'Message: "Hello, Forge EC EdDSA!"\nEd25519 signature: 64 bytes',
          delay: 600
        },
        {
          title: 'Verify Ed25519 Signature',
          status: 'Verifying EdDSA signature...',
          output: '✅ Ed25519 signature verification: VALID\n🚀 Deterministic signature confirmed',
          delay: 400
        }
      ],
      ecdh: [
        {
          title: 'Generate Alice\'s Keypair',
          status: 'Generating Alice\'s X25519 keypair...',
          output: 'Alice private key: 32 bytes\nAlice public key: 32 bytes',
          delay: 400
        },
        {
          title: 'Generate Bob\'s Keypair',
          status: 'Generating Bob\'s X25519 keypair...',
          output: 'Bob private key: 32 bytes\nBob public key: 32 bytes',
          delay: 400
        },
        {
          title: 'Compute Shared Secrets',
          status: 'Performing ECDH key exchange...',
          output: 'Alice computes: alice_private * bob_public\nBob computes: bob_private * alice_public',
          delay: 700
        },
        {
          title: 'Verify Shared Secret',
          status: 'Verifying shared secret agreement...',
          output: '✅ Shared secrets match!\n🔐 Secure channel established\nShared secret: 32 bytes',
          delay: 500
        }
      ],
      schnorr: [
        {
          title: 'Generate Schnorr Keypair',
          status: 'Generating Schnorr keypair...',
          output: 'Schnorr private key: 32 bytes\nSchnorr public key: 33 bytes (compressed)',
          delay: 500
        },
        {
          title: 'Create Schnorr Signature',
          status: 'Creating Schnorr signature...',
          output: 'Message: "Hello, Forge EC Schnorr!"\nSchnorr signature: 64 bytes\nNonce commitment: 32 bytes',
          delay: 800
        },
        {
          title: 'Verify Schnorr Signature',
          status: 'Verifying Schnorr signature...',
          output: '✅ Schnorr signature verification: VALID\n⚡ Linear signature aggregation ready',
          delay: 600
        }
      ]
    };

    return steps[demoType] || [];
  }

  getDemoDisplayName(demoType) {
    const names = {
      ecdsa: 'ECDSA',
      eddsa: 'EdDSA',
      ecdh: 'ECDH',
      schnorr: 'Schnorr'
    };
    return names[demoType] || demoType.toUpperCase();
  }

  setupCopyButtons() {
    // Copy button functionality is handled in main.js
    // This method can be extended for demo-specific copy functionality
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Method to highlight code syntax (basic implementation)
  highlightCode(code, language = 'rust') {
    // This is a simple syntax highlighter
    // In a real implementation, you might use Prism.js or similar
    return code
      .replace(/\b(fn|let|use|pub|struct|impl|trait|enum|match|if|else|for|while|loop|break|continue|return|mut|const|static|async|await)\b/g, '<span class="keyword">$1</span>')
      .replace(/\b(String|Vec|Option|Result|Box|Rc|Arc|HashMap|BTreeMap|u8|u16|u32|u64|u128|i8|i16|i32|i64|i128|f32|f64|bool|char|usize|isize)\b/g, '<span class="type">$1</span>')
      .replace(/"([^"\\]|\\.)*"/g, '<span class="string">$&</span>')
      .replace(/\/\/.*$/gm, '<span class="comment">$&</span>')
      .replace(/\b(\d+)\b/g, '<span class="number">$1</span>');
  }

  // Method to add interactive features to code examples
  makeCodeInteractive(codeElement) {
    // Add line numbers
    const lines = codeElement.textContent.split('\n');
    const numberedLines = lines.map((line, index) => 
      `<span class="line-number">${index + 1}</span>${line}`
    ).join('\n');
    
    codeElement.innerHTML = this.highlightCode(numberedLines);
  }

  // Method to export demo results
  exportDemoResults(demoType) {
    const outputElement = document.getElementById(`${demoType}-output`);
    const results = outputElement.textContent;
    
    const blob = new Blob([results], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `forge-ec-${demoType}-demo-results.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  }
}

// CSS for demo styling
const demoCSS = `
  .demo-step {
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: var(--bg-glass);
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-lg);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }
  
  .step-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .step-number {
    width: 20px;
    height: 20px;
    background: var(--color-primary);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 700;
  }
  
  .step-output {
    font-family: var(--font-family-mono);
    font-size: 0.875rem;
    color: var(--text-secondary);
    white-space: pre-wrap;
    line-height: 1.4;
  }
  
  .demo-loading {
    text-align: center;
    color: var(--text-secondary);
    font-style: italic;
    padding: 2rem;
  }
  
  .demo-error {
    color: var(--color-error);
    background: rgba(239, 68, 68, 0.1);
    padding: 1rem;
    border-radius: var(--radius-lg);
    border: 1px solid rgba(239, 68, 68, 0.2);
  }
  
  .keyword { color: #c678dd; }
  .type { color: #e06c75; }
  .string { color: #98c379; }
  .comment { color: #5c6370; font-style: italic; }
  .number { color: #d19a66; }
  
  .line-number {
    display: inline-block;
    width: 2em;
    color: var(--text-tertiary);
    font-size: 0.75rem;
    margin-right: 1em;
    text-align: right;
  }
`;

// Inject demo CSS
const style = document.createElement('style');
style.textContent = demoCSS;
document.head.appendChild(style);

// Initialize examples controller when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.examplesController = new ExamplesController();
});

// Export for use in other modules
window.ExamplesController = ExamplesController;
