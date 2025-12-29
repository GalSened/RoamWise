// Simple JavaScript implementation to ensure navigation works
console.log('Simple app starting...');

// API Configuration - use environment variable or fallback to Cloud Run proxy
const API_BASE_URL = 'https://roamwise-proxy-971999716773.us-central1.run.app';

class SimpleNavigation {
  constructor() {
    this.currentView = 'search';
    this.init();
  }

  init() {
    console.log('Initializing navigation...');
    this.setupNavigation();
    this.setupThemeToggle();
    this.setupLanguageToggle();
    this.setupFormInteractions(); // Add this to ensure search works
    this.showView('search');
  }

  setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.app-view');

    console.log('Found nav buttons:', navButtons.length);
    console.log('Found views:', views.length);

    navButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetView = button.getAttribute('data-view');
        console.log('Navigation clicked:', targetView);
        this.showView(targetView);
      });
    });
  }

  showView(viewName) {
    console.log('Showing view:', viewName);
    
    // Hide all views
    const views = document.querySelectorAll('.app-view');
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

    // Update navigation buttons
    const navButtons = document.querySelectorAll('.nav-btn');
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
        localStorage.setItem('app-theme', newTheme);
        console.log('Theme changed to:', newTheme);
      });
    }

    // Load saved theme
    const savedTheme = localStorage.getItem('app-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  setupLanguageToggle() {
    const langHe = document.getElementById('langHe');
    const langEn = document.getElementById('langEn');

    const setLanguage = (lang) => {
      // Update active class
      if (lang === 'he') {
        langHe.classList.add('active');
        langEn.classList.remove('active');
        document.body.setAttribute('dir', 'rtl');
      } else {
        langEn.classList.add('active');
        langHe.classList.remove('active');
        document.body.setAttribute('dir', 'ltr');
      }

      // Save to localStorage
      localStorage.setItem('app-language', lang);
      console.log('Language changed to:', lang);
    };

    if (langHe) {
      langHe.addEventListener('click', () => setLanguage('he'));
    }

    if (langEn) {
      langEn.addEventListener('click', () => setLanguage('en'));
    }

    // Load saved language (default to 'en')
    const savedLang = localStorage.getItem('app-language') || 'en';
    setLanguage(savedLang);
  }

  setupFormInteractions() {
    console.log('Setting up form interactions...');
    
    // Budget slider
    const budgetSlider = document.getElementById('budgetRange');
    const budgetAmount = document.getElementById('budgetAmount');
    if (budgetSlider && budgetAmount) {
      budgetSlider.addEventListener('input', () => {
        budgetAmount.textContent = budgetSlider.value;
      });
    }

    // Duration options
    document.querySelectorAll('.duration-option').forEach(option => {
      option.addEventListener('click', () => {
        document.querySelectorAll('.duration-option').forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');
      });
    });

    // Interest options
    document.querySelectorAll('.interest-option').forEach(option => {
      option.addEventListener('click', () => {
        const selected = document.querySelectorAll('.interest-option.selected');
        if (option.classList.contains('selected')) {
          option.classList.remove('selected');
        } else if (selected.length < 4) {
          option.classList.add('selected');
        } else {
          alert('Maximum 4 interests allowed');
        }
      });
    });

    this.setupSearch();
    this.setupTripGeneration();
    this.setupVoiceButton();
    this.setupPlannerUI();
  }

  setupSearch() {
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('freeText');
    console.log('Setting up search - Button:', !!searchBtn, 'Input:', !!searchInput);
    
    if (searchBtn && searchInput) {
      searchBtn.addEventListener('click', async () => {
        const query = searchInput.value.trim();
        if (query) {
          console.log('Searching with Personal AI for:', query);
          searchBtn.textContent = 'AI Searching...';
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
            const resultsList = document.getElementById('list');

            if (data.ok && data.items && data.items.length > 0) {
              resultsList.innerHTML = data.items.map(place => `
                <div class="search-result ai-powered">
                  <h3>📍 ${place.displayName?.text || place.name || 'Unknown'}</h3>
                  <p>${place.formattedAddress || place.vicinity || ''}</p>
                  <div class="result-rating">⭐ ${place.rating?.toFixed(1) || 'N/A'} (${place.userRatingCount || 0} reviews)</div>
                  ${place.priceLevel ? `<div class="price-level">💰 ${place.priceLevel}</div>` : ''}
                </div>
              `).join('');
            } else {
              resultsList.innerHTML = `
                <div class="search-result">
                  <h3>🔍 No results for "${query}"</h3>
                  <p>Try a different search term or location.</p>
                </div>
              `;
            }
          } catch (error) {
            console.error('Search error:', error);
            const resultsList = document.getElementById('list');
            resultsList.innerHTML = `
              <div class="search-result">
                <h3>⚠️ Search Error</h3>
                <p>Unable to connect to search service. Please try again.</p>
                <div class="error-detail">${error.message}</div>
              </div>
            `;
          }
          
          searchBtn.textContent = 'Search';
          searchBtn.disabled = false;
        }
      });
    } else {
      console.error('Search elements not found - Button:', !!searchBtn, 'Input:', !!searchInput);
    }
  }

  setupTripGeneration() {
    const generateBtn = document.getElementById('generateTripBtn');
    if (generateBtn) {
      generateBtn.addEventListener('click', async () => {
        console.log('Generating AI-powered trip...');
        generateBtn.textContent = '🧠 AI Thinking...';
        generateBtn.disabled = true;
        
        try {
          // Collect user preferences
          const selectedDuration = document.querySelector('.duration-option.selected')?.textContent || 'Full day';
          const selectedInterests = Array.from(document.querySelectorAll('.interest-option.selected')).map(el => el.textContent);
          const budget = document.getElementById('budgetAmount')?.textContent || '300';
          
          // Map interests to Google Places types
          const interestToType = {
            '🍽️ Food': 'restaurant',
            '🌿 Nature': 'park',
            '🏛️ Culture': 'museum',
            '🛍️ Shopping': 'shopping_mall',
            '🎯 Entertainment': 'tourist_attraction',
            '😌 Relaxation': 'spa'
          };
          const types = selectedInterests.map(i => interestToType[i] || 'tourist_attraction').filter(Boolean);

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
              near_origin: {
                radius_km: 10,
                types: types.length > 0 ? types : ['tourist_attraction', 'restaurant'],
                min_rating: 4.0,
                limit: 10
              }
            })
          });

          const data = await response.json();
          const tripDisplay = document.getElementById('enhancedTripDisplay');

          if (data.ok && data.plan) {
            const { summary, timeline } = data.plan;
            tripDisplay.innerHTML = `
              <div class="trip-result ai-powered">
                <h3>🗺️ Your AI-Powered Trip!</h3>
                <div class="trip-summary">
                  <div class="trip-stat">
                    <span class="stat-label">Duration:</span>
                    <span class="stat-value">${selectedDuration}</span>
                  </div>
                  <div class="trip-stat">
                    <span class="stat-label">Budget:</span>
                    <span class="stat-value">$${budget}</span>
                  </div>
                  <div class="trip-stat">
                    <span class="stat-label">Stops:</span>
                    <span class="stat-value">${summary.count || 0} places</span>
                  </div>
                </div>
                <div class="trip-timeline">
                  ${timeline.map((leg, idx) => `
                    <div class="timeline-item">
                      <div class="timeline-marker">${idx + 1}</div>
                      <div class="timeline-content">
                        <strong>${leg.to?.name || leg.to?.kind || 'Stop'}</strong>
                        ${leg.leg_seconds ? `<span class="travel-time">🚗 ${Math.round(leg.leg_seconds / 60)} min</span>` : ''}
                        ${leg.to?.rating ? `<span class="rating">⭐ ${leg.to.rating.toFixed(1)}</span>` : ''}
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `;
          } else {
            throw new Error(data.error || 'No plan generated');
          }
          
        } catch (error) {
          console.error('Trip generation error:', error);
          const tripDisplay = document.getElementById('enhancedTripDisplay');
          tripDisplay.innerHTML = `
            <div class="trip-result">
              <h3>⚠️ Trip Planning Error</h3>
              <p>Unable to generate trip plan. Please try again.</p>
              <div class="error-detail">${error.message}</div>
            </div>
          `;
        }
        
        generateBtn.textContent = '🤖 Generate Smart Trip';
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

    chipDistance.textContent = `📏 ${distance}`;
    chipDuration.textContent = `⏱️ ${duration}`;
    chipAvoid.textContent = `🚫 Avoid: ${avoid}`;

    // Show chips
    routeChips.style.display = 'flex';

    // Populate navigation links
    const origin = routeData?.origin || '32.08,34.78';
    const destination = routeData?.destination || '31.77,35.22';

    navWaze.href = `https://waze.com/ul?ll=${destination}&navigate=yes`;
    navGoogle.href = `https://www.google.com/maps/dir/${origin}/${destination}`;
    navApple.href = `https://maps.apple.com/?saddr=${origin}&daddr=${destination}`;

    // Show navigation links
    navLinks.style.display = 'flex';
  }

  setupVoiceButton() {
    const voiceBtn = document.getElementById('voiceBtn');
    if (voiceBtn) {
      let isListening = false;
      
      voiceBtn.addEventListener('mousedown', () => {
        if (!isListening) {
          isListening = true;
          voiceBtn.classList.add('listening');
          voiceBtn.querySelector('.voice-text').textContent = 'Listening... Release to stop';
          
          const statusEl = document.getElementById('voiceStatus');
          if (statusEl) {
            statusEl.textContent = '🎤 Listening for your voice command...';
          }
        }
      });

      voiceBtn.addEventListener('mouseup', () => {
        if (isListening) {
          isListening = false;
          voiceBtn.classList.remove('listening');
          voiceBtn.querySelector('.voice-text').textContent = 'Press & Hold to Speak';
          
          const statusEl = document.getElementById('voiceStatus');
          const responseEl = document.getElementById('voiceResponse');
          
          if (statusEl) {
            statusEl.textContent = '🤖 Processing your request...';
          }
          
          setTimeout(() => {
            if (statusEl) statusEl.textContent = '';
            if (responseEl) {
              responseEl.textContent = 'Demo: Voice recognition would work here. The AI would process your speech and provide intelligent responses!';
              responseEl.style.display = 'block';
            }
          }, 1500);
        }
      });

      voiceBtn.addEventListener('mouseleave', () => {
        if (isListening) {
          isListening = false;
          voiceBtn.classList.remove('listening');
          voiceBtn.querySelector('.voice-text').textContent = 'Press & Hold to Speak';
        }
      });
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
          const lang = document.documentElement.getAttribute('data-lang') || 'he';
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
            // Hotel mode: use origin_query
            const hotelInput = document.getElementById('hotelInput');
            const hotelName = hotelInput?.value?.trim();
            if (!hotelName) {
              resultsDiv.innerHTML = '<div data-testid="planner-error" style="padding:20px; color:#d32f2f;">⚠️ Please enter a hotel name</div>';
              btnPlanDay.disabled = false;
              btnPlanDay.textContent = document.querySelector('[data-i18n="planner.plan_day"]')?.textContent || 'Plan Day';
              return;
            }
            body.origin_query = hotelName;
          } else {
            // Current location mode: use geolocation
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
              // Fallback to Tel Aviv center
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
          const response = await fetch('https://roamwise-proxy-971999716773.us-central1.run.app/planner/plan-day', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-lang': lang
            },
            credentials: 'include',
            body: JSON.stringify(body)
          });
          
          const data = await response.json();
          
          if (!data.ok || !data.plan) {
            throw new Error(data.error || 'Plan failed');
          }
          
          // Render results
          const { plan } = data;
          const { summary, timeline } = plan;
          
          let html = '<div class="header">';
          html += `<div><strong>🗺️ Day Plan</strong></div>`;
          if (summary.origin_name) {
            html += `<div>📍 Starting from: ${summary.origin_name}</div>`;
          }
          html += `<div>🎯 Mode: ${summary.plan_mode} • POIs: ${summary.count}</div>`;
          if (summary.near_origin_scanned) {
            html += `<div>🔍 Near origin: ${summary.near_origin_count || 0} found</div>`;
          }
          if (summary.sar_scanned) {
            html += `<div>🛣️ Along route: ${summary.sar_count || 0} found</div>`;
          }
          html += '</div>';
          
          if (timeline && timeline.length > 0) {
            let cumMin = 0;
            for (const leg of timeline) {
              if (leg.to?.kind === 'poi') {
                const eta = leg.eta_seconds ? Math.round(leg.eta_seconds / 60) : null;
                cumMin = eta || cumMin;
                
                html += '<div class="poi">';
                html += `<div><strong>${leg.to.name || 'POI'}</strong></div>`;
                if (leg.to.rating) {
                  html += `<div class="meta">⭐ ${leg.to.rating.toFixed(1)}`;
                  if (leg.to.user_ratings_total) {
                    html += ` (${leg.to.user_ratings_total} reviews)`;
                  }
                  html += '</div>';
                }
                if (eta !== null) {
                  html += `<div class="meta">🕐 ETA: +${cumMin} min from start</div>`;
                }
                if (leg.to.detour_min !== undefined) {
                  html += `<div class="meta">🔀 Detour: ${leg.to.detour_min} min</div>`;
                }
                html += '</div>';
              }
            }
          } else {
            html += '<div style="padding:20px;">No POIs found. Try adjusting the radius or destination.</div>';
          }
          
          // Add SAR results if present
          if (summary.sar_results && summary.sar_results.length > 0) {
            html += '<hr><div class="header"><strong>🛣️ Along-Route Discoveries</strong></div>';
            for (const sar of summary.sar_results.slice(0, 6)) {
              html += '<div class="poi">';
              html += `<div><strong>${sar.name || 'Place'}</strong></div>`;
              if (sar.rating) {
                html += `<div class="meta">⭐ ${sar.rating.toFixed(1)}`;
                if (sar.user_ratings_total) {
                  html += ` (${sar.user_ratings_total} reviews)`;
                }
                html += '</div>';
              }
              if (sar.detour_min !== undefined) {
                html += `<div class="meta">🔀 Detour: ${sar.detour_min} min</div>`;
              }
              html += '</div>';
            }
          }
          
          resultsDiv.innerHTML = html;
          
        } catch (error) {
          console.error('Planner error:', error);
          resultsDiv.innerHTML = `<div data-testid="planner-error" style="padding:20px; color:#d32f2f;">❌ Error: ${error.message || 'Failed to plan day'}</div>`;
        } finally {
          btnPlanDay.disabled = false;
          btnPlanDay.textContent = document.querySelector('[data-i18n="planner.plan_day"]')?.textContent || 'Plan Day';
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

console.log('Simple app loaded');