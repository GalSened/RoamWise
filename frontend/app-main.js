// Traveling iOS-style App - Full implementation with bug fixes
console.log('Traveling iOS App starting...');

// API Configuration - use environment variable or fallback to Cloud Run proxy
const API_BASE_URL = 'https://roamwise-proxy-971999716773.us-central1.run.app';

// Traveler Level System - Gamification
const TRAVELER_LEVELS = [
  { name: 'Newbie', nameHe: 'מתחיל', minScore: 0, icon: '🌱' },
  { name: 'Wanderer', nameHe: 'נודד', minScore: 50, icon: '🚶' },
  { name: 'Explorer', nameHe: 'מגלה', minScore: 150, icon: '🧭' },
  { name: 'Pioneer', nameHe: 'חלוץ', minScore: 300, icon: '🏔️' },
  { name: 'Legend', nameHe: 'אגדה', minScore: 500, icon: '⭐' }
];

// Achievements System
const ACHIEVEMENTS = [
  { id: 'first_steps', name: 'First Steps', nameHe: 'צעדים ראשונים', icon: '👶',
    desc: 'Save your first trip', descHe: 'שמור את הטיול הראשון שלך', condition: { type: 'trips', threshold: 1 } },
  { id: 'wanderer', name: 'Wanderer', nameHe: 'נודד', icon: '🚶',
    desc: 'Save 5 trips', descHe: 'שמור 5 טיולים', condition: { type: 'trips', threshold: 5 } },
  { id: 'explorer', name: 'Explorer', nameHe: 'מגלה', icon: '🧭',
    desc: 'Save 10 places', descHe: 'שמור 10 מקומות', condition: { type: 'places', threshold: 10 } },
  { id: 'planner', name: 'AI Planner', nameHe: 'מתכנן AI', icon: '🤖',
    desc: 'Generate 3 AI trips', descHe: 'צור 3 טיולים עם AI', condition: { type: 'ai_trips', threshold: 3 } },
  { id: 'collector', name: 'Collector', nameHe: 'אספן', icon: '📍',
    desc: 'Save 25 places', descHe: 'שמור 25 מקומות', condition: { type: 'places', threshold: 25 } }
];

// Helper: Convert PRICE_LEVEL API values to $ symbols
function formatPriceLevel(priceLevel) {
  if (priceLevel === undefined || priceLevel === null) return null;

  // Handle string formats from Google Places API
  const priceLevelMap = {
    'PRICE_LEVEL_FREE': 'Free',
    'PRICE_LEVEL_INEXPENSIVE': '$',
    'PRICE_LEVEL_MODERATE': '$$',
    'PRICE_LEVEL_EXPENSIVE': '$$$',
    'PRICE_LEVEL_VERY_EXPENSIVE': '$$$$',
    // Numeric formats
    0: 'Free',
    1: '$',
    2: '$$',
    3: '$$$',
    4: '$$$$'
  };

  return priceLevelMap[priceLevel] || null;
}

// Helper: Truncate long text for display
function truncateText(text, maxLength = 50) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// ============================================================================
// TOAST NOTIFICATION SYSTEM
// ============================================================================
const ToastSystem = {
  container: null,
  queue: [],
  maxVisible: 3,

  init() {
    this.container = document.getElementById('toastContainer');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toastContainer';
      this.container.className = 'toast-container';
      document.body.prepend(this.container);
    }
  },

  /**
   * Show a toast notification
   * @param {string} message - The message to display
   * @param {string} type - 'success' | 'error' | 'warning' | 'info'
   * @param {number} duration - Duration in ms (default 3000)
   * @returns {HTMLElement} The toast element
   */
  show(message, type = 'info', duration = 3000) {
    if (!this.container) this.init();

    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <div class="toast-content">
        <span class="toast-message">${message}</span>
      </div>
      <button class="toast-close" aria-label="Close">×</button>
      <div class="toast-progress" style="animation-duration: ${duration}ms"></div>
    `;

    // Close button handler
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => this.dismiss(toast));

    // Add to container
    this.container.appendChild(toast);
    this.queue.push(toast);

    // Manage max visible toasts
    while (this.queue.length > this.maxVisible) {
      const oldest = this.queue.shift();
      if (oldest && oldest.parentNode) {
        this.dismiss(oldest, true);
      }
    }

    // Auto-dismiss
    if (duration > 0) {
      setTimeout(() => this.dismiss(toast), duration);
    }

    return toast;
  },

  dismiss(toast, immediate = false) {
    if (!toast || !toast.parentNode) return;

    if (immediate) {
      toast.remove();
    } else {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 200);
    }

    // Remove from queue
    const index = this.queue.indexOf(toast);
    if (index > -1) this.queue.splice(index, 1);
  },

  // Convenience methods
  success(message, duration) { return this.show(message, 'success', duration); },
  error(message, duration) { return this.show(message, 'error', duration || 5000); },
  warning(message, duration) { return this.show(message, 'warning', duration || 4000); },
  info(message, duration) { return this.show(message, 'info', duration); }
};

// Global function for easy access
function showToast(message, type = 'info', duration = 3000) {
  return ToastSystem.show(message, type, duration);
}

// ============================================================================
// CONFIRMATION DIALOG SYSTEM
// ============================================================================
const ConfirmDialog = {
  /**
   * Show a confirmation dialog
   * @param {Object} options - Dialog options
   * @param {string} options.title - Dialog title
   * @param {string} options.message - Dialog message
   * @param {string} options.icon - Emoji icon (optional)
   * @param {string} options.confirmText - Confirm button text
   * @param {string} options.cancelText - Cancel button text
   * @param {string} options.confirmType - 'primary' | 'danger'
   * @returns {Promise<boolean>} Resolves true if confirmed, false if cancelled
   */
  show(options) {
    return new Promise((resolve) => {
      const {
        title = 'Confirm',
        message = 'Are you sure?',
        icon = '❓',
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        confirmType = 'primary'
      } = options;

      const overlay = document.createElement('div');
      overlay.className = 'confirm-overlay';
      overlay.innerHTML = `
        <div class="confirm-dialog">
          <div class="confirm-header">
            <div class="confirm-icon">${icon}</div>
            <h3 class="confirm-title">${title}</h3>
            <p class="confirm-message">${message}</p>
          </div>
          <div class="confirm-actions">
            <button class="confirm-btn confirm-btn-${confirmType}" data-action="confirm">${confirmText}</button>
            <button class="confirm-btn confirm-btn-secondary" data-action="cancel">${cancelText}</button>
          </div>
        </div>
      `;

      const close = (result) => {
        overlay.classList.add('confirm-exit');
        setTimeout(() => {
          overlay.remove();
          resolve(result);
        }, 150);
      };

      // Button handlers
      overlay.querySelector('[data-action="confirm"]').addEventListener('click', () => close(true));
      overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => close(false));

      // Click outside to cancel
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close(false);
      });

      // Escape key to cancel
      const escHandler = (e) => {
        if (e.key === 'Escape') {
          document.removeEventListener('keydown', escHandler);
          close(false);
        }
      };
      document.addEventListener('keydown', escHandler);

      document.body.appendChild(overlay);
    });
  },

  // Convenience method for destructive actions
  async confirmDelete(itemName) {
    return this.show({
      title: 'Delete?',
      message: `Are you sure you want to delete "${itemName}"? This cannot be undone.`,
      icon: '🗑️',
      confirmText: 'Delete',
      cancelText: 'Keep',
      confirmType: 'danger'
    });
  },

  // Convenience method for ending trip
  async confirmEndTrip(progress) {
    return this.show({
      title: 'End trip early?',
      message: progress ? `You've completed ${progress}. Your progress will be saved.` : 'Your progress will be saved.',
      icon: '🏁',
      confirmText: 'End Trip',
      cancelText: 'Keep Going',
      confirmType: 'danger'
    });
  }
};


// ============================================
// FEATURE HINTS SYSTEM - First-time user guidance
// ============================================
const FeatureHints = {
  _shownHints: null,
  
  _loadShownHints() {
    if (this._shownHints === null) {
      try {
        this._shownHints = JSON.parse(TenantStorage.get('feature-hints-shown', '[]'));
      } catch {
        this._shownHints = [];
      }
    }
    return this._shownHints;
  },
  
  _saveHint(featureId) {
    const shown = this._loadShownHints();
    if (!shown.includes(featureId)) {
      shown.push(featureId);
      TenantStorage.set('feature-hints-shown', JSON.stringify(shown));
    }
  },
  
  wasShown(featureId) {
    return this._loadShownHints().includes(featureId);
  },
  
  reset() {
    this._shownHints = [];
    TenantStorage.remove('feature-hints-shown');
  },
  
  /**
   * Show a feature hint if not already shown
   * @param {string} featureId - Unique feature identifier
   * @param {Object} options - Hint options
   * @param {string} options.title - Hint title
   * @param {string} options.body - Hint description
   * @param {string} options.targetSelector - CSS selector for target element
   * @param {string} options.position - 'top' | 'bottom' | 'left' | 'right'
   * @param {string} options.icon - Emoji icon (optional)
   * @returns {boolean} True if hint was shown, false if already seen
   */
  show(featureId, options) {
    if (this.wasShown(featureId)) return false;
    
    const {
      title,
      body,
      targetSelector,
      position = 'bottom',
      icon = '💡'
    } = options;
    
    // Find target element
    const target = targetSelector ? document.querySelector(targetSelector) : null;
    
    // Create hint overlay
    const overlay = document.createElement('div');
    overlay.className = 'feature-hint-overlay';
    overlay.setAttribute('data-feature', featureId);
    
    const hint = document.createElement('div');
    hint.className = `feature-hint feature-hint-${position}`;
    hint.innerHTML = `
      <div class="feature-hint-arrow"></div>
      <div class="feature-hint-content">
        <div class="feature-hint-header">
          <span class="feature-hint-icon">${icon}</span>
          <span class="feature-hint-title">${title}</span>
        </div>
        <p class="feature-hint-body">${body}</p>
        <button class="feature-hint-dismiss">Got it!</button>
      </div>
    `;
    
    overlay.appendChild(hint);
    
    // Position hint near target
    if (target) {
      const rect = target.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      
      switch (position) {
        case 'top':
          hint.style.left = `${rect.left + scrollLeft + rect.width / 2}px`;
          hint.style.top = `${rect.top + scrollTop - 10}px`;
          hint.style.transform = 'translateX(-50%) translateY(-100%)';
          break;
        case 'bottom':
          hint.style.left = `${rect.left + scrollLeft + rect.width / 2}px`;
          hint.style.top = `${rect.bottom + scrollTop + 10}px`;
          hint.style.transform = 'translateX(-50%)';
          break;
        case 'left':
          hint.style.left = `${rect.left + scrollLeft - 10}px`;
          hint.style.top = `${rect.top + scrollTop + rect.height / 2}px`;
          hint.style.transform = 'translateX(-100%) translateY(-50%)';
          break;
        case 'right':
          hint.style.left = `${rect.right + scrollLeft + 10}px`;
          hint.style.top = `${rect.top + scrollTop + rect.height / 2}px`;
          hint.style.transform = 'translateY(-50%)';
          break;
      }
      
      // Highlight target element
      target.classList.add('feature-hint-target');
    } else {
      // Center if no target
      hint.style.position = 'fixed';
      hint.style.left = '50%';
      hint.style.top = '50%';
      hint.style.transform = 'translate(-50%, -50%)';
    }
    
    // Dismiss handler
    const dismiss = () => {
      this._saveHint(featureId);
      overlay.classList.add('feature-hint-exit');
      if (target) target.classList.remove('feature-hint-target');
      setTimeout(() => overlay.remove(), 200);
    };
    
    hint.querySelector('.feature-hint-dismiss').addEventListener('click', dismiss);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) dismiss();
    });
    
    document.body.appendChild(overlay);
    return true;
  },
  
  // Pre-defined hints for key features
  hints: {
    search: {
      title: 'Find Your Next Adventure',
      body: 'Type a destination or tap categories below to explore nearby places.',
      targetSelector: '#freeText, #searchInput',
      position: 'bottom',
      icon: '🔍'
    },
    tripWizard: {
      title: 'Plan in 5 Easy Steps',
      body: 'Answer a few quick questions and AI will create your perfect itinerary.',
      targetSelector: '.nav-btn[data-view="trip"]',
      position: 'top',
      icon: '🗺️'
    },
    chat: {
      title: 'Your AI Travel Assistant',
      body: 'Ask me anything about travel! I can find places, check weather, and more.',
      targetSelector: '#chatInput',
      position: 'top',
      icon: '🤖'
    },
    profile: {
      title: 'Track Your Adventures',
      body: 'View your saved places, trips, achievements, and traveler level here.',
      targetSelector: '.nav-btn[data-view="profile"]',
      position: 'top',
      icon: '👤'
    },
    savedPlaces: {
      title: 'Your Collection',
      body: 'Save places you love and easily add them to future trips.',
      targetSelector: '#savedPlacesList',
      position: 'top',
      icon: '❤️'
    }
  },
  
  // Show a predefined hint
  showHint(hintKey) {
    const hintConfig = this.hints[hintKey];
    if (hintConfig) {
      return this.show(hintKey, hintConfig);
    }
    return false;
  }
};

// Make globally available
window.FeatureHints = FeatureHints;

// Global function for easy access
function showConfirmDialog(options) {
  return ConfirmDialog.show(options);
}

// ============================================================================
// LOADING SKELETON SYSTEM
// ============================================================================
const LoadingSkeleton = {
  /**
   * Show skeleton loading cards in a container
   * @param {HTMLElement|string} container - Container element or selector
   * @param {number} count - Number of skeleton cards to show
   */
  show(container, count = 3) {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;

    const skeletons = Array(count).fill(0).map(() => `
      <div class="skeleton-card">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text-short"></div>
        <div class="skeleton-meta">
          <div class="skeleton skeleton-badge"></div>
          <div class="skeleton skeleton-badge"></div>
        </div>
      </div>
    `).join('');

    el.innerHTML = skeletons;
  },

  /**
   * Hide skeleton loading
   * @param {HTMLElement|string} container - Container element or selector
   */
  hide(container) {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (el) el.innerHTML = '';
  }
};

// Generation progress messages
const GENERATION_STEPS = [
  { key: 'analyzing', message: 'Analyzing your preferences...', icon: '🔍' },
  { key: 'finding', message: 'Finding best destinations...', icon: '📍' },
  { key: 'optimizing', message: 'Optimizing your route...', icon: '🛣️' },
  { key: 'recommendations', message: 'Adding local recommendations...', icon: '⭐' },
  { key: 'finalizing', message: 'Finalizing your itinerary!', icon: '✨' }
];

/**
 * Show generation progress in a container
 * @param {HTMLElement|string} container - Container element or selector
 * @returns {Object} Controller with updateStep(index) and complete() methods
 */
function showGenerationProgress(container) {
  const el = typeof container === 'string' ? document.querySelector(container) : container;
  if (!el) return null;

  el.innerHTML = `
    <div class="generation-progress">
      ${GENERATION_STEPS.map((step, i) => `
        <div class="gen-step ${i === 0 ? 'active' : ''}" data-step="${i}">
          <span class="gen-step-icon">${i === 0 ? '⏳' : '○'}</span>
          <span>${step.message}</span>
        </div>
      `).join('')}
    </div>
  `;

  return {
    updateStep(index) {
      const steps = el.querySelectorAll('.gen-step');
      steps.forEach((step, i) => {
        step.classList.remove('active', 'completed');
        const icon = step.querySelector('.gen-step-icon');
        if (i < index) {
          step.classList.add('completed');
          icon.textContent = '✓';
        } else if (i === index) {
          step.classList.add('active');
          icon.textContent = '⏳';
        } else {
          icon.textContent = '○';
        }
      });
    },
    complete() {
      const steps = el.querySelectorAll('.gen-step');
      steps.forEach(step => {
        step.classList.remove('active');
        step.classList.add('completed');
        step.querySelector('.gen-step-icon').textContent = '✓';
      });
    }
  };
}

// Multi-tenant storage manager - prefixes all keys with tenant ID
const TenantStorage = {
  getTenantId() {
    return localStorage.getItem('roamwise-tenant-id');
  },

  setTenantId(name) {
    const id = name.trim().toLowerCase().replace(/\s+/g, '-');
    localStorage.setItem('roamwise-tenant-id', id);
    localStorage.setItem('roamwise-tenant-name', name.trim());
    return id;
  },

  getTenantName() {
    return localStorage.getItem('roamwise-tenant-name') || '';
  },

  getKey(key) {
    const tenant = this.getTenantId();
    return tenant ? `${tenant}:${key}` : key;
  },

  get(key, defaultValue = null) {
    const stored = localStorage.getItem(this.getKey(key));
    if (stored === null) return defaultValue;
    try { return JSON.parse(stored); } catch { return stored; }
  },

  set(key, value) {
    const data = typeof value === 'object' ? JSON.stringify(value) : value;
    localStorage.setItem(this.getKey(key), data);
  },

  remove(key) {
    localStorage.removeItem(this.getKey(key));
  }
};

class SimpleNavigation {
  constructor() {
    this.currentView = 'search';
    this.selectedInterests = [];
    this.tripsPlanned = 0;
    this.placesVisited = 0;
    this.init();
  }

  loadTenantStats() {
    this.tripsPlanned = TenantStorage.get('stats-trips', 0);
    this.placesVisited = TenantStorage.get('stats-places', 0);
  }

  async init() {
    console.log('Initializing iOS-style navigation...');
    const isFirstTime = this.checkFirstTimeUser();
    this.loadTenantStats();
    this.setupNavigation();
    this.setupThemeToggle();
    // Await translations to be loaded before showing any UI with translated text
    await this.setupLanguageToggle();
    this.setupFormInteractions();
    this.setupHomeBaseSettings();
    this.setupChat();
    this.setupActiveTrip();
    this.updateProfileStats();
    this.showView('search');

    // Initialize user location for distance calculations
    this.initUserLocation();

    // Show greeting on every launch (after welcome modal for new users)
    if (!isFirstTime) {
      this.showTravelGreeting();
    }
  }

  // Get user's location for distance calculations
  initUserLocation() {
    // Try to load cached location first
    const cached = TenantStorage.get('user-location', null);
    if (cached && Date.now() - cached.timestamp < 30 * 60 * 1000) { // 30 min cache
      this.userLocation = { lat: cached.lat, lon: cached.lon };
      return;
    }

    // Request fresh location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.userLocation = {
            lat: position.coords.latitude,
            lon: position.coords.longitude
          };
          // Cache for 30 minutes
          TenantStorage.set('user-location', {
            ...this.userLocation,
            timestamp: Date.now()
          });
          console.log('User location updated:', this.userLocation);
        },
        (error) => {
          console.log('Geolocation not available:', error.message);
          // Use default location (Tel Aviv) if no permission
          this.userLocation = { lat: 32.0853, lon: 34.7818 };
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 }
      );
    }
  }

  checkFirstTimeUser() {
    if (!TenantStorage.getTenantId()) {
      this.showWelcomeModal();
      return true;
    }
    return false;
  }

  showWelcomeModal() {
    const modal = document.getElementById('welcomeModal');
    const input = document.getElementById('tenantNameInput');
    const btn = document.getElementById('welcomeStartBtn');
    const hint = document.getElementById('welcomeHint');
    const skipBtn = document.getElementById('welcomeSkipBtn');
    const skipWarning = document.getElementById('welcomeSkipWarning');

    if (!modal || !input || !btn) return;

    modal.style.display = 'flex';

    // Add entrance animation
    requestAnimationFrame(() => {
      modal.classList.add('welcome-modal-visible');
    });

    // Auto-focus input after animation
    setTimeout(() => input.focus(), 300);

    input.addEventListener('input', () => {
      const valid = input.value.trim().length >= 2;
      btn.disabled = !valid;
      // Show/hide validation hint
      if (hint) {
        hint.style.opacity = input.value.length > 0 && !valid ? '1' : '0';
      }
      // Hide skip warning when typing
      if (skipWarning && input.value.length > 0) {
        skipWarning.style.display = 'none';
      }
    });

    btn.addEventListener('click', () => {
      const name = input.value.trim();
      if (name.length >= 2) {
        TenantStorage.setTenantId(name);
        modal.classList.remove('welcome-modal-visible');
        setTimeout(() => {
          modal.style.display = 'none';
          // Show travel greeting after welcome for new users
          this.showTravelGreeting();
        }, 200);
        // Update profile immediately
        this.updateProfileHeader();
      }
    });

    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !btn.disabled) btn.click();
    });

    // Skip button - first click shows warning, second click confirms
    let skipClicked = false;
    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        if (!skipClicked) {
          // First click - show warning
          skipClicked = true;
          if (skipWarning) {
            skipWarning.style.display = 'block';
          }
          skipBtn.textContent = this.t('welcome.skip_confirm') || 'Yes, skip setup';
          skipBtn.style.color = 'var(--ios-orange)';
        } else {
          // Second click - confirm skip
          TenantStorage.setTenantId('Traveler');
          modal.classList.remove('welcome-modal-visible');
          setTimeout(() => {
            modal.style.display = 'none';
            this.showToast(this.t('welcome.skipped') || 'Using default settings. Change in Profile anytime!', 'info');
          }, 200);
          this.updateProfileHeader();
        }
      });
    }
  }

  updateProfileHeader() {
    const name = TenantStorage.getTenantName();
    if (name) {
      const profileName = document.getElementById('profileName');
      const profileAvatar = document.getElementById('profileAvatar');
      if (profileName) profileName.textContent = name;
      if (profileAvatar) profileAvatar.textContent = name.charAt(0).toUpperCase();
    }
  }

  setupNavigation() {
    // Support both old class names (.nav-btn) and new iOS class names (.ios-tab)
    const navButtons = document.querySelectorAll('.nav-btn, .ios-tab');
    const views = document.querySelectorAll('.app-view, .ios-view');

    console.log('Found nav buttons:', navButtons.length);
    console.log('Found views:', views.length);

    navButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetView = button.getAttribute('data-view');
        console.log('Navigation clicked:', targetView);

        // Add iOS spring animation
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
          button.style.transform = '';
        }, 100);

        this.showView(targetView);
      });
    });
  }

  showView(viewName) {
    console.log('Showing view:', viewName);

    // Hide all views (support both class naming conventions)
    const views = document.querySelectorAll('.app-view, .ios-view');
    views.forEach(view => {
      view.classList.remove('active');
    });

    // Show target view
    const targetView = document.querySelector(`[data-view="${viewName}"]`);
    if (targetView) {
      targetView.classList.add('active');
      console.log('View activated:', viewName);
    } else {
      console.error('View not found:', viewName);
    }

    // Update navigation buttons (support both class naming conventions)
    const navButtons = document.querySelectorAll('.nav-btn, .ios-tab');
    navButtons.forEach(button => {
      button.classList.remove('active');
      if (button.getAttribute('data-view') === viewName) {
        button.classList.add('active');
      }
    });

    this.currentView = viewName;

    // View-specific actions
    if (viewName === 'search') {
      // Render recently viewed section
      const recentContainer = document.getElementById('recentlyViewedContainer');
      if (recentContainer) {
        recentContainer.innerHTML = this.renderRecentlyViewed();
      }
      // Render next achievement hint
      this.renderNextAchievementHint();
      // Clear category filters when returning to search
      this.clearCategoryFilters();
    } else if (viewName === 'trip') {
      this.checkAndRenderActiveTrip();
      this.renderQueuedPlaces();
      this.loadPreselectedInterests();
    } else if (viewName === 'profile') {
      this.updateProfileHeader();
      this.renderProfileData();
    } else if (viewName === 'ai') {
      this.renderActiveTrip();
    }
    
    // Show first-time hints after a short delay (allow view to render)
    setTimeout(() => {
      this.showFirstTimeHint(viewName);
    }, 300);
  }


  showFirstTimeHint(viewName) {
    // Map view names to feature hint keys
    const hintMap = {
      'search': 'search',
      'trip': 'tripWizard',
      'ai': 'chat',
      'profile': 'profile'
    };
    
    const hintKey = hintMap[viewName];
    if (hintKey && typeof FeatureHints !== 'undefined') {
      FeatureHints.showHint(hintKey);
    }
  }

  setupThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('app-theme', newTheme);
        console.log('Theme changed to:', newTheme);

        // Update icon if using new iOS toggle
        const icon = themeToggle.querySelector('.ios-icon');
        if (icon) {
          icon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
        }
      });
    }

    // Load saved theme
    const savedTheme = localStorage.getItem('app-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.body.setAttribute('data-theme', savedTheme);
  }

  setupLanguageToggle() {
    // Support both old IDs and new data-testid attributes
    const langHe = document.getElementById('langHe') || document.querySelector('[data-testid="lang-he"]');
    const langEn = document.getElementById('langEn') || document.querySelector('[data-testid="lang-en"]');

    // Translation cache
    this.translations = {};
    this.currentLang = 'en';

    // Load translation file
    const loadTranslations = async (lang) => {
      if (this.translations[lang]) return this.translations[lang];
      try {
        // Derive base path from current URL (handles /roamwise-app/ or /)
        const pathParts = window.location.pathname.split('/').filter(Boolean);
        const basePath = pathParts.length > 0 && pathParts[0] !== 'index.html'
          ? `/${pathParts[0]}/`
          : '/';
        const response = await fetch(`${basePath}i18n/${lang}.json`);
        if (response.ok) {
          this.translations[lang] = await response.json();
        } else {
          console.warn(`Failed to load ${lang} translations`);
          this.translations[lang] = {};
        }
      } catch (error) {
        console.warn(`Error loading ${lang} translations:`, error);
        this.translations[lang] = {};
      }
      return this.translations[lang];
    };

    // Apply translations to DOM
    const applyTranslations = (translations) => {
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[key]) {
          if (el.tagName === 'INPUT' && el.placeholder !== undefined) {
            el.placeholder = translations[key];
          } else {
            el.textContent = translations[key];
          }
        }
      });
      // Handle placeholder translations
      document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[key]) {
          el.placeholder = translations[key];
        }
      });
    };

    const setLanguage = async (lang) => {
      this.currentLang = lang;

      // Update active class (support both button types)
      const allLangBtns = document.querySelectorAll('[data-testid^="lang-"], #langHe, #langEn');
      allLangBtns.forEach(btn => btn.classList.remove('active'));

      if (lang === 'he') {
        if (langHe) langHe.classList.add('active');
        document.body.setAttribute('dir', 'rtl');
        document.documentElement.setAttribute('lang', 'he');
        document.documentElement.setAttribute('dir', 'rtl');
      } else {
        if (langEn) langEn.classList.add('active');
        document.body.setAttribute('dir', 'ltr');
        document.documentElement.setAttribute('lang', 'en');
        document.documentElement.setAttribute('dir', 'ltr');
      }

      // Load and apply translations
      const translations = await loadTranslations(lang);
      applyTranslations(translations);

      // Save to localStorage
      localStorage.setItem('app-language', lang);
      console.log('Language changed to:', lang);
    };

    // Expose translation helper with parameter support
    this.t = (key, params = {}) => {
      let text = this.translations[this.currentLang]?.[key] || key;
      // Replace placeholders like {name}, {city}, {country}
      if (params && typeof params === 'object') {
        Object.entries(params).forEach(([k, v]) => {
          text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
        });
      }
      return text;
    };

    if (langHe) {
      langHe.addEventListener('click', () => setLanguage('he'));
    }

    if (langEn) {
      langEn.addEventListener('click', () => setLanguage('en'));
    }

    // Load saved language (default to 'he' - Hebrew)
    const savedLang = localStorage.getItem('app-language') || 'he';
    // Return the promise so init() can await it
    return setLanguage(savedLang);
  }

  setupFormInteractions() {
    console.log('Setting up form interactions...');

    // Budget slider (support both old and new IDs)
    const budgetSlider = document.getElementById('budgetRange') || document.getElementById('budgetSlider');
    const budgetAmount = document.getElementById('budgetAmount') || document.getElementById('budgetValue');
    if (budgetSlider && budgetAmount) {
      budgetSlider.addEventListener('input', () => {
        budgetAmount.textContent = budgetSlider.value;
      });
    }

    // Duration options (support both old and new class names)
    document.querySelectorAll('.duration-option, .ios-segment').forEach(option => {
      option.addEventListener('click', () => {
        document.querySelectorAll('.duration-option, .ios-segment').forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');
      });
    });

    // Interest options with counter and validation (support both old and new class names)
    this.setupInterestSelection();

    // Mode selection (Smart Route Optimizer)
    this.setupModeSelection();

    this.setupSearch();
    this.setupCategoryButtons();
    this.setupTripGeneration();
    this.setupVoiceButton();
    this.setupPlannerUI();
  }

  setupInterestSelection() {
    const interestOptions = document.querySelectorAll('.interest-option, .ios-interest');
    const interestCount = document.getElementById('interestCount');
    const interestHint = document.getElementById('interestHint');
    const generateBtn = document.getElementById('generateTripBtn');

    const updateInterestUI = () => {
      const selected = document.querySelectorAll('.interest-option.selected, .ios-interest.selected');
      const count = selected.length;

      // Update counter display
      if (interestCount) {
        interestCount.textContent = `${count}/4`;
      }

      // Update hint message
      if (interestHint) {
        if (count === 0) {
          interestHint.textContent = this.t('trip.select_hint') || 'Select at least 1 interest';
          interestHint.style.color = 'var(--ios-red, #FF3B30)';
        } else if (count >= 4) {
          interestHint.textContent = this.t('trip.max_reached') || 'Maximum reached';
          interestHint.style.color = 'var(--ios-orange, #FF9500)';
        } else {
          interestHint.textContent = '';
        }
      }

      // Disable/enable unselected options when max reached
      interestOptions.forEach(opt => {
        if (!opt.classList.contains('selected')) {
          if (count >= 4) {
            opt.classList.add('disabled');
            opt.style.opacity = '0.5';
            opt.style.pointerEvents = 'none';
          } else {
            opt.classList.remove('disabled');
            opt.style.opacity = '';
            opt.style.pointerEvents = '';
          }
        }
      });

      // Require at least 1 interest for trip generation
      if (generateBtn) {
        if (count === 0) {
          generateBtn.disabled = true;
          generateBtn.style.opacity = '0.5';
        } else {
          generateBtn.disabled = false;
          generateBtn.style.opacity = '';
        }
      }
    };

    interestOptions.forEach(option => {
      option.addEventListener('click', () => {
        const selected = document.querySelectorAll('.interest-option.selected, .ios-interest.selected');

        if (option.classList.contains('selected')) {
          option.classList.remove('selected');
        } else if (selected.length < 4) {
          option.classList.add('selected');
        }
        // If at max and trying to add, do nothing (visual feedback via disabled state)

        updateInterestUI();
      });
    });

    // Initialize UI state
    updateInterestUI();
  }

  setupModeSelection() {
    const modeButtons = document.querySelectorAll('.ios-mode-btn');
    const modeDisabledHint = document.getElementById('modeDisabledHint');
    const weatherScoreBadge = document.getElementById('weatherScoreBadge');

    // Track selected mode
    this.selectedMode = 'efficiency';

    modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        // Don't allow selecting disabled modes
        if (btn.classList.contains('disabled')) {
          if (modeDisabledHint) {
            modeDisabledHint.style.display = 'block';
            setTimeout(() => {
              modeDisabledHint.style.display = 'none';
            }, 3000);
          }
          return;
        }

        // Update selection
        modeButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        this.selectedMode = btn.getAttribute('data-mode');
        console.log('Mode selected:', this.selectedMode);

        // iOS spring animation
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => {
          btn.style.transform = '';
        }, 100);
      });
    });

    // Method to update mode availability based on optimization result
    this.updateModeAvailability = (optimizationResult) => {
      if (!optimizationResult) return;

      const { packages, recommended, weatherInsights } = optimizationResult;

      // Update weather score badge
      if (weatherScoreBadge && weatherInsights?.scores?.overall) {
        const score = Math.round(weatherInsights.scores.overall * 100);
        weatherScoreBadge.textContent = `${this.t('trip.weather_score') || 'Weather'}: ${score}%`;
        weatherScoreBadge.style.display = 'inline-flex';

        // Color based on score
        weatherScoreBadge.className = 'ios-badge';
        if (score >= 80) {
          weatherScoreBadge.classList.add('ios-badge-green');
        } else if (score >= 60) {
          weatherScoreBadge.classList.add('ios-badge-blue');
        } else {
          weatherScoreBadge.classList.add('ios-badge-orange');
        }
      }

      // Update each mode button
      modeButtons.forEach(btn => {
        const mode = btn.getAttribute('data-mode');
        const pkg = packages[mode];
        const recommendedBadge = btn.querySelector('.ios-mode-recommended');

        // Reset state
        btn.classList.remove('disabled', 'selected');
        if (recommendedBadge) recommendedBadge.style.display = 'none';

        if (pkg?.disabled) {
          btn.classList.add('disabled');
          btn.setAttribute('title', pkg.reason || 'Not available');
        }

        // Show recommended badge
        if (mode === recommended && recommendedBadge) {
          recommendedBadge.style.display = 'block';
        }

        // Auto-select recommended mode
        if (mode === recommended && !pkg?.disabled) {
          btn.classList.add('selected');
          this.selectedMode = mode;
        }
      });

      // If selected mode is disabled, fall back to efficiency
      const selectedBtn = document.querySelector(`.ios-mode-btn[data-mode="${this.selectedMode}"]`);
      if (selectedBtn?.classList.contains('disabled')) {
        const efficiencyBtn = document.querySelector('.ios-mode-btn[data-mode="efficiency"]');
        if (efficiencyBtn && !efficiencyBtn.classList.contains('disabled')) {
          modeButtons.forEach(b => b.classList.remove('selected'));
          efficiencyBtn.classList.add('selected');
          this.selectedMode = 'efficiency';
        }
      }
    };

    console.log('Mode selection setup complete');
  }

  setupSearch() {
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('freeText') || document.getElementById('searchInput');
    const resultsList = document.getElementById('list') || document.getElementById('searchResults');

    console.log('Setting up search - Button:', !!searchBtn, 'Input:', !!searchInput);

    // Store reference for retry functionality
    this._lastSearchQuery = '';

    if (searchBtn && searchInput) {
      searchBtn.addEventListener('click', async () => {
        const query = searchInput.value.trim();
        await this.performSearch(query);
      });
    } else {
      console.error('Search elements not found - Button:', !!searchBtn, 'Input:', !!searchInput);
    }
  }


  async performSearch(query) {
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('freeText') || document.getElementById('searchInput');
    const resultsList = document.getElementById('list') || document.getElementById('searchResults');

    // FIX: Handle empty search - show ready state, not previous results
    if (!query) {
      if (resultsList) {
        resultsList.innerHTML = `
          <div class="ios-empty-state" style="text-align: center; padding: 3rem 1.5rem; color: var(--label-secondary);">
            <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
            <h3 style="margin: 0 0 0.5rem; color: var(--label-primary);">${this.t('search.ready') || 'Ready to Search'}</h3>
            <p style="margin: 0;">${this.t('search.enter_query') || 'Enter a location or place to find nearby options'}</p>
          </div>
        `;
      }
      return;
    }

    // Store for retry
    this._lastSearchQuery = query;

    console.log('Searching with Personal AI for:', query);
    if (searchBtn) {
      searchBtn.textContent = this.t('search.searching') || 'AI Searching...';
      searchBtn.disabled = true;
    }

    try {
      // Use Google Places API via backend proxy
      const response = await fetch(`${API_BASE_URL}/api/places/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Lang': localStorage.getItem('app-language') || 'en'
        },
        body: JSON.stringify({
          query: query,
          minRating: 3.5
        })
      });

      const data = await response.json();

      if (data.ok && data.items && data.items.length > 0) {
        // Track places visited
        this.placesVisited += data.items.length;
        TenantStorage.set('stats-places', this.placesVisited);
        this.updateProfileStats();

        // Store places data for action handlers
        window._searchResults = data.items;

        resultsList.innerHTML = data.items.map((place, index) => {
          // FIX: Format price level properly
          const priceDisplay = formatPriceLevel(place.priceLevel);
          const isSaved = this.isPlaceSaved(place.placeId);

          // Get category icon based on place type
          const categoryIcon = this.getCategoryIcon(place.types?.[0] || place.primaryType || 'default');

          // Calculate distance if user location available
          const distance = this.calculateDistanceFromUser(place);
          const distanceText = distance ? `${distance < 1 ? (distance * 1000).toFixed(0) + 'm' : distance.toFixed(1) + ' km'}` : null;

          // Determine open status
          const isOpen = place.currentOpeningHours?.openNow ?? place.openingHours?.openNow;
          const openStatusHtml = isOpen !== undefined ? `
            <span class="open-status ${isOpen ? 'open' : 'closed'}">${isOpen ? 'Open' : 'Closed'}</span>
          ` : '';

          // Track as recently viewed
          this.trackRecentlyViewed(place);

          return `
            <div class="search-result-card" data-place-index="${index}">
              <div class="search-result-image">
                <span class="category-icon">${categoryIcon}</span>
                <div class="search-result-badges">
                  ${distanceText ? `<span class="distance-badge">📍 ${distanceText}</span>` : '<span></span>'}
                  ${openStatusHtml}
                </div>
              </div>
              <div class="search-result-content">
                <div class="search-result-header">
                  <h3 class="search-result-title">${place.displayName?.text || place.name || 'Unknown'}</h3>
                  <button class="save-btn-icon save-place-btn" data-index="${index}" aria-label="Save place">
                    ${isSaved ? '❤️' : '🤍'}
                  </button>
                </div>
                <p class="search-result-address">${place.formattedAddress || place.vicinity || ''}</p>
                <div class="search-result-meta">
                  <span class="meta-item rating">⭐ ${place.rating?.toFixed(1) || 'N/A'} (${place.userRatingCount || 0})</span>
                  ${priceDisplay ? `<span class="meta-item price">💰 ${priceDisplay}</span>` : ''}
                </div>
                <div class="search-result-quick-actions">
                  <button class="quick-action-btn primary add-to-trip-btn" data-index="${index}">
                    📍 ${this.t('search.add_to_trip') || 'Add to Trip'}
                  </button>
                  <button class="quick-action-btn secondary open-maps-btn" data-index="${index}">
                    🗺️ ${this.t('search.navigate') || 'Navigate'}
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('');

        // Attach event handlers
        this.attachSearchResultActions();
      } else {
        // FIX: Truncate long query in error message
        const displayQuery = truncateText(query, 40);
        resultsList.innerHTML = `
          <div class="ios-empty-state" style="text-align: center; padding: 2rem 1.5rem;">
            <div style="font-size: 3rem; margin-bottom: 0.75rem;">🔍</div>
            <h3 style="margin: 0 0 0.5rem; font-size: 17px; font-weight: 600;">${this.t('search.no_results') || 'No Results Found'}</h3>
            <p style="margin: 0; color: var(--label-secondary); font-size: 14px;">Nothing matches "<span style="font-weight: 500;">${displayQuery}</span>"</p>
            <p style="margin: 0.75rem 0 1rem; color: var(--label-tertiary); font-size: 13px;">${this.t('search.no_results_hint') || 'Try a different term or explore categories'}</p>
            <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px;">
              <button class="empty-state-category" data-category="restaurants" style="
                background: var(--fill-tertiary);
                border: none;
                padding: 8px 14px;
                border-radius: 16px;
                font-size: 13px;
                cursor: pointer;
              ">🍽️ Restaurants</button>
              <button class="empty-state-category" data-category="attractions" style="
                background: var(--fill-tertiary);
                border: none;
                padding: 8px 14px;
                border-radius: 16px;
                font-size: 13px;
                cursor: pointer;
              ">🎯 Attractions</button>
              <button class="empty-state-category" data-category="parks" style="
                background: var(--fill-tertiary);
                border: none;
                padding: 8px 14px;
                border-radius: 16px;
                font-size: 13px;
                cursor: pointer;
              ">🌿 Parks</button>
            </div>
          </div>
        `;

        // Attach category click handlers
        resultsList.querySelectorAll('.empty-state-category').forEach(btn => {
          btn.addEventListener('click', () => {
            const category = btn.dataset.category;
            const searchInput = document.getElementById('freeText') || document.getElementById('searchInput');
            if (searchInput) {
              searchInput.value = category;
              this.performSearch(category);
            }
          });
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      resultsList.innerHTML = `
        <div class="ios-empty-state error-recovery-state" style="text-align: center; padding: 3rem 1.5rem;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
          <h3 style="margin: 0 0 0.5rem;">${this.t('search.error') || 'Search Error'}</h3>
          <p style="margin: 0 0 1rem; color: var(--label-secondary);">${this.t('search.error_hint') || 'Unable to connect. Please try again.'}</p>
          <div style="display: flex; gap: 8px; justify-content: center;">
            <button class="retry-search-btn" style="padding: 10px 20px; font-size: 15px; border-radius: 10px; background: var(--ios-blue, #007AFF); color: white; border: none; cursor: pointer; font-weight: 500;">
              🔄 ${this.t('common.retry') || 'Retry'}
            </button>
            <button class="skip-search-btn" style="padding: 10px 20px; font-size: 15px; border-radius: 10px; background: var(--fill-tertiary, #E5E5EA); color: var(--label-primary); border: none; cursor: pointer;">
              ${this.t('common.skip') || 'Skip'}
            </button>
          </div>
        </div>
      `;

      // Attach retry handler
      const retryBtn = resultsList.querySelector('.retry-search-btn');
      const skipBtn = resultsList.querySelector('.skip-search-btn');
      
      if (retryBtn) {
        retryBtn.addEventListener('click', () => {
          this.performSearch(this._lastSearchQuery);
        });
      }
      
      if (skipBtn) {
        skipBtn.addEventListener('click', () => {
          resultsList.innerHTML = `
            <div class="ios-empty-state" style="text-align: center; padding: 3rem 1.5rem; color: var(--label-secondary);">
              <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
              <h3 style="margin: 0 0 0.5rem; color: var(--label-primary);">${this.t('search.ready') || 'Ready to Search'}</h3>
              <p style="margin: 0;">${this.t('search.enter_query') || 'Enter a location or place to find nearby options'}</p>
            </div>
          `;
        });
      }
    }

    if (searchBtn) {
      searchBtn.textContent = this.t('search.button') || 'Search';
      searchBtn.disabled = false;
    }
  }

  setupCategoryButtons() {
    // Track selected category filters
    this.selectedCategories = new Set();

    // Category chip buttons - new multi-select filter system
    document.querySelectorAll('.category-chip[data-category]').forEach(btn => {
      btn.addEventListener('click', () => {
        const category = btn.getAttribute('data-category');

        // Toggle selection
        if (btn.classList.contains('selected')) {
          btn.classList.remove('selected');
          this.selectedCategories.delete(category);
        } else {
          // Limit to 3 categories max
          if (this.selectedCategories.size >= 3) {
            this.showToast(this.t('search.max_categories') || 'Max 3 categories at once', 'warning');
            return;
          }
          btn.classList.add('selected');
          this.selectedCategories.add(category);
        }

        // Auto-search when categories selected
        if (this.selectedCategories.size > 0) {
          this.searchByCategories();
        } else {
          // Clear results if no categories selected
          this.showSearchReadyState();
        }
      });
    });

    // Legacy ios-chip support for backward compatibility
    document.querySelectorAll('.ios-chip[data-category]').forEach(btn => {
      btn.addEventListener('click', () => {
        const category = btn.getAttribute('data-category');
        const searchInput = document.getElementById('freeText') || document.getElementById('searchInput');

        // Fill search input with readable name
        const categoryNames = {
          restaurant: 'restaurants near me',
          attraction: 'attractions and sights',
          shopping: 'shopping',
          entertainment: 'entertainment and fun'
        };

        if (searchInput) {
          searchInput.value = categoryNames[category] || category;
          document.getElementById('searchBtn')?.click();
        }

        // Also pre-select matching interest on Trip tab
        this.preselectInterest(category);
      });
    });
    console.log('Category buttons setup complete');
  }

  // Search by selected category filters
  searchByCategories() {
    const categories = Array.from(this.selectedCategories);
    if (categories.length === 0) return;

    // Build search query from selected categories
    const categoryNames = {
      restaurant: 'restaurants',
      cafe: 'cafes coffee',
      tourist_attraction: 'attractions sights',
      museum: 'museums galleries',
      park: 'parks nature',
      shopping_mall: 'shopping malls',
      bar: 'bars nightlife',
      spa: 'spa wellness'
    };

    const query = categories.map(c => categoryNames[c] || c).join(' ');
    this.performSearch(query);
  }

  // Show ready state when no search active
  showSearchReadyState() {
    const resultsList = document.getElementById('list') || document.getElementById('searchResults');
    if (!resultsList) return;

    // Render recently viewed if available
    const recentHtml = this.renderRecentlyViewed();
    const recentContainer = document.getElementById('recentlyViewedContainer');
    if (recentContainer) {
      recentContainer.innerHTML = recentHtml;
    }

    resultsList.innerHTML = `
      <div class="ios-card">
        <div class="ios-card-title">🔍 ${this.t('search.ready') || 'Ready to Search'}</div>
        <p class="ios-card-subtitle">${this.t('search.ready_desc') || 'Enter what you\'re looking for above or select categories to filter'}</p>
        <div class="ios-card-meta">
          <span>🤖 ${this.t('search.powered_by') || 'Powered by AI'}</span>
        </div>
      </div>
    `;
  }

  // Clear category filters
  clearCategoryFilters() {
    this.selectedCategories?.clear();
    document.querySelectorAll('.category-chip.selected').forEach(chip => {
      chip.classList.remove('selected');
    });
  }

  preselectInterest(category) {
    const interestMap = {
      restaurant: 'Food',
      attraction: 'Culture',
      shopping: 'Shopping',
      entertainment: 'Entertainment'
    };

    const interestName = interestMap[category];
    if (interestName) {
      localStorage.setItem('preselected-interest', interestName);
    }
  }

  // ===== SAVED PLACES FUNCTIONALITY =====
  getSavedPlaces() {
    return TenantStorage.get('saved-places', []);
  }

  isPlaceSaved(placeId) {
    return this.getSavedPlaces().some(p => p.placeId === placeId);
  }

  // Get category icon based on place type
  getCategoryIcon(type) {
    const iconMap = {
      // Food & Drink
      'restaurant': '🍽️',
      'cafe': '☕',
      'bar': '🍺',
      'bakery': '🥐',
      'fast_food': '🍔',
      'food': '🍽️',
      // Entertainment
      'tourist_attraction': '🎯',
      'museum': '🏛️',
      'art_gallery': '🎨',
      'amusement_park': '🎢',
      'zoo': '🦁',
      'aquarium': '🐠',
      'movie_theater': '🎬',
      'night_club': '🎉',
      // Nature & Outdoors
      'park': '🌳',
      'beach': '🏖️',
      'natural_feature': '🏞️',
      'hiking': '🥾',
      'garden': '🌷',
      // Shopping
      'shopping_mall': '🛍️',
      'store': '🏪',
      'clothing_store': '👕',
      'jewelry_store': '💎',
      'market': '🛒',
      // Services
      'spa': '💆',
      'gym': '💪',
      'hotel': '🏨',
      'lodging': '🛏️',
      // Transport
      'airport': '✈️',
      'train_station': '🚂',
      'bus_station': '🚌',
      // Religious
      'church': '⛪',
      'mosque': '🕌',
      'synagogue': '🕍',
      // Default
      'default': '📍'
    };
    return iconMap[type] || iconMap['default'];
  }

  // Calculate distance from user location
  calculateDistanceFromUser(place) {
    if (!this.userLocation) return null;

    const lat = place.location?.latitude || place.lat;
    const lon = place.location?.longitude || place.lon;

    if (!lat || !lon) return null;

    // Haversine formula
    const R = 6371; // Earth's radius in km
    const dLat = (lat - this.userLocation.lat) * Math.PI / 180;
    const dLon = (lon - this.userLocation.lon) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.userLocation.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Track recently viewed places
  trackRecentlyViewed(place) {
    const recent = TenantStorage.get('recently-viewed', []);
    const placeId = place.placeId || place.id;

    // Remove if already exists (to move to front)
    const filtered = recent.filter(p => p.placeId !== placeId);

    // Add to front
    filtered.unshift({
      placeId: placeId,
      name: place.displayName?.text || place.name,
      address: place.formattedAddress || place.vicinity,
      rating: place.rating,
      type: place.types?.[0] || place.primaryType || 'default',
      viewedAt: Date.now()
    });

    // Keep only last 10
    TenantStorage.set('recently-viewed', filtered.slice(0, 10));
  }

  // Get recently viewed places
  getRecentlyViewed() {
    return TenantStorage.get('recently-viewed', []);
  }

  // Render recently viewed section
  renderRecentlyViewed() {
    const recent = this.getRecentlyViewed();
    if (recent.length === 0) return '';

    return `
      <div class="recently-viewed-section">
        <div class="section-header">
          <span class="section-title">${this.t('search.recently_viewed') || 'Recently Viewed'}</span>
          <button class="section-action" onclick="app.clearRecentlyViewed()">
            ${this.t('common.clear') || 'Clear'}
          </button>
        </div>
        <div class="recently-viewed-scroll">
          ${recent.map((place, index) => `
            <div class="recent-place-card" data-recent-index="${index}" onclick="app.searchRecentPlace(${index})">
              <div class="recent-place-image">
                <span class="place-icon">${this.getCategoryIcon(place.type)}</span>
              </div>
              <div class="recent-place-info">
                <p class="recent-place-name">${place.name}</p>
                <span class="recent-place-meta">
                  ${place.rating ? `⭐ ${place.rating.toFixed(1)}` : ''}
                </span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Clear recently viewed
  clearRecentlyViewed() {
    this.showConfirmDialog({
      title: this.t('confirm.clear_recent_title') || 'Clear History?',
      message: this.t('confirm.clear_recent_message') || 'This will remove all recently viewed places.',
      confirmText: this.t('common.clear') || 'Clear',
      cancelText: this.t('common.cancel') || 'Cancel',
      onConfirm: () => {
        TenantStorage.remove('recently-viewed');
        this.showToast(this.t('toast.history_cleared') || 'History cleared', 'info');
        // Re-render search view if on search
        if (this.currentNav === 'search') {
          this.showView('search');
        }
      }
    });
  }

  // Search for a recent place
  searchRecentPlace(index) {
    const recent = this.getRecentlyViewed();
    const place = recent[index];
    if (place) {
      const searchInput = document.getElementById('freeText') || document.getElementById('searchInput');
      if (searchInput) {
        searchInput.value = place.name;
        this.performSearch(place.name);
      }
    }
  }

  toggleSavePlace(placeData) {
    const saved = this.getSavedPlaces();
    const index = saved.findIndex(p => p.placeId === placeData.placeId);

    if (index > -1) {
      saved.splice(index, 1);
      this.showToast(this.t('toast.place_removed') || 'Removed from saved places', 'info');
    } else {
      saved.push({
        placeId: placeData.placeId,
        name: placeData.displayName?.text || placeData.name,
        address: placeData.formattedAddress || placeData.vicinity,
        rating: placeData.rating,
        lat: placeData.location?.latitude,
        lon: placeData.location?.longitude,
        savedAt: new Date().toISOString()
      });
      this.showToast(this.t('toast.place_added') || '❤️ Saved to My Places!', 'success');
      // Award XP for saving a place
      this.addTravelerXP(5);
    }

    TenantStorage.set('saved-places', saved);
    this.updateProfileStats();
    return !saved.some(p => p.placeId === placeData.placeId); // returns true if removed
  }

  // ===== TRIP QUEUE FUNCTIONALITY =====
  getTripQueue() {
    return TenantStorage.get('trip-queue', []);
  }

  addToTripQueue(place) {
    const queue = this.getTripQueue();
    if (!queue.some(p => p.placeId === place.placeId)) {
      queue.push({
        placeId: place.placeId,
        name: place.displayName?.text || place.name,
        address: place.formattedAddress || place.vicinity,
        lat: place.location?.latitude || place.lat,
        lon: place.location?.longitude || place.lon,
        rating: place.rating
      });
      TenantStorage.set('trip-queue', queue);
      this.showToast(this.t('toast.added_to_trip') || `➕ ${place.displayName?.text || place.name} added to trip!`, 'success');
      return true;
    }
    return false;
  }

  clearTripQueue() {
    TenantStorage.remove('trip-queue');
  }

  // ===== TOAST NOTIFICATION =====
  showToast(message, typeOrDuration = 'info', duration = 3000) {
    // Support both old signature (message, duration) and new (message, type, duration)
    let type = 'info';
    let actualDuration = duration;

    if (typeof typeOrDuration === 'number') {
      // Old signature: showToast(message, duration)
      actualDuration = typeOrDuration;
    } else if (typeof typeOrDuration === 'string') {
      // New signature: showToast(message, type, duration)
      type = typeOrDuration;
    }

    // Use the enhanced ToastSystem
    return ToastSystem.show(message, type, actualDuration);
  }

  // ===== SEARCH RESULT ACTIONS =====
  attachSearchResultActions() {
    // Save place buttons
    document.querySelectorAll('.save-place-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index);
        const place = window._searchResults?.[index];
        if (place) {
          this.toggleSavePlace(place);
          const isSaved = this.isPlaceSaved(place.placeId);
          btn.textContent = isSaved ? '❤️' : '🤍';
        }
      });
    });

    // Add to trip buttons
    document.querySelectorAll('.add-to-trip-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index);
        const place = window._searchResults?.[index];
        if (place) {
          const added = this.addToTripQueue(place);
          if (added) {
            btn.textContent = '✅ ' + (this.t('search.added') || 'Added!');
            btn.disabled = true;
            btn.style.background = 'var(--ios-green, #34C759)';
          } else {
            this.showToast(this.t('toast.already_in_trip') || 'Already in your trip!', 'warning');
          }
        }
      });
    });

    // Open maps buttons
    document.querySelectorAll('.open-maps-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index);
        const place = window._searchResults?.[index];
        if (place) {
          const query = encodeURIComponent(place.displayName?.text || place.name || '');
          window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
        }
      });
    });
  }

  // ===== QUEUED PLACES RENDERING =====
  renderQueuedPlaces() {
    const queue = this.getTripQueue();
    const section = document.getElementById('queuedPlacesSection');
    const list = document.getElementById('queuedPlacesList');
    const countBadge = document.getElementById('queuedCount');

    if (queue.length > 0 && section && list) {
      section.style.display = 'block';
      if (countBadge) countBadge.textContent = queue.length;

      list.innerHTML = queue.map((place, i) => `
        <div class="queued-place" style="display: flex; align-items: center; gap: 10px; padding: 12px; background: var(--fill-tertiary, #F2F2F7); border-radius: 10px; margin-bottom: 8px;">
          <span class="place-number" style="width: 24px; height: 24px; background: var(--ios-blue, #007AFF); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;">${i + 1}</span>
          <div style="flex: 1;">
            <div style="font-weight: 600; font-size: 15px;">${place.name}</div>
            ${place.rating ? `<span style="font-size: 12px; color: var(--label-secondary);">⭐ ${place.rating.toFixed(1)}</span>` : ''}
          </div>
          <button class="remove-queue-btn" data-index="${i}" style="background: none; border: none; font-size: 18px; cursor: pointer; color: var(--ios-red, #FF3B30);">✕</button>
        </div>
      `).join('');

      // Attach remove handlers
      document.querySelectorAll('.remove-queue-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const queue = this.getTripQueue();
          queue.splice(parseInt(btn.dataset.index), 1);
          TenantStorage.set('trip-queue', queue);
          this.renderQueuedPlaces();
        });
      });

      // Clear all button - with confirmation
      const clearBtn = document.getElementById('clearQueueBtn');
      if (clearBtn) {
        clearBtn.onclick = async () => {
          const confirmed = await ConfirmDialog.show({
            title: this.t('confirm.clear_queue_title') || 'Clear trip queue?',
            message: this.t('confirm.clear_queue_message') || 'This will remove all places from your trip queue.',
            confirmText: this.t('confirm.clear') || 'Clear All',
            cancelText: this.t('confirm.cancel') || 'Keep Places',
            type: 'warning'
          });
          if (confirmed) {
            this.clearTripQueue();
            this.renderQueuedPlaces();
            this.showToast(this.t('toast.queue_cleared') || 'Trip queue cleared', 'info');
          }
        };
      }
    } else if (section) {
      section.style.display = 'none';
    }
  }

  loadPreselectedInterests() {
    const preselected = localStorage.getItem('preselected-interest');
    if (preselected) {
      // Find and select matching interest button
      const interestBtns = document.querySelectorAll('.ios-interest, .interest-option');
      interestBtns.forEach(btn => {
        const btnText = btn.textContent.toLowerCase();
        if (btnText.includes(preselected.toLowerCase())) {
          btn.click();
        }
      });
      localStorage.removeItem('preselected-interest');
    }
  }

  // ===== PROFILE DATA RENDERING =====
  renderProfileData() {
    const places = this.getSavedPlaces();
    const trips = this.getSavedTrips();

    // Update counts
    const placesCount = document.getElementById('placesCount') || document.getElementById('savedPlacesCount');
    const tripsCount = document.getElementById('tripsCount') || document.getElementById('savedTripsCount');

    if (placesCount) placesCount.textContent = places.length;
    if (tripsCount) tripsCount.textContent = trips.length;

    // Render saved places list
    const placesList = document.getElementById('savedPlacesList');
    if (placesList) {
      if (places.length > 0) {
        placesList.innerHTML = places.map(place => `
          <div class="saved-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--fill-tertiary, #F2F2F7); border-radius: 10px; margin-bottom: 8px;">
            <div class="saved-item-info" style="flex: 1;">
              <strong style="display: block; font-size: 15px;">${place.name}</strong>
              <small style="color: var(--label-secondary); font-size: 12px;">${place.address || ''}</small>
            </div>
            <div class="saved-item-actions" style="display: flex; gap: 8px;">
              <button class="add-saved-to-trip" data-place='${JSON.stringify(place).replace(/'/g, "&#39;")}' style="background: none; border: none; font-size: 18px; cursor: pointer;">📍</button>
              <button class="remove-saved-place" data-id="${place.placeId}" style="background: none; border: none; font-size: 18px; cursor: pointer;">🗑️</button>
            </div>
          </div>
        `).join('');

        // Attach handlers
        this.attachProfileActions();
      } else {
        placesList.innerHTML = `
          <div class="ios-empty-state" style="text-align: center; padding: 2rem 1rem;">
            <div style="font-size: 3rem; margin-bottom: 0.75rem;">📍</div>
            <h4 style="margin: 0 0 0.5rem; color: var(--label-primary); font-size: 16px; font-weight: 600;">${this.t('profile.no_places_title') || 'Start Your Collection'}</h4>
            <p style="margin: 0 0 1rem; color: var(--label-secondary); font-size: 14px; line-height: 1.4;">${this.t('profile.no_places') || 'Discover amazing places and save your favorites for easy access.'}</p>
            <button class="empty-state-cta" onclick="window.simpleApp?.showView('search')" style="
              background: var(--ios-blue);
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
            ">🔍 ${this.t('common.explore') || 'Explore & Save'}</button>
          </div>`;
      }
    }

    // Render saved trips list
    const tripsList = document.getElementById('savedTripsList');
    if (tripsList) {
      if (trips.length > 0) {
        tripsList.innerHTML = trips.map(trip => `
          <div class="saved-item trip-item" data-trip-id="${trip.id}" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--fill-tertiary, #F2F2F7); border-radius: 10px; margin-bottom: 8px;">
            <div class="saved-item-info" style="flex: 1;">
              <strong style="display: block; font-size: 15px;">${trip.summary?.count || 0} ${this.t('profile.stops') || 'stops'}</strong>
              <small style="color: var(--label-secondary); font-size: 12px;">${new Date(trip.createdAt).toLocaleDateString()}</small>
            </div>
            <div class="saved-item-actions" style="display: flex; gap: 8px;">
              <button class="start-saved-trip" data-trip='${JSON.stringify(trip).replace(/'/g, "&#39;")}' style="background: none; border: none; font-size: 18px; cursor: pointer;">🚀</button>
              <button class="delete-saved-trip" data-id="${trip.id}" style="background: none; border: none; font-size: 18px; cursor: pointer;">🗑️</button>
            </div>
          </div>
        `).join('');
      } else {
        tripsList.innerHTML = `
          <div class="ios-empty-state" style="text-align: center; padding: 2rem 1rem;">
            <div style="font-size: 3rem; margin-bottom: 0.75rem;">🗺️</div>
            <h4 style="margin: 0 0 0.5rem; color: var(--label-primary); font-size: 16px; font-weight: 600;">${this.t('profile.no_trips_title') || 'No Adventures Yet'}</h4>
            <p style="margin: 0 0 1rem; color: var(--label-secondary); font-size: 14px; line-height: 1.4;">${this.t('profile.no_trips') || 'Plan your first trip and let AI create the perfect itinerary.'}</p>
            <button class="empty-state-cta" onclick="window.simpleApp?.showView('trip')" style="
              background: var(--ios-blue);
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
            ">✨ ${this.t('trip.plan_first') || 'Plan Your First Trip'}</button>
          </div>`;
      }
    }
  }

  attachProfileActions() {
    // Add saved place to trip
    document.querySelectorAll('.add-saved-to-trip').forEach(btn => {
      btn.addEventListener('click', () => {
        const place = JSON.parse(btn.dataset.place);
        if (this.addToTripQueue(place)) {
          btn.textContent = '✅';
        }
      });
    });

    // Remove saved place
    document.querySelectorAll('.remove-saved-place').forEach(btn => {
      btn.addEventListener('click', async () => {
        const placeName = btn.dataset.name || 'this place';
        const confirmed = await ConfirmDialog.confirmDelete(placeName);
        if (confirmed) {
          const saved = this.getSavedPlaces();
          const filtered = saved.filter(p => p.placeId !== btn.dataset.id);
          TenantStorage.set('saved-places', filtered);
          this.renderProfileData();
          this.showToast(this.t('toast.place_removed') || 'Removed from saved places', 'info');
        }
      });
    });

    // Start saved trip
    document.querySelectorAll('.start-saved-trip').forEach(btn => {
      btn.addEventListener('click', () => {
        const trip = JSON.parse(btn.dataset.trip);
        this.setActiveTrip(trip);
        this.showView('ai');
        this.showToast(this.t('toast.trip_started') || '🚀 Trip started! Let\'s go!', 'success');
      });
    });

    // Delete saved trip - with confirmation
    document.querySelectorAll('.delete-saved-trip').forEach(btn => {
      btn.addEventListener('click', async () => {
        const tripName = btn.dataset.name || 'this trip';
        const confirmed = await ConfirmDialog.confirmDelete(tripName);
        if (confirmed) {
          const trips = this.getSavedTrips();
          const filtered = trips.filter(t => t.id !== parseInt(btn.dataset.id));
          TenantStorage.set('trips', filtered);
          this.renderProfileData();
          this.showToast(this.t('toast.trip_deleted') || 'Trip deleted', 'info');
        }
      });
    });
  }

  // ===== TRIP STORAGE =====
  getSavedTrips() {
    return TenantStorage.get('trips', []);
  }

  saveGeneratedTrip(plan) {
    const trips = this.getSavedTrips();
    const newTrip = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      summary: plan.summary,
      timeline: plan.timeline,
      status: 'saved'
    };
    trips.push(newTrip);
    TenantStorage.set('trips', trips);
    this.showToast(this.t('toast.trip_saved') || '✅ Trip saved! View it in your Profile.', 'success');
    this.clearTripQueue();
    return newTrip;
  }

  setActiveTrip(plan) {
    TenantStorage.set('active-trip', {
      ...plan,
      currentStopIndex: 0,
      startedAt: new Date().toISOString()
    });
  }

  getActiveTrip() {
    return TenantStorage.get('active-trip', null);
  }

  clearActiveTrip() {
    TenantStorage.remove('active-trip');
  }

  // ===== ACTIVE TRIP FUNCTIONALITY =====

  setupActiveTrip() {
    // Event listeners for active trip buttons
    document.getElementById('navigateBtn')?.addEventListener('click', () => this.navigateToCurrentActivity());
    document.getElementById('completeBtn')?.addEventListener('click', () => this.markActivityComplete());
    document.getElementById('skipBtn')?.addEventListener('click', () => this.skipActivity());
    document.getElementById('endTripBtn')?.addEventListener('click', () => this.endActiveTrip());
  }

  checkAndRenderActiveTrip() {
    const activeTrip = this.getActiveTrip();
    const activeTripSection = document.getElementById('activeTripSection');
    const tripWizard = document.getElementById('tripWizard');

    if (activeTrip && activeTrip.timeline && activeTrip.timeline.length > 0) {
      if (activeTripSection) activeTripSection.style.display = 'block';
      if (tripWizard) tripWizard.style.display = 'none';
      this.renderActiveTripView(activeTrip);
    } else {
      if (activeTripSection) activeTripSection.style.display = 'none';
      if (tripWizard) tripWizard.style.display = 'block';
      this.initWizard();
    }
  }

  renderActiveTripView(trip) {
    const stops = trip.timeline || trip.stops || trip.places || [];
    const currentIndex = trip.currentStopIndex || 0;
    const current = stops[currentIndex];
    const next = stops[currentIndex + 1];

    // Update stops counter
    const completedCount = stops.filter((s, i) => i < currentIndex || s.status === 'completed').length;
    const stopsCounter = document.getElementById('activeTripStops');
    if (stopsCounter) {
      stopsCounter.textContent = `${completedCount}/${stops.length}`;
    }

    // Render current activity
    if (current) {
      const name = current.to?.name || current.name || current.title || `Stop ${currentIndex + 1}`;
      const address = current.to?.vicinity || current.address || current.vicinity || '';
      const time = current.time || (current.leg_seconds ? `${Math.round(current.leg_seconds / 60)} min` : '');

      const nameEl = document.getElementById('currentActivityName');
      const addressEl = document.getElementById('currentActivityAddress');
      const timeEl = document.getElementById('currentActivityTime');

      if (nameEl) nameEl.textContent = name;
      if (addressEl) addressEl.textContent = address;
      if (timeEl) timeEl.textContent = time;

      // Set up countdown timer
      this.setupActivityCountdown(trip, current, currentIndex);
    }

    // Render enhanced next up preview
    const nextUpPreview = document.getElementById('nextUpPreview');
    const nextUpName = document.getElementById('nextUpName');
    const nextUpTime = document.getElementById('nextUpTime');
    const nextUpTravelInfo = document.getElementById('nextUpTravelInfo');
    const nextUpTravelTime = document.getElementById('nextUpTravelTime');

    if (next && nextUpPreview && nextUpName) {
      nextUpPreview.style.display = 'flex';
      nextUpName.textContent = next.to?.name || next.name || next.title || `Stop ${currentIndex + 2}`;

      // Calculate estimated arrival time
      const travelSeconds = next.leg_seconds || 0;
      if (nextUpTime) {
        const arrivalTime = new Date(Date.now() + (30 * 60 * 1000) + (travelSeconds * 1000)); // 30 min assumed activity + travel
        nextUpTime.textContent = arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }

      // Show travel time if available
      if (nextUpTravelInfo && travelSeconds > 0) {
        nextUpTravelInfo.style.display = 'flex';
        const mins = Math.round(travelSeconds / 60);
        nextUpTravelTime.textContent = mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
      } else if (nextUpTravelInfo) {
        nextUpTravelInfo.style.display = 'none';
      }
    } else if (nextUpPreview) {
      nextUpPreview.style.display = 'none';
    }

    // Render timeline
    this.renderTimeline(stops, currentIndex);
  }

  setupActivityCountdown(trip, activity, activityIndex) {
    const countdownContainer = document.getElementById('activityCountdown');
    const countdownTime = document.getElementById('countdownTime');
    const runningLateBtn = document.getElementById('runningLateBtn');

    if (!countdownContainer) return;

    // Track when activity started
    if (!trip.activityStartTimes) {
      trip.activityStartTimes = {};
    }

    const activityKey = `activity_${activityIndex}`;
    if (!trip.activityStartTimes[activityKey]) {
      trip.activityStartTimes[activityKey] = Date.now();
      TenantStorage.set('active-trip', trip);
    }

    // Default activity duration: 30 minutes (or use leg_seconds if available)
    const activityDuration = (activity.duration_seconds || activity.suggested_duration || 30 * 60) * 1000;
    const startTime = trip.activityStartTimes[activityKey];
    const endTime = startTime + activityDuration;

    // Show countdown
    countdownContainer.style.display = 'flex';

    // Clear any existing countdown interval
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    const updateCountdown = () => {
      const remaining = endTime - Date.now();

      if (remaining <= 0) {
        countdownTime.textContent = 'Time to go!';
        countdownTime.className = 'countdown-time urgent';
        return;
      }

      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);

      if (mins >= 60) {
        countdownTime.textContent = `${Math.floor(mins / 60)}h ${mins % 60}m`;
      } else if (mins > 0) {
        countdownTime.textContent = `${mins} min`;
      } else {
        countdownTime.textContent = `${secs}s`;
      }

      // Update urgency styling
      if (remaining < 5 * 60 * 1000) { // Less than 5 minutes
        countdownTime.className = 'countdown-time urgent';
      } else if (remaining < 10 * 60 * 1000) { // Less than 10 minutes
        countdownTime.className = 'countdown-time warning';
      } else {
        countdownTime.className = 'countdown-time';
      }
    };

    // Initial update
    updateCountdown();

    // Update every second
    this.countdownInterval = setInterval(updateCountdown, 1000);

    // Set up "running late" button
    if (runningLateBtn) {
      runningLateBtn.onclick = () => {
        this.handleRunningLate(trip, activityIndex);
      };
    }
  }

  handleRunningLate(trip, activityIndex) {
    // Add 15 minutes to the current activity
    const activityKey = `activity_${activityIndex}`;
    if (trip.activityStartTimes && trip.activityStartTimes[activityKey]) {
      trip.activityStartTimes[activityKey] += 15 * 60 * 1000; // Add 15 minutes
      TenantStorage.set('active-trip', trip);
      this.setupActivityCountdown(trip, trip.timeline[activityIndex], activityIndex);
      this.showToast('Added 15 minutes to your schedule', 'info');
    }
  }

  renderTimeline(stops, currentIndex) {
    const timeline = document.getElementById('activeTripTimeline');
    if (!timeline) return;

    timeline.innerHTML = stops.map((stop, i) => {
      let markerClass = 'upcoming';
      let markerContent = '○';
      let nameClass = '';

      if (stop.status === 'completed' || i < currentIndex) {
        markerClass = 'completed';
        markerContent = '✓';
        nameClass = 'completed';
      } else if (stop.status === 'skipped') {
        markerClass = 'skipped';
        markerContent = '—';
        nameClass = 'skipped';
      } else if (i === currentIndex) {
        markerClass = 'current';
        markerContent = '●';
      }

      const name = stop.to?.name || stop.name || stop.title || `Stop ${i + 1}`;
      const time = stop.time || (stop.leg_seconds ? `${Math.round(stop.leg_seconds / 60)} min` : '');

      return `
        <div class="timeline-item">
          <div class="timeline-marker ${markerClass}">${markerContent}</div>
          <div class="timeline-content">
            <div class="timeline-name ${nameClass}">${this.escapeHtml(name)}</div>
            ${time ? `<div class="timeline-time">${time}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  navigateToCurrentActivity() {
    const trip = this.getActiveTrip();
    if (!trip) return;

    const stops = trip.timeline || trip.stops || trip.places || [];
    const current = stops[trip.currentStopIndex || 0];

    if (current) {
      const lat = current.to?.lat || current.location?.lat || current.lat;
      const lon = current.to?.lon || current.to?.lng || current.location?.lng || current.lon || current.lng;
      const name = current.to?.name || current.name || current.title;
      const address = current.to?.vicinity || current.address;

      if (lat && lon) {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`, '_blank');
      } else if (name) {
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`, '_blank');
      } else if (address) {
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
      }
    }
  }

  markActivityComplete() {
    const trip = this.getActiveTrip();
    if (!trip) return;

    const stops = trip.timeline || trip.stops || trip.places || [];
    const currentIndex = trip.currentStopIndex || 0;

    // Mark current as completed
    if (stops[currentIndex]) {
      stops[currentIndex].status = 'completed';
    }

    // Calculate completed count for milestones
    const completedBefore = stops.filter((s, i) => i < currentIndex && s.status === 'completed').length;
    const completedNow = completedBefore + 1;
    const total = stops.length;

    // Show XP animation from the complete button
    const completeBtn = document.getElementById('completeBtn');
    this.showXPAnimation(10, completeBtn);

    // Award XP immediately for activity completion
    const currentXP = TenantStorage.get('userXP', 0);
    TenantStorage.set('userXP', currentXP + 10);
    this.updateProfileStats();

    // Check for milestones
    if (completedNow === 1) {
      // First activity!
      setTimeout(() => {
        this.showMilestonePopup('🚀', "You're on your way!", 'First activity completed');
      }, 500);
    } else if (completedNow === Math.ceil(total / 2) && total > 2) {
      // Halfway there!
      setTimeout(() => {
        this.showMilestonePopup('🎯', 'Halfway there!', `${completedNow}/${total} activities done`);
      }, 500);
    }

    // Pulse the progress ring
    const progressRing = document.querySelector('.activity-progress');
    if (progressRing) {
      progressRing.classList.add('milestone-pulse');
      setTimeout(() => progressRing.classList.remove('milestone-pulse'), 2000);
    }

    // Move to next
    const nextIndex = currentIndex + 1;

    if (nextIndex >= stops.length) {
      // Trip complete - delay to let XP animation play
      setTimeout(() => this.completeTripWithReward(trip), 800);
    } else {
      trip.currentStopIndex = nextIndex;
      TenantStorage.set('active-trip', trip);

      // Delay view update to let animation complete
      setTimeout(() => {
        this.renderActiveTripView(trip);
      }, 300);

      this.showToast(this.t('active.activity_completed') || '✅ Activity completed!', 'success');
    }
  }

  showXPAnimation(xp, anchorElement) {
    // Create floating XP element
    const container = document.createElement('div');
    container.className = 'xp-float-container';

    const float = document.createElement('div');
    float.className = 'xp-float';
    float.innerHTML = `<span class="xp-icon">⭐</span><span>+${xp} XP</span>`;
    container.appendChild(float);

    // Position near the anchor element or center of screen
    if (anchorElement) {
      const rect = anchorElement.getBoundingClientRect();
      container.style.left = `${rect.left + rect.width / 2 - 50}px`;
      container.style.top = `${rect.top - 20}px`;
    } else {
      container.style.left = '50%';
      container.style.top = '50%';
      container.style.transform = 'translate(-50%, -50%)';
    }

    document.body.appendChild(container);

    // Remove after animation completes
    setTimeout(() => {
      container.remove();
    }, 1500);
  }

  showMilestonePopup(icon, title, subtitle) {
    const popup = document.createElement('div');
    popup.className = 'milestone-popup';
    popup.innerHTML = `
      <span class="milestone-icon">${icon}</span>
      <div class="milestone-title">${title}</div>
      <div class="milestone-subtitle">${subtitle}</div>
    `;

    document.body.appendChild(popup);

    // Auto-remove after 2.5 seconds
    setTimeout(() => {
      popup.style.animation = 'fadeInModal 0.3s ease reverse';
      setTimeout(() => popup.remove(), 300);
    }, 2500);
  }

  skipActivity() {
    const trip = this.getActiveTrip();
    if (!trip) return;

    const stops = trip.timeline || trip.stops || trip.places || [];
    const currentIndex = trip.currentStopIndex || 0;

    // Mark current as skipped
    if (stops[currentIndex]) {
      stops[currentIndex].status = 'skipped';
    }

    // Move to next
    const nextIndex = currentIndex + 1;

    if (nextIndex >= stops.length) {
      this.completeTripWithReward(trip);
    } else {
      trip.currentStopIndex = nextIndex;
      TenantStorage.set('active-trip', trip);
      this.renderActiveTripView(trip);
      this.showToast(this.t('active.activity_skipped') || 'Activity skipped', 'info');
    }
  }

  async endActiveTrip() {
    const trip = this.getActiveTrip();
    if (!trip) return;

    const stops = trip.timeline || trip.stops || trip.places || [];
    const completed = stops.filter(s => s.status === 'completed').length;
    const total = stops.length;
    const progress = `${completed}/${total}`;

    const confirmed = await ConfirmDialog.confirmEndTrip(progress);
    if (confirmed) {
      this.completeTripWithReward(trip);
    }
  }

  completeTripWithReward(trip) {
    // Calculate XP based on completed stops
    const stops = trip.timeline || trip.stops || trip.places || [];
    const completed = stops.filter(s => s.status === 'completed').length;
    const xp = completed * 50; // 50 XP per stop

    // Add XP to profile
    const currentXP = TenantStorage.get('userXP', 0);
    TenantStorage.set('userXP', currentXP + xp);

    // Increment trips completed
    const tripsCompleted = TenantStorage.get('stats-trips-completed', 0);
    TenantStorage.set('stats-trips-completed', tripsCompleted + 1);
    this.tripsGenerated = tripsCompleted + 1;

    // Clear active trip
    this.clearActiveTrip();

    // Show completion modal
    this.showTripCompleteModal(completed, stops.length, xp);

    // Refresh view
    this.checkAndRenderActiveTrip();
    this.updateProfileStats();
  }

  showTripCompleteModal(completed, total, xp) {
    // Trigger confetti!
    this.showConfetti();

    // Calculate level progress
    const totalXP = TenantStorage.get('userXP', 0);
    const levels = [
      { name: 'Newbie', min: 0, max: 100 },
      { name: 'Explorer', min: 100, max: 500 },
      { name: 'Adventurer', min: 500, max: 1500 },
      { name: 'Globetrotter', min: 1500, max: 3500 },
      { name: 'Legend', min: 3500, max: 10000 }
    ];
    const currentLevel = levels.find(l => totalXP >= l.min && totalXP < l.max) || levels[levels.length - 1];
    const nextLevel = levels[levels.indexOf(currentLevel) + 1] || currentLevel;
    const levelProgress = Math.min(100, ((totalXP - currentLevel.min) / (currentLevel.max - currentLevel.min)) * 100);

    // Get trip stats
    const tripsCompleted = TenantStorage.get('stats-trips-completed', 0);
    const skippedCount = total - completed;

    // Check for achievements
    let achievement = null;
    if (tripsCompleted === 1) {
      achievement = { icon: '🎯', text: 'First Adventure!' };
    } else if (completed === total) {
      achievement = { icon: '⭐', text: 'Perfect Trip!' };
    } else if (tripsCompleted === 5) {
      achievement = { icon: '🌟', text: 'Frequent Flyer!' };
    }

    const modal = document.createElement('div');
    modal.className = 'trip-complete-modal';

    modal.innerHTML = `
      <div class="trip-complete-content">
        <div class="trip-complete-icon">🎉</div>
        <h2 class="trip-complete-title">${this.t('active.trip_complete') || 'Trip Complete!'}</h2>

        ${achievement ? `
          <div class="trip-complete-achievement">
            <span>${achievement.icon}</span>
            <span>${achievement.text}</span>
          </div>
        ` : ''}

        <div class="trip-complete-xp">+${xp} XP</div>

        <div class="trip-complete-stats">
          <div class="stat-item">
            <span class="stat-value">${completed}</span>
            <span class="stat-label">Visited</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${skippedCount}</span>
            <span class="stat-label">Skipped</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${tripsCompleted}</span>
            <span class="stat-label">Total Trips</span>
          </div>
        </div>

        <div class="trip-complete-level">
          <div class="level-header">
            <span class="level-badge">🧭 ${currentLevel.name}</span>
            <span class="level-xp">${totalXP} / ${currentLevel.max} XP</span>
          </div>
          <div class="level-progress-bar">
            <div class="level-progress-fill" style="width: ${levelProgress}%"></div>
          </div>
        </div>

        <div class="trip-complete-actions">
          <button class="trip-complete-btn secondary" id="shareTrip">
            📤 Share
          </button>
          <button class="trip-complete-btn" id="closeComplete">
            ${this.t('active.great') || 'Awesome!'}
          </button>
        </div>
      </div>
    `;

    // Event handlers
    modal.querySelector('#closeComplete').addEventListener('click', () => {
      modal.remove();
    });

    modal.querySelector('#shareTrip')?.addEventListener('click', () => {
      this.shareTrip(completed, total, xp);
    });

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    document.body.appendChild(modal);

    // Animate level progress bar
    setTimeout(() => {
      const fill = modal.querySelector('.level-progress-fill');
      if (fill) fill.style.width = `${levelProgress}%`;
    }, 100);
  }

  showConfetti() {
    const container = document.createElement('div');
    container.className = 'confetti-container';

    const colors = ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF', '#5856D6', '#AF52DE'];
    const confettiCount = 50;

    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = `${Math.random() * 100}%`;
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.animationDelay = `${Math.random() * 2}s`;
      confetti.style.animationDuration = `${2 + Math.random() * 2}s`;

      // Random shapes
      if (Math.random() > 0.5) {
        confetti.style.borderRadius = '50%';
      } else {
        confetti.style.width = '8px';
        confetti.style.height = '12px';
      }

      container.appendChild(confetti);
    }

    document.body.appendChild(container);

    // Remove after animation
    setTimeout(() => container.remove(), 5000);
  }

  shareTrip(completed, total, xp) {
    const text = `🎉 Just completed a trip with RoamWise!\n📍 Visited ${completed}/${total} places\n⭐ Earned ${xp} XP\n\nPlan your adventure at roamwise.app`;

    if (navigator.share) {
      navigator.share({
        title: 'My RoamWise Trip',
        text: text
      }).catch(() => {
        // User cancelled or error
        this.copyToClipboard(text);
      });
    } else {
      this.copyToClipboard(text);
    }
  }

  copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      this.showToast('Copied to clipboard!', 'success');
    }).catch(() => {
      this.showToast('Could not copy', 'error');
    });
  }

  // Legacy renderActiveTrip for backwards compatibility (AI view)
  renderActiveTrip() {
    // For trip view, use the new checkAndRenderActiveTrip
    if (this.currentView === 'trip') {
      this.checkAndRenderActiveTrip();
      return;
    }
    // Legacy behavior for AI view - just update chat trip banner
    this.updateChatTripBanner();
  }

  // ===== TRIP PLANNING WIZARD =====

  initWizard() {
    this.wizardStep = 1;
    this.wizardData = {
      destination: null,
      dates: { start: null, end: null, flexible: false },
      preferences: { pace: 3, interests: [], budget: 'moderate', style: 'couple' },
      generatedPlan: null
    };

    // Render popular destinations
    this.renderPopularDestinations();

    // Setup all step handlers
    this.setupWizardStep1();
    this.setupWizardStep2();
    this.setupWizardStep3();
    this.setupWizardNavigation();
    this.setupWizardFinalActions();

    // Reset to step 1
    this.goToWizardStep(1);
  }

  setupWizardStep1() {
    // Destination search
    const searchInput = document.getElementById('wizardDestSearch');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        // Filter destinations by search query (basic filter)
        const query = e.target.value.toLowerCase();
        document.querySelectorAll('.destination-card').forEach(card => {
          const name = card.querySelector('.destination-name')?.textContent.toLowerCase() || '';
          card.style.display = name.includes(query) ? 'flex' : 'none';
        });
      });
    }

    // Destination card selection
    document.getElementById('destinationsGrid')?.addEventListener('click', (e) => {
      const card = e.target.closest('.destination-card');
      if (card) {
        this.selectDestination(card);
      }
    });
  }

  renderPopularDestinations() {
    const grid = document.getElementById('destinationsGrid');
    if (!grid) return;

    // Using reliable Unsplash image IDs for each destination
    const destinations = [
      { id: 'paris', name: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522, emoji: '🇫🇷',
        image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=300&fit=crop' },
      { id: 'tokyo', name: 'Tokyo', country: 'Japan', lat: 35.6762, lon: 139.6503, emoji: '🇯🇵',
        image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=300&fit=crop' },
      { id: 'rome', name: 'Rome', country: 'Italy', lat: 41.9028, lon: 12.4964, emoji: '🇮🇹',
        image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400&h=300&fit=crop' },
      { id: 'barcelona', name: 'Barcelona', country: 'Spain', lat: 41.3874, lon: 2.1686, emoji: '🇪🇸',
        image: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=400&h=300&fit=crop' },
      { id: 'london', name: 'London', country: 'UK', lat: 51.5074, lon: -0.1278, emoji: '🇬🇧',
        image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=300&fit=crop' },
      { id: 'tel-aviv', name: 'Tel Aviv', country: 'Israel', lat: 32.0853, lon: 34.7818, emoji: '🇮🇱',
        image: 'https://images.unsplash.com/photo-1544967082-d9d25d867d66?w=400&h=300&fit=crop' }
    ];

    grid.innerHTML = destinations.map(dest => `
      <div class="destination-card" data-dest-id="${dest.id}" data-lat="${dest.lat}" data-lon="${dest.lon}">
        <img class="destination-image"
             src="${dest.image}"
             alt="${dest.name}"
             loading="lazy"
             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 300%22><rect fill=%22%231a1a1a%22 width=%22400%22 height=%22300%22/><text x=%22200%22 y=%22150%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2260%22>${dest.emoji}</text></svg>'">
        <div class="destination-overlay">
          <span class="destination-name">${dest.name}</span>
          <span class="destination-country">${dest.country}</span>
        </div>
      </div>
    `).join('');
  }

  selectDestination(card) {
    // Remove previous selection
    document.querySelectorAll('.destination-card.selected').forEach(c => c.classList.remove('selected'));

    // Select this card
    card.classList.add('selected');

    // Store destination data
    const destId = card.dataset.destId;
    const lat = parseFloat(card.dataset.lat);
    const lon = parseFloat(card.dataset.lon);
    const name = card.querySelector('.destination-name')?.textContent || destId;
    const country = card.querySelector('.destination-country')?.textContent || '';

    this.wizardData.destination = { id: destId, name, country, lat, lon };
  }

  setupWizardStep2() {
    // Date inputs
    const startDate = document.getElementById('wizardStartDate');
    const endDate = document.getElementById('wizardEndDate');

    // Smart default: upcoming weekend (Friday-Sunday)
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun, 5=Fri
    // Find next Friday (or this Friday if today is early in the week)
    let daysUntilFriday = (5 - dayOfWeek + 7) % 7;
    if (daysUntilFriday === 0) daysUntilFriday = 7; // If today is Friday, use next Friday

    const nextFriday = new Date(today.getTime() + daysUntilFriday * 24 * 60 * 60 * 1000);
    const nextSunday = new Date(nextFriday.getTime() + 2 * 24 * 60 * 60 * 1000);

    if (startDate) {
      startDate.valueAsDate = nextFriday;
      // Initialize wizardData with smart weekend defaults
      this.wizardData.dates.start = nextFriday.toISOString().split('T')[0];
      startDate.addEventListener('change', () => {
        this.wizardData.dates.start = startDate.value;
      });
    }
    if (endDate) {
      endDate.valueAsDate = nextSunday;
      // Initialize wizardData with smart weekend defaults
      this.wizardData.dates.end = nextSunday.toISOString().split('T')[0];
      endDate.addEventListener('change', () => {
        this.wizardData.dates.end = endDate.value;
      });
    }

    // Auto-select weekend chip since we defaulted to weekend
    const weekendChip = document.querySelector('.wizard-chip[data-duration="weekend"]');
    if (weekendChip) {
      weekendChip.classList.add('active');
    }

    // Quick duration chips
    document.querySelectorAll('.wizard-chip[data-duration]').forEach(chip => {
      chip.addEventListener('click', () => {
        this.setQuickDuration(chip.dataset.duration);
        // Update active state
        document.querySelectorAll('.wizard-chip[data-duration]').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      });
    });

    // Flexible dates toggle
    const flexToggle = document.getElementById('flexibleDatesToggle');
    if (flexToggle) {
      flexToggle.addEventListener('click', () => {
        flexToggle.classList.toggle('active');
        this.wizardData.dates.flexible = flexToggle.classList.contains('active');
      });
    }
  }

  setQuickDuration(duration) {
    const startDate = document.getElementById('wizardStartDate');
    const endDate = document.getElementById('wizardEndDate');

    const today = new Date();
    let end = new Date(today);

    switch (duration) {
      case 'weekend':
        // Find next Friday
        const daysUntilFriday = (5 - today.getDay() + 7) % 7 || 7;
        end = new Date(today.getTime() + (daysUntilFriday + 2) * 24 * 60 * 60 * 1000);
        break;
      case 'week':
        end = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case '2weeks':
        end = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
        break;
    }

    if (startDate) startDate.valueAsDate = today;
    if (endDate) endDate.valueAsDate = end;

    this.wizardData.dates.start = today.toISOString().split('T')[0];
    this.wizardData.dates.end = end.toISOString().split('T')[0];
  }

  setupWizardStep3() {
    // Load last saved preferences
    const savedPrefs = this.loadSavedWizardPreferences();

    // Pace slider
    const paceSlider = document.getElementById('wizardPaceSlider');
    const paceValue = document.getElementById('wizardPaceValue');
    if (paceSlider) {
      // Restore saved pace
      if (savedPrefs.pace) {
        paceSlider.value = savedPrefs.pace;
        this.wizardData.preferences.pace = savedPrefs.pace;
        if (paceValue) paceValue.textContent = savedPrefs.pace;
      }
      paceSlider.addEventListener('input', () => {
        this.wizardData.preferences.pace = parseInt(paceSlider.value);
        if (paceValue) paceValue.textContent = paceSlider.value;
        this.saveWizardPreferences();
      });
    }

    // Interests selection
    document.querySelectorAll('.wizard-interest').forEach(btn => {
      btn.addEventListener('click', () => {
        this.toggleWizardInterest(btn);
      });
    });

    // Budget buttons
    document.querySelectorAll('.wizard-button[data-budget]').forEach(btn => {
      // Restore saved budget selection
      if (savedPrefs.budget && btn.dataset.budget === savedPrefs.budget) {
        document.querySelectorAll('.wizard-button[data-budget]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.wizardData.preferences.budget = savedPrefs.budget;
      }
      btn.addEventListener('click', () => {
        document.querySelectorAll('.wizard-button[data-budget]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.wizardData.preferences.budget = btn.dataset.budget;
        this.saveWizardPreferences();
      });
    });

    // Style buttons
    document.querySelectorAll('.wizard-button[data-style]').forEach(btn => {
      // Restore saved style selection
      if (savedPrefs.style && btn.dataset.style === savedPrefs.style) {
        document.querySelectorAll('.wizard-button[data-style]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.wizardData.preferences.style = savedPrefs.style;
      }
      btn.addEventListener('click', () => {
        document.querySelectorAll('.wizard-button[data-style]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.wizardData.preferences.style = btn.dataset.style;
        this.saveWizardPreferences();
      });
    });
  }

  loadSavedWizardPreferences() {
    try {
      const saved = TenantStorage.getItem('wizardPreferences');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  }

  saveWizardPreferences() {
    const prefs = {
      pace: this.wizardData.preferences.pace,
      budget: this.wizardData.preferences.budget,
      style: this.wizardData.preferences.style
    };
    TenantStorage.setItem('wizardPreferences', JSON.stringify(prefs));
  }

  toggleWizardInterest(btn) {
    const interest = btn.dataset.interest;
    const interests = this.wizardData.preferences.interests;

    if (btn.classList.contains('selected')) {
      // Deselect
      btn.classList.remove('selected');
      const index = interests.indexOf(interest);
      if (index > -1) interests.splice(index, 1);
    } else {
      // Select (max 4)
      if (interests.length < 4) {
        btn.classList.add('selected');
        interests.push(interest);
      } else {
        this.showToast(this.t('trip.max_interests') || 'Maximum 4 interests allowed', 'warning');
      }
    }

    // Update counter
    const counter = document.getElementById('wizardInterestCount');
    if (counter) {
      counter.textContent = `${interests.length}/4`;
    }
  }

  setupWizardNavigation() {
    const backBtn = document.getElementById('wizardBack');
    const nextBtn = document.getElementById('wizardNext');

    if (backBtn) {
      backBtn.addEventListener('click', () => this.prevWizardStep());
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.nextWizardStep());
    }

    // Allow clicking on completed steps to jump back
    document.querySelectorAll('.wizard-step').forEach((el, i) => {
      el.addEventListener('click', () => {
        const stepNumber = i + 1;
        // Only allow jumping to completed steps (not current or future)
        if (el.classList.contains('completed') && stepNumber < this.wizardStep) {
          this.goToWizardStep(stepNumber);
          this.showToast(`Back to Step ${stepNumber}`, 'info', 1500);
        }
      });
    });
  }

  goToWizardStep(step) {
    this.wizardStep = step;

    // Update progress bar
    document.querySelectorAll('.wizard-step').forEach((el, i) => {
      el.classList.remove('active', 'completed');
      if (i + 1 < step) {
        el.classList.add('completed');
        // Make completed steps clickable
        el.style.cursor = 'pointer';
      } else if (i + 1 === step) {
        el.classList.add('active');
        el.style.cursor = 'default';
      } else {
        el.style.cursor = 'default';
      }
    });

    // Update progress percentage (steps 1-3 are user input, 4 is AI, 5 is review)
    const progressPercent = document.getElementById('wizardProgressPercent');
    if (progressPercent) {
      const percent = Math.min(Math.round(((step - 1) / 4) * 100), 100);
      progressPercent.textContent = `${percent}% complete`;
    }

    // Show draft saved indicator when user has filled some data (step > 1)
    const draftSaved = document.getElementById('wizardDraftSaved');
    if (draftSaved) {
      if (step > 1 && step < 5) {
        draftSaved.style.display = 'inline';
        // Briefly highlight when saving
        draftSaved.style.opacity = '0';
        setTimeout(() => {
          draftSaved.style.opacity = '1';
          draftSaved.style.transition = 'opacity 0.3s';
        }, 100);
      } else {
        draftSaved.style.display = 'none';
      }
    }

    // Show/hide panels
    document.querySelectorAll('.wizard-panel').forEach(panel => {
      panel.classList.remove('active');
      if (parseInt(panel.dataset.panel) === step) {
        panel.classList.add('active');
      }
    });

    // Update navigation buttons
    const backBtn = document.getElementById('wizardBack');
    const nextBtn = document.getElementById('wizardNext');
    const navContainer = document.getElementById('wizardNav');
    const finalActions = document.getElementById('wizardFinalActions');

    if (backBtn) backBtn.style.display = step === 1 ? 'none' : 'flex';

    if (nextBtn) {
      if (step === 3) {
        nextBtn.textContent = this.t('wizard.nav.generate') || 'Generate';
      } else if (step < 5) {
        nextBtn.textContent = this.t('wizard.nav.next') || 'Next';
      }
    }

    // Hide nav on step 4 (generating) and 5 (review)
    if (navContainer) navContainer.style.display = step >= 4 ? 'none' : 'flex';
    if (finalActions) finalActions.style.display = step === 5 ? 'flex' : 'none';
  }

  validateCurrentStep() {
    switch (this.wizardStep) {
      case 1:
        if (!this.wizardData.destination) {
          this.showToast(this.t('wizard.select_destination') || 'Please select a destination', 'warning');
          return false;
        }
        break;
      case 2:
        if (!this.wizardData.dates.start || !this.wizardData.dates.end) {
          this.showToast(this.t('wizard.select_dates') || 'Please select travel dates', 'warning');
          return false;
        }
        break;
      case 3:
        if (this.wizardData.preferences.interests.length === 0) {
          this.showToast(this.t('trip.select_at_least_one') || 'Please select at least 1 interest', 'warning');
          return false;
        }
        break;
    }
    return true;
  }

  nextWizardStep() {
    if (!this.validateCurrentStep()) return;

    if (this.wizardStep === 3) {
      // Go to generation step
      this.goToWizardStep(4);
      this.startGeneration();
    } else if (this.wizardStep < 5) {
      this.goToWizardStep(this.wizardStep + 1);
    }
  }

  prevWizardStep() {
    if (this.wizardStep > 1 && this.wizardStep !== 4) {
      this.goToWizardStep(this.wizardStep - 1);
    }
  }

  async startGeneration() {
    const progressBar = document.getElementById('wizardProgressBar');
    const steps = document.querySelectorAll('.wizard-generating-step');

    // Populate preferences summary
    this.updateGenerationSummary();

    // Reset all steps first
    steps.forEach(step => {
      step.classList.remove('active', 'completed');
      const icon = step.querySelector('.wizard-generating-step-icon');
      if (icon) icon.textContent = '⏳';
    });

    // Start with step 1 active
    if (steps[0]) steps[0].classList.add('active');

    // Animate progress with step transitions
    let progress = 0;
    const stepThresholds = [
      { progress: 20, step: 0, message: 'preferences' },
      { progress: 45, step: 1, message: 'places' },
      { progress: 70, step: 2, message: 'route' },
      { progress: 90, step: 3, message: 'tips' }
    ];
    let currentStep = 0;

    const updateStep = (stepIndex, completed = false) => {
      const step = steps[stepIndex];
      if (!step) return;
      
      const icon = step.querySelector('.wizard-generating-step-icon');
      
      if (completed) {
        step.classList.remove('active');
        step.classList.add('completed');
        if (icon) icon.textContent = '✓';
        
        // Activate next step
        const nextStep = steps[stepIndex + 1];
        if (nextStep) nextStep.classList.add('active');
      } else {
        step.classList.add('active');
      }
    };

    const progressInterval = setInterval(() => {
      progress += 2;
      if (progressBar) progressBar.style.width = `${Math.min(progress, 95)}%`;

      // Check step thresholds and update
      for (const threshold of stepThresholds) {
        if (progress >= threshold.progress && currentStep < threshold.step + 1) {
          if (currentStep > 0) {
            updateStep(currentStep - 1, true);
          }
          currentStep = threshold.step + 1;
        }
      }
    }, 100);

    try {
      await this.generateTripPlan();
      clearInterval(progressInterval);
      
      // Complete all steps
      steps.forEach((step, idx) => {
        step.classList.remove('active');
        step.classList.add('completed');
        const icon = step.querySelector('.wizard-generating-step-icon');
        if (icon) icon.textContent = '✓';
      });
      
      if (progressBar) progressBar.style.width = '100%';

      // Small delay to show completion
      await new Promise(resolve => setTimeout(resolve, 600));

      // Go to review step
      this.goToWizardStep(5);
      this.renderTripReview();
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Trip generation error:', error);
      
      // Mark current step as failed
      if (steps[currentStep]) {
        steps[currentStep].classList.remove('active');
        steps[currentStep].classList.add('error');
        const icon = steps[currentStep].querySelector('.wizard-generating-step-icon');
        if (icon) icon.textContent = '✗';
      }
      
      this.showToast(this.t('trip.error') || '⚠️ Error generating trip. Please try again.', 'error');
      
      // Delay before going back to let user see what failed
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.goToWizardStep(3);
    }
  }

  updateGenerationSummary() {
    const { destination, dates, preferences } = this.wizardData;

    // Destination
    const destEl = document.getElementById('genSummaryDest');
    if (destEl && destination) {
      destEl.textContent = `${destination.name}, ${destination.country}`;
    }

    // Dates
    const datesEl = document.getElementById('genSummaryDates');
    if (datesEl && dates.start && dates.end) {
      const start = new Date(dates.start);
      const end = new Date(dates.end);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      const options = { month: 'short', day: 'numeric' };
      datesEl.textContent = `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)} (${days} days)`;
    }

    // Interests
    const interestsEl = document.getElementById('genSummaryInterests');
    if (interestsEl && preferences.interests.length > 0) {
      const interestLabels = {
        'food': 'Food',
        'nature': 'Nature',
        'culture': 'Culture',
        'shopping': 'Shopping',
        'art': 'Art',
        'nightlife': 'Nightlife',
        'adventure': 'Adventure',
        'wellness': 'Wellness'
      };
      const names = preferences.interests.map(i => interestLabels[i] || i);
      interestsEl.textContent = names.join(', ');
    }
  }

  async generateTripPlan() {
    const { destination, dates, preferences } = this.wizardData;

    // Calculate trip days
    const startDate = new Date(dates.start);
    const endDate = new Date(dates.end);
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    // Map interests to API types
    const interestToType = {
      'food': 'restaurant',
      'nature': 'park',
      'culture': 'museum',
      'shopping': 'shopping_mall',
      'entertainment': 'tourist_attraction',
      'relaxation': 'spa',
      'art': 'art_gallery',
      'history': 'museum',
      'nightlife': 'night_club',
      'adventure': 'tourist_attraction',
      'wellness': 'spa'
    };
    const types = preferences.interests.map(i => interestToType[i] || 'tourist_attraction');

    // Adjust limit based on pace (1-5) and days
    const activitiesPerDay = 2 + preferences.pace;
    const limit = Math.min(activitiesPerDay * days, 20);

    // Map budget to min rating
    const budgetToRating = {
      'budget': 3.5,
      'moderate': 4.0,
      'premium': 4.3,
      'luxury': 4.5
    };
    const minRating = budgetToRating[preferences.budget] || 4.0;

    const response = await fetch(`${API_BASE_URL}/planner/plan-day`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Lang': localStorage.getItem('app-language') || 'en'
      },
      body: JSON.stringify({
        origin: { lat: destination.lat, lon: destination.lon },
        mode: 'drive',
        near_origin: {
          radius_km: 15,
          types: types.length > 0 ? types : ['tourist_attraction', 'restaurant'],
          min_rating: minRating,
          limit: limit
        }
      })
    });

    const data = await response.json();

    if (data.ok && data.plan) {
      this.wizardData.generatedPlan = {
        ...data.plan,
        destination: destination,
        dates: dates,
        preferences: preferences,
        days: days
      };

      // Store for later use
      window._generatedPlan = this.wizardData.generatedPlan;

      // Track stats
      this.tripsPlanned++;
      TenantStorage.set('stats-trips', this.tripsPlanned);
      const aiTrips = parseInt(TenantStorage.get('stats-ai-trips') || '0') + 1;
      TenantStorage.set('stats-ai-trips', aiTrips);
      this.addTravelerXP(30);
      this.updateProfileStats();
    } else {
      throw new Error('Failed to generate trip plan');
    }
  }

  renderTripReview() {
    const plan = this.wizardData.generatedPlan;
    if (!plan) return;

    const { destination, dates, timeline } = plan;
    const days = plan.days || 1;

    // Update meta info
    const metaEl = document.getElementById('wizardReviewMeta');
    if (metaEl) {
      metaEl.textContent = `${destination.name} • ${days} day${days > 1 ? 's' : ''} • ${timeline?.length || 0} activities`;
    }

    // Render category breakdown
    this.renderCategoryBreakdown(timeline);

    // Generate day tabs
    const tabsContainer = document.getElementById('wizardDayTabs');
    if (tabsContainer) {
      tabsContainer.innerHTML = Array.from({ length: days }, (_, i) => `
        <button class="wizard-day-tab ${i === 0 ? 'active' : ''}" data-day="${i + 1}">
          ${this.t('wizard.review.day') || 'Day'} ${i + 1}
        </button>
      `).join('');

      tabsContainer.addEventListener('click', (e) => {
        const tab = e.target.closest('.wizard-day-tab');
        if (tab) {
          document.querySelectorAll('.wizard-day-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          this.renderDayTimeline(parseInt(tab.dataset.day));
        }
      });
    }

    // Render first day
    this.renderDayTimeline(1);
  }

  renderDayTimeline(dayNumber) {
    const timelineContainer = document.getElementById('wizardActivityTimeline');
    if (!timelineContainer) return;

    const plan = this.wizardData.generatedPlan;
    if (!plan || !plan.timeline) return;

    // Distribute activities across days
    const activitiesPerDay = Math.ceil(plan.timeline.length / (plan.days || 1));
    const startIndex = (dayNumber - 1) * activitiesPerDay;
    const dayActivities = plan.timeline.slice(startIndex, startIndex + activitiesPerDay);

    // Generate time slots starting from 9 AM
    const baseHour = 9;

    timelineContainer.innerHTML = dayActivities.map((activity, i) => {
      const name = activity.to?.name || activity.name || `Activity ${i + 1}`;
      const address = activity.to?.vicinity || activity.address || '';
      const duration = activity.leg_seconds ? Math.round(activity.leg_seconds / 60) : 60;
      const hour = baseHour + Math.floor(i * 1.5);
      const time = `${hour}:00`;

      return `
        <div class="wizard-activity-card" data-activity-index="${startIndex + i}">
          <div class="wizard-activity-time">${time}</div>
          <div class="wizard-activity-content">
            <div class="wizard-activity-name">${this.escapeHtml(name)}</div>
            <div class="wizard-activity-address">${this.escapeHtml(address)}</div>
            <div class="wizard-activity-duration">${duration} min</div>
          </div>
          <div class="wizard-activity-actions">
            <button class="wizard-activity-btn" data-action="edit" title="Edit">✏️</button>
            <button class="wizard-activity-btn" data-action="remove" title="Remove">🗑️</button>
          </div>
        </div>
      `;
    }).join('');

    // Activity action handlers
    timelineContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.wizard-activity-btn');
      if (!btn) return;

      const card = btn.closest('.wizard-activity-card');
      const index = parseInt(card.dataset.activityIndex);
      const action = btn.dataset.action;

      if (action === 'remove') {
        plan.timeline.splice(index, 1);
        this.renderDayTimeline(dayNumber);
      }
      // Edit action can be added in Phase 2
    });
  }

  renderCategoryBreakdown(timeline) {
    // Create or get the breakdown container
    let container = document.getElementById('wizardCategoryBreakdown');
    if (!container) {
      // Create and insert after regen options
      container = document.createElement('div');
      container.id = 'wizardCategoryBreakdown';
      container.className = 'wizard-category-breakdown';
      const regenOptions = document.getElementById('wizardRegenOptions');
      if (regenOptions) {
        regenOptions.after(container);
      }
    }

    if (!timeline || timeline.length === 0) {
      container.innerHTML = '';
      return;
    }

    // Categorize activities
    const categories = {
      'food': { icon: '🍽️', label: 'Food & Dining', count: 0 },
      'culture': { icon: '🏛️', label: 'Culture', count: 0 },
      'nature': { icon: '🌿', label: 'Nature', count: 0 },
      'shopping': { icon: '🛍️', label: 'Shopping', count: 0 },
      'attraction': { icon: '🎯', label: 'Attractions', count: 0 },
      'other': { icon: '📍', label: 'Other', count: 0 }
    };

    // Map place types to categories
    const typeToCategory = {
      'restaurant': 'food',
      'cafe': 'food',
      'bar': 'food',
      'museum': 'culture',
      'art_gallery': 'culture',
      'park': 'nature',
      'beach': 'nature',
      'shopping_mall': 'shopping',
      'store': 'shopping',
      'tourist_attraction': 'attraction',
      'point_of_interest': 'attraction'
    };

    timeline.forEach(activity => {
      const type = activity.to?.type || activity.type || 'other';
      const category = typeToCategory[type] || 'other';
      if (categories[category]) {
        categories[category].count++;
      } else {
        categories.other.count++;
      }
    });

    // Render only categories with activities
    const categoriesHtml = Object.entries(categories)
      .filter(([_, cat]) => cat.count > 0)
      .map(([_, cat]) => `
        <div class="category-chip">
          <span class="category-icon">${cat.icon}</span>
          <span class="category-label">${cat.label}</span>
          <span class="category-count">${cat.count}</span>
        </div>
      `).join('');

    container.innerHTML = categoriesHtml;
  }

  setupWizardFinalActions() {
    const startBtn = document.getElementById('wizardStartTrip');
    const saveBtn = document.getElementById('wizardSaveTrip');

    if (startBtn) {
      startBtn.addEventListener('click', () => {
        if (this.wizardData.generatedPlan) {
          this.setActiveTrip(this.wizardData.generatedPlan);
          this.showToast(this.t('toast.trip_started') || '🚀 Trip started! Let\'s go!', 'success');
          this.showView('ai');
        }
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        if (this.wizardData.generatedPlan) {
          const savedTrips = TenantStorage.get('saved-trips', []);
          savedTrips.push({
            ...this.wizardData.generatedPlan,
            savedAt: new Date().toISOString()
          });
          TenantStorage.set('saved-trips', savedTrips);
          this.showToast(this.t('toast.trip_saved') || '✅ Trip saved!', 'success');
        }
      });
    }

    // Regenerate button toggle
    const regenBtn = document.getElementById('wizardRegenBtn');
    const regenMenu = document.getElementById('wizardRegenMenu');
    if (regenBtn && regenMenu) {
      regenBtn.addEventListener('click', () => {
        const isVisible = regenMenu.style.display !== 'none';
        regenMenu.style.display = isVisible ? 'none' : 'flex';
      });
    }

    // Regenerate options
    document.querySelectorAll('.regen-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const focus = opt.dataset.focus;
        this.regenerateWithFocus(focus);
      });
    });
  }

  async regenerateWithFocus(focus) {
    // Map focus to preference adjustments
    const focusMap = {
      'more-food': { addInterests: ['food'], removeInterests: [] },
      'more-culture': { addInterests: ['culture', 'art'], removeInterests: [] },
      'relaxed': { pace: 2 },
      'packed': { pace: 5 }
    };

    const adjustment = focusMap[focus] || {};

    // Adjust preferences
    if (adjustment.addInterests) {
      adjustment.addInterests.forEach(interest => {
        if (!this.wizardData.preferences.interests.includes(interest)) {
          this.wizardData.preferences.interests.push(interest);
        }
      });
    }
    if (adjustment.pace !== undefined) {
      this.wizardData.preferences.pace = adjustment.pace;
    }

    // Show feedback
    const focusLabels = {
      'more-food': 'more food spots',
      'more-culture': 'more cultural activities',
      'relaxed': 'a slower pace',
      'packed': 'more activities'
    };
    this.showToast(`Regenerating with ${focusLabels[focus]}...`, 'info');

    // Hide the menu
    const regenMenu = document.getElementById('wizardRegenMenu');
    if (regenMenu) regenMenu.style.display = 'none';

    // Go back to generation step
    this.goToWizardStep(4);
    await this.startGeneration();
  }

  setupTripGeneration() {
    const generateBtn = document.getElementById('generateTripBtn');
    if (generateBtn) {
      generateBtn.addEventListener('click', async () => {
        // Validate at least 1 interest selected
        const selectedInterests = Array.from(document.querySelectorAll('.interest-option.selected, .ios-interest.selected'));
        if (selectedInterests.length === 0) {
          const interestHint = document.getElementById('interestHint');
          if (interestHint) {
            interestHint.textContent = this.t('trip.select_at_least_one') || 'Please select at least 1 interest';
            interestHint.style.color = 'var(--ios-red, #FF3B30)';
          }
          return;
        }

        console.log('Generating AI-powered trip...');
        generateBtn.textContent = '🧠 AI Thinking...';
        generateBtn.disabled = true;

        try {
          // Collect user preferences
          const selectedDuration = document.querySelector('.duration-option.selected, .ios-segment.selected');
          const durationHours = selectedDuration?.getAttribute('data-duration') || '8';
          const durationText = selectedDuration?.textContent || 'Full day';

          const interests = selectedInterests.map(el => el.getAttribute('data-interest') || el.textContent);
          const budget = document.getElementById('budgetAmount')?.textContent ||
                        document.getElementById('budgetValue')?.textContent || '300';

          // Map interests to Google Places types
          const interestToType = {
            'food': 'restaurant',
            'nature': 'park',
            'culture': 'museum',
            'shopping': 'shopping_mall',
            'entertainment': 'tourist_attraction',
            'relaxation': 'spa',
            // Text-based fallbacks
            '🍽️ Food': 'restaurant',
            '🌿 Nature': 'park',
            '🏛️ Culture': 'museum',
            '🛍️ Shopping': 'shopping_mall',
            '🎯 Entertainment': 'tourist_attraction',
            '😌 Relaxation': 'spa'
          };
          const types = interests.map(i => interestToType[i] || 'tourist_attraction').filter(Boolean);

          // Call planner API
          const response = await fetch(`${API_BASE_URL}/planner/plan-day`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Lang': localStorage.getItem('app-language') || 'en'
            },
            body: JSON.stringify({
              origin: { lat: 32.0853, lon: 34.7818 }, // Tel Aviv default
              mode: 'drive',
              optimizationMode: this.selectedMode || 'efficiency', // Smart Route Optimizer mode
              near_origin: {
                radius_km: 10,
                types: types.length > 0 ? types : ['tourist_attraction', 'restaurant'],
                min_rating: 4.0,
                limit: parseInt(durationHours) + 2 // Adjust stops based on duration
              }
            })
          });

          const data = await response.json();
          const tripDisplay = document.getElementById('enhancedTripDisplay') || document.getElementById('tripResults');

          // Get AI weather insights for the trip location
          const insightsData = await this.getAIWeatherInsights(32.0853, 34.7818, 'Tel Aviv');

          if (data.ok && data.plan) {
            const { summary, timeline } = data.plan;

            // FIX: Count actual POI stops, not all timeline entries
            const poiStops = timeline.filter(leg => leg.to?.kind === 'poi' || leg.to?.name);
            const stopCount = poiStops.length;

            // FIX: Increment trip counter
            this.tripsPlanned++;
            TenantStorage.set('stats-trips', this.tripsPlanned);

            // Track AI trips for achievements
            const aiTrips = parseInt(TenantStorage.get('stats-ai-trips') || '0') + 1;
            TenantStorage.set('stats-ai-trips', aiTrips);

            // Award XP for trip (+20) and AI bonus (+10)
            this.addTravelerXP(30);
            this.updateProfileStats();

            tripDisplay.innerHTML = `
              <div class="ios-card trip-result">
                <div class="ios-card-content">
                  <h3 style="margin: 0 0 1rem; font-size: 20px; font-weight: 600;">🗺️ ${this.t('trip.result_title') || 'Your AI-Powered Trip!'}</h3>

                  <div class="trip-summary" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem; padding: 1rem; background: var(--bg-secondary); border-radius: 12px;">
                    <div style="text-align: center;">
                      <div style="font-size: 13px; color: var(--label-secondary);">${this.t('trip.duration') || 'Duration'}</div>
                      <div style="font-size: 17px; font-weight: 600;">${durationText}</div>
                    </div>
                    <div style="text-align: center;">
                      <div style="font-size: 13px; color: var(--label-secondary);">${this.t('trip.budget') || 'Budget'}</div>
                      <div style="font-size: 17px; font-weight: 600;">$${budget}</div>
                    </div>
                    <div style="text-align: center;">
                      <div style="font-size: 13px; color: var(--label-secondary);">${this.t('trip.stops_label') || 'Stops'}</div>
                      <div style="font-size: 17px; font-weight: 600;">${stopCount} ${this.t('trip.places') || 'places'}</div>
                    </div>
                  </div>

                  <div class="trip-timeline">
                    ${poiStops.map((leg, idx) => {
                      // FIX: Handle "dest" placeholder - use actual name or fallback
                      const stopName = (leg.to?.name && leg.to.name !== 'dest')
                        ? leg.to.name
                        : (leg.to?.kind === 'dest' ? (this.t('trip.destination') || 'Destination') : `Stop ${idx + 1}`);

                      return `
                        <div class="timeline-item" style="display: flex; gap: 1rem; padding: 0.75rem 0; border-bottom: 1px solid var(--separator);">
                          <div class="timeline-marker" style="width: 28px; height: 28px; background: var(--ios-blue); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; flex-shrink: 0;">${idx + 1}</div>
                          <div class="timeline-content" style="flex: 1;">
                            <strong style="font-size: 15px;">${stopName}</strong>
                            <div style="display: flex; gap: 1rem; margin-top: 0.25rem; font-size: 13px; color: var(--label-secondary);">
                              ${leg.leg_seconds ? `<span>🚗 ${Math.round(leg.leg_seconds / 60)} min</span>` : ''}
                              ${leg.to?.rating ? `<span>⭐ ${leg.to.rating.toFixed(1)}</span>` : ''}
                            </div>
                          </div>
                        </div>
                      `;
                    }).join('')}
                  </div>

                  <!-- Trip Action Buttons -->
                  <div class="trip-actions" style="display: flex; gap: 12px; margin-top: 1.5rem;">
                    <button id="saveTripBtn" class="ios-button" style="flex: 1; padding: 14px; background: var(--ios-blue, #007AFF); color: white; border: none; border-radius: 12px; font-size: 15px; font-weight: 600; cursor: pointer;">
                      💾 ${this.t('trip.save_trip') || 'Save Trip'}
                    </button>
                    <button id="startTripBtn" class="ios-button" style="flex: 1; padding: 14px; background: var(--ios-green, #34C759); color: white; border: none; border-radius: 12px; font-size: 15px; font-weight: 600; cursor: pointer;">
                      🚀 ${this.t('trip.start_now') || 'Start Now'}
                    </button>
                  </div>
                </div>
              </div>
            `;

            // Store plan for button handlers
            window._generatedPlan = data.plan;

            // Attach button handlers
            document.getElementById('saveTripBtn')?.addEventListener('click', () => {
              const savedTrip = this.saveGeneratedTrip(window._generatedPlan);
              document.getElementById('saveTripBtn').textContent = '✅ ' + (this.t('trip.saved') || 'Saved!');
              document.getElementById('saveTripBtn').disabled = true;
            });

            document.getElementById('startTripBtn')?.addEventListener('click', () => {
              this.setActiveTrip(window._generatedPlan);
              this.showToast(this.t('toast.trip_started') || '🚀 Trip started! Head to AI tab for navigation.', 'success');
              this.showView('ai');
            });

            // Render weather insights after trip display
            if (insightsData.insights.length > 0) {
              this.renderInsights(insightsData.insights, tripDisplay.id);
            }
          } else {
            throw new Error(data.error || 'No plan generated');
          }

        } catch (error) {
          console.error('Trip generation error:', error);
          const tripDisplay = document.getElementById('enhancedTripDisplay') || document.getElementById('tripResults');
          tripDisplay.innerHTML = `
            <div class="ios-card" style="background: var(--ios-red-bg, #FEE2E2); border: 1px solid var(--ios-red, #FF3B30);">
              <div class="ios-card-content" style="text-align: center; padding: 2rem;">
                <div style="font-size: 2rem; margin-bottom: 0.5rem;">⚠️</div>
                <h3 style="margin: 0 0 0.5rem;">${this.t('trip.error') || 'Trip Planning Error'}</h3>
                <p style="margin: 0; color: var(--label-secondary);">${this.t('trip.error_hint') || 'Unable to generate trip. Please try again.'}</p>
              </div>
            </div>
          `;
        }

        generateBtn.textContent = this.t('trip.generate') || '🤖 Generate Smart Trip';
        generateBtn.disabled = false;

        // Update route chips and navigation links with mock data
        this.updateRouteInfo({
          distance: '42.5 km',
          duration: '1h 15m',
          avoid: 'tolls, ferries',
          origin: '32.08,34.78',
          destination: '31.77,35.22'
        });
      });
    }
  }

  updateProfileStats() {
    const tripsEl = document.getElementById('tripsPlannedCount');
    const placesEl = document.getElementById('placesVisitedCount');
    const countriesEl = document.getElementById('countriesCount');
    const scoreDisplayEl = document.getElementById('travelerScoreDisplay');

    if (tripsEl) tripsEl.textContent = this.tripsPlanned;
    if (placesEl) placesEl.textContent = this.placesVisited;
    if (countriesEl) countriesEl.textContent = TenantStorage.get('stats-countries', 1);

    // Update traveler level and XP
    this.updateTravelerLevel();

    // Update achievements
    this.checkAchievements();
  }

  // Calculate current traveler level based on XP score
  calculateTravelerLevel(score) {
    for (let i = TRAVELER_LEVELS.length - 1; i >= 0; i--) {
      if (score >= TRAVELER_LEVELS[i].minScore) {
        return { level: TRAVELER_LEVELS[i], index: i };
      }
    }
    return { level: TRAVELER_LEVELS[0], index: 0 };
  }

  // Update the traveler level display
  updateTravelerLevel() {
    const score = parseInt(TenantStorage.get('traveler-score', 0));
    const prevScore = this._lastTravelerScore || 0;
    this._lastTravelerScore = score;

    const { level, index } = this.calculateTravelerLevel(score);
    const nextLevel = TRAVELER_LEVELS[index + 1];

    // Update score display
    const scoreDisplayEl = document.getElementById('travelerScoreDisplay');
    if (scoreDisplayEl) scoreDisplayEl.textContent = score;

    // Update level badge
    const levelIconEl = document.getElementById('levelIcon');
    const levelNameEl = document.getElementById('levelName');
    if (levelIconEl) levelIconEl.textContent = level.icon;
    if (levelNameEl) levelNameEl.textContent = window.currentLang === 'he' ? level.nameHe : level.name;

    // Update progress bar
    const progressFillEl = document.getElementById('levelProgressFill');
    const progressTextEl = document.getElementById('levelProgressText');

    if (nextLevel) {
      const progress = ((score - level.minScore) / (nextLevel.minScore - level.minScore)) * 100;
      if (progressFillEl) progressFillEl.style.width = `${Math.min(progress, 100)}%`;
      if (progressTextEl) progressTextEl.textContent = `${score}/${nextLevel.minScore} XP`;
    } else {
      // Max level reached
      if (progressFillEl) progressFillEl.style.width = '100%';
      if (progressTextEl) progressTextEl.textContent = `${score} XP ⭐`;
    }

    // Add animation if XP increased
    if (score > prevScore && progressFillEl && progressTextEl) {
      progressFillEl.classList.add('xp-pulse');
      progressTextEl.classList.add('xp-gained');

      // Remove animation classes after animation completes
      setTimeout(() => {
        progressFillEl.classList.remove('xp-pulse');
        progressTextEl.classList.remove('xp-gained');
      }, 600);
    }
  }

  // Add XP points and update display
  addTravelerXP(points) {
    const current = parseInt(TenantStorage.get('traveler-score', 0));
    const oldLevel = this.calculateTravelerLevel(current);
    const newScore = current + points;
    TenantStorage.set('traveler-score', newScore);

    const newLevel = this.calculateTravelerLevel(newScore);

    // Check for level up
    if (newLevel.index > oldLevel.index) {
      const levelName = window.currentLang === 'he' ? newLevel.level.nameHe : newLevel.level.name;
      this.showToast(`🎉 ${window.currentLang === 'he' ? 'עלית לרמה' : 'Level Up!'} ${newLevel.level.icon} ${levelName}!`, 'success', 5000);
    }

    this.updateTravelerLevel();
  }

  // Check and update achievements
  checkAchievements() {
    const unlocked = TenantStorage.get('achievements', []);
    const aiTrips = parseInt(TenantStorage.get('stats-ai-trips', 0));

    const stats = {
      trips: this.tripsPlanned,
      places: this.placesVisited,
      ai_trips: aiTrips
    };

    let newUnlocks = [];
    ACHIEVEMENTS.forEach(achievement => {
      if (!unlocked.includes(achievement.id)) {
        const { type, threshold } = achievement.condition;
        if (stats[type] >= threshold) {
          unlocked.push(achievement.id);
          newUnlocks.push(achievement);
        }
      }
    });

    // Save unlocked achievements
    if (newUnlocks.length > 0) {
      TenantStorage.set('achievements', unlocked);
      // Show notification for each new achievement
      newUnlocks.forEach(achievement => {
        const msg = window.currentLang === 'he'
          ? `🏆 הישג חדש: ${achievement.nameHe}!`
          : `🏆 Achievement Unlocked: ${achievement.name}!`;
        this.showToast(msg, 'success', 5000);
        // Bonus XP for unlocking achievement
        this.addTravelerXP(15);
      });
    }

    // Render achievements grid
    this.renderAchievements(unlocked);
  }

  // Render achievements grid with progress for locked achievements
  renderAchievements(unlockedIds) {
    const grid = document.getElementById('achievementGrid');
    if (!grid) return;

    // Get current stats for progress calculation
    const aiTrips = parseInt(TenantStorage.get('stats-ai-trips', 0));
    const stats = {
      trips: this.tripsPlanned,
      places: this.placesVisited,
      ai_trips: aiTrips,
      countries: parseInt(TenantStorage.get('stats-countries', 1))
    };

    grid.innerHTML = ACHIEVEMENTS.map(a => {
      const isUnlocked = unlockedIds.includes(a.id);
      const { type, threshold } = a.condition;
      const current = stats[type] || 0;
      const progress = Math.min(Math.round((current / threshold) * 100), 100);
      const title = window.currentLang === 'he' ? a.descHe : a.desc;

      if (isUnlocked) {
        return `
          <div class="achievement-badge unlocked" title="${title}">
            <span class="achievement-icon">${a.icon}</span>
            <span class="achievement-name">${window.currentLang === 'he' ? a.nameHe : a.name}</span>
            <span class="achievement-status">✓</span>
          </div>
        `;
      } else {
        return `
          <div class="achievement-badge locked" title="${title}">
            <span class="achievement-icon">${a.icon}</span>
            <span class="achievement-name">${window.currentLang === 'he' ? a.nameHe : a.name}</span>
            <div class="achievement-progress">
              <div class="achievement-progress-bar">
                <div class="achievement-progress-fill" style="width: ${progress}%"></div>
              </div>
              <span class="achievement-progress-text">${current}/${threshold}</span>
            </div>
          </div>
        `;
      }
    }).join('');
  }

  // Render next achievement hint on home/search view
  renderNextAchievementHint() {
    const container = document.getElementById('nextAchievementHint');
    if (!container) return;

    // Get unlocked achievements
    const unlockedIds = TenantStorage.get('unlocked-achievements', []);

    // Get current stats
    const aiTrips = parseInt(TenantStorage.get('stats-ai-trips', 0));
    const stats = {
      trips: this.tripsPlanned,
      places: this.placesVisited,
      ai_trips: aiTrips,
      countries: parseInt(TenantStorage.get('stats-countries', 1))
    };

    // Find the closest achievement to unlock (highest progress among locked)
    let closest = null;
    let highestProgress = -1;

    ACHIEVEMENTS.forEach(a => {
      if (unlockedIds.includes(a.id)) return; // Skip unlocked

      const { type, threshold } = a.condition;
      const current = stats[type] || 0;
      const progress = Math.min((current / threshold) * 100, 99); // Cap at 99 for unlocked

      if (progress > highestProgress) {
        highestProgress = progress;
        closest = {
          ...a,
          current,
          threshold,
          progress: Math.round(progress)
        };
      }
    });

    // If no locked achievements, hide the hint
    if (!closest) {
      container.style.display = 'none';
      return;
    }

    // Render the hint card
    const name = window.currentLang === 'he' ? closest.nameHe : closest.name;
    const label = window.currentLang === 'he' ? 'ההישג הבא שלך' : 'Your next achievement';

    container.innerHTML = `
      <div class="next-achievement-icon">${closest.icon}</div>
      <div class="next-achievement-content">
        <div class="next-achievement-label">${label}</div>
        <div class="next-achievement-name">${this.escapeHtml(name)}</div>
        <div class="next-achievement-progress-wrap">
          <div class="next-achievement-bar">
            <div class="next-achievement-fill" style="width: ${closest.progress}%"></div>
          </div>
          <span class="next-achievement-percent">${closest.progress}%</span>
        </div>
      </div>
    `;
    container.style.display = 'flex';
  }

  // Show toast notification - delegates to global ToastSystem
  showToast(message, type = 'info', duration = 3000) {
    return ToastSystem.show(message, type, duration);
  }

  updateRouteInfo(routeData) {
    const routeChips = document.getElementById('route-chips');
    const navLinks = document.getElementById('nav-links');
    const chipDistance = document.getElementById('chip-distance');
    const chipDuration = document.getElementById('chip-duration');
    const chipAvoid = document.getElementById('chip-avoid');
    const navWaze = document.getElementById('nav-waze');
    const navGoogle = document.getElementById('nav-google');
    const navApple = document.getElementById('nav-apple');

    if (!routeChips || !navLinks) return;

    // Populate chips with route data
    const distance = routeData?.distance || '42.5 km';
    const duration = routeData?.duration || '1h 15m';
    const avoid = routeData?.avoid || 'tolls, ferries';

    if (chipDistance) chipDistance.textContent = `📏 ${distance}`;
    if (chipDuration) chipDuration.textContent = `⏱️ ${duration}`;
    if (chipAvoid) chipAvoid.textContent = `🚫 Avoid: ${avoid}`;

    // Show chips
    routeChips.style.display = 'flex';

    // Populate navigation links
    const origin = routeData?.origin || '32.08,34.78';
    const destination = routeData?.destination || '31.77,35.22';

    if (navWaze) navWaze.href = `https://waze.com/ul?ll=${destination}&navigate=yes`;
    if (navGoogle) navGoogle.href = `https://www.google.com/maps/dir/${origin}/${destination}`;
    if (navApple) navApple.href = `https://maps.apple.com/?saddr=${origin}&daddr=${destination}`;

    // Show navigation links
    navLinks.style.display = 'flex';
  }

  setupVoiceButton() {
    const voiceBtn = document.getElementById('voiceBtn');
    if (!voiceBtn) return;

    // Voice recording state
    this.isRecording = false;
    this.mediaRecorder = null;
    this.audioChunks = [];

    voiceBtn.addEventListener('click', async () => {
      const responseEl = document.getElementById('voiceResponse') || document.getElementById('aiResponse');

      if (this.isRecording) {
        // Stop recording
        this.stopVoiceRecording();
        return;
      }

      // Start recording
      try {
        // Request microphone permission
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Show recording state
        this.isRecording = true;
        voiceBtn.classList.add('recording');
        voiceBtn.innerHTML = '<span class="voice-icon recording-pulse">🔴</span>';

        // Update voice status text
        const statusEl = document.getElementById('voiceStatus');
        if (statusEl) {
          statusEl.textContent = this.t('voice.listening') || 'Listening...';
        }

        if (responseEl) {
          responseEl.innerHTML = `
            <div class="ios-card" style="background: var(--ios-red-bg, #FEE2E2); border: 1px solid var(--ios-red);">
              <div class="ios-card-content" style="text-align: center; padding: 1.5rem;">
                <div class="recording-indicator" style="font-size: 2rem; margin-bottom: 0.5rem; animation: pulse 1s infinite;">🎤</div>
                <h4 style="margin: 0 0 0.5rem; color: var(--ios-red);">${this.t('voice.listening') || 'Listening...'}</h4>
                <p style="margin: 0; color: var(--label-secondary); font-size: 13px;">${this.t('voice.tap_stop') || 'Tap microphone again to stop'}</p>
              </div>
            </div>
          `;
          responseEl.style.display = 'block';
        }

        // Setup MediaRecorder
        this.audioChunks = [];
        this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.audioChunks.push(event.data);
          }
        };

        this.mediaRecorder.onstop = async () => {
          // Stop all tracks
          stream.getTracks().forEach(track => track.stop());

          // Process the recording
          await this.processVoiceRecording(responseEl);
        };

        // Start recording
        this.mediaRecorder.start();

        // Auto-stop after 30 seconds
        setTimeout(() => {
          if (this.isRecording) {
            this.stopVoiceRecording();
          }
        }, 30000);

      } catch (error) {
        console.error('Microphone error:', error);
        this.isRecording = false;

        if (responseEl) {
          let errorMsg = this.t('voice.mic_error') || 'Unable to access microphone';
          if (error.name === 'NotAllowedError') {
            errorMsg = this.t('voice.mic_denied') || 'Microphone access denied. Please allow microphone access in your browser settings.';
          } else if (error.name === 'NotFoundError') {
            errorMsg = this.t('voice.mic_not_found') || 'No microphone found. Please connect a microphone.';
          }

          responseEl.innerHTML = `
            <div class="ios-card" style="background: var(--ios-red-bg, #FEE2E2); border: 1px solid var(--ios-red);">
              <div class="ios-card-content" style="text-align: center; padding: 1.5rem;">
                <div style="font-size: 2rem; margin-bottom: 0.5rem;">⚠️</div>
                <h4 style="margin: 0 0 0.5rem;">${this.t('voice.error') || 'Microphone Error'}</h4>
                <p style="margin: 0; color: var(--label-secondary); font-size: 13px;">${errorMsg}</p>
              </div>
            </div>
          `;
          responseEl.style.display = 'block';
        }
      }
    });

    // Setup quick action buttons
    this.setupQuickActions();
  }

  stopVoiceRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.isRecording = false;
      this.mediaRecorder.stop();

      const voiceBtn = document.getElementById('voiceBtn');
      if (voiceBtn) {
        voiceBtn.classList.remove('recording');
        voiceBtn.innerHTML = '<span class="voice-icon">🎤</span>';
      }

      // Clear voice status
      const statusEl = document.getElementById('voiceStatus');
      if (statusEl) {
        statusEl.textContent = '';
      }
    }
  }

  async processVoiceRecording(responseEl) {
    if (this.audioChunks.length === 0) return;

    // Show processing state
    if (responseEl) {
      responseEl.innerHTML = `
        <div class="ios-card" style="background: var(--ios-blue-bg, #E0F2FE); border: 1px solid var(--ios-blue);">
          <div class="ios-card-content" style="text-align: center; padding: 1.5rem;">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">🧠</div>
            <h4 style="margin: 0 0 0.5rem;">${this.t('voice.processing') || 'Processing...'}</h4>
            <p style="margin: 0; color: var(--label-secondary); font-size: 13px;">${this.t('voice.ai_thinking') || 'AI is transcribing your voice...'}</p>
          </div>
        </div>
      `;
    }

    try {
      // Create audio blob
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });

      // Get current location for context
      let location = null;
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
            enableHighAccuracy: false,
            maximumAge: 300000
          });
        });
        location = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      } catch (e) {
        console.warn('Could not get location for voice context');
      }

      // Send to Whisper API
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice.webm');
      formData.append('language', this.currentLang || 'he');
      if (location) {
        formData.append('location', JSON.stringify(location));
      }

      const response = await fetch(`${API_BASE_URL}/whisper-intent`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.ok !== false) {
        // Show transcription and response
        if (responseEl) {
          responseEl.innerHTML = `
            <div class="ios-card" style="background: var(--ios-green-bg, #D1FAE5); border: 1px solid var(--ios-green);">
              <div class="ios-card-content" style="padding: 1.5rem;">
                <div style="margin-bottom: 1rem;">
                  <span style="font-size: 13px; color: var(--label-secondary);">${this.t('voice.you_said') || 'You said:'}</span>
                  <p style="margin: 0.25rem 0 0; font-size: 17px; font-weight: 500;">"${data.text}"</p>
                </div>
                <div style="padding-top: 1rem; border-top: 1px solid var(--separator);">
                  <span style="font-size: 13px; color: var(--label-secondary);">🤖 ${this.t('voice.ai_response') || 'AI Response:'}</span>
                  <p style="margin: 0.25rem 0 0; font-size: 15px;">${data.response || data.intent?.response || this.t('voice.understood') || 'I understood your request!'}</p>
                </div>
                ${data.mock ? `<p style="margin: 1rem 0 0; font-size: 11px; color: var(--label-tertiary); text-align: center;">⚠️ Demo mode - Connect API for real transcription</p>` : ''}
              </div>
            </div>
          `;
        }

        // Execute intent if recognized
        if (data.intent) {
          await this.executeVoiceIntent(data.intent);
        }

      } else {
        throw new Error(data.error || 'Transcription failed');
      }

    } catch (error) {
      console.error('Voice processing error:', error);
      if (responseEl) {
        responseEl.innerHTML = `
          <div class="ios-card" style="background: var(--ios-red-bg, #FEE2E2); border: 1px solid var(--ios-red);">
            <div class="ios-card-content" style="text-align: center; padding: 1.5rem;">
              <div style="font-size: 2rem; margin-bottom: 0.5rem;">⚠️</div>
              <h4 style="margin: 0 0 0.5rem;">${this.t('voice.process_error') || 'Processing Error'}</h4>
              <p style="margin: 0; color: var(--label-secondary); font-size: 13px;">${this.t('voice.try_again') || 'Unable to process voice. Please try again.'}</p>
            </div>
          </div>
        `;
      }
    }
  }

  async executeVoiceIntent(intent) {
    console.log('Executing voice intent:', intent);

    // Map intents to actions
    switch (intent.intent) {
      case 'find_food':
      case 'ai_recommendations':
        if (intent.params?.type === 'restaurant') {
          await this.handleFindFood();
        } else {
          await this.handleRecommendations();
        }
        break;

      case 'check_weather':
      case 'weather':
        const responseEl = document.getElementById('voiceResponse') || document.getElementById('aiResponse');
        await this.handleCheckWeather(responseEl);
        break;

      case 'navigate':
      case 'directions':
        this.handleGetDirections();
        break;

      case 'plan_trip':
        this.showView('trip');
        break;

      case 'search':
        if (intent.params?.query) {
          this.showView('search');
          const searchInput = document.getElementById('freeText') || document.getElementById('searchInput');
          const searchBtn = document.getElementById('searchBtn');
          if (searchInput && searchBtn) {
            searchInput.value = intent.params.query;
            searchBtn.click();
          }
        }
        break;

      default:
        console.log('Unknown intent, no action taken:', intent.intent);
    }
  }

  setupQuickActions() {
    const actionButtons = document.querySelectorAll('.action-btn[data-action], .ios-action-btn[data-action]');
    const responseEl = document.getElementById('voiceResponse') || document.getElementById('aiResponse');

    actionButtons.forEach(btn => {
      btn.addEventListener('click', async () => {
        const action = btn.getAttribute('data-action');
        console.log('Quick action:', action);

        switch (action) {
          case 'find-food':
            await this.handleFindFood();
            break;
          case 'weather':
            await this.handleCheckWeather(responseEl);
            break;
          case 'navigate':
            this.handleGetDirections();
            break;
          case 'recommend':
            await this.handleRecommendations();
            break;
        }
      });
    });
  }

  async handleFindFood() {
    // Navigate to search view and search for restaurants
    this.showView('search');
    const searchInput = document.getElementById('freeText') || document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');

    if (searchInput && searchBtn) {
      searchInput.value = 'restaurants nearby';
      searchBtn.click();
    }
  }

  // Convert WMO weather codes to descriptions
  getWeatherDescription(code) {
    const descriptions = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Foggy',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      71: 'Slight snow',
      73: 'Moderate snow',
      75: 'Heavy snow',
      80: 'Slight rain showers',
      81: 'Moderate rain showers',
      82: 'Violent rain showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with hail',
      99: 'Thunderstorm with heavy hail'
    };
    return descriptions[code] || 'Clear';
  }

  // Derive weather description from precipitation amount
  getWeatherDescFromPrecip(precipitation, isDay) {
    if (precipitation === undefined || precipitation === null) {
      return isDay ? 'Clear' : 'Clear night';
    }
    if (precipitation > 5) return 'Heavy rain';
    if (precipitation > 1) return 'Rainy';
    if (precipitation > 0.1) return 'Light rain';
    return isDay ? 'Clear' : 'Clear night';
  }

  async handleCheckWeather(responseEl) {
    if (responseEl) {
      responseEl.innerHTML = `
        <div class="ios-card">
          <div class="ios-card-content" style="text-align: center; padding: 1.5rem;">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">🌤️</div>
            <p>${this.t('weather.loading') || 'Getting weather info...'}</p>
          </div>
        </div>
      `;
      responseEl.style.display = 'block';
    }

    try {
      // Get current location with better error handling
      let lat, lon;

      try {
        const position = await new Promise((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
            return;
          }
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 10000,
            enableHighAccuracy: false,
            maximumAge: 300000 // Accept cached position up to 5 minutes old
          });
        });
        lat = position.coords.latitude;
        lon = position.coords.longitude;
      } catch (geoError) {
        // FIX: Better geolocation error handling with fallback
        console.warn('Geolocation error, using Tel Aviv as fallback:', geoError);
        lat = 32.0853;
        lon = 34.7818;

        // Show fallback notice
        if (responseEl) {
          responseEl.innerHTML = `
            <div class="ios-card" style="background: var(--ios-orange-bg, #FEF3C7); border: 1px solid var(--ios-orange);">
              <div class="ios-card-content" style="text-align: center; padding: 1rem;">
                <p style="margin: 0; font-size: 13px;">📍 ${this.t('weather.location_fallback') || 'Using Tel Aviv as default location'}</p>
              </div>
            </div>
          `;
        }
        await new Promise(r => setTimeout(r, 1500)); // Show notice briefly
      }

      // Fetch weather from weather API (POST endpoint)
      const response = await fetch(`${API_BASE_URL}/weather`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng: lon })
      });

      if (response.ok) {
        const data = await response.json();
        const weather = data.weather?.current || {};

        if (responseEl) {
          // Parse Open-Meteo format from /weather endpoint
          const tempValue = weather.temperature_2m;
          const temp = tempValue !== undefined
            ? `${Math.round(tempValue)}°C`
            : '--';
          // Derive description from weather_code or precipitation
          const desc = weather.weather_code !== undefined
            ? this.getWeatherDescription(weather.weather_code)
            : this.getWeatherDescFromPrecip(weather.precipitation, weather.is_day);
          const windValue = weather.wind_speed_10m;
          const wind = windValue !== undefined ? `${Math.round(windValue)} km/h` : '--';
          const feelsLike = weather.apparent_temperature !== undefined
            ? `${Math.round(weather.apparent_temperature)}°C`
            : '--';

          responseEl.innerHTML = `
            <div class="ios-card weather-card" style="background: linear-gradient(135deg, var(--ios-blue), #3B82F6); color: white;">
              <div class="ios-card-content" style="padding: 1.5rem;">
                <h4 style="margin: 0 0 0.5rem; font-size: 15px; opacity: 0.9;">🌤️ ${this.t('weather.current') || 'Current Weather'}</h4>
                <p style="margin: 0; font-size: 2.5rem; font-weight: 700;">${temp}</p>
                <p style="margin: 0.25rem 0; font-size: 17px;">${desc}</p>
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.2); display: flex; gap: 1.5rem; font-size: 13px; opacity: 0.9;">
                  <span>🌡️ Feels ${feelsLike}</span>
                  <span>💨 ${wind}</span>
                </div>
              </div>
            </div>
          `;
        }
      } else {
        throw new Error('Weather API failed');
      }
    } catch (error) {
      console.error('Weather error:', error);
      if (responseEl) {
        responseEl.innerHTML = `
          <div class="ios-card error-recovery-state" style="background: var(--ios-red-bg, #FEE2E2); border: 1px solid var(--ios-red);">
            <div class="ios-card-content" style="text-align: center; padding: 1.5rem;">
              <div style="font-size: 2rem; margin-bottom: 0.5rem;">⚠️</div>
              <p style="margin: 0 0 1rem;">${this.t('weather.error') || 'Unable to get weather. Please try again.'}</p>
              <div style="display: flex; gap: 8px; justify-content: center;">
                <button class="retry-weather-btn" style="padding: 10px 20px; font-size: 15px; border-radius: 10px; background: var(--ios-blue, #007AFF); color: white; border: none; cursor: pointer; font-weight: 500;">
                  🔄 ${this.t('common.retry') || 'Retry'}
                </button>
                <button class="skip-weather-btn" style="padding: 10px 20px; font-size: 15px; border-radius: 10px; background: var(--fill-tertiary, #E5E5EA); color: var(--label-primary); border: none; cursor: pointer;">
                  ${this.t('common.skip') || 'Skip'}
                </button>
              </div>
            </div>
          </div>
        `;

        // Attach retry handler
        const retryBtn = responseEl.querySelector('.retry-weather-btn');
        const skipBtn = responseEl.querySelector('.skip-weather-btn');

        if (retryBtn) {
          retryBtn.addEventListener('click', () => {
            this.handleCheckWeather(responseEl);
          });
        }

        if (skipBtn) {
          skipBtn.addEventListener('click', () => {
            responseEl.innerHTML = '';
            responseEl.style.display = 'none';
          });
        }
      }
    }
  }

  handleGetDirections() {
    // Navigate to trip planning view
    this.showView('trip');

    const responseEl = document.getElementById('voiceResponse') || document.getElementById('aiResponse');
    if (responseEl) {
      responseEl.innerHTML = `
        <div class="ios-card" style="background: var(--ios-green-bg, #D1FAE5); border: 1px solid var(--ios-green);">
          <div class="ios-card-content" style="padding: 1rem;">
            <p style="margin: 0;">✅ ${this.t('nav.opened_planner') || 'Navigated to Trip Planner. Configure your preferences and generate a smart route!'}</p>
          </div>
        </div>
      `;
      responseEl.style.display = 'block';

      // Clear message after 3 seconds
      setTimeout(() => {
        responseEl.style.display = 'none';
      }, 3000);
    }
  }

  async handleRecommendations() {
    // Navigate to search view and search for attractions
    this.showView('search');
    const searchInput = document.getElementById('freeText') || document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');

    if (searchInput && searchBtn) {
      searchInput.value = 'popular attractions sightseeing';
      searchBtn.click();
    }
  }

  async getAIWeatherInsights(lat, lon, locationName = '') {
    try {
      const response = await fetch(`${API_BASE_URL}/weather`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng: lon })
      });

      if (!response.ok) throw new Error('Weather API failed');

      const data = await response.json();
      const weather = data.weather?.current || {};

      const insights = [];
      // Parse Open-Meteo format from /weather endpoint
      const temp = weather.temperature_2m;
      const precipitation = weather.precipitation ?? 0;
      // Derive description from weather_code or precipitation
      const description = (weather.weather_code !== undefined
        ? this.getWeatherDescription(weather.weather_code)
        : this.getWeatherDescFromPrecip(precipitation, weather.is_day)).toLowerCase();
      const windSpeed = weather.wind_speed_10m ?? 0;

      // Rain insights
      if (description.includes('rain') || description.includes('shower') || description.includes('drizzle')) {
        insights.push({
          type: 'warning',
          icon: '🌧️',
          title: this.t('insight.rain_title') || 'Rain Expected',
          message: locationName
            ? `${this.t('insight.rain_at') || "It's raining in"} ${locationName} ${this.t('insight.rain_change_route') || "today. You may want to consider indoor activities or changing your route."}`
            : this.t('insight.rain_generic') || "Rain is expected. Consider bringing an umbrella or waterproof jacket."
        });
      }

      // Cold weather insights
      if (temp !== undefined && temp < 10) {
        const coldMsg = temp < 5
          ? this.t('insight.very_cold') || "It will be very cold. Dress warmly with layers, hat, and gloves."
          : this.t('insight.cold') || "It might be chilly. Bring a warm jacket.";
        insights.push({
          type: 'info',
          icon: '🥶',
          title: this.t('insight.cold_title') || 'Cold Weather',
          message: coldMsg
        });
      }

      // Hot weather insights
      if (temp !== undefined && temp > 30) {
        insights.push({
          type: 'warning',
          icon: '☀️',
          title: this.t('insight.hot_title') || 'Hot Weather',
          message: this.t('insight.hot') || "It will be hot today. Stay hydrated, wear sunscreen, and take breaks in the shade."
        });
      }

      // High altitude / hills insight
      if (locationName && (locationName.toLowerCase().includes('hill') || locationName.toLowerCase().includes('mountain') || locationName.toLowerCase().includes('garda'))) {
        if (temp !== undefined && temp < 15) {
          insights.push({
            type: 'info',
            icon: '⛰️',
            title: this.t('insight.altitude_title') || 'Mountain Weather',
            message: this.t('insight.altitude') || "It will be colder up in the hills. Bring warm layers even if it's nice at the base."
          });
        }
      }

      // Wind insights
      if (windSpeed > 10) {
        insights.push({
          type: 'info',
          icon: '💨',
          title: this.t('insight.windy_title') || 'Windy Conditions',
          message: this.t('insight.windy') || "Strong winds expected. Secure loose items and consider windproof clothing."
        });
      }

      // Snow insights
      if (description.includes('snow')) {
        insights.push({
          type: 'warning',
          icon: '❄️',
          title: this.t('insight.snow_title') || 'Snow Expected',
          message: this.t('insight.snow') || "Snow is expected. Check road conditions and consider alternative routes."
        });
      }

      // Good weather message if no concerns
      if (insights.length === 0 && temp !== undefined) {
        insights.push({
          type: 'success',
          icon: '✨',
          title: this.t('insight.good_title') || 'Great Weather!',
          message: `${Math.round(temp)}°C - ${this.t('insight.good') || "Perfect conditions for your trip. Enjoy!"}`
        });
      }

      return {
        weather: {
          temp: temp !== undefined ? Math.round(temp) : null,
          description: weather.description || 'Clear',
          humidity,
          windSpeed
        },
        insights
      };
    } catch (error) {
      console.error('AI Insights error:', error);
      return { weather: null, insights: [] };
    }
  }

  renderInsights(insights, containerId) {
    const container = document.getElementById(containerId);
    if (!container || insights.length === 0) return;

    const insightsHtml = insights.map(insight => {
      const bgColor = {
        warning: 'var(--ios-orange-bg, #FEF3C7)',
        alert: 'var(--ios-red-bg, #FEE2E2)',
        info: 'var(--ios-blue-bg, #E0F2FE)',
        success: 'var(--ios-green-bg, #D1FAE5)'
      }[insight.type] || 'var(--bg-secondary)';

      const borderColor = {
        warning: 'var(--ios-orange, #FF9500)',
        alert: 'var(--ios-red, #FF3B30)',
        info: 'var(--ios-blue, #007AFF)',
        success: 'var(--ios-green, #34C759)'
      }[insight.type] || 'var(--separator)';

      return `
        <div class="ios-card ai-insight" style="background: ${bgColor}; border-left: 4px solid ${borderColor}; margin-bottom: 0.75rem;">
          <div class="ios-card-content" style="padding: 1rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
              <span style="font-size: 1.25rem;">${insight.icon}</span>
              <strong style="font-size: 15px;">${insight.title}</strong>
            </div>
            <p style="margin: 0; color: var(--label-secondary); font-size: 13px;">${insight.message}</p>
          </div>
        </div>
      `;
    }).join('');

    // Insert or update insights section
    let insightsSection = container.querySelector('.ai-insights-section');
    if (!insightsSection) {
      insightsSection = document.createElement('div');
      insightsSection.className = 'ai-insights-section';
      insightsSection.innerHTML = `
        <h4 style="display: flex; align-items: center; gap: 0.5rem; margin: 1rem 0; font-size: 15px;">
          🧠 <span data-i18n="insight.header">${this.t('insight.header') || 'AI Weather Insights'}</span>
        </h4>
        <div class="insights-list">${insightsHtml}</div>
      `;
      container.appendChild(insightsSection);
    } else {
      insightsSection.querySelector('.insights-list').innerHTML = insightsHtml;
    }
  }

  setupPlannerUI() {
    // Toggle start source buttons
    const btnCurrent = document.getElementById('btnStartCurrent');
    const btnHotel = document.getElementById('btnStartHotel');
    const hotelRow = document.getElementById('hotelRow');

    if (btnCurrent && btnHotel && hotelRow) {
      btnCurrent.addEventListener('click', () => {
        btnCurrent.classList.add('active');
        btnHotel.classList.remove('active');
        hotelRow.style.display = 'none';
      });

      btnHotel.addEventListener('click', () => {
        btnHotel.classList.add('active');
        btnCurrent.classList.remove('active');
        hotelRow.style.display = 'flex';
      });
    }

    // Update slider value displays
    const nearRadius = document.getElementById('nearRadius');
    const nearRadiusVal = document.getElementById('nearRadiusVal');
    if (nearRadius && nearRadiusVal) {
      nearRadius.addEventListener('input', () => {
        nearRadiusVal.textContent = nearRadius.value;
      });
    }

    const detourMin = document.getElementById('detourMin');
    const detourMinVal = document.getElementById('detourMinVal');
    if (detourMin && detourMinVal) {
      detourMin.addEventListener('input', () => {
        detourMinVal.textContent = detourMin.value;
      });
    }

    // Plan Day button handler
    const btnPlanDay = document.getElementById('btnPlanDay');
    if (btnPlanDay) {
      btnPlanDay.addEventListener('click', async () => {
        const resultsDiv = document.getElementById('planner-results');
        if (!resultsDiv) return;

        resultsDiv.innerHTML = '<div data-testid="planner-loading" style="padding:20px; text-align:center;">🧠 Planning your day...</div>';
        btnPlanDay.disabled = true;
        btnPlanDay.textContent = 'Planning...';

        try {
          const lang = document.documentElement.getAttribute('lang') || 'he';
          const isHotelMode = btnHotel && btnHotel.classList.contains('active');

          let body = {
            mode: 'drive',
            near_origin: {
              radius_km: parseInt(nearRadius?.value || '5'),
              types: ['tourist_attraction', 'viewpoint', 'museum'],
              min_rating: 4.3,
              open_now: false,
              limit: 8
            },
            sar: {
              query: 'viewpoint|restaurant|ice_cream',
              max_detour_min: parseInt(detourMin?.value || '15'),
              max_results: 12
            }
          };

          if (isHotelMode) {
            const hotelInput = document.getElementById('hotelInput');
            const hotelName = hotelInput?.value?.trim();
            if (!hotelName) {
              resultsDiv.innerHTML = '<div data-testid="planner-error" style="padding:20px; color: var(--ios-red);">⚠️ Please enter a hotel name</div>';
              btnPlanDay.disabled = false;
              btnPlanDay.textContent = this.t('planner.plan_day') || 'Plan Day';
              return;
            }
            body.origin_query = hotelName;
          } else {
            try {
              const pos = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                  enableHighAccuracy: false,
                  timeout: 10000,
                  maximumAge: 300000
                });
              });
              body.origin = {
                lat: pos.coords.latitude,
                lon: pos.coords.longitude
              };
            } catch (geoErr) {
              console.warn('Geolocation error, falling back to Tel Aviv center:', geoErr);
              body.origin = {
                lat: 32.08,
                lon: 34.78
              };
            }
          }

          // Optional destination
          const destInput = document.getElementById('destInput');
          const destQuery = destInput?.value?.trim();
          if (destQuery) {
            body.dest_query = destQuery;
          }

          // Call backend API via proxy
          const response = await fetch(`${API_BASE_URL}/planner/plan-day`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-lang': lang
            },
            body: JSON.stringify(body)
          });

          const data = await response.json();

          if (!data.ok || !data.plan) {
            throw new Error(data.error || 'Plan failed');
          }

          // Render results
          const { plan } = data;
          const { summary, timeline } = plan;

          // FIX: Increment trip counter
          this.tripsPlanned++;
          TenantStorage.set('stats-trips', this.tripsPlanned);

          // Track AI trips for achievements
          const aiTrips2 = parseInt(TenantStorage.get('stats-ai-trips') || '0') + 1;
          TenantStorage.set('stats-ai-trips', aiTrips2);

          // Award XP for trip (+20) and AI bonus (+10)
          this.addTravelerXP(30);
          this.updateProfileStats();

          let html = '<div class="ios-card"><div class="ios-card-content">';
          html += `<h3 style="margin: 0 0 1rem; font-size: 17px; font-weight: 600;">🗺️ Day Plan</h3>`;
          if (summary.origin_name) {
            html += `<p style="margin: 0 0 0.5rem; font-size: 13px; color: var(--label-secondary);">📍 Starting from: ${summary.origin_name}</p>`;
          }
          html += `<p style="margin: 0 0 1rem; font-size: 13px; color: var(--label-secondary);">🎯 Mode: ${summary.plan_mode} • POIs: ${summary.count}</p>`;

          if (timeline && timeline.length > 0) {
            let cumMin = 0;
            const poiLegs = timeline.filter(leg => leg.to?.kind === 'poi');

            for (const leg of poiLegs) {
              const eta = leg.eta_seconds ? Math.round(leg.eta_seconds / 60) : null;
              cumMin = eta || cumMin;

              // FIX: Handle "dest" placeholder
              const poiName = (leg.to?.name && leg.to.name !== 'dest') ? leg.to.name : 'Point of Interest';

              html += `
                <div style="padding: 0.75rem 0; border-bottom: 1px solid var(--separator);">
                  <strong style="font-size: 15px;">${poiName}</strong>
                  <div style="display: flex; gap: 1rem; margin-top: 0.25rem; font-size: 13px; color: var(--label-secondary);">
                    ${leg.to?.rating ? `<span>⭐ ${leg.to.rating.toFixed(1)}${leg.to.user_ratings_total ? ` (${leg.to.user_ratings_total})` : ''}</span>` : ''}
                    ${eta !== null ? `<span>🕐 +${cumMin} min</span>` : ''}
                    ${leg.to?.detour_min !== undefined ? `<span>🔀 ${leg.to.detour_min} min detour</span>` : ''}
                  </div>
                </div>
              `;
            }
          } else {
            html += '<p style="padding: 1rem 0; text-align: center; color: var(--label-secondary);">No POIs found. Try adjusting the radius or destination.</p>';
          }

          html += '</div></div>';
          resultsDiv.innerHTML = html;

        } catch (error) {
          console.error('Planner error:', error);
          resultsDiv.innerHTML = `<div data-testid="planner-error" class="ios-card" style="background: var(--ios-red-bg); border: 1px solid var(--ios-red);"><div class="ios-card-content" style="padding: 1.5rem; text-align: center;">❌ Error: ${error.message || 'Failed to plan day'}</div></div>`;
        } finally {
          btnPlanDay.disabled = false;
          btnPlanDay.textContent = this.t('planner.plan_day') || 'Plan Day';
        }
      });
    }
  }

  // ===== HOME BASE SETTINGS =====
  setupHomeBaseSettings() {
    const countrySelect = document.getElementById('homeCountrySelect');
    const cityInput = document.getElementById('homeCityInput');

    if (countrySelect) {
      // Load saved value
      const savedCountry = localStorage.getItem('traveling-home-country') || 'IL';
      countrySelect.value = savedCountry;

      countrySelect.addEventListener('change', () => {
        localStorage.setItem('traveling-home-country', countrySelect.value);
        console.log('[HomeBase] Country set to:', countrySelect.value);
      });
    }

    if (cityInput) {
      // Load saved value
      const savedCity = localStorage.getItem('traveling-home-city') || '';
      cityInput.value = savedCity;

      cityInput.addEventListener('blur', () => {
        localStorage.setItem('traveling-home-city', cityInput.value.trim());
        console.log('[HomeBase] City set to:', cityInput.value.trim());
      });
    }
  }

  // ===== TRAVEL GREETING LIFECYCLE =====
  async showTravelGreeting() {
    const modal = document.getElementById('greetingModal');
    if (!modal) {
      console.warn('[Greeting] Modal not found');
      return;
    }

    const iconEl = document.getElementById('greetingIcon');
    const titleEl = document.getElementById('greetingTitle');
    const subtitleEl = document.getElementById('greetingSubtitle');
    const actionsEl = document.getElementById('greetingActions');
    const skipBtn = document.getElementById('greetingSkip');
    const loadingEl = document.getElementById('greetingLoading');
    const contentEl = modal.querySelector('.greeting-content');

    // Show modal with loading state
    modal.style.display = 'flex';
    if (loadingEl) loadingEl.style.display = 'flex';
    if (contentEl) contentEl.style.display = 'none';

    try {
      // Import TravelContextManager dynamically
      const { travelContextManager } = await import('./src/services/TravelContextManager.ts');

      // Refresh context (detect location)
      const context = await travelContextManager.refreshContext();

      // Get user name and translation function
      const userName = TenantStorage.getTenantName() || 'Traveler';
      const greeting = travelContextManager.getGreeting(userName, this.t.bind(this));

      // Hide loading, show content
      if (loadingEl) loadingEl.style.display = 'none';
      if (contentEl) contentEl.style.display = 'block';

      // Update greeting UI
      if (iconEl) iconEl.textContent = greeting.icon;
      if (titleEl) titleEl.textContent = greeting.title;
      if (subtitleEl) subtitleEl.textContent = greeting.subtitle;

      // Build action buttons based on travel mode
      if (actionsEl) {
        actionsEl.innerHTML = '';

        if (context.travelMode === 'international' || context.travelMode === 'domestic') {
          // Traveling - show explore actions
          actionsEl.innerHTML = `
            <button class="greeting-action-btn greeting-action-primary" data-action="search">
              ${this.t('greeting.find_nearby') || 'Find Places Nearby'}
            </button>
            <button class="greeting-action-btn greeting-action-secondary" data-action="trip">
              ${this.t('trip.generate') || 'Plan a Trip'}
            </button>
          `;
        } else {
          // At home - show planning actions
          actionsEl.innerHTML = `
            <button class="greeting-action-btn greeting-action-primary" data-action="trip">
              ${this.t('greeting.plan_next') || 'Plan Next Adventure'}
            </button>
            <button class="greeting-action-btn greeting-action-secondary" data-action="profile">
              ${this.t('profile.my_places') || 'View Saved Places'}
            </button>
          `;
        }

        // Add action handlers
        actionsEl.querySelectorAll('[data-action]').forEach(btn => {
          btn.addEventListener('click', () => {
            const action = btn.getAttribute('data-action');
            this.hideGreetingModal();
            if (action) this.showView(action);
          });
        });
      }

      // Skip button handler
      if (skipBtn) {
        skipBtn.onclick = () => this.hideGreetingModal();
      }

      console.log('[Greeting] Showing greeting for mode:', context.travelMode);

    } catch (error) {
      console.warn('[Greeting] Failed to detect location:', error);

      // Show simple welcome without location context
      if (loadingEl) loadingEl.style.display = 'none';
      if (contentEl) contentEl.style.display = 'block';

      const userName = TenantStorage.getTenantName() || 'Traveler';
      if (iconEl) iconEl.textContent = '👋';
      if (titleEl) titleEl.textContent = this.t('greeting.welcome_home', { name: userName }) || `Welcome, ${userName}!`;
      if (subtitleEl) subtitleEl.textContent = this.t('greeting.plan_next') || 'Plan your next adventure';

      if (actionsEl) {
        actionsEl.innerHTML = `
          <button class="greeting-action-btn greeting-action-primary" data-action="search">
            ${this.t('search.title') || 'Find Places'}
          </button>
        `;
        actionsEl.querySelector('[data-action]')?.addEventListener('click', () => {
          this.hideGreetingModal();
          this.showView('search');
        });
      }

      if (skipBtn) {
        skipBtn.onclick = () => this.hideGreetingModal();
      }
    }
  }

  hideGreetingModal() {
    const modal = document.getElementById('greetingModal');
    if (modal) {
      modal.style.opacity = '0';
      setTimeout(() => {
        modal.style.display = 'none';
        modal.style.opacity = '1';
      }, 300);
    }
  }

  // ===== CHAT FUNCTIONALITY =====

  chatHistory = [];

  setupChat() {
    // Event listeners
    document.getElementById('chatSendBtn')?.addEventListener('click', () => this.sendChatMessage());
    document.getElementById('chatInput')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendChatMessage();
    });

    // Suggestion chips
    document.querySelectorAll('.chat-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        const suggestion = e.target.dataset.suggestion;
        this.handleSuggestion(suggestion);
      });
    });

    // Voice button - using Web Speech API
    this.setupChatVoiceInput();

    // Render welcome message
    this.renderWelcomeMessage();

    // Show trip banner if active
    this.updateChatTripBanner();
  }


  setupChatVoiceInput() {
    const voiceBtn = document.getElementById('chatVoiceBtn');
    if (!voiceBtn) return;

    // Check for Web Speech API support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // Web Speech API not supported - hide button
      voiceBtn.style.display = 'none';
      console.warn('Web Speech API not supported');
      return;
    }

    let isListening = false;
    let recognition = null;

    voiceBtn.addEventListener('click', () => {
      if (isListening) {
        // Stop listening
        if (recognition) {
          recognition.stop();
        }
        return;
      }

      // Start listening
      recognition = new SpeechRecognition();
      recognition.lang = this.currentLang === 'he' ? 'he-IL' : 'en-US';
      recognition.continuous = false;
      recognition.interimResults = true;

      // Update UI
      isListening = true;
      voiceBtn.classList.add('recording');
      voiceBtn.innerHTML = '🔴';
      this.showToast(this.t('voice.listening') || '🎤 Listening...', 'info', 2000);

      recognition.onresult = (event) => {
        const input = document.getElementById('chatInput');
        let transcript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        
        if (input) {
          input.value = transcript;
        }
        
        // If final result, send the message
        if (event.results[event.results.length - 1].isFinal) {
          if (input && input.value.trim()) {
            this.sendChatMessage();
          }
        }
      };

      recognition.onend = () => {
        isListening = false;
        voiceBtn.classList.remove('recording');
        voiceBtn.innerHTML = '🎤';
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        isListening = false;
        voiceBtn.classList.remove('recording');
        voiceBtn.innerHTML = '🎤';

        let errorMsg = this.t('voice.error') || 'Voice input error';
        if (event.error === 'not-allowed') {
          errorMsg = this.t('voice.mic_denied') || 'Microphone access denied';
        } else if (event.error === 'no-speech') {
          errorMsg = this.t('voice.no_speech') || 'No speech detected';
        }
        this.showToast(errorMsg, 'error');
      };

      try {
        recognition.start();
      } catch (error) {
        console.error('Failed to start recognition:', error);
        isListening = false;
        voiceBtn.classList.remove('recording');
        voiceBtn.innerHTML = '🎤';
        this.showToast(this.t('voice.error') || 'Could not start voice input', 'error');
      }
    });
  }

  renderWelcomeMessage() {
    const name = TenantStorage.getTenantName() || '';
    const container = document.getElementById('chatMessages');
    if (!container) return;

    // Create welcome card with AI capabilities
    const welcomeCard = document.createElement('div');
    welcomeCard.className = 'chat-welcome-card';
    welcomeCard.innerHTML = `
      <div class="welcome-avatar">🤖</div>
      <h3 class="welcome-title">${name ? `Hi ${this.escapeHtml(name)}!` : 'Hi!'} ${this.t('chat.welcome_intro') || "I'm your AI travel co-pilot"}</h3>
      <p class="welcome-subtitle">${this.t('chat.welcome_subtitle') || 'Here\'s what I can help you with:'}</p>
      <div class="welcome-capabilities">
        <div class="capability-item">
          <span class="capability-icon">🍽️</span>
          <span class="capability-text">${this.t('chat.capability_food') || 'Find restaurants & cafes'}</span>
        </div>
        <div class="capability-item">
          <span class="capability-icon">🎯</span>
          <span class="capability-text">${this.t('chat.capability_attractions') || 'Discover attractions'}</span>
        </div>
        <div class="capability-item">
          <span class="capability-icon">🌤️</span>
          <span class="capability-text">${this.t('chat.capability_weather') || 'Check weather conditions'}</span>
        </div>
        <div class="capability-item">
          <span class="capability-icon">🗺️</span>
          <span class="capability-text">${this.t('chat.capability_plan') || 'Plan your perfect day'}</span>
        </div>
        <div class="capability-item">
          <span class="capability-icon">📍</span>
          <span class="capability-text">${this.t('chat.capability_directions') || 'Get directions'}</span>
        </div>
      </div>
      <p class="welcome-prompt">${this.t('chat.welcome_prompt') || 'Ask me anything about travel!'}</p>
    `;
    container.appendChild(welcomeCard);
  }

  async sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;

    input.value = '';
    input.disabled = true;
    document.getElementById('chatSendBtn').disabled = true;

    // Add user message
    this.addChatMessage('user', message);

    // Show typing indicator
    this.showTypingIndicator();

    try {
      // Get context
      const context = this.getChatContext();

      // Call AI
      const response = await this.callChatAI(message, context);

      // Hide typing
      this.hideTypingIndicator();

      // Generate contextual actions based on message and response
      const actions = this.generateChatActions(message, response);

      // Show response with actions
      this.addChatMessage('assistant', response.content, actions);

    } catch (error) {
      console.error('Chat error:', error);
      this.hideTypingIndicator();

      // Store last message for retry
      this._lastChatMessage = message;

      // Add error message with retry button
      this.addChatErrorWithRetry(this.t('chat.error') || "Sorry, I couldn't process that.");
    }

    input.disabled = false;
    document.getElementById('chatSendBtn').disabled = false;
    input.focus();
  }

  generateChatActions(userMessage, response) {
    const actions = [];
    const msgLower = userMessage.toLowerCase();
    const contentLower = (response.content || '').toLowerCase();

    // If response contains place data, add place-specific actions
    if (response.place) {
      const placeData = {
        place: {
          id: response.place.placeId || response.place.id,
          name: response.place.name,
          address: response.place.address || response.place.formattedAddress,
          lat: response.place.location?.latitude || response.place.lat,
          lng: response.place.location?.longitude || response.place.lng,
          rating: response.place.rating
        }
      };

      actions.push({
        type: 'navigate',
        label: this.t('chat.action_navigate') || 'Navigate',
        data: { lat: placeData.place.lat, lng: placeData.place.lng, address: placeData.place.address }
      });

      actions.push({
        type: 'add-to-trip',
        label: this.t('chat.action_add_trip') || 'Add to Trip',
        data: placeData
      });

      actions.push({
        type: 'save',
        label: this.t('chat.action_save') || 'Save',
        data: placeData
      });

      return actions;
    }

    // Detect search intent - offer to search
    const searchKeywords = ['restaurant', 'cafe', 'coffee', 'food', 'eat', 'museum', 'park', 'beach', 'hotel', 'bar', 'shop', 'attraction'];
    const hasSearchIntent = searchKeywords.some(kw => msgLower.includes(kw) || contentLower.includes(kw));

    if (hasSearchIntent) {
      // Extract the most relevant search term
      const foundKeyword = searchKeywords.find(kw => msgLower.includes(kw)) || searchKeywords.find(kw => contentLower.includes(kw));
      if (foundKeyword) {
        actions.push({
          type: 'search',
          label: this.t('chat.action_search') || `Search ${foundKeyword}s`,
          data: { query: foundKeyword }
        });
      }
    }

    // Detect planning intent - offer to start trip wizard
    const planKeywords = ['plan', 'trip', 'itinerary', 'day trip', 'weekend', 'vacation'];
    const hasPlanIntent = planKeywords.some(kw => msgLower.includes(kw));

    if (hasPlanIntent && actions.length === 0) {
      actions.push({
        type: 'search',
        label: this.t('chat.action_plan_trip') || 'Plan a Trip',
        data: { query: 'trip' }
      });
    }

    // Weather queries - offer current location
    if (msgLower.includes('weather') && this.userLocation) {
      actions.push({
        type: 'navigate',
        label: this.t('chat.action_current_location') || 'My Location',
        data: { lat: this.userLocation.lat, lng: this.userLocation.lon }
      });
    }

    return actions;
  }

  addChatErrorWithRetry(errorMessage) {
    const container = document.getElementById('chatMessages');
    if (!container) return;

    const bubble = document.createElement('div');
    bubble.className = 'chat-message assistant error-recovery-state';
    bubble.innerHTML = `
      <div style="margin-bottom: 8px;">${this.escapeHtml(errorMessage)}</div>
      <button class="retry-chat-btn" style="padding: 6px 14px; font-size: 13px; border-radius: 8px; background: var(--ios-blue, #007AFF); color: white; border: none; cursor: pointer; font-weight: 500; margin-right: 8px;">
        🔄 ${this.t('common.retry') || 'Retry'}
      </button>
    `;
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;

    // Attach retry handler
    const retryBtn = bubble.querySelector('.retry-chat-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        // Remove error bubble
        bubble.remove();

        // Retry with stored message
        if (this._lastChatMessage) {
          const input = document.getElementById('chatInput');
          input.value = this._lastChatMessage;
          this.sendChatMessage();
        }
      });
    }
  }

  addChatMessage(role, content, actions = null) {
    const container = document.getElementById('chatMessages');
    if (!container) return;

    const msg = { id: Date.now(), role, content, timestamp: new Date() };
    this.chatHistory.push(msg);

    const bubble = document.createElement('div');
    bubble.className = `chat-message ${role}`;

    // Basic message content
    let html = `<div class="chat-content">${this.escapeHtml(content)}</div>`;

    // Add action cards if provided
    if (actions && actions.length > 0) {
      html += `<div class="chat-actions">`;
      actions.forEach(action => {
        const icon = this.getChatActionIcon(action.type);
        html += `
          <button class="chat-action-btn" data-action-type="${action.type}" data-action-data='${JSON.stringify(action.data || {})}'>
            <span class="chat-action-icon">${icon}</span>
            <span class="chat-action-label">${this.escapeHtml(action.label)}</span>
          </button>
        `;
      });
      html += `</div>`;
    }

    bubble.innerHTML = html;
    container.appendChild(bubble);

    // Attach action handlers
    bubble.querySelectorAll('.chat-action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const actionType = btn.getAttribute('data-action-type');
        let actionData = {};
        try {
          actionData = JSON.parse(btn.getAttribute('data-action-data') || '{}');
        } catch (e) { /* ignore */ }
        this.handleChatAction(actionType, actionData);
      });
    });

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
  }

  getChatActionIcon(type) {
    const icons = {
      'navigate': '📍',
      'add-to-trip': '➕',
      'save': '❤️',
      'search': '🔍',
      'call': '📞',
      'share': '📤',
      'book': '🎫'
    };
    return icons[type] || '▶️';
  }

  handleChatAction(actionType, data) {
    console.log('Chat action:', actionType, data);

    switch (actionType) {
      case 'navigate':
        // Open Google Maps with coordinates or address
        if (data.lat && data.lng) {
          const url = `https://www.google.com/maps/dir/?api=1&destination=${data.lat},${data.lng}`;
          window.open(url, '_blank');
          this.showToast(this.t('chat.opening_maps') || 'Opening Google Maps...', 'info');
        } else if (data.address) {
          const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(data.address)}`;
          window.open(url, '_blank');
          this.showToast(this.t('chat.opening_maps') || 'Opening Google Maps...', 'info');
        } else {
          this.showToast(this.t('chat.no_location') || 'No location available', 'warning');
        }
        break;

      case 'add-to-trip':
        // Add place to trip queue
        if (data.place) {
          const tripQueue = TenantStorage.get('trip-queue', []);
          const placeId = data.place.placeId || data.place.id || `chat-${Date.now()}`;

          // Check if already in queue
          if (tripQueue.some(p => p.id === placeId)) {
            this.showToast(this.t('trip.already_in_queue') || 'Already in trip queue', 'info');
            return;
          }

          tripQueue.push({
            id: placeId,
            name: data.place.name,
            address: data.place.address,
            lat: data.place.lat,
            lng: data.place.lng,
            rating: data.place.rating,
            addedAt: Date.now()
          });
          TenantStorage.set('trip-queue', tripQueue);
          this.showToast(this.t('trip.added_to_queue') || 'Added to trip!', 'success');
        } else {
          this.showToast(this.t('chat.no_place_data') || 'Cannot add - no place data', 'error');
        }
        break;

      case 'save':
        // Save place to favorites
        if (data.place) {
          const savedPlaces = TenantStorage.get('saved-places', []);
          const placeId = data.place.placeId || data.place.id || `chat-${Date.now()}`;

          // Check if already saved
          if (savedPlaces.some(p => p.id === placeId)) {
            this.showToast(this.t('places.already_saved') || 'Already saved', 'info');
            return;
          }

          savedPlaces.push({
            id: placeId,
            name: data.place.name,
            address: data.place.address,
            lat: data.place.lat,
            lng: data.place.lng,
            rating: data.place.rating,
            savedAt: Date.now()
          });
          TenantStorage.set('saved-places', savedPlaces);
          this.showToast(this.t('places.saved_success') || 'Saved to favorites!', 'success');
        } else {
          this.showToast(this.t('chat.no_place_data') || 'Cannot save - no place data', 'error');
        }
        break;

      case 'search':
        // Perform search with the query
        if (data.query) {
          this.showView('search');
          const searchInput = document.getElementById('freeText');
          if (searchInput) {
            searchInput.value = data.query;
            setTimeout(() => this.performSearch(), 100);
          }
        }
        break;

      case 'call':
        // Open phone dialer
        if (data.phone) {
          window.open(`tel:${data.phone}`, '_self');
        }
        break;

      case 'share':
        // Share content
        if (navigator.share && data.text) {
          navigator.share({
            title: data.title || 'RoamWise',
            text: data.text,
            url: data.url
          }).catch(() => {});
        } else {
          // Fallback: copy to clipboard
          if (data.text) {
            navigator.clipboard?.writeText(data.text);
            this.showToast(this.t('common.copied') || 'Copied to clipboard', 'success');
          }
        }
        break;

      default:
        console.log('Unknown chat action:', actionType);
    }
  }

  showTypingIndicator() {
    const container = document.getElementById('chatMessages');
    if (!container) return;

    const typing = document.createElement('div');
    typing.id = 'typingIndicator';
    typing.className = 'chat-message assistant typing';
    typing.innerHTML = `<div class="typing-dots"><span></span><span></span><span></span></div>`;
    container.appendChild(typing);
    container.scrollTop = container.scrollHeight;
  }

  hideTypingIndicator() {
    document.getElementById('typingIndicator')?.remove();
  }

  getChatContext() {
    const activeTrip = TenantStorage.get('activeTrip');
    return {
      activeTrip: activeTrip ? JSON.parse(activeTrip) : null,
      location: this.userLocation || null,
      lang: window.currentLang || 'en',
      history: this.chatHistory.slice(-10) // Last 10 messages for context
    };
  }

  async callChatAI(message, context) {
    // Use existing proxy endpoint
    const API_BASE = 'https://roamwise-proxy-971999716773.us-central1.run.app';

    const systemPrompt = `You are an expert travel co-pilot for Israel and worldwide destinations.
Your role: Help users discover places, plan trips, and navigate their journeys.
Language: Respond in ${context.lang === 'he' ? 'Hebrew' : 'English'}.
${context.activeTrip ? `Active trip: ${JSON.stringify(context.activeTrip)}` : ''}
${context.location ? `User location: ${context.location.lat}, ${context.location.lng}` : ''}

Guidelines:
- Keep responses concise (2-3 sentences)
- Be helpful and friendly
- For non-travel topics, politely redirect to travel
- Suggest relevant actions when appropriate`;

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          context: systemPrompt,
          history: context.history.map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (response.ok) {
        const data = await response.json();
        return { content: data.response || data.message || data.content };
      }
    } catch (e) {
      console.warn('Chat API error, using fallback:', e);
    }

    // Fallback: simple response
    return {
      content: this.t('chat.fallback_response') || "I'm here to help with your travel plans! Try asking about restaurants, attractions, or trip planning."
    };
  }

  handleSuggestion(type) {
    const suggestions = {
      food: this.t('chat.prompt_food') || 'Find good restaurants near me',
      weather: this.t('chat.prompt_weather') || "What's the weather like today?",
      plan: this.t('chat.prompt_plan') || 'Help me plan a day trip',
      nearby: this.t('chat.prompt_nearby') || "What's interesting nearby?"
    };

    const input = document.getElementById('chatInput');
    if (input) {
      input.value = suggestions[type] || '';
      input.focus();
    }
  }

  updateChatTripBanner() {
    const banner = document.getElementById('chatTripBanner');
    const activeTrip = TenantStorage.get('activeTrip');
    if (banner) {
      banner.style.display = activeTrip ? 'block' : 'none';
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.simpleApp = new SimpleNavigation();
  });
} else {
  window.simpleApp = new SimpleNavigation();
}

// Listen for service worker update events
window.addEventListener('update-available', (e) => {
  const notification = document.getElementById('updateNotification');
  if (notification) {
    notification.classList.remove('hidden');
  }
});

console.log('Traveling iOS App loaded');
