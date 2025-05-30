/**
 * Enhanced Documentation Search with Firebase Integration
 * Provides real-time search across documentation content with user tracking
 */

class DocsSearch {
  constructor() {
    this.searchInput = document.getElementById('docs-search');
    this.searchResults = document.getElementById('search-results');
    this.isSearching = false;
    this.searchHistory = [];
    this.recentSearches = new Set();

    // Documentation content for search
    this.docs = [
      {
        title: 'Quick Start Guide',
        description: 'Get up and running with Forge EC in under 5 minutes',
        category: 'Getting Started',
        level: 'Beginner',
        keywords: ['quick', 'start', 'tutorial', 'begin', 'first', 'setup'],
        url: 'docs/getting-started/quick-start.html'
      },
      {
        title: 'Installation Guide',
        description: 'Multiple installation methods and dependency management',
        category: 'Getting Started',
        level: 'Beginner',
        keywords: ['install', 'cargo', 'dependencies', 'setup', 'add'],
        url: 'docs/getting-started/installation.html'
      },
      {
        title: 'Configuration',
        description: 'Customize Forge EC for your specific use case',
        category: 'Getting Started',
        level: 'Intermediate',
        keywords: ['config', 'configure', 'settings', 'customize', 'features'],
        url: 'docs/getting-started/configuration.html'
      },
      {
        title: 'Signatures Module',
        description: 'ECDSA, EdDSA, and Schnorr signature implementations',
        category: 'API Reference',
        level: 'Intermediate',
        keywords: ['ecdsa', 'eddsa', 'schnorr', 'signature', 'sign', 'verify'],
        url: 'docs/api/signatures.html'
      },
      {
        title: 'Encoding Module',
        description: 'Point compression, serialization, and format conversion',
        category: 'API Reference',
        level: 'Intermediate',
        keywords: ['encoding', 'compression', 'serialization', 'format', 'convert'],
        url: 'docs/api/encoding.html'
      },
      {
        title: 'Hashing Module',
        description: 'Hash-to-curve, HMAC, and cryptographic hash functions',
        category: 'API Reference',
        level: 'Advanced',
        keywords: ['hash', 'hmac', 'sha', 'curve', 'cryptographic'],
        url: 'docs/api/hashing.html'
      },
      {
        title: 'RNG Module',
        description: 'Secure random number generation and entropy sources',
        category: 'API Reference',
        level: 'Intermediate',
        keywords: ['random', 'rng', 'entropy', 'secure', 'generation'],
        url: 'docs/api/rng.html'
      },
      {
        title: 'Security Guidelines',
        description: 'Essential security practices and common pitfalls to avoid',
        category: 'Security',
        level: 'Advanced',
        keywords: ['security', 'best', 'practices', 'pitfalls', 'safe', 'secure'],
        url: 'docs/security/guidelines.html'
      },
      {
        title: 'Constant-Time Operations',
        description: 'Understanding and implementing timing-attack resistant code',
        category: 'Security',
        level: 'Expert',
        keywords: ['constant', 'time', 'timing', 'attack', 'resistant', 'side-channel'],
        url: 'docs/security/constant-time.html'
      },
      {
        title: 'Vulnerability Disclosure',
        description: 'How to responsibly report security vulnerabilities',
        category: 'Security',
        level: 'Beginner',
        keywords: ['vulnerability', 'disclosure', 'report', 'security', 'responsible'],
        url: 'docs/security/vulnerability-disclosure.html'
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
    if (!this.searchInput) {
      console.warn("DocsSearch: searchInput element not found.");
      return;
    }
    if (!this.searchResults) {
      // Although not strictly breaking if searchInput is present, good to note.
      // Functionality like displayResults will implicitly handle it if it's null.
      console.warn("DocsSearch: searchResults element not found. Results will not be displayed.");
    }

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

  async performSearch(query) {
    if (this.isSearching) return;

    this.isSearching = true;

    try {
      // Track search query with Firebase
      const currentUser = window.firebaseAuth ? window.firebaseAuth.currentUser : null;
      const userId = currentUser ? currentUser.uid : null;

      // Search through local documentation first (for immediate results)
      const localResults = this.docs.filter(doc => {
        const searchText = `${doc.title} ${doc.description} ${doc.category} ${doc.keywords.join(' ')}`.toLowerCase();
        return searchText.includes(query);
      });

      // Search through Firebase documentation
      let firebaseResults = [];
      try {
        // The original firebaseDocsService.getDocumentation() likely contained specific Firestore query logic.
        // Replicating that logic here is complex and error-prone without its definition.
        // This change will ensure the code doesn't break due to the missing import and will allow
        // the existing catch block for this operation to engage, falling back to local results.
        console.warn("firebaseDocsService.getDocumentation() was removed. The application will rely on local search results. If dynamic/Firebase-backed doc search is needed, the Firestore query logic must be re-implemented here using window.firebaseDb.");
        throw new Error("Simulating Firebase documentation fetch failure to trigger fallback to local results.");
      } catch (error) {
        console.warn('Firebase search failed, using local results:', error);
      }

      // Combine and deduplicate results
      const combinedResults = this.combineSearchResults(localResults, firebaseResults);

      // Sort results by relevance
      combinedResults.sort((a, b) => {
        const aScore = this.calculateRelevance(a, query);
        const bScore = this.calculateRelevance(b, query);
        return bScore - aScore;
      });

      const finalResults = combinedResults.slice(0, 8);

      // Track search analytics
      if (window.firebaseDb && typeof window.firebaseDb.collection === 'function') {
          // This is a placeholder for where the actual Firestore write would happen.
          // Example: await window.firebaseDb.collection('search_analytics').add({ query, userId, resultCount: finalResults.length, timestamp: new Date() });
          console.log('Placeholder: Search analytics would be tracked here using window.firebaseDb.');
      } else {
          console.warn('Global firebaseDb (Firestore instance) not found. Cannot track search query to Firebase.');
      }

      // Add to search history
      this.addToSearchHistory(query, finalResults.length);

      this.displayResults(finalResults);
    } catch (error) {
      console.error('Search error:', error);
      // Fallback to local search
      const localResults = this.docs.filter(doc => {
        const searchText = `${doc.title} ${doc.description} ${doc.category} ${doc.keywords.join(' ')}`.toLowerCase();
        return searchText.includes(query);
      });
      this.displayResults(localResults.slice(0, 8));
    } finally {
      this.isSearching = false;
    }
  }

  combineSearchResults(localResults, firebaseResults) {
    const resultMap = new Map();

    // Add local results
    localResults.forEach(result => {
      resultMap.set(result.id || result.title, result);
    });

    // Add Firebase results (will override local if same ID)
    firebaseResults.forEach(result => {
      resultMap.set(result.id || result.title, result);
    });

    return Array.from(resultMap.values());
  }

  addToSearchHistory(query, resultCount) {
    const searchEntry = {
      query,
      resultCount,
      timestamp: new Date().toISOString()
    };

    this.searchHistory.unshift(searchEntry);
    this.recentSearches.add(query);

    // Keep only last 50 searches
    if (this.searchHistory.length > 50) {
      this.searchHistory = this.searchHistory.slice(0, 50);
    }

    // Keep only last 10 recent searches
    if (this.recentSearches.size > 10) {
      const recentArray = Array.from(this.recentSearches);
      this.recentSearches = new Set(recentArray.slice(0, 10));
    }

    // Save to localStorage
    try {
      localStorage.setItem('forge-ec-search-history', JSON.stringify(Array.from(this.searchHistory)));
      localStorage.setItem('forge-ec-recent-searches', JSON.stringify(Array.from(this.recentSearches)));
    } catch (error) {
      console.warn('Failed to save search history:', error);
    }
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
    if (!this.searchResults) return; // Guard against null searchResults element

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
    if (this.searchResults) this.searchResults.classList.add('show');
  }

  hideResults() {
    if (this.searchResults) this.searchResults.classList.remove('show');
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
