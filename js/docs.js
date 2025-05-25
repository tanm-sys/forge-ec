// Documentation-specific JavaScript

document.addEventListener('DOMContentLoaded', function() {
    initDocsNavigation();
    initSearch();
    initSidebarToggle();
    initScrollSpy();
    initCodeBlocks();
    initTabSwitching();
    initAnimations();
    initSyntaxHighlighting();
});

// Documentation Navigation
function initDocsNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.docs-section');

    // Handle navigation clicks
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href && href.startsWith('#')) {
                e.preventDefault();
                const targetSection = document.querySelector(href);
                if (targetSection) {
                    scrollToSection(targetSection);
                    updateActiveNavItem(this);
                }
            }
        });
    });

    // Update active navigation item
    function updateActiveNavItem(activeItem) {
        navItems.forEach(item => item.classList.remove('active'));
        activeItem.classList.add('active');
    }

    // Smooth scroll to section
    function scrollToSection(section) {
        const navbarHeight = document.getElementById('navbar').offsetHeight;
        const targetPosition = section.offsetTop - navbarHeight - 20;

        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
    }
}

// Search Functionality
function initSearch() {
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');

    if (!searchInput || !searchResults) return;

    let searchIndex = [];
    let searchTimeout;

    // Build search index
    buildSearchIndex();

    // Handle search input
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const query = this.value.trim().toLowerCase();
            if (query.length >= 2) {
                performSearch(query);
            } else {
                hideSearchResults();
            }
        }, 300);
    });

    // Hide search results when clicking outside
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            hideSearchResults();
        }
    });

    function buildSearchIndex() {
        const sections = document.querySelectorAll('.docs-section');

        sections.forEach(section => {
            const id = section.id;
            const title = section.querySelector('h1, h2, h3')?.textContent || '';
            const content = section.textContent || '';

            // Extract headings
            const headings = section.querySelectorAll('h1, h2, h3, h4, h5, h6');
            headings.forEach(heading => {
                searchIndex.push({
                    id: id,
                    title: heading.textContent,
                    content: heading.nextElementSibling?.textContent || '',
                    type: 'heading',
                    element: heading
                });
            });

            // Extract code blocks
            const codeBlocks = section.querySelectorAll('code, pre');
            codeBlocks.forEach(code => {
                searchIndex.push({
                    id: id,
                    title: title,
                    content: code.textContent,
                    type: 'code',
                    element: code
                });
            });

            // Extract paragraphs
            const paragraphs = section.querySelectorAll('p');
            paragraphs.forEach(p => {
                searchIndex.push({
                    id: id,
                    title: title,
                    content: p.textContent,
                    type: 'text',
                    element: p
                });
            });
        });
    }

    function performSearch(query) {
        const results = searchIndex.filter(item => {
            return item.title.toLowerCase().includes(query) ||
                   item.content.toLowerCase().includes(query);
        }).slice(0, 10); // Limit to 10 results

        displaySearchResults(results, query);
    }

    function displaySearchResults(results, query) {
        if (results.length === 0) {
            searchResults.innerHTML = '<div class="search-result">No results found</div>';
        } else {
            searchResults.innerHTML = results.map(result => {
                const excerpt = highlightSearchTerm(
                    truncateText(result.content, 100),
                    query
                );

                return `
                    <div class="search-result" data-target="#${result.id}">
                        <div class="search-result-title">${highlightSearchTerm(result.title, query)}</div>
                        <div class="search-result-excerpt">${excerpt}</div>
                    </div>
                `;
            }).join('');

            // Add click handlers to search results
            searchResults.querySelectorAll('.search-result').forEach(result => {
                result.addEventListener('click', function() {
                    const target = this.getAttribute('data-target');
                    const section = document.querySelector(target);
                    if (section) {
                        scrollToSection(section);
                        hideSearchResults();
                        searchInput.value = '';
                    }
                });
            });
        }

        searchResults.style.display = 'block';
    }

    function hideSearchResults() {
        searchResults.style.display = 'none';
    }

    function highlightSearchTerm(text, term) {
        const regex = new RegExp(`(${escapeRegex(term)})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    function truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength) + '...';
    }

    function escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function scrollToSection(section) {
        const navbarHeight = document.getElementById('navbar').offsetHeight;
        const targetPosition = section.offsetTop - navbarHeight - 20;

        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
    }
}

// Sidebar Toggle for Mobile
function initSidebarToggle() {
    // Create sidebar toggle button
    const toggleButton = document.createElement('button');
    toggleButton.className = 'sidebar-toggle';
    toggleButton.innerHTML = '☰';
    toggleButton.setAttribute('aria-label', 'Toggle sidebar');
    document.body.appendChild(toggleButton);

    const sidebar = document.getElementById('docs-sidebar');

    toggleButton.addEventListener('click', function() {
        sidebar.classList.toggle('open');
        this.innerHTML = sidebar.classList.contains('open') ? '✕' : '☰';
    });

    // Close sidebar when clicking on main content
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 1024 &&
            !sidebar.contains(e.target) &&
            !toggleButton.contains(e.target)) {
            sidebar.classList.remove('open');
            toggleButton.innerHTML = '☰';
        }
    });
}

// Scroll Spy for Navigation
function initScrollSpy() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.docs-section');

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                const correspondingNavItem = document.querySelector(`.nav-item[href="#${id}"]`);

                if (correspondingNavItem) {
                    navItems.forEach(item => item.classList.remove('active'));
                    correspondingNavItem.classList.add('active');
                }
            }
        });
    }, {
        rootMargin: '-100px 0px -50% 0px',
        threshold: 0.1
    });

    sections.forEach(section => {
        observer.observe(section);
    });
}

// Enhanced Code Blocks
function initCodeBlocks() {
    const codeBlocks = document.querySelectorAll('.code-block');

    codeBlocks.forEach(block => {
        const copyBtn = block.querySelector('.copy-btn');
        const codeElement = block.querySelector('code');

        if (copyBtn && codeElement) {
            // Set copy data if not already set
            if (!copyBtn.getAttribute('data-copy')) {
                copyBtn.setAttribute('data-copy', codeElement.textContent);
            }

            // Add line numbers if code block is long enough
            if (codeElement.textContent.split('\n').length > 5) {
                addLineNumbers(codeElement);
            }
        }
    });
}

function addLineNumbers(codeElement) {
    const lines = codeElement.textContent.split('\n');
    const lineNumbersWrapper = document.createElement('span');
    lineNumbersWrapper.className = 'line-numbers-rows';

    lines.forEach(() => {
        const lineNumber = document.createElement('span');
        lineNumbersWrapper.appendChild(lineNumber);
    });

    const pre = codeElement.parentElement;
    pre.classList.add('line-numbers');
    pre.appendChild(lineNumbersWrapper);
}

// Table of Contents Generator
function generateTableOfContents() {
    const headings = document.querySelectorAll('.docs-content h2, .docs-content h3, .docs-content h4');
    if (headings.length === 0) return;

    const toc = document.createElement('div');
    toc.className = 'toc';
    toc.innerHTML = '<h4>Table of Contents</h4>';

    const tocList = document.createElement('ul');

    headings.forEach((heading, index) => {
        // Generate ID if not present
        if (!heading.id) {
            heading.id = `heading-${index}`;
        }

        const listItem = document.createElement('li');
        const link = document.createElement('a');
        link.href = `#${heading.id}`;
        link.textContent = heading.textContent;
        link.className = `toc-${heading.tagName.toLowerCase()}`;

        listItem.appendChild(link);
        tocList.appendChild(listItem);
    });

    toc.appendChild(tocList);

    // Insert TOC after the first section
    const firstSection = document.querySelector('.docs-section');
    if (firstSection && firstSection.nextElementSibling) {
        firstSection.parentNode.insertBefore(toc, firstSection.nextElementSibling);
    }
}

// Keyboard Navigation
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + K to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.focus();
        }
    }

    // Escape to close search results
    if (e.key === 'Escape') {
        const searchResults = document.getElementById('search-results');
        if (searchResults) {
            searchResults.style.display = 'none';
        }
    }
});

// Copy to Clipboard Enhancement
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('copy-btn')) {
        // Add visual feedback
        const button = e.target;
        const originalText = button.textContent;

        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
            button.style.transform = 'scale(1)';
        }, 150);
    }
});

// Auto-generate anchors for headings
function addHeadingAnchors() {
    const headings = document.querySelectorAll('.docs-content h2, .docs-content h3, .docs-content h4');

    headings.forEach(heading => {
        if (!heading.id) {
            heading.id = heading.textContent
                .toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .replace(/\s+/g, '-');
        }

        const anchor = document.createElement('a');
        anchor.href = `#${heading.id}`;
        anchor.className = 'heading-anchor';
        anchor.innerHTML = '#';
        anchor.setAttribute('aria-label', 'Link to this heading');

        heading.appendChild(anchor);
    });
}

// Initialize heading anchors when DOM is ready
document.addEventListener('DOMContentLoaded', addHeadingAnchors);

// Tab Switching Functionality
function initTabSwitching() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');

            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked button and corresponding content
            this.classList.add('active');
            const targetContent = document.getElementById(`${targetTab}-tab`);
            if (targetContent) {
                targetContent.classList.add('active');

                // Re-highlight syntax in the new tab
                if (typeof Prism !== 'undefined') {
                    Prism.highlightAllUnder(targetContent);
                }
            }
        });
    });
}

// Enhanced Syntax Highlighting
function initSyntaxHighlighting() {
    if (typeof Prism !== 'undefined') {
        // Initial highlighting
        Prism.highlightAll();

        // Add copy functionality to code blocks
        enhanceCodeBlocks();

        // Add line numbers to longer code blocks
        addLineNumbersToCodeBlocks();
    } else {
        // Retry after a short delay if Prism isn't loaded yet
        setTimeout(initSyntaxHighlighting, 100);
    }
}

function enhanceCodeBlocks() {
    const codeBlocks = document.querySelectorAll('.docs-section .code-block');

    codeBlocks.forEach(block => {
        const copyBtn = block.querySelector('.copy-btn');
        const codeElement = block.querySelector('code');

        if (copyBtn && codeElement) {
            copyBtn.addEventListener('click', function() {
                const text = codeElement.textContent;

                navigator.clipboard.writeText(text).then(() => {
                    showCopySuccess(this);
                }).catch(err => {
                    console.error('Failed to copy text: ', err);
                    fallbackCopyTextToClipboard(text, this);
                });
            });
        }
    });
}

function showCopySuccess(button) {
    const originalText = button.textContent;
    button.textContent = 'Copied!';
    button.classList.add('success');

    setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove('success');
    }, 2000);
}

function fallbackCopyTextToClipboard(text, button) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showCopySuccess(button);
        }
    } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
    }

    document.body.removeChild(textArea);
}

function addLineNumbersToCodeBlocks() {
    const codeBlocks = document.querySelectorAll('.docs-section pre[class*="language-"]');

    codeBlocks.forEach(block => {
        if (!block.classList.contains('line-numbers')) {
            const lines = block.textContent.split('\n').length - 1;
            if (lines > 5) { // Only add line numbers for longer code blocks
                block.classList.add('line-numbers');

                // Create line numbers container
                const lineNumbers = document.createElement('span');
                lineNumbers.className = 'line-numbers-rows';

                for (let i = 0; i < lines; i++) {
                    lineNumbers.appendChild(document.createElement('span'));
                }

                block.appendChild(lineNumbers);
            }
        }
    });
}

// Modern Animations
function initAnimations() {
    // Animate elements on scroll
    const animatedElements = document.querySelectorAll('.animate-on-scroll');

    const animationObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                entry.target.classList.add('animated');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    animatedElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        element.style.transition = 'opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1), transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
        animationObserver.observe(element);
    });

    // Staggered animations
    const staggeredElements = document.querySelectorAll('[class*="stagger-"]');
    staggeredElements.forEach((element, index) => {
        const staggerClass = Array.from(element.classList).find(cls => cls.startsWith('stagger-'));
        const staggerIndex = staggerClass ? parseInt(staggerClass.split('-')[1]) : 0;
        element.style.animationDelay = `${staggerIndex * 0.15}s`;
        element.style.transitionDelay = `${staggerIndex * 0.15}s`;
    });

    // Floating animation for icons
    const floatingElements = document.querySelectorAll('.animate-float');
    floatingElements.forEach((element, index) => {
        element.style.animationDelay = `${index * 0.5}s`;
    });
}

// Enhanced responsive behavior
function handleResponsiveChanges() {
    const sidebar = document.getElementById('docs-sidebar');
    const toggleButton = document.querySelector('.sidebar-toggle');

    if (window.innerWidth > 1024) {
        sidebar.classList.remove('open');
        if (toggleButton) {
            toggleButton.innerHTML = '☰';
        }
    }
}

window.addEventListener('resize', handleResponsiveChanges);

// Performance optimization: Debounce scroll events
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Smooth scroll enhancement
function smoothScrollTo(target, duration = 800) {
    const targetPosition = target.offsetTop - 100;
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    let startTime = null;

    function animation(currentTime) {
        if (startTime === null) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const run = ease(timeElapsed, startPosition, distance, duration);
        window.scrollTo(0, run);
        if (timeElapsed < duration) requestAnimationFrame(animation);
    }

    function ease(t, b, c, d) {
        t /= d / 2;
        if (t < 1) return c / 2 * t * t + b;
        t--;
        return -c / 2 * (t * (t - 2) - 1) + b;
    }

    requestAnimationFrame(animation);
}
