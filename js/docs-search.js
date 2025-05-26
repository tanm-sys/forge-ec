/**
 * Documentation Search Functionality
 * Provides real-time search across documentation content
 */

class DocsSearch {
  constructor() {
    this.searchInput = document.getElementById('docs-search');
    this.searchResults = document.getElementById('search-results');
    this.isSearching = false;
    
    // Documentation content for search
    this.docs = [
      {
        title: 'Quick Start Guide',
        description: 'Get up and running with Forge EC in under 5 minutes',
        category: 'Getting Started',
        level: 'Beginner',
        keywords: ['quick', 'start', 'tutorial', 'begin', 'first', 'setup'],
        url: '#quick-start'
      },
      {
        title: 'Installation Guide',
        description: 'Multiple installation methods and dependency management',
        category: 'Getting Started',
        level: 'Beginner',
        keywords: ['install', 'cargo', 'dependencies', 'setup', 'add'],
        url: '#installation'
      },
      {
        title: 'Configuration',
        description: 'Customize Forge EC for your specific use case',
        category: 'Getting Started',
        level: 'Intermediate',
        keywords: ['config', 'configure', 'settings', 'customize', 'features'],
        url: '#configuration'
      },
      {
        title: 'Signatures Module',
        description: 'ECDSA, EdDSA, and Schnorr signature implementations',
        category: 'API Reference',
        level: 'Intermediate',
        keywords: ['ecdsa', 'eddsa', 'schnorr', 'signature', 'sign', 'verify'],
        url: '#api-signatures'
      },
      {
        title: 'Encoding Module',
        description: 'Point compression, serialization, and format conversion',
        category: 'API Reference',
        level: 'Intermediate',
        keywords: ['encoding', 'compression', 'serialization', 'format', 'convert'],
        url: '#api-encoding'
      },
      {
        title: 'Hashing Module',
        description: 'Hash-to-curve, HMAC, and cryptographic hash functions',
        category: 'API Reference',
        level: 'Advanced',
        keywords: ['hash', 'hmac', 'sha', 'curve', 'cryptographic'],
        url: '#api-hashing'
      },
      {
        title: 'RNG Module',
        description: 'Secure random number generation and entropy sources',
        category: 'API Reference',
        level: 'Intermediate',
        keywords: ['random', 'rng', 'entropy', 'secure', 'generation'],
        url: '#api-rng'
      },
      {
        title: 'Security Guidelines',
        description: 'Essential security practices and common pitfalls to avoid',
        category: 'Security',
        level: 'Advanced',
        keywords: ['security', 'best', 'practices', 'pitfalls', 'safe', 'secure'],
        url: '#security-guidelines'
      },
      {
        title: 'Constant-Time Operations',
        description: 'Understanding and implementing timing-attack resistant code',
        category: 'Security',
        level: 'Expert',
        keywords: ['constant', 'time', 'timing', 'attack', 'resistant', 'side-channel'],
        url: '#constant-time'
      },
      {
        title: 'Vulnerability Disclosure',
        description: 'How to responsibly report security vulnerabilities',
        category: 'Security',
        level: 'Beginner',
        keywords: ['vulnerability', 'disclosure', 'report', 'security', 'responsible'],
        url: '#vulnerability-disclosure'
      },
      {
        title: 'ECDSA Examples',
        description: 'Complete examples of ECDSA signature creation and verification',
        category: 'Examples',
        level: 'Intermediate',
        keywords: ['ecdsa', 'example', 'demo', 'signature', 'secp256k1'],
        url: '#examples'
      },
      {
        title: 'EdDSA Examples',
        description: 'Ed25519 signature examples and best practices',
        category: 'Examples',
        level: 'Intermediate',
        keywords: ['eddsa', 'ed25519', 'example', 'demo', 'signature'],
        url: '#examples'
      },
      {
        title: 'ECDH Key Exchange',
        description: 'Elliptic Curve Diffie-Hellman key exchange examples',
        category: 'Examples',
        level: 'Intermediate',
        keywords: ['ecdh', 'key', 'exchange', 'diffie', 'hellman', 'x25519'],
        url: '#examples'
      },
      {
        title: 'Schnorr Signatures',
        description: 'Schnorr signature scheme implementation and usage',
        category: 'Examples',
        level: 'Advanced',
        keywords: ['schnorr', 'signature', 'example', 'demo', 'bitcoin'],
        url: '#examples'
      }
    ];

    this.init();
  }

  init() {
    if (!this.searchInput) return;

    // Add event listeners
    this.searchInput.addEventListener('input', this.handleSearch.bind(this));
    this.searchInput.addEventListener('focus', this.handleFocus.bind(this));
    this.searchInput.addEventListener('blur', this.handleBlur.bind(this));

    // Close search results when clicking outside
    document.addEventListener('click', (event) => {
      if (!event.target.closest('.search-container')) {
        this.hideResults();
      }
    });

    console.log('✅ Documentation search initialized');
  }

  handleSearch(event) {
    const query = event.target.value.trim().toLowerCase();
    
    if (query.length < 2) {
      this.hideResults();
      return;
    }

    this.performSearch(query);
  }

  handleFocus() {
    const query = this.searchInput.value.trim().toLowerCase();
    if (query.length >= 2) {
      this.performSearch(query);
    }
  }

  handleBlur() {
    // Delay hiding to allow clicking on results
    setTimeout(() => {
      if (!this.searchResults.matches(':hover')) {
        this.hideResults();
      }
    }, 150);
  }

  performSearch(query) {
    if (this.isSearching) return;
    
    this.isSearching = true;
    
    // Search through documentation
    const results = this.docs.filter(doc => {
      const searchText = `${doc.title} ${doc.description} ${doc.category} ${doc.keywords.join(' ')}`.toLowerCase();
      return searchText.includes(query);
    });

    // Sort results by relevance
    results.sort((a, b) => {
      const aScore = this.calculateRelevance(a, query);
      const bScore = this.calculateRelevance(b, query);
      return bScore - aScore;
    });

    this.displayResults(results.slice(0, 8)); // Show top 8 results
    this.isSearching = false;
  }

  calculateRelevance(doc, query) {
    let score = 0;
    const queryWords = query.split(' ');

    queryWords.forEach(word => {
      // Title match (highest weight)
      if (doc.title.toLowerCase().includes(word)) {
        score += 10;
      }
      
      // Keywords match (high weight)
      if (doc.keywords.some(keyword => keyword.includes(word))) {
        score += 5;
      }
      
      // Description match (medium weight)
      if (doc.description.toLowerCase().includes(word)) {
        score += 3;
      }
      
      // Category match (low weight)
      if (doc.category.toLowerCase().includes(word)) {
        score += 1;
      }
    });

    return score;
  }

  displayResults(results) {
    if (results.length === 0) {
      this.searchResults.innerHTML = `
        <div class="search-result-item">
          <div class="search-result-title">No results found</div>
          <div class="search-result-description">Try different keywords or browse the documentation categories below</div>
        </div>
      `;
    } else {
      this.searchResults.innerHTML = results.map(result => `
        <div class="search-result-item" onclick="window.location.href='${result.url}'">
          <div class="search-result-title">${result.title}</div>
          <div class="search-result-description">${result.description}</div>
          <div class="search-result-meta">
            <span class="search-result-category">${result.category}</span>
            <span class="search-result-level doc-level ${result.level.toLowerCase()}">${result.level}</span>
          </div>
        </div>
      `).join('');
    }

    this.showResults();
  }

  showResults() {
    this.searchResults.classList.add('show');
  }

  hideResults() {
    this.searchResults.classList.remove('show');
  }

  // Public method to add new documentation entries
  addDoc(doc) {
    this.docs.push(doc);
  }

  // Public method to search programmatically
  search(query) {
    this.searchInput.value = query;
    this.performSearch(query.toLowerCase());
  }
}

// Initialize documentation search when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.docsSearch = new DocsSearch();
});

// Export for potential external use
window.DocsSearch = DocsSearch;
