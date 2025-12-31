// RoamWise iOS-style App - Full implementation with bug fixes
console.log('RoamWise iOS App starting...');

// API Configuration - use environment variable or fallback to Cloud Run proxy
const API_BASE_URL = 'https://roamwise-proxy-971999716773.us-central1.run.app';

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

class SimpleNavigation {
  constructor() {
    this.currentView = 'search';
    this.selectedInterests = [];
    this.tripsPlanned = parseInt(localStorage.getItem('tripsPlanned') || '0');
    this.placesVisited = parseInt(localStorage.getItem('placesVisited') || '0');
    this.init();
  }

  init() {
    console.log('Initializing iOS-style navigation...');
    this.setupNavigation();
    this.setupThemeToggle();
    this.setupLanguageToggle();
    this.setupFormInteractions();
    this.updateProfileStats();
    this.showView('search');
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
        // Use relative path for Vite base path compatibility
        const basePath = import.meta.env?.BASE_URL || '/';
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

    // Expose translation helper
    this.t = (key) => {
      return this.translations[this.currentLang]?.[key] || key;
    };

    if (langHe) {
      langHe.addEventListener('click', () => setLanguage('he'));
    }

    if (langEn) {
      langEn.addEventListener('click', () => setLanguage('en'));
    }

    // Load saved language (default to 'he' - Hebrew)
    const savedLang = localStorage.getItem('app-language') || 'he';
    setLanguage(savedLang);
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

    if (searchBtn && searchInput) {
      searchBtn.addEventListener('click', async () => {
        const query = searchInput.value.trim();

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

        console.log('Searching with Personal AI for:', query);
        searchBtn.textContent = this.t('search.searching') || 'AI Searching...';
        searchBtn.disabled = true;

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
            localStorage.setItem('placesVisited', this.placesVisited.toString());
            this.updateProfileStats();

            resultsList.innerHTML = data.items.map(place => {
              // FIX: Format price level properly
              const priceDisplay = formatPriceLevel(place.priceLevel);

              return `
                <div class="ios-card search-result" style="cursor: pointer;" onclick="window.open('https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.displayName?.text || place.name || '')}', '_blank')">
                  <div class="ios-card-content">
                    <h3 style="margin: 0 0 0.25rem; font-size: 17px; font-weight: 600;">📍 ${place.displayName?.text || place.name || 'Unknown'}</h3>
                    <p style="margin: 0 0 0.5rem; color: var(--label-secondary); font-size: 15px;">${place.formattedAddress || place.vicinity || ''}</p>
                    <div style="display: flex; gap: 1rem; font-size: 13px; color: var(--label-secondary);">
                      <span>⭐ ${place.rating?.toFixed(1) || 'N/A'} (${place.userRatingCount || 0})</span>
                      ${priceDisplay ? `<span>💰 ${priceDisplay}</span>` : ''}
                    </div>
                  </div>
                </div>
              `;
            }).join('');
          } else {
            // FIX: Truncate long query in error message
            const displayQuery = truncateText(query, 40);
            resultsList.innerHTML = `
              <div class="ios-empty-state" style="text-align: center; padding: 3rem 1.5rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
                <h3 style="margin: 0 0 0.5rem;">${this.t('search.no_results') || 'No Results'}</h3>
                <p style="margin: 0; color: var(--label-secondary);">${this.t('search.no_results_for') || 'No results for'} "<span class="ios-error-query">${displayQuery}</span>"</p>
                <p style="margin: 0.5rem 0 0; color: var(--label-tertiary); font-size: 13px;">${this.t('search.try_different') || 'Try a different search term'}</p>
              </div>
            `;
          }
        } catch (error) {
          console.error('Search error:', error);
          resultsList.innerHTML = `
            <div class="ios-empty-state" style="text-align: center; padding: 3rem 1.5rem;">
              <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
              <h3 style="margin: 0 0 0.5rem;">${this.t('error.search') || 'Search Error'}</h3>
              <p style="margin: 0; color: var(--label-secondary);">${this.t('error.try_again') || 'Unable to connect. Please try again.'}</p>
            </div>
          `;
        }

        searchBtn.textContent = this.t('search.button') || 'Search';
        searchBtn.disabled = false;
      });
    } else {
      console.error('Search elements not found - Button:', !!searchBtn, 'Input:', !!searchInput);
    }
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
            localStorage.setItem('tripsPlanned', this.tripsPlanned.toString());
            this.updateProfileStats();

            tripDisplay.innerHTML = `
              <div class="ios-card trip-result">
                <div class="ios-card-content">
                  <h3 style="margin: 0 0 1rem; font-size: 20px; font-weight: 600;">🗺️ ${this.t('trip.your_trip') || 'Your AI-Powered Trip!'}</h3>

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
                      <div style="font-size: 13px; color: var(--label-secondary);">${this.t('trip.stops') || 'Stops'}</div>
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
                </div>
              </div>
            `;

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
                <h3 style="margin: 0 0 0.5rem;">${this.t('error.trip') || 'Trip Planning Error'}</h3>
                <p style="margin: 0; color: var(--label-secondary);">${this.t('error.try_again') || 'Unable to generate trip. Please try again.'}</p>
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

    if (tripsEl) tripsEl.textContent = this.tripsPlanned;
    if (placesEl) placesEl.textContent = this.placesVisited;
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

      // Fetch weather from hazards API
      const response = await fetch(
        `${API_BASE_URL}/api/hazards?lat=${lat}&lon=${lon}&radius=5000`
      );

      if (response.ok) {
        const data = await response.json();
        const weather = data.conditions || {};

        if (responseEl) {
          const temp = weather.temperature !== undefined
            ? `${Math.round(weather.temperature)}°C`
            : 'N/A';
          const desc = weather.description || 'Clear';
          const humidity = weather.humidity ? `${weather.humidity}%` : 'N/A';
          const wind = weather.windSpeed ? `${weather.windSpeed} m/s` : 'N/A';

          responseEl.innerHTML = `
            <div class="ios-card weather-card" style="background: linear-gradient(135deg, var(--ios-blue), #3B82F6); color: white;">
              <div class="ios-card-content" style="padding: 1.5rem;">
                <h4 style="margin: 0 0 0.5rem; font-size: 15px; opacity: 0.9;">🌤️ ${this.t('weather.current') || 'Current Weather'}</h4>
                <p style="margin: 0; font-size: 2.5rem; font-weight: 700;">${temp}</p>
                <p style="margin: 0.25rem 0; font-size: 17px;">${desc}</p>
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.2); display: flex; gap: 1.5rem; font-size: 13px; opacity: 0.9;">
                  <span>💧 ${humidity}</span>
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
          <div class="ios-card" style="background: var(--ios-red-bg, #FEE2E2); border: 1px solid var(--ios-red);">
            <div class="ios-card-content" style="text-align: center; padding: 1.5rem;">
              <div style="font-size: 2rem; margin-bottom: 0.5rem;">⚠️</div>
              <p style="margin: 0;">${this.t('weather.error') || 'Unable to get weather. Please try again.'}</p>
            </div>
          </div>
        `;
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
      const response = await fetch(
        `${API_BASE_URL}/api/hazards?lat=${lat}&lon=${lon}&radius=10000`
      );

      if (!response.ok) throw new Error('Weather API failed');

      const data = await response.json();
      const weather = data.conditions || {};
      const alerts = data.alerts || [];

      const insights = [];
      const temp = weather.temperature;
      const description = (weather.description || '').toLowerCase();
      const windSpeed = weather.windSpeed || 0;
      const humidity = weather.humidity || 0;

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

      // Add any official alerts
      if (alerts.length > 0) {
        alerts.forEach(alert => {
          insights.push({
            type: 'alert',
            icon: '⚠️',
            title: alert.event || 'Weather Alert',
            message: alert.description || 'Check local weather services for details.'
          });
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
          localStorage.setItem('tripsPlanned', this.tripsPlanned.toString());
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
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.simpleApp = new SimpleNavigation();
  });
} else {
  window.simpleApp = new SimpleNavigation();
}

console.log('RoamWise iOS App loaded');
