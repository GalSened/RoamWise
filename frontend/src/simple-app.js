// Simple JavaScript implementation to ensure navigation works
console.log('Simple app starting...');

// API Configuration - use environment variable or fallback to Cloud Run proxy
const API_BASE_URL = import.meta.env.VITE_PROXY_URL || 'https://roamwise-proxy-971999716773.us-central1.run.app';

class SimpleNavigation {
  constructor() {
    this.currentView = 'search';
    this.init();
  }

  init() {
    console.log('Initializing navigation...');
    this.setupNavigation();
    this.setupThemeToggle();
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
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.simpleApp = new SimpleNavigation();
  });
} else {
  window.simpleApp = new SimpleNavigation();
}

// Basic form interactions
document.addEventListener('DOMContentLoaded', () => {
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

  // Search functionality with Personal AI
  const searchBtn = document.getElementById('searchBtn');
  const searchInput = document.getElementById('freeText');
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
              'X-Lang': 'en'
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
  }

  // Trip generation with Personal AI
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
            'X-Lang': 'en'
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
          tripDisplay.style.display = 'block';
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
        tripDisplay.style.display = 'block';
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
    });
  }

  // Voice button
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
});

console.log('Simple app loaded');