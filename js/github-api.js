// ===== GITHUB API INTEGRATION =====

class GitHubAPI {
  constructor() {
    this.baseURL = 'https://api.github.com';
    this.owner = 'tanm-sys';
    this.repo = 'forge-ec';
    this.cache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes (increased for rate limiting)
    this.rateLimitRemaining = 60;
    this.rateLimitReset = 0;
    this.pendingRequests = new Map(); // Prevent duplicate requests
    this.lastRequestTime = 0;
    this.requestDelay = 1000; // 1 second between requests
  }

  async fetchWithCache(url, options = {}) {
    const cacheKey = url;
    const cached = this.cache.get(cacheKey);

    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log('📦 Using cached data for:', url);
      return cached.data;
    }

    // Check if there's already a pending request for this URL
    if (this.pendingRequests.has(cacheKey)) {
      console.log('⏳ Request already pending for:', url);
      return await this.pendingRequests.get(cacheKey);
    }

    // Check rate limiting before making request
    if (this.rateLimitRemaining <= 5 && Date.now() < this.rateLimitReset * 1000) {
      console.warn('⚠️ Rate limit approaching, using cached data if available');
      if (cached) {
        return cached.data;
      }
    }

    // Implement request delay to avoid hitting rate limits
    const timeSinceLastRequest = Date.now() - this.lastRequestTime;
    if (timeSinceLastRequest < this.requestDelay) {
      await new Promise(resolve => setTimeout(resolve, this.requestDelay - timeSinceLastRequest));
    }

    // Create the request promise
    const requestPromise = this.makeRequest(url, options, cached);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      // Clean up pending request
      this.pendingRequests.delete(cacheKey);
      this.lastRequestTime = Date.now();
    }
  }

  async makeRequest(url, options, cached) {
    try {
      console.log('🌐 Fetching from GitHub API:', url);
      const response = await fetch(url, {
        ...options,
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Forge-EC-Website',
          ...options.headers
        }
      });

      // Update rate limit info from headers
      const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
      const rateLimitReset = response.headers.get('X-RateLimit-Reset');

      if (rateLimitRemaining) {
        this.rateLimitRemaining = parseInt(rateLimitRemaining);
      }
      if (rateLimitReset) {
        this.rateLimitReset = parseInt(rateLimitReset);
      }

      // Handle rate limiting
      if (response.status === 403 && this.rateLimitRemaining === 0) {
        const resetTime = new Date(this.rateLimitReset * 1000);
        console.warn('⚠️ GitHub API rate limit exceeded. Resets at:', resetTime);

        // Return cached data if available
        if (cached) {
          console.log('📦 Using expired cached data due to rate limit');
          return cached.data;
        }

        throw new Error(`Rate limit exceeded. Resets at ${resetTime.toLocaleTimeString()}`);
      }

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Cache the response
      this.cache.set(url, {
        data,
        timestamp: Date.now()
      });

      console.log('✅ Successfully fetched and cached data');
      return data;
    } catch (error) {
      console.warn('❌ GitHub API request failed:', error.message);

      // Return cached data if available, even if expired
      if (cached) {
        console.log('📦 Using expired cached data due to error');
        return cached.data;
      }

      // For rate limit errors, throw a more user-friendly error
      if (error.message.includes('Rate limit')) {
        throw new Error('GitHub API rate limit exceeded. Please try again later.');
      }

      throw error;
    }
  }

  async getRepositoryInfo() {
    const url = `${this.baseURL}/repos/${this.owner}/${this.repo}`;
    return await this.fetchWithCache(url);
  }

  async getRepositoryStats() {
    const url = `${this.baseURL}/repos/${this.owner}/${this.repo}/stats/contributors`;
    return await this.fetchWithCache(url);
  }

  async getCommits(page = 1, perPage = 100) {
    const url = `${this.baseURL}/repos/${this.owner}/${this.repo}/commits?page=${page}&per_page=${perPage}`;
    return await this.fetchWithCache(url);
  }

  async getTotalCommitCount() {
    try {
      // Get the default branch first
      const repoInfo = await this.getRepositoryInfo();
      const defaultBranch = repoInfo.default_branch || 'main';

      // Get commits from the default branch with pagination to get total count
      const url = `${this.baseURL}/repos/${this.owner}/${this.repo}/commits?sha=${defaultBranch}&per_page=1`;
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (response.ok) {
        // GitHub provides the total count in the Link header for pagination
        const linkHeader = response.headers.get('Link');
        if (linkHeader) {
          const lastPageMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
          if (lastPageMatch) {
            return parseInt(lastPageMatch[1]);
          }
        }

        // Fallback: try to get a reasonable estimate by fetching multiple pages
        let totalCommits = 0;
        let page = 1;
        let hasMore = true;

        while (hasMore && page <= 10) { // Limit to 10 pages to avoid rate limiting
          const commits = await this.getCommits(page, 100);
          if (commits && commits.length > 0) {
            totalCommits += commits.length;
            hasMore = commits.length === 100;
            page++;
          } else {
            hasMore = false;
          }
        }

        return totalCommits;
      }
    } catch (error) {
      console.warn('Failed to get total commit count:', error);
    }

    // Fallback to a reasonable estimate
    return 150;
  }

  async getContributors() {
    const url = `${this.baseURL}/repos/${this.owner}/${this.repo}/contributors`;
    return await this.fetchWithCache(url);
  }

  async getReleases() {
    const url = `${this.baseURL}/repos/${this.owner}/${this.repo}/releases`;
    return await this.fetchWithCache(url);
  }

  async getIssues(state = 'open') {
    const url = `${this.baseURL}/repos/${this.owner}/${this.repo}/issues?state=${state}`;
    return await this.fetchWithCache(url);
  }

  async getPullRequests(state = 'open') {
    const url = `${this.baseURL}/repos/${this.owner}/${this.repo}/pulls?state=${state}`;
    return await this.fetchWithCache(url);
  }

  async loadRepositoryData() {
    try {
      console.log('🔄 Loading GitHub repository data...');

      // Load basic repository information first
      const repoInfo = await this.getRepositoryInfo();
      console.log('📊 Repository info loaded:', {
        stars: repoInfo.stargazers_count,
        forks: repoInfo.forks_count,
        name: repoInfo.name
      });

      // Update basic stats immediately
      this.updateRepositoryStats(repoInfo);

      // Load additional data in parallel
      const [contributors, totalCommits, recentCommits] = await Promise.all([
        this.getContributors().catch(err => {
          console.warn('Failed to load contributors:', err);
          return [];
        }),
        this.getTotalCommitCount().catch(err => {
          console.warn('Failed to load commit count:', err);
          return 150; // Fallback
        }),
        this.getCommits(1, 10).catch(err => {
          console.warn('Failed to load recent commits:', err);
          return [];
        })
      ]);

      console.log('📈 Additional data loaded:', {
        contributors: contributors.length,
        totalCommits,
        recentCommits: recentCommits.length
      });

      // Update all statistics with real data
      this.updateContributorStats(contributors);
      this.updateCommitStatsWithTotal(totalCommits, recentCommits);
      this.updateGitHubBadges(repoInfo);

      console.log('✅ GitHub data loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load GitHub data:', error);
      this.showFallbackData();
    }
  }

  updateRepositoryStats(repoInfo) {
    const stars = repoInfo.stargazers_count || 0;
    const forks = repoInfo.forks_count || 0;
    const watchers = repoInfo.subscribers_count || 0;

    console.log('🔄 Updating repository stats:', { stars, forks, watchers });

    // Update stars count with data-target override
    const starsElements = document.querySelectorAll('#repo-stars, #stars-count, .stars-count');
    starsElements.forEach(element => {
      // Override the hardcoded data-target value
      if (element.hasAttribute('data-target')) {
        element.setAttribute('data-target', stars);
      }
      this.animateNumber(element, stars, element.id === 'stars-count' ? '⭐ ' : '');
    });

    // Update forks count with data-target override
    const forksElements = document.querySelectorAll('#repo-forks, #forks-count, .forks-count');
    forksElements.forEach(element => {
      // Override the hardcoded data-target value
      if (element.hasAttribute('data-target')) {
        element.setAttribute('data-target', forks);
      }
      this.animateNumber(element, forks, element.id === 'forks-count' ? '🍴 ' : '');
    });

    // Update watchers count
    const watchersElements = document.querySelectorAll('#repo-watchers');
    watchersElements.forEach(element => {
      this.animateNumber(element, watchers);
    });

    // Update repository description
    const descriptionElements = document.querySelectorAll('.repo-description');
    descriptionElements.forEach(element => {
      element.textContent = repoInfo.description || 'Modern Rust library for secure, high-performance elliptic curve cryptography';
    });

    // Update last updated
    const updatedElements = document.querySelectorAll('.repo-updated');
    updatedElements.forEach(element => {
      const updatedDate = new Date(repoInfo.updated_at);
      element.textContent = `Updated ${this.formatRelativeTime(updatedDate)}`;
    });
  }

  updateContributorStats(contributors) {
    const contributorCount = contributors.length || 1;
    console.log('🔄 Updating contributor stats:', contributorCount);

    const contributorsElements = document.querySelectorAll('#repo-contributors');
    contributorsElements.forEach(element => {
      // Override the hardcoded data-target value
      if (element.hasAttribute('data-target')) {
        element.setAttribute('data-target', contributorCount);
      }
      this.animateNumber(element, contributorCount);
    });

    // Update contributors list if element exists
    const contributorsList = document.querySelector('.contributors-list');
    if (contributorsList && contributors.length > 0) {
      contributorsList.innerHTML = contributors.slice(0, 10).map(contributor => `
        <div class="contributor-item" title="${contributor.login}">
          <img src="${contributor.avatar_url}" alt="${contributor.login}" class="contributor-avatar">
          <span class="contributor-name">${contributor.login}</span>
          <span class="contributor-contributions">${contributor.contributions} commits</span>
        </div>
      `).join('');
    }

    // Update About page contributors section
    const aboutContributors = document.getElementById('about-contributors');
    if (aboutContributors && contributors.length > 0) {
      aboutContributors.innerHTML = contributors.slice(0, 8).map(contributor => `
        <div class="contributor-item" title="${contributor.login} - ${contributor.contributions} contributions">
          <img src="${contributor.avatar_url}" alt="${contributor.login}" class="contributor-avatar" loading="lazy">
          <span class="contributor-name">${contributor.login}</span>
        </div>
      `).join('');
    }
  }

  updateCommitStatsWithTotal(totalCommits, recentCommits) {
    console.log('🔄 Updating commit stats:', totalCommits);

    const commitsElements = document.querySelectorAll('#repo-commits');
    commitsElements.forEach(element => {
      // Override the hardcoded data-target value
      if (element.hasAttribute('data-target')) {
        element.setAttribute('data-target', totalCommits);
      }
      this.animateNumber(element, totalCommits);
    });

    // Update recent commits if element exists
    const recentCommitsList = document.querySelector('.recent-commits');
    if (recentCommitsList && recentCommits.length > 0) {
      recentCommitsList.innerHTML = recentCommits.slice(0, 5).map(commit => `
        <div class="commit-item">
          <div class="commit-message">${commit.commit.message.split('\n')[0]}</div>
          <div class="commit-meta">
            <span class="commit-author">${commit.commit.author.name}</span>
            <span class="commit-date">${this.formatRelativeTime(new Date(commit.commit.author.date))}</span>
          </div>
        </div>
      `).join('');
    }
  }



  updateGitHubBadges(repoInfo) {
    const stars = repoInfo.stargazers_count || 0;
    const forks = repoInfo.forks_count || 0;

    console.log('🔄 Updating GitHub badges:', { stars, forks });

    // Update GitHub stats in navigation
    const starsCountNav = document.getElementById('stars-count');
    const forksCountNav = document.getElementById('forks-count');

    if (starsCountNav) {
      starsCountNav.textContent = `⭐ ${this.formatNumber(stars)}`;
    }

    if (forksCountNav) {
      forksCountNav.textContent = `🍴 ${this.formatNumber(forks)}`;
    }

    // Also update any other navigation stats elements
    const navStarsElements = document.querySelectorAll('#nav-stars, .nav-stars');
    navStarsElements.forEach(element => {
      element.textContent = `⭐ ${this.formatNumber(stars)}`;
    });

    const navForksElements = document.querySelectorAll('#nav-forks, .nav-forks');
    navForksElements.forEach(element => {
      element.textContent = `🍴 ${this.formatNumber(forks)}`;
    });
  }

  animateNumber(element, targetNumber, prefix = '') {
    if (!element) return;

    // Clear any existing loading text
    if (element.textContent.includes('Loading')) {
      element.textContent = prefix + '0';
    }

    const startNumber = 0;
    const duration = 1500; // 1.5 seconds for smoother animation
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentNumber = Math.floor(startNumber + (targetNumber - startNumber) * easeOut);

      element.textContent = prefix + this.formatNumber(currentNumber);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        element.textContent = prefix + this.formatNumber(targetNumber);
        console.log(`✅ Animated ${element.id || 'element'} to ${targetNumber}`);
      }
    };

    requestAnimationFrame(animate);
  }

  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  formatRelativeTime(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    const intervals = [
      { label: 'year', seconds: 31536000 },
      { label: 'month', seconds: 2592000 },
      { label: 'week', seconds: 604800 },
      { label: 'day', seconds: 86400 },
      { label: 'hour', seconds: 3600 },
      { label: 'minute', seconds: 60 }
    ];

    for (const interval of intervals) {
      const count = Math.floor(diffInSeconds / interval.seconds);
      if (count >= 1) {
        return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
      }
    }

    return 'just now';
  }

  showFallbackData() {
    // Show fallback data when GitHub API is unavailable
    // Using more realistic current estimates for the forge-ec repository
    const fallbackData = {
      stars: 15,
      forks: 3,
      contributors: 2,
      commits: 85
    };

    console.log('⚠️ GitHub API unavailable, using fallback data:', fallbackData);

    // Update with fallback data and override data-target attributes
    const starsElements = document.querySelectorAll('#repo-stars, #stars-count, .stars-count');
    starsElements.forEach(element => {
      if (element.hasAttribute('data-target')) {
        element.setAttribute('data-target', fallbackData.stars);
      }
      this.animateNumber(element, fallbackData.stars, element.id === 'stars-count' ? '⭐ ' : '');
    });

    const forksElements = document.querySelectorAll('#repo-forks, #forks-count, .forks-count');
    forksElements.forEach(element => {
      if (element.hasAttribute('data-target')) {
        element.setAttribute('data-target', fallbackData.forks);
      }
      this.animateNumber(element, fallbackData.forks, element.id === 'forks-count' ? '🍴 ' : '');
    });

    const contributorsElements = document.querySelectorAll('#repo-contributors');
    contributorsElements.forEach(element => {
      if (element.hasAttribute('data-target')) {
        element.setAttribute('data-target', fallbackData.contributors);
      }
      this.animateNumber(element, fallbackData.contributors);
    });

    const commitsElements = document.querySelectorAll('#repo-commits');
    commitsElements.forEach(element => {
      if (element.hasAttribute('data-target')) {
        element.setAttribute('data-target', fallbackData.commits);
      }
      this.animateNumber(element, fallbackData.commits);
    });

    console.log('📊 Using fallback GitHub data');
  }

  // Method to refresh data
  async refreshData() {
    this.cache.clear();
    await this.loadRepositoryData();
  }

  // Method to get build status (if using GitHub Actions)
  async getBuildStatus() {
    try {
      const url = `${this.baseURL}/repos/${this.owner}/${this.repo}/actions/runs?per_page=1`;
      const runs = await this.fetchWithCache(url);

      if (runs.workflow_runs && runs.workflow_runs.length > 0) {
        const latestRun = runs.workflow_runs[0];
        return {
          status: latestRun.status,
          conclusion: latestRun.conclusion,
          url: latestRun.html_url
        };
      }
    } catch (error) {
      console.warn('Failed to get build status:', error);
    }

    return null;
  }

  // Method to update build status badge
  async updateBuildStatus() {
    const buildStatus = await this.getBuildStatus();
    const buildBadge = document.querySelector('.build-status-badge');

    if (buildBadge && buildStatus) {
      const statusClass = buildStatus.conclusion === 'success' ? 'success' :
                         buildStatus.conclusion === 'failure' ? 'error' : 'warning';

      buildBadge.className = `badge badge-${statusClass}`;
      buildBadge.textContent = buildStatus.conclusion || buildStatus.status;

      if (buildStatus.url) {
        buildBadge.onclick = () => window.open(buildStatus.url, '_blank');
      }
    }
  }
}

// Initialize GitHub API (prevent duplicate initialization)
if (!window.forgeGitHubAPI) {
  try {
    window.forgeGitHubAPI = new GitHubAPI();
    console.log('✅ GitHub API initialized');

    // Auto-refresh data every 15 minutes (increased to reduce rate limiting)
    const refreshInterval = setInterval(() => {
      if (window.forgeGitHubAPI && window.forgeGitHubAPI.rateLimitRemaining > 10) {
        console.log('🔄 Auto-refreshing GitHub data...');
        window.forgeGitHubAPI.refreshData().catch(error => {
          console.warn('Auto-refresh failed:', error.message);
        });
      } else {
        console.log('⏸️ Skipping auto-refresh due to rate limiting');
      }
    }, 15 * 60 * 1000);

    // Also refresh when the page becomes visible again (user returns to tab)
    // But only if enough time has passed and rate limit allows
    let lastVisibilityRefresh = 0;
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden &&
          Date.now() - lastVisibilityRefresh > 5 * 60 * 1000 && // 5 minutes minimum
          window.forgeGitHubAPI.rateLimitRemaining > 5) {
        console.log('👁️ Page visible again, refreshing GitHub data...');
        lastVisibilityRefresh = Date.now();
        window.forgeGitHubAPI.refreshData().catch(error => {
          console.warn('Visibility refresh failed:', error.message);
        });
      }
    });

    // Clean up interval on page unload
    window.addEventListener('beforeunload', () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    });

  } catch (error) {
    console.error('❌ Failed to initialize GitHub API:', error);
    window.forgeGitHubAPI = null;
  }
} else {
  console.log('🔄 GitHub API already initialized, skipping...');
}

// Export class for potential external use (prevent duplicate declaration)
if (!window.GitHubAPI) {
    window.GitHubAPI = GitHubAPI;
    console.log('✅ GitHubAPI class exported to window');
} else {
    console.log('🔄 GitHubAPI class already exists on window, skipping export');
}
