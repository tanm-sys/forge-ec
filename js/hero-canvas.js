// ===== HERO CANVAS WITH ELLIPTIC CURVE VISUALIZATION =====

class HeroCanvas {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.curves = [];
    this.mouse = { x: 0, y: 0 };
    this.animationId = null;
    this.time = 0;
    
    this.init();
  }

  init() {
    this.setupCanvas();
    this.createParticles();
    this.createCurves();
    this.setupEventListeners();
    this.animate();
  }

  setupCanvas() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    this.ctx.scale(dpr, dpr);
    
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    
    this.width = rect.width;
    this.height = rect.height;
  }

  createParticles() {
    const particleCount = Math.min(150, Math.floor(this.width * this.height / 8000));
    
    for (let i = 0; i < particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 3 + 1,
        opacity: Math.random() * 0.5 + 0.2,
        hue: Math.random() * 60 + 200, // Blue to purple range
        life: Math.random() * 100
      });
    }
  }

  createCurves() {
    // Create elliptic curve visualizations
    const curveCount = 3;
    
    for (let i = 0; i < curveCount; i++) {
      this.curves.push({
        centerX: this.width * (0.2 + i * 0.3),
        centerY: this.height * 0.5,
        a: 50 + i * 30,
        b: 30 + i * 20,
        rotation: i * Math.PI / 3,
        rotationSpeed: 0.001 + i * 0.0005,
        opacity: 0.1 + i * 0.05,
        hue: 220 + i * 30
      });
    }
  }

  setupEventListeners() {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.mouse.x = this.width / 2;
      this.mouse.y = this.height / 2;
    });
  }

  updateParticles() {
    this.particles.forEach(particle => {
      // Mouse interaction
      const dx = this.mouse.x - particle.x;
      const dy = this.mouse.y - particle.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 100) {
        const force = (100 - distance) / 100;
        particle.vx += (dx / distance) * force * 0.01;
        particle.vy += (dy / distance) * force * 0.01;
      }

      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;

      // Boundary wrapping
      if (particle.x < 0) particle.x = this.width;
      if (particle.x > this.width) particle.x = 0;
      if (particle.y < 0) particle.y = this.height;
      if (particle.y > this.height) particle.y = 0;

      // Damping
      particle.vx *= 0.99;
      particle.vy *= 0.99;

      // Life cycle
      particle.life += 0.5;
      particle.opacity = 0.2 + Math.sin(particle.life * 0.02) * 0.3;
    });
  }

  updateCurves() {
    this.curves.forEach(curve => {
      curve.rotation += curve.rotationSpeed;
    });
  }

  drawParticles() {
    this.particles.forEach(particle => {
      this.ctx.save();
      
      // Create gradient for particle
      const gradient = this.ctx.createRadialGradient(
        particle.x, particle.y, 0,
        particle.x, particle.y, particle.size * 2
      );
      
      gradient.addColorStop(0, `hsla(${particle.hue}, 70%, 60%, ${particle.opacity})`);
      gradient.addColorStop(1, `hsla(${particle.hue}, 70%, 60%, 0)`);
      
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.restore();
    });
  }

  drawCurves() {
    this.curves.forEach(curve => {
      this.ctx.save();
      this.ctx.translate(curve.centerX, curve.centerY);
      this.ctx.rotate(curve.rotation);
      
      // Draw elliptic curve
      this.ctx.strokeStyle = `hsla(${curve.hue}, 60%, 50%, ${curve.opacity})`;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      
      // Parametric ellipse
      for (let t = 0; t <= Math.PI * 2; t += 0.1) {
        const x = curve.a * Math.cos(t);
        const y = curve.b * Math.sin(t);
        
        if (t === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }
      
      this.ctx.closePath();
      this.ctx.stroke();
      
      // Draw curve points
      for (let i = 0; i < 8; i++) {
        const t = (i / 8) * Math.PI * 2;
        const x = curve.a * Math.cos(t);
        const y = curve.b * Math.sin(t);
        
        this.ctx.fillStyle = `hsla(${curve.hue}, 80%, 60%, ${curve.opacity * 2})`;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 3, 0, Math.PI * 2);
        this.ctx.fill();
      }
      
      this.ctx.restore();
    });
  }

  drawConnections() {
    // Draw connections between nearby particles
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const p1 = this.particles[i];
        const p2 = this.particles[j];
        
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 80) {
          const opacity = (80 - distance) / 80 * 0.1;
          
          this.ctx.strokeStyle = `hsla(220, 60%, 60%, ${opacity})`;
          this.ctx.lineWidth = 1;
          this.ctx.beginPath();
          this.ctx.moveTo(p1.x, p1.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.stroke();
        }
      }
    }
  }

  drawCodeSnippets() {
    // Draw floating code snippets
    const codeSnippets = [
      'use forge_ec::*;',
      'let key = PrivateKey::new();',
      'let signature = key.sign(message);',
      'verify(signature, message, &public_key)',
      'secp256k1::Point::generator()'
    ];

    this.ctx.font = '12px JetBrains Mono, monospace';
    this.ctx.fillStyle = 'hsla(220, 30%, 60%, 0.3)';

    codeSnippets.forEach((snippet, index) => {
      const x = (this.width / codeSnippets.length) * index + 50;
      const y = 100 + Math.sin(this.time * 0.001 + index) * 20;
      
      this.ctx.save();
      this.ctx.translate(x, y);
      this.ctx.rotate(Math.sin(this.time * 0.0005 + index) * 0.1);
      this.ctx.fillText(snippet, 0, 0);
      this.ctx.restore();
    });
  }

  drawBackground() {
    // Create animated background gradient
    const gradient = this.ctx.createLinearGradient(0, 0, this.width, this.height);
    
    const hue1 = 220 + Math.sin(this.time * 0.001) * 20;
    const hue2 = 260 + Math.cos(this.time * 0.0015) * 20;
    
    gradient.addColorStop(0, `hsla(${hue1}, 20%, 95%, 0.1)`);
    gradient.addColorStop(1, `hsla(${hue2}, 20%, 90%, 0.1)`);
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  animate() {
    this.time++;
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    // Draw background
    this.drawBackground();
    
    // Update and draw elements
    this.updateParticles();
    this.updateCurves();
    
    this.drawConnections();
    this.drawCurves();
    this.drawParticles();
    this.drawCodeSnippets();
    
    // Continue animation
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    window.removeEventListener('resize', this.resizeCanvas);
  }

  // Method to add particle burst effect
  addParticleBurst(x, y, count = 10) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        size: Math.random() * 4 + 2,
        opacity: 0.8,
        hue: Math.random() * 60 + 200,
        life: 0
      });
    }
  }

  // Method to update theme colors
  updateTheme(isDark) {
    this.particles.forEach(particle => {
      if (isDark) {
        particle.hue = Math.random() * 60 + 200; // Blue to purple
      } else {
        particle.hue = Math.random() * 60 + 180; // Lighter blues
      }
    });

    this.curves.forEach(curve => {
      if (isDark) {
        curve.hue = 220 + Math.random() * 40;
        curve.opacity = 0.2;
      } else {
        curve.hue = 200 + Math.random() * 40;
        curve.opacity = 0.1;
      }
    });
  }
}

// Initialize hero canvas when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const heroCanvas = new HeroCanvas('hero-canvas');
  
  // Listen for theme changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        heroCanvas.updateTheme(isDark);
      }
    });
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
  });

  // Add click effect
  document.getElementById('hero-canvas')?.addEventListener('click', (e) => {
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    heroCanvas.addParticleBurst(x, y, 15);
  });

  // Store reference globally
  window.heroCanvas = heroCanvas;
});
