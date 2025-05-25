// ===== CRYPTOGRAPHIC FORGE ANIMATION SYSTEM =====

class ForgeAnimationSystem {
  constructor() {
    this.isActive = false;
    this.particles = [];
    this.codeSnippets = [];
    this.hammerPosition = { x: 0, y: 0 };
    this.anvilGlow = 0;
    this.sparkCount = 0;
    this.canvas = null;
    this.ctx = null;
    
    this.init();
  }

  init() {
    this.createForgeCanvas();
    this.setupEventListeners();
    this.initializeCodeSnippets();
  }

  createForgeCanvas() {
    // Create overlay canvas for forge effects
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'forge-overlay';
    this.canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 9999;
      opacity: 0;
      transition: opacity 300ms ease-out;
    `;
    
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.ctx.scale(dpr, dpr);
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
  }

  setupEventListeners() {
    // Listen for demo button clicks
    document.addEventListener('click', (e) => {
      if (e.target.matches('[id$="-demo-btn"]') || e.target.closest('[id$="-demo-btn"]')) {
        const demoType = e.target.id?.replace('-demo-btn', '') || 
                        e.target.closest('[id$="-demo-btn"]').id.replace('-demo-btn', '');
        this.triggerForgeAnimation(demoType, e.target);
      }
    });
  }

  initializeCodeSnippets() {
    this.codeSnippetTemplates = {
      ecdsa: ['let key = PrivateKey::new()', 'let sig = key.sign(msg)', 'verify(sig, msg, &pub_key)'],
      eddsa: ['Ed25519::generate_keypair()', 'ed_sign(private_key, message)', 'ed_verify(signature, message)'],
      ecdh: ['let shared = alice.dh(&bob_pub)', 'X25519::diffie_hellman()', 'derive_shared_secret()'],
      schnorr: ['schnorr_sign(key, msg)', 'batch_verify(signatures)', 'aggregate_signatures()']
    };
  }

  async triggerForgeAnimation(demoType, buttonElement) {
    if (this.isActive) return;
    
    this.isActive = true;
    this.canvas.style.opacity = '1';
    
    // Get button position for hammer animation
    const rect = buttonElement.getBoundingClientRect();
    this.hammerPosition = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };

    // Start animation sequence
    await this.playForgeSequence(demoType);
    
    // Fade out
    this.canvas.style.opacity = '0';
    setTimeout(() => {
      this.isActive = false;
      this.particles = [];
      this.codeSnippets = [];
    }, 300);
  }

  async playForgeSequence(demoType) {
    // Phase 1: Hammer strike
    await this.animateHammerStrike();
    
    // Phase 2: Spark explosion
    await this.createSparkExplosion();
    
    // Phase 3: Code snippet formation
    await this.formCodeSnippets(demoType);
    
    // Phase 4: Anvil glow pulse
    await this.pulseAnvilGlow();
  }

  async animateHammerStrike() {
    return new Promise(resolve => {
      let progress = 0;
      const duration = 800;
      const startTime = performance.now();
      
      const animate = (currentTime) => {
        progress = (currentTime - startTime) / duration;
        
        if (progress < 1) {
          this.drawHammer(progress);
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      
      requestAnimationFrame(animate);
    });
  }

  drawHammer(progress) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Hammer animation with easing
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const hammerY = this.hammerPosition.y - 100 + (easeOut * 80);
    const rotation = progress * Math.PI * 0.25;
    
    this.ctx.save();
    this.ctx.translate(this.hammerPosition.x, hammerY);
    this.ctx.rotate(rotation);
    
    // Draw hammer
    this.ctx.fillStyle = '#8b5cf6';
    this.ctx.fillRect(-15, -40, 30, 60); // Handle
    
    this.ctx.fillStyle = '#374151';
    this.ctx.fillRect(-25, -50, 50, 20); // Head
    
    // Add glow effect
    this.ctx.shadowColor = '#8b5cf6';
    this.ctx.shadowBlur = 20;
    this.ctx.fillStyle = '#a78bfa';
    this.ctx.fillRect(-20, -45, 40, 10);
    
    this.ctx.restore();
  }

  async createSparkExplosion() {
    return new Promise(resolve => {
      // Create spark particles
      for (let i = 0; i < 30; i++) {
        this.particles.push({
          x: this.hammerPosition.x,
          y: this.hammerPosition.y,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8 - 2,
          life: 1,
          decay: 0.02 + Math.random() * 0.02,
          size: Math.random() * 4 + 2,
          color: `hsl(${45 + Math.random() * 30}, 100%, ${60 + Math.random() * 30}%)`
        });
      }
      
      let animationTime = 0;
      const animate = () => {
        animationTime += 16;
        this.updateAndDrawSparks();
        
        if (animationTime < 1500 && this.particles.length > 0) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      
      requestAnimationFrame(animate);
    });
  }

  updateAndDrawSparks() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Update and draw particles
    this.particles = this.particles.filter(particle => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.2; // Gravity
      particle.life -= particle.decay;
      
      if (particle.life > 0) {
        this.ctx.save();
        this.ctx.globalAlpha = particle.life;
        this.ctx.fillStyle = particle.color;
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
        return true;
      }
      return false;
    });
  }

  async formCodeSnippets(demoType) {
    return new Promise(resolve => {
      const snippets = this.codeSnippetTemplates[demoType] || [];
      let snippetIndex = 0;
      
      const createSnippet = () => {
        if (snippetIndex < snippets.length) {
          // Transform some sparks into code snippets
          const sparkIndices = this.particles
            .map((_, index) => index)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);
          
          sparkIndices.forEach((index, i) => {
            if (this.particles[index]) {
              this.codeSnippets.push({
                text: snippets[snippetIndex],
                x: this.particles[index].x,
                y: this.particles[index].y,
                targetX: window.innerWidth * 0.2 + i * 200,
                targetY: window.innerHeight * 0.3 + snippetIndex * 60,
                progress: 0,
                alpha: 0
              });
              
              // Remove the spark
              this.particles.splice(index, 1);
            }
          });
          
          snippetIndex++;
          setTimeout(createSnippet, 500);
        } else {
          // Animate code snippets to final positions
          this.animateCodeSnippets().then(resolve);
        }
      };
      
      setTimeout(createSnippet, 200);
    });
  }

  async animateCodeSnippets() {
    return new Promise(resolve => {
      let animationTime = 0;
      const duration = 1500;
      
      const animate = () => {
        animationTime += 16;
        const progress = Math.min(animationTime / duration, 1);
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Continue drawing remaining sparks
        this.updateAndDrawSparks();
        
        // Animate code snippets
        this.codeSnippets.forEach(snippet => {
          snippet.progress = Math.min(snippet.progress + 0.02, 1);
          snippet.alpha = Math.min(snippet.alpha + 0.03, 1);
          
          const easeOut = 1 - Math.pow(1 - snippet.progress, 3);
          const currentX = snippet.x + (snippet.targetX - snippet.x) * easeOut;
          const currentY = snippet.y + (snippet.targetY - snippet.y) * easeOut;
          
          this.ctx.save();
          this.ctx.globalAlpha = snippet.alpha;
          this.ctx.font = '16px JetBrains Mono, monospace';
          this.ctx.fillStyle = '#3b82f6';
          this.ctx.shadowColor = '#3b82f6';
          this.ctx.shadowBlur = 10;
          this.ctx.fillText(snippet.text, currentX, currentY);
          this.ctx.restore();
        });
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setTimeout(resolve, 1000);
        }
      };
      
      requestAnimationFrame(animate);
    });
  }

  async pulseAnvilGlow() {
    return new Promise(resolve => {
      let pulseTime = 0;
      const pulseDuration = 1000;
      
      const animate = () => {
        pulseTime += 16;
        const progress = pulseTime / pulseDuration;
        
        if (progress < 1) {
          this.drawAnvilGlow(Math.sin(progress * Math.PI * 4) * 0.5 + 0.5);
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      
      requestAnimationFrame(animate);
    });
  }

  drawAnvilGlow(intensity) {
    // Draw glowing anvil/chip at bottom center
    const anvilX = window.innerWidth * 0.5;
    const anvilY = window.innerHeight * 0.8;
    
    this.ctx.save();
    this.ctx.globalAlpha = intensity * 0.8;
    
    // Anvil base
    this.ctx.fillStyle = '#374151';
    this.ctx.fillRect(anvilX - 40, anvilY - 20, 80, 40);
    
    // Glow effect
    this.ctx.shadowColor = '#06b6d4';
    this.ctx.shadowBlur = 30 * intensity;
    this.ctx.fillStyle = '#22d3ee';
    this.ctx.fillRect(anvilX - 35, anvilY - 15, 70, 30);
    
    this.ctx.restore();
  }

  // Method to enable audio reactivity
  enableAudioReactivity(audioContext, analyser) {
    this.audioContext = audioContext;
    this.analyser = analyser;
    this.audioData = new Uint8Array(analyser.frequencyBinCount);
  }

  // Cleanup method
  destroy() {
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    this.isActive = false;
  }
}

// Initialize forge animation system
document.addEventListener('DOMContentLoaded', () => {
  window.forgeAnimationSystem = new ForgeAnimationSystem();
});

// Export for use in other modules
window.ForgeAnimationSystem = ForgeAnimationSystem;
