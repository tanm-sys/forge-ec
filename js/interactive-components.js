// ===== ADVANCED INTERACTIVE COMPONENTS =====

class InteractiveComponents {
  constructor() {
    this.keyExchangeVisualizer = null;
    this.curveSelector = null;
    this.wasmVisualizer = null;
    this.starfield = null;
    
    this.init();
  }

  init() {
    this.createKeyExchangeVisualizer();
    this.createCurveSelector();
    this.createWasmVisualizer();
    this.createInteractiveStarfield();
  }

  createKeyExchangeVisualizer() {
    // Create dedicated section for ECDH visualization
    const visualizerHTML = `
      <section class="key-exchange-visualizer" id="key-exchange-demo">
        <div class="container">
          <div class="section-header animate-on-scroll">
            <h2 class="section-title">Live Key Exchange Visualization</h2>
            <p class="section-subtitle">Watch Alice and Bob establish a shared secret using ECDH</p>
          </div>
          
          <div class="exchange-stage">
            <div class="participant alice" id="alice-avatar">
              <div class="avatar-container">
                <div class="avatar alice-avatar">
                  <div class="avatar-face">A</div>
                  <div class="key-indicator" id="alice-key"></div>
                </div>
                <div class="participant-name">Alice</div>
                <div class="key-display" id="alice-keys">
                  <div class="key-item">Private: <span class="key-value">●●●●●●●●</span></div>
                  <div class="key-item">Public: <span class="key-value" id="alice-public">Generating...</span></div>
                </div>
              </div>
            </div>

            <div class="exchange-center">
              <svg class="data-flow" viewBox="0 0 400 200" id="data-flow-svg">
                <defs>
                  <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                          refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
                  </marker>
                </defs>
                <path id="alice-to-bob" d="M 50 100 Q 200 50 350 100" 
                      stroke="#3b82f6" stroke-width="2" fill="none" 
                      marker-end="url(#arrowhead)" opacity="0"/>
                <path id="bob-to-alice" d="M 350 100 Q 200 150 50 100" 
                      stroke="#8b5cf6" stroke-width="2" fill="none" 
                      marker-end="url(#arrowhead)" opacity="0"/>
                <circle id="shared-secret" cx="200" cy="100" r="20" 
                        fill="#10b981" opacity="0"/>
                <text id="shared-text" x="200" y="140" text-anchor="middle" 
                      fill="#10b981" opacity="0">Shared Secret</text>
              </svg>
              
              <div class="exchange-controls">
                <button class="btn btn-primary" id="start-exchange">
                  <span class="btn-text">Start Key Exchange</span>
                  <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <polygon points="5,3 19,12 5,21"/>
                  </svg>
                </button>
                <div class="exchange-status" id="exchange-status">Ready to begin</div>
              </div>
            </div>

            <div class="participant bob" id="bob-avatar">
              <div class="avatar-container">
                <div class="avatar bob-avatar">
                  <div class="avatar-face">B</div>
                  <div class="key-indicator" id="bob-key"></div>
                </div>
                <div class="participant-name">Bob</div>
                <div class="key-display" id="bob-keys">
                  <div class="key-item">Private: <span class="key-value">●●●●●●●●</span></div>
                  <div class="key-item">Public: <span class="key-value" id="bob-public">Generating...</span></div>
                </div>
              </div>
            </div>
          </div>

          <div class="exchange-explanation" id="exchange-explanation">
            <div class="step-indicator">
              <div class="step active" data-step="1">1</div>
              <div class="step" data-step="2">2</div>
              <div class="step" data-step="3">3</div>
              <div class="step" data-step="4">4</div>
            </div>
            <div class="step-description" id="step-description">
              Click "Start Key Exchange" to begin the demonstration
            </div>
          </div>
        </div>
      </section>
    `;

    // Insert after examples section
    const examplesSection = document.getElementById('examples');
    if (examplesSection) {
      examplesSection.insertAdjacentHTML('afterend', visualizerHTML);
      this.setupKeyExchangeEvents();
    }
  }

  setupKeyExchangeEvents() {
    const startButton = document.getElementById('start-exchange');
    if (startButton) {
      startButton.addEventListener('click', () => this.animateKeyExchange());
    }
  }

  async animateKeyExchange() {
    const steps = [
      { description: "Alice and Bob generate their private keys", duration: 1000 },
      { description: "They compute their public keys from private keys", duration: 1200 },
      { description: "Alice sends her public key to Bob", duration: 1500 },
      { description: "Bob sends his public key to Alice", duration: 1500 },
      { description: "Both compute the same shared secret!", duration: 2000 }
    ];

    const statusElement = document.getElementById('exchange-status');
    const stepDescription = document.getElementById('step-description');
    const stepIndicators = document.querySelectorAll('.step');

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      
      // Update UI
      if (statusElement) statusElement.textContent = `Step ${i + 1}: ${step.description}`;
      else console.warn("Element with ID 'exchange-status' not found.");
      if (stepDescription) stepDescription.textContent = step.description;
      else console.warn("Element with ID 'step-description' not found.");
      
      // Update step indicators
      stepIndicators.forEach((indicator, index) => {
        indicator.classList.toggle('active', index <= i);
        indicator.classList.toggle('completed', index < i);
      });

      // Animate based on step
      switch (i) {
        case 0:
          await this.animateKeyGeneration();
          break;
        case 1:
          await this.animatePublicKeyComputation();
          break;
        case 2:
          await this.animateDataFlow('alice-to-bob');
          break;
        case 3:
          await this.animateDataFlow('bob-to-alice');
          break;
        case 4:
          await this.animateSharedSecret();
          break;
      }

      await this.delay(step.duration);
    }

    statusElement.textContent = "Key exchange completed successfully!";
  }

  async animateKeyGeneration() {
    const aliceKey = document.getElementById('alice-key');
    const bobKey = document.getElementById('bob-key');
    
    [aliceKey, bobKey].forEach(keyElem => {
      if (keyElem) {
        keyElem.style.background = 'linear-gradient(45deg, #3b82f6, #8b5cf6)';
        keyElem.style.animation = 'pulse 0.5s ease-in-out infinite alternate';
      } else {
        console.warn(`Key element for Alice/Bob not found.`);
      }
    });
  }

  async animatePublicKeyComputation() {
    const alicePublic = document.getElementById('alice-public');
    const bobPublic = document.getElementById('bob-public');
    
    // Simulate key computation with typewriter effect
    if (alicePublic) await this.typewriterEffect(alicePublic, '04a1b2c3d4e5f6...');
    else console.warn("Element with ID 'alice-public' not found.");
    if (bobPublic) await this.typewriterEffect(bobPublic, '049f8e7d6c5b4a...');
    else console.warn("Element with ID 'bob-public' not found.");
  }

  async animateDataFlow(pathId) {
    const path = document.getElementById(pathId);
    if (!path) return;

    path.style.opacity = '1';
    path.style.strokeDasharray = '1000';
    path.style.strokeDashoffset = '1000';
    path.style.animation = 'drawPath 1.5s ease-out forwards';
  }

  async animateSharedSecret() {
    const sharedSecret = document.getElementById('shared-secret');
    const sharedText = document.getElementById('shared-text');
    
    if (sharedSecret) {
      sharedSecret.style.opacity = '1';
      sharedSecret.style.animation = 'pulseGlow 1s ease-in-out infinite alternate';
    } else {
      console.warn("Element with ID 'shared-secret' not found.");
    }
    if (sharedText) {
      sharedText.style.opacity = '1';
    } else {
      console.warn("Element with ID 'shared-text' not found.");
    }
  }

  async typewriterEffect(element, text) {
    if (!element) {
      console.warn('typewriterEffect called with null element');
      return;
    }
    element.textContent = '';
    for (let i = 0; i < text.length; i++) {
      element.textContent += text[i];
      await this.delay(50);
    }
  }

  createCurveSelector() {
    // Create radial curve selection interface
    const selectorHTML = `
      <div class="curve-selector-container" id="curve-selector">
        <div class="curve-wheel" id="curve-wheel">
          <div class="curve-option" data-curve="secp256k1">
            <div class="curve-icon">⚡</div>
            <div class="curve-name">secp256k1</div>
          </div>
          <div class="curve-option" data-curve="p256">
            <div class="curve-icon">🔒</div>
            <div class="curve-name">P-256</div>
          </div>
          <div class="curve-option" data-curve="ed25519">
            <div class="curve-icon">📐</div>
            <div class="curve-name">Ed25519</div>
          </div>
          <div class="curve-option" data-curve="x25519">
            <div class="curve-icon">🔗</div>
            <div class="curve-name">X25519</div>
          </div>
        </div>
        <div class="curve-info" id="curve-info">
          <h3 class="curve-title" id="curve-title">Select a Curve</h3>
          <div class="curve-parameters" id="curve-parameters">
            <div class="parameter">
              <span class="param-label">Field:</span>
              <span class="param-value" id="field-value">-</span>
            </div>
            <div class="parameter">
              <span class="param-label">Order:</span>
              <span class="param-value" id="order-value">-</span>
            </div>
          </div>
        </div>
      </div>
    `;

    // Replace existing tab navigation in examples section
    const exampleTabs = document.querySelector('.example-tabs');
    if (exampleTabs) {
      exampleTabs.insertAdjacentHTML('beforebegin', selectorHTML);
      this.setupCurveSelectorEvents();
    }
  }

  setupCurveSelectorEvents() {
    const curveOptions = document.querySelectorAll('.curve-option');
    const curveWheel = document.getElementById('curve-wheel');
    
    curveOptions.forEach((option, index) => {
      option.addEventListener('click', () => {
        const curve = option.dataset.curve;
        this.selectCurve(curve, index);
      });
    });
  }

  selectCurve(curveName, index) {
    // Rotate wheel to selected position
    const rotation = index * 90;
    const curveWheel = document.getElementById('curve-wheel');
    if (curveWheel) {
      curveWheel.style.transform = `rotate(${rotation}deg)`;
    } else {
      console.warn("Element with ID 'curve-wheel' not found.");
    }
    
    // Update curve info
    this.updateCurveInfo(curveName);
    
    // Notify hero canvas to switch curve type
    if (window.heroCanvas) {
      window.heroCanvas.switchCurveType(curveName);
    }
  }

  updateCurveInfo(curveName) {
    const curveData = {
      secp256k1: { field: 'GF(2^256 - 2^32 - 977)', order: '2^256 - 432420386565659656852420866394968145599' },
      p256: { field: 'GF(2^256 - 2^224 + 2^192 + 2^96 - 1)', order: '2^256 - 2^224 + 2^192 - 2^96 + 1' },
      ed25519: { field: 'GF(2^255 - 19)', order: '2^252 + 27742317777372353535851937790883648493' },
      x25519: { field: 'GF(2^255 - 19)', order: '2^252 + 27742317777372353535851937790883648493' }
    };

    const data = curveData[curveName];
    if (data) {
      const curveTitleEl = document.getElementById('curve-title');
      if (curveTitleEl) curveTitleEl.textContent = curveName.toUpperCase();
      else console.warn("Element with ID 'curve-title' not found.");

      const fieldValueEl = document.getElementById('field-value');
      if (fieldValueEl) fieldValueEl.textContent = data.field;
      else console.warn("Element with ID 'field-value' not found.");

      const orderValueEl = document.getElementById('order-value');
      if (orderValueEl) orderValueEl.textContent = data.order;
      else console.warn("Element with ID 'order-value' not found.");
    }
  }

  createWasmVisualizer() {
    // Mock WASM execution pipeline visualization
    const wasmHTML = `
      <div class="wasm-visualizer" id="wasm-visualizer">
        <div class="pipeline-container">
          <div class="pipeline-stage" data-stage="compile">
            <div class="stage-icon">⚙️</div>
            <div class="stage-name">Compile</div>
            <div class="stage-progress"></div>
          </div>
          <div class="pipeline-stage" data-stage="optimize">
            <div class="stage-icon">🚀</div>
            <div class="stage-name">Optimize</div>
            <div class="stage-progress"></div>
          </div>
          <div class="pipeline-stage" data-stage="execute">
            <div class="stage-icon">⚡</div>
            <div class="stage-name">Execute</div>
            <div class="stage-progress"></div>
          </div>
          <div class="pipeline-stage" data-stage="secure">
            <div class="stage-icon">🔒</div>
            <div class="stage-name">Secure</div>
            <div class="stage-progress"></div>
          </div>
        </div>
        <div class="performance-metrics" id="performance-metrics">
          <div class="metric">
            <span class="metric-label">Speed:</span>
            <span class="metric-value" id="speed-metric">0x</span>
          </div>
          <div class="metric">
            <span class="metric-label">Memory:</span>
            <span class="metric-value" id="memory-metric">0 KB</span>
          </div>
        </div>
      </div>
    `;

    // Add to demo outputs
    const demoOutputs = document.querySelectorAll('.demo-output');
    demoOutputs.forEach(output => {
      output.insertAdjacentHTML('beforeend', wasmHTML);
    });
  }

  createInteractiveStarfield() {
    // Create starfield background with mathematical symbols
    const starfieldCanvas = document.createElement('canvas');
    starfieldCanvas.id = 'starfield-canvas';
    starfieldCanvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: -1;
      opacity: 0.3;
    `;
    
    document.body.appendChild(starfieldCanvas);
    this.starfield = new StarfieldSystem(starfieldCanvas);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Cleanup method
  destroy() {
    if (this.starfield) {
      this.starfield.destroy();
    }
  }
}

// Starfield system for mathematical symbols
class StarfieldSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.stars = [];
    this.symbols = ['∑', '∫', '∂', '∇', '∞', '≈', '≡', '⊕', '⊗', '∈', '∀', '∃', 'π', 'φ', 'λ'];
    
    this.resizeCanvas();
    this.createStars();
    this.animate();
    
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  createStars() {
    const starCount = 100;
    for (let i = 0; i < starCount; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        z: Math.random() * 1000,
        symbol: this.symbols[Math.floor(Math.random() * this.symbols.length)],
        speed: 0.5 + Math.random() * 1.5
      });
    }
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.stars.forEach(star => {
      star.z -= star.speed;
      
      if (star.z <= 0) {
        star.z = 1000;
        star.x = Math.random() * this.canvas.width;
        star.y = Math.random() * this.canvas.height;
      }
      
      const x = (star.x - this.canvas.width / 2) * (1000 / star.z) + this.canvas.width / 2;
      const y = (star.y - this.canvas.height / 2) * (1000 / star.z) + this.canvas.height / 2;
      const size = (1000 - star.z) / 1000 * 20;
      const opacity = (1000 - star.z) / 1000;
      
      this.ctx.save();
      this.ctx.globalAlpha = opacity * 0.6;
      this.ctx.font = `${size}px serif`;
      this.ctx.fillStyle = '#3b82f6';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(star.symbol, x, y);
      this.ctx.restore();
    });
    
    requestAnimationFrame(() => this.animate());
  }

  destroy() {
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}

// Initialize interactive components
document.addEventListener('DOMContentLoaded', () => {
  window.interactiveComponents = new InteractiveComponents();
});

// Export for use in other modules
window.InteractiveComponents = InteractiveComponents;
