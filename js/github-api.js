// ===== GITHUB API INTEGRATION =====

class GitHubAPI {
  constructor() {
    this.baseURL = 'https://api.github.com';
    this.owner = 'tanm-sys';
    this.repo = 'forge-ec';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  async fetchWithCache(url, options = {}) {
    const cacheKey = url;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          ...options.headers
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Cache the response
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      console.warn('GitHub API request failed:', error);
      
      // Return cached data if available, even if expired
      if (cached) {
        return cached.data;
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

  async getCommits(page = 1, perPage = 10) {
    const url = `${this.baseURL}/repos/${this.owner}/${this.repo}/commits?page=${page}&per_page=${perPage}`;
    return await this.fetchWithCache(url);
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
      // Load basic repository information
      const repoInfo = await this.getRepositoryInfo();
      this.updateRepositoryStats(repoInfo);

      // Load additional data in parallel
      const [contributors, commits] = await Promise.all([
        this.getContributors().catch(() => []),
        this.getCommits(1, 100).catch(() => [])
      ]);

      this.updateContributorStats(contributors);
      this.updateCommitStats(commits);
      this.updateGitHubBadges(repoInfo);

      console.log('✅ GitHub data loaded successfully');
    } catch (error) {
      console.warn('Failed to load GitHub data:', error);
      this.showFallbackData();
    }
  }

  updateRepositoryStats(repoInfo) {
    // Update stars count
    const starsElements = document.querySelectorAll('#repo-stars, #stars-count, .stars-count');
    starsElements.forEach(element => {
      this.animateNumber(element, repoInfo.stargazers_count || 0, '⭐ ');
    });

    // Update forks count
    const forksElements = document.querySelectorAll('#repo-forks, #forks-count, .forks-count');
    forksElements.forEach(element => {
      this.animateNumber(element, repoInfo.forks_count || 0, '🍴 ');
    });

    // Update watchers count
    const watchersElements = document.querySelectorAll('#repo-watchers');
    watchersElements.forEach(element => {
      this.animateNumber(element, repoInfo.subscribers_count || 0);
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
    const contributorsElements = document.querySelectorAll('#repo-contributors');
    contributorsElements.forEach(element => {
      this.animateNumber(element, contributors.length || 1);
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
  }

  updateCommitStats(commits) {
    const commitsElements = document.querySelectorAll('#repo-commits');
    commitsElements.forEach(element => {
      this.animateNumber(element, commits.length || 0);
    });

    // Update recent commits if element exists
    const recentCommits = document.querySelector('.recent-commits');
    if (recentCommits && commits.length > 0) {
      recentCommits.innerHTML = commits.slice(0, 5).map(commit => `
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
    // Update GitHub stats in navigation
    const githubStats = document.getElementById('github-stats');
    if (githubStats) {
      githubStats.innerHTML = `
        <span class="stars-count">⭐ ${this.formatNumber(repoInfo.stargazers_count || 0)}</span>
        <span class="forks-count">🍴 ${this.formatNumber(repoInfo.forks_count || 0)}</span>
      `;
    }
  }

  animateNumber(element, targetNumber, prefix = '') {
    if (!element) return;

    const startNumber = 0;
    const duration = 2000; // 2 seconds
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
    const fallbackData = {
      stars: 42,
      forks: 8,
      contributors: 3,
      commits: 156
    };

    // Update with fallback data
    const starsElements = document.querySelectorAll('#repo-stars, #stars-count, .stars-count');
    starsElements.forEach(element => {
      this.animateNumber(element, fallbackData.stars, '⭐ ');
    });

    const forksElements = document.querySelectorAll('#repo-forks, #forks-count, .forks-count');
    forksElements.forEach(element => {
      this.animateNumber(element, fallbackData.forks, '🍴 ');
    });

    const contributorsElements = document.querySelectorAll('#repo-contributors');
    contributorsElements.forEach(element => {
      this.animateNumber(element, fallbackData.contributors);
    });

    const commitsElements = document.querySelectorAll('#repo-commits');
    commitsElements.forEach(element => {
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

// Initialize GitHub API
window.GitHubAPI = new GitHubAPI();

// Auto-refresh data every 10 minutes
setInterval(() => {
  window.GitHubAPI.refreshData();
}, 10 * 60 * 1000);
