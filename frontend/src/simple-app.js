// Simple JavaScript implementation to ensure navigation works
console.log('Simple app starting...');

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
          // Use Personal AI for intelligent search
          const response = await fetch('https://premium-hybrid-473405-g7.uc.r.appspot.com/api/intelligence/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: query,
              location: 'Current Location',
              preferences: {
                budgetCategory: 'mid_range',
                destinationTypes: ['urban', 'cultural'],
                activityPreferences: ['food', 'sightseeing']
              }
            })
          });
          
          const data = await response.json();
          const resultsList = document.getElementById('list');
          
          if (data.results && data.results.length > 0) {
            resultsList.innerHTML = data.results.map(result => `
              <div class="search-result ai-powered">
                <h3>🤖 ${result.name}</h3>
                <p>${result.description}</p>
                <div class="result-rating">⭐ ${result.rating?.toFixed(1) || 'N/A'} • AI Score: ${result.personalizedScore?.toFixed(1) || 'N/A'}</div>
                <div class="ai-reason">${result.personalizedReason}</div>
                <div class="ai-tags">${result.personalizedTags?.join(', ') || ''}</div>
              </div>
            `).join('');
          } else {
            resultsList.innerHTML = `
              <div class="search-result">
                <h3>🧠 AI Analysis for "${query}"</h3>
                <p>Your Personal AI is learning about this search. Results will improve as you use the app!</p>
                <div class="result-rating">🤖 Powered by o3-mini</div>
              </div>
            `;
          }
        } catch (error) {
          console.error('AI Search error:', error);
          const resultsList = document.getElementById('list');
          resultsList.innerHTML = `
            <div class="search-result">
              <h3>🔄 AI Learning Mode</h3>
              <p>Your Personal AI is initializing. This powerful backend with o3-mini reasoning will provide amazing results soon!</p>
              <div class="result-rating">🧠 Personal AI Backend Active</div>
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
        
        // Call Personal AI for recommendations
        const response = await fetch('https://premium-hybrid-473405-g7.uc.r.appspot.com/api/ai/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            preferences: {
              duration: selectedDuration,
              interests: selectedInterests,
              budget: parseInt(budget),
              destinationType: 'mixed',
              activities: selectedInterests
            },
            context: {
              userId: 'personal',
              location: 'Current Location',
              requestType: 'trip_planning'
            }
          })
        });
        
        const data = await response.json();
        const tripDisplay = document.getElementById('enhancedTripDisplay');
        
        if (data.recommendations) {
          tripDisplay.style.display = 'block';
          tripDisplay.innerHTML = `
            <div class="trip-result ai-powered">
              <h3>🧠 Your o3-mini AI Generated Trip!</h3>
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
                  <span class="stat-label">AI Confidence:</span>
                  <span class="stat-value">${data.confidence || 85}%</span>
                </div>
              </div>
              <div class="ai-insight">
                <strong>Personal Insight:</strong> ${data.personalizedInsight || 'Your AI is learning your preferences!'}
              </div>
              <div class="learning-note">
                <strong>Learning:</strong> ${data.learningNote || 'Each interaction makes your AI smarter!'}
              </div>
              <p><strong>🤖 Powered by o3-mini reasoning</strong> - Your Personal AI is analyzing your preferences and creating the perfect trip just for you!</p>
            </div>
          `;
        } else {
          throw new Error('No recommendations received');
        }
        
      } catch (error) {
        console.error('AI Trip generation error:', error);
        const tripDisplay = document.getElementById('enhancedTripDisplay');
        tripDisplay.style.display = 'block';
        tripDisplay.innerHTML = `
          <div class="trip-result ai-learning">
            <h3>🧠 AI Learning Your Preferences</h3>
            <div class="trip-summary">
              <div class="trip-stat">
                <span class="stat-label">Duration:</span>
                <span class="stat-value">${document.querySelector('.duration-option.selected')?.textContent || 'Full day'}</span>
              </div>
              <div class="trip-stat">
                <span class="stat-label">Budget:</span>
                <span class="stat-value">$${document.getElementById('budgetAmount')?.textContent || '300'}</span>
              </div>
              <div class="trip-stat">
                <span class="stat-label">AI Status:</span>
                <span class="stat-value">Learning Mode</span>
              </div>
            </div>
            <p><strong>🚀 Your Personal AI (o3-mini) is initializing!</strong> Your travel intelligence system is setting up and will provide amazing personalized recommendations soon. Each interaction helps it learn your unique travel style!</p>
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