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

  // Search functionality
  const searchBtn = document.getElementById('searchBtn');
  const searchInput = document.getElementById('freeText');
  if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', () => {
      const query = searchInput.value.trim();
      if (query) {
        console.log('Searching for:', query);
        searchBtn.textContent = 'Searching...';
        setTimeout(() => {
          searchBtn.textContent = 'Search';
          const resultsList = document.getElementById('list');
          if (resultsList) {
            resultsList.innerHTML = `
              <div class="search-result">
                <h3>Demo Result for "${query}"</h3>
                <p>This is a demo search result. In the full app, this would show real places.</p>
                <div class="result-rating">⭐ 4.2 (123 reviews)</div>
              </div>
            `;
          }
        }, 1000);
      }
    });
  }

  // Trip generation
  const generateBtn = document.getElementById('generateTripBtn');
  if (generateBtn) {
    generateBtn.addEventListener('click', () => {
      console.log('Generating trip...');
      generateBtn.textContent = 'Generating...';
      generateBtn.disabled = true;
      
      setTimeout(() => {
        generateBtn.textContent = '🤖 Generate Smart Trip';
        generateBtn.disabled = false;
        
        const tripDisplay = document.getElementById('enhancedTripDisplay');
        if (tripDisplay) {
          tripDisplay.style.display = 'block';
          tripDisplay.innerHTML = `
            <div class="trip-result">
              <h3>🎉 Your AI-Generated Trip is Ready!</h3>
              <div class="trip-summary">
                <div class="trip-stat">
                  <span class="stat-label">Duration:</span>
                  <span class="stat-value">Full Day (8 hours)</span>
                </div>
                <div class="trip-stat">
                  <span class="stat-label">Budget:</span>
                  <span class="stat-value">$${document.getElementById('budgetAmount')?.textContent || '300'}</span>
                </div>
                <div class="trip-stat">
                  <span class="stat-label">Stops:</span>
                  <span class="stat-value">5 amazing places</span>
                </div>
              </div>
              <p>Your personalized trip plan has been created! In the full app, this would show detailed itinerary with real places, timing, and navigation.</p>
            </div>
          `;
        }
      }, 2000);
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