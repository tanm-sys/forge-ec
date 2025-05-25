// Examples page specific JavaScript

document.addEventListener('DOMContentLoaded', function() {
    initCategoryFiltering();
    initExampleRunner();
    initPlayground();
    initExampleAnimations();
});

// Category Filtering
function initCategoryFiltering() {
    const categoryButtons = document.querySelectorAll('.category-btn');
    const exampleCards = document.querySelectorAll('.example-card');
    
    categoryButtons.forEach(button => {
        button.addEventListener('click', function() {
            const category = this.getAttribute('data-category');
            
            // Update active button
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Filter examples
            filterExamples(category, exampleCards);
        });
    });
}

function filterExamples(category, cards) {
    cards.forEach(card => {
        const cardCategory = card.getAttribute('data-category');
        const shouldShow = category === 'all' || cardCategory === category;
        
        if (shouldShow) {
            card.classList.remove('filtering-out');
            card.classList.add('filtering-in');
            setTimeout(() => {
                card.classList.remove('hidden');
            }, 50);
        } else {
            card.classList.add('filtering-out');
            card.classList.remove('filtering-in');
            setTimeout(() => {
                card.classList.add('hidden');
            }, 300);
        }
    });
}

// Example Runner
function initExampleRunner() {
    const runButtons = document.querySelectorAll('.run-example');
    
    runButtons.forEach(button => {
        button.addEventListener('click', function() {
            const exampleType = this.getAttribute('data-example');
            runExample(exampleType, this);
        });
    });
}

async function runExample(exampleType, button) {
    // Prevent multiple clicks
    if (button.classList.contains('running')) return;
    
    // Update button state
    button.classList.add('running');
    const originalText = button.innerHTML;
    button.innerHTML = '<span class="loading-spinner"></span> Running...';
    
    try {
        // Simulate running the example
        const result = await simulateExampleExecution(exampleType);
        
        // Show success state
        button.classList.remove('running');
        button.classList.add('success');
        button.innerHTML = '<span class="btn-icon">✅</span> Success!';
        
        // Show result in a modal or output area
        showExampleResult(exampleType, result);
        
        // Reset button after delay
        setTimeout(() => {
            button.classList.remove('success');
            button.innerHTML = originalText;
        }, 3000);
        
    } catch (error) {
        // Show error state
        button.classList.remove('running');
        button.classList.add('error');
        button.innerHTML = '<span class="btn-icon">❌</span> Error';
        
        // Show error message
        showExampleError(exampleType, error.message);
        
        // Reset button after delay
        setTimeout(() => {
            button.classList.remove('error');
            button.innerHTML = originalText;
        }, 3000);
    }
}

async function simulateExampleExecution(exampleType) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Simulate different outcomes based on example type
    const outcomes = {
        'ecdsa': {
            success: true,
            output: `ECDSA Signature Example
======================
Generated new secp256k1 key pair
Created signature for message
Signature verification: success

DER-encoded signature:
30 45 02 21 00 c6 04 7f 94 41 ed 7d 6d 3d 4e c7 
39 0e 4a 94 da 2f dd 2a 32 69 be 1a 99 8b 61 31 
bc 40 af 0d f3 02 20 4e 45 e1 69 32 b8 af 0e 17 
8b a4 99 a7 56 2d 14 a2 33 13 49 2a 70 c2 b1 3b 
7c 6d 5d 50 24 83 

Modified message verification: failed (expected)`
        },
        'eddsa': {
            success: true,
            output: `Ed25519 Signature Example
=========================
Generated Ed25519 key pair
Public key: 3d4017c3e843895a92b70aa74d1b7ebc9c982ccf2ec4968cc0cd55f12af4660c
Created signature for message
Ed25519 signature verified: true`
        },
        'ecdh': {
            success: true,
            output: `ECDH Key Exchange Example
========================
Alice generated key pair
Bob generated key pair
Alice computed shared secret
Bob computed shared secret
Shared secrets match: true
Derived symmetric key: a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456`
        },
        'schnorr': {
            success: true,
            output: `Schnorr Signature Example
=========================
Generated secp256k1 key pair
Created Schnorr signature
Signature verification: success
Batch verification (1 signature): success`
        },
        'keygen': {
            success: true,
            output: `Key Generation Example
=====================
Generated secp256k1 key pair
Exported private key in DER format
Exported private key in PEM format

Private key (PEM):
-----BEGIN EC PRIVATE KEY-----
MHcCAQEEIGg7DOVRW8uMANO6jcyBXOxBt0trjbvG1Ky4r6+0FdXxoAoGCCqGSM49
AwEHoUQDQgAE4f4LxrMpNDXQpEqiY3Te4f1+bwX9FCfDSmGrfflOJ+Ta6gK0wGAG
sQ+W2xgywJqhaCbRs5n9aMGg+B4db5+2Vw==
-----END EC PRIVATE KEY-----`
        },
        'openssl': {
            success: true,
            output: `OpenSSL Interoperability Example
================================
Created OpenSSL-compatible signature
DER signature: 3045022100c6047f9441ed7d6d3d4ec7390e4a94da2fdd2a3269be1a998b6131bc40af0df302204e45e16932b8af0e178ba499a7562d14a23313492a70c2b13b7c6d5d502483

This signature can be verified with OpenSSL using:
openssl dgst -sha256 -verify pubkey.pem -signature sig.der message.txt`
        }
    };
    
    const result = outcomes[exampleType];
    if (result && result.success) {
        return result.output;
    } else {
        throw new Error(`Example '${exampleType}' failed to execute`);
    }
}

function showExampleResult(exampleType, output) {
    // Create a modal or use existing output area
    const modal = createResultModal(exampleType, output, 'success');
    document.body.appendChild(modal);
    
    // Auto-close after 10 seconds
    setTimeout(() => {
        if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    }, 10000);
}

function showExampleError(exampleType, error) {
    const modal = createResultModal(exampleType, error, 'error');
    document.body.appendChild(modal);
    
    // Auto-close after 5 seconds
    setTimeout(() => {
        if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    }, 5000);
}

function createResultModal(title, content, type) {
    const modal = document.createElement('div');
    modal.className = 'result-modal';
    modal.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title} Output</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <pre class="output-${type}">${content}</pre>
                </div>
            </div>
        </div>
    `;
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .result-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .modal-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
        }
        
        .modal-content {
            position: relative;
            background: var(--bg-card);
            border: 1px solid var(--border-primary);
            border-radius: var(--radius-lg);
            max-width: 600px;
            max-height: 80vh;
            overflow: hidden;
            box-shadow: var(--shadow-xl);
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: var(--spacing-lg);
            border-bottom: 1px solid var(--border-primary);
            background: var(--bg-secondary);
        }
        
        .modal-close {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: var(--text-secondary);
        }
        
        .modal-body {
            padding: var(--spacing-lg);
            max-height: 400px;
            overflow-y: auto;
        }
        
        .modal-body pre {
            margin: 0;
            font-family: var(--font-family-mono);
            font-size: 0.875rem;
            line-height: 1.6;
            white-space: pre-wrap;
        }
    `;
    document.head.appendChild(style);
    
    // Add close functionality
    const closeBtn = modal.querySelector('.modal-close');
    const overlay = modal.querySelector('.modal-overlay');
    
    closeBtn.addEventListener('click', () => {
        if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    });
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }
    });
    
    return modal;
}

// Interactive Playground
function initPlayground() {
    const codeEditor = document.getElementById('code-editor');
    const runButton = document.getElementById('run-code');
    const clearButton = document.getElementById('clear-code');
    const clearOutputButton = document.getElementById('clear-output');
    const outputContent = document.getElementById('output-content');
    
    if (!codeEditor || !runButton) return;
    
    runButton.addEventListener('click', async function() {
        const code = codeEditor.value.trim();
        if (!code) {
            showPlaygroundOutput('Error: No code to run', 'error');
            return;
        }
        
        await runPlaygroundCode(code);
    });
    
    clearButton.addEventListener('click', function() {
        codeEditor.value = '';
        codeEditor.focus();
    });
    
    clearOutputButton.addEventListener('click', function() {
        outputContent.innerHTML = '<div class="output-placeholder">Run your code to see the output here...</div>';
    });
    
    // Add syntax highlighting to editor
    codeEditor.addEventListener('input', function() {
        // Simple syntax highlighting could be added here
        // For now, we'll just handle tab indentation
    });
    
    // Handle tab key for indentation
    codeEditor.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = this.selectionStart;
            const end = this.selectionEnd;
            
            this.value = this.value.substring(0, start) + '    ' + this.value.substring(end);
            this.selectionStart = this.selectionEnd = start + 4;
        }
    });
}

async function runPlaygroundCode(code) {
    const outputContent = document.getElementById('output-content');
    const runButton = document.getElementById('run-code');
    
    // Show loading state
    runButton.disabled = true;
    runButton.innerHTML = '<span class="loading-spinner"></span> Running...';
    showPlaygroundOutput('Compiling and running...', 'info');
    
    try {
        // Simulate compilation and execution
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Simple code analysis for demo purposes
        const output = analyzeAndRunCode(code);
        showPlaygroundOutput(output, 'success');
        
    } catch (error) {
        showPlaygroundOutput(`Error: ${error.message}`, 'error');
    } finally {
        // Reset button
        runButton.disabled = false;
        runButton.innerHTML = '<span class="btn-icon">▶️</span> Run';
    }
}

function analyzeAndRunCode(code) {
    // Simple code analysis for demo
    if (code.includes('println!')) {
        const matches = code.match(/println!\s*\(\s*[&"]([^"]*)[&"]?\s*\)/g);
        if (matches) {
            return matches.map(match => {
                const content = match.match(/[&"]([^"]*)[&"]?/);
                return content ? content[1] : 'Hello, World!';
            }).join('\n');
        }
    }
    
    if (code.includes('Secp256k1')) {
        return `Compiled successfully!

Running Forge EC example...
Generated secp256k1 key pair
Performing cryptographic operations...
All tests passed!

Execution completed in 0.123s`;
    }
    
    if (code.includes('Ed25519')) {
        return `Compiled successfully!

Running Ed25519 example...
Generated Ed25519 key pair
Created signature
Verified signature: true

Execution completed in 0.089s`;
    }
    
    return `Compiled successfully!

Running main function...
Program executed successfully!

Execution completed in 0.045s`;
}

function showPlaygroundOutput(content, type) {
    const outputContent = document.getElementById('output-content');
    outputContent.innerHTML = `<div class="output-${type}">${content}</div>`;
}

// Example Animations
function initExampleAnimations() {
    const cards = document.querySelectorAll('.example-card');
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    cards.forEach((card, index) => {
        // Set initial state
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = `all 0.6s ease-out ${index * 0.1}s`;
        
        observer.observe(card);
    });
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + Enter to run playground code
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const runButton = document.getElementById('run-code');
        if (runButton && !runButton.disabled) {
            runButton.click();
        }
    }
    
    // Ctrl/Cmd + K to clear playground
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const clearButton = document.getElementById('clear-code');
        if (clearButton) {
            clearButton.click();
        }
    }
});
