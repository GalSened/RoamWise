import type { VoiceIntent, UpdateInfo, Place, Route, TripPlan } from '@/types';
import { EventBus } from '@/lib/utils/events';
import { telemetry } from '@/lib/telemetry';

interface UIConfig {
  planningManager: any;
  voiceManager: any;
  navigationManager: any;
  aiOrchestrator: any;
  providers: any;
}

export class UIManager extends EventBus {
  private config: UIConfig;
  private isInitialized = false;
  private currentView = 'search';

  constructor(config: UIConfig) {
    super();
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    this.setupNavigation();
    this.setupVoiceUI();
    this.setupPlanningUI();
    this.setupSearchUI();
    this.setupUpdateUI();
    this.setupThemeToggle();

    this.isInitialized = true;
    telemetry.track('ui_manager_initialized');
  }

  private setupNavigation(): void {
    // Support both nav-item and nav-btn classes for compatibility
    const navItems = document.querySelectorAll('.nav-item, .nav-btn');
    const views = document.querySelectorAll('.mobile-view, .app-view');

    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const targetView = item.getAttribute('data-view');
        if (!targetView) return;

        // Update navigation
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');

        // Update views
        views.forEach(view => view.classList.remove('active'));
        const targetElement = document.querySelector(`[data-view="${targetView}"]`);
        if (targetElement) {
          targetElement.classList.add('active');
        }

        this.currentView = targetView;
        this.emit('view-changed', { view: targetView });
        telemetry.track('view_changed', { view: targetView });

        // Handle view-specific initialization
        this.handleViewChange(targetView);
      });
    });
  }

  private handleViewChange(view: string): void {
    switch (view) {
      case 'map':
        this.emit('map-view-activated');
        break;
      case 'trip':
        this.initializeTripPlanning();
        break;
      case 'ai':
        this.initializeAIInterface();
        break;
      case 'voice':
        this.initializeVoiceInterface();
        break;
    }
  }

  private setupVoiceUI(): void {
    const voiceBtn = document.getElementById('voiceBtn');
    if (!voiceBtn) return;

    let isHolding = false;

    const startListening = async () => {
      if (isHolding) return;
      isHolding = true;
      
      try {
        await this.config.voiceManager.startPressAndHold();
        voiceBtn.classList.add('listening');
        this.showVoiceStatus('Listening... Release to stop');
        telemetry.track('voice_press_and_hold_started');
      } catch (error) {
        console.error('Voice listening failed:', error);
        this.showVoiceStatus('Voice not available');
        isHolding = false;
      }
    };

    const stopListening = async () => {
      if (!isHolding) return;
      isHolding = false;

      try {
        await this.config.voiceManager.endPressAndHold();
        voiceBtn.classList.remove('listening');
        this.showVoiceStatus('Processing...');
        telemetry.track('voice_press_and_hold_ended');
      } catch (error) {
        console.error('Voice stop failed:', error);
        this.showVoiceStatus('');
      }
    };

    // Mouse events
    voiceBtn.addEventListener('mousedown', startListening);
    voiceBtn.addEventListener('mouseup', stopListening);
    voiceBtn.addEventListener('mouseleave', stopListening);

    // Touch events
    voiceBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      startListening();
    });
    voiceBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      stopListening();
    });
    voiceBtn.addEventListener('touchcancel', stopListening);
  }

  private setupPlanningUI(): void {
    // Duration selection
    document.querySelectorAll('.duration-option').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.duration-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });

    // Interest selection
    document.querySelectorAll('.interest-option').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('selected');
        
        // Limit to 4 selections
        const selected = document.querySelectorAll('.interest-option.selected');
        if (selected.length > 4) {
          btn.classList.remove('selected');
          this.showNotification('Maximum 4 interests allowed', 'warning');
        }
      });
    });

    // Budget slider
    const budgetSlider = document.getElementById('budgetRange') as HTMLInputElement;
    const budgetAmount = document.getElementById('budgetAmount');
    if (budgetSlider && budgetAmount) {
      budgetSlider.addEventListener('input', () => {
        budgetAmount.textContent = budgetSlider.value;
      });
    }

    // Generate trip button
    const generateBtn = document.getElementById('generateTripBtn');
    if (generateBtn) {
      generateBtn.addEventListener('click', this.handleTripGeneration.bind(this));
    }
  }

  private async handleTripGeneration(): Promise<void> {
    const generateBtn = document.getElementById('generateTripBtn') as HTMLButtonElement;
    const statusEl = document.getElementById('tripGenerationStatus');

    if (!generateBtn || !statusEl) return;

    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';
    statusEl.textContent = 'Creating your perfect trip...';

    try {
      // Get form data
      const duration = this.getSelectedDuration();
      const interests = this.getSelectedInterests();
      const budget = parseInt((document.getElementById('budgetRange') as HTMLInputElement)?.value || '300');
      const groupType = (document.getElementById('groupType') as HTMLSelectElement)?.value || 'couple';
      const groupSize = parseInt((document.getElementById('groupSize') as HTMLInputElement)?.value || '2');

      // Create trip plan
      const plan = await this.config.planningManager.createPlan(
        'AI Generated Trip',
        'Automatically generated based on your preferences'
      );

      // TODO: Use AI orchestrator to populate the plan
      statusEl.textContent = 'Trip generated successfully!';
      this.showTripPlan(plan);

      telemetry.track('trip_generated', {
        duration,
        interests: interests.length,
        budget,
        group_type: groupType,
        group_size: groupSize
      });

    } catch (error) {
      console.error('Trip generation failed:', error);
      statusEl.textContent = 'Failed to generate trip. Please try again.';
      this.showError('Trip generation failed');
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = 'Generate Smart Trip';
    }
  }

  private setupSearchUI(): void {
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('freeText') as HTMLInputElement;

    if (searchBtn && searchInput) {
      const performSearch = async () => {
        const query = searchInput.value.trim();
        if (!query) return;

        try {
          searchBtn.textContent = 'Searching...';
          // TODO: Implement search via providers
          this.showSearchResults([]);
          telemetry.track('search_performed', { query });
        } catch (error) {
          console.error('Search failed:', error);
          this.showError('Search failed');
        } finally {
          searchBtn.textContent = 'Search';
        }
      };

      searchBtn.addEventListener('click', performSearch);
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
      });
    }

    // Quick search categories
    document.querySelectorAll('.category-card').forEach(card => {
      card.addEventListener('click', () => {
        const preset = card.getAttribute('data-preset');
        if (preset) {
          this.performQuickSearch(preset);
        }
      });
    });
  }

  private setupUpdateUI(): void {
    // Create update notification container if it doesn't exist
    if (!document.getElementById('updateNotification')) {
      const container = document.createElement('div');
      container.id = 'updateNotification';
      container.className = 'update-notification hidden';
      document.body.appendChild(container);
    }
  }

  private setupThemeToggle(): void {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;

    themeToggle.addEventListener('click', () => {
      // Theme toggle is handled by ThemeProvider
      this.emit('theme-toggle-clicked');
      telemetry.track('theme_toggle_clicked');
    });
  }

  // Public methods
  showUpdateNotification(updateInfo: UpdateInfo): void {
    const container = document.getElementById('updateNotification');
    if (!container) return;

    container.innerHTML = `
      <div class="update-card">
        <div class="update-header">
          <h3>🎉 Update Available</h3>
          <button class="close-btn" onclick="this.parentElement.parentElement.parentElement.classList.add('hidden')">×</button>
        </div>
        <div class="update-content">
          <p>Version ${updateInfo.latest} is available</p>
          ${updateInfo.urgent ? '<p class="urgent">⚠️ Important security update</p>' : ''}
          <div class="update-actions">
            <button class="btn-primary" onclick="window.updateManager.applyUpdate()">Update Now</button>
            <button class="btn-secondary" onclick="this.parentElement.parentElement.parentElement.classList.add('hidden')">Later</button>
          </div>
        </div>
      </div>
    `;

    container.classList.remove('hidden');
    telemetry.track('update_notification_displayed', updateInfo);
  }

  showError(message: string): void {
    this.showNotification(message, 'error');
  }

  showSuccess(message: string): void {
    this.showNotification(message, 'success');
  }

  showNotification(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
      notification.remove();
    }, 3000);

    telemetry.track('notification_shown', { message, type });
  }

  handleAIResult(intentType: string, result: any): void {
    switch (intentType) {
      case 'plan_create':
        this.showTripPlan(result.plan);
        break;
      case 'search':
        this.showSearchResults(result);
        break;
      case 'weather':
        this.showWeatherInfo(result);
        break;
      default:
        console.log('AI result:', result);
    }
  }

  enterNavigationMode(): void {
    document.body.classList.add('navigation-mode');
    this.currentView = 'navigation';
    this.emit('navigation-mode-entered');
  }

  exitNavigationMode(): void {
    document.body.classList.remove('navigation-mode');
    this.emit('navigation-mode-exited');
  }

  // Helper methods
  private getSelectedDuration(): number {
    const selected = document.querySelector('.duration-option.selected');
    return parseInt(selected?.getAttribute('data-duration') || '8');
  }

  private getSelectedInterests(): string[] {
    const selected = document.querySelectorAll('.interest-option.selected');
    return Array.from(selected).map(el => el.getAttribute('data-interest')).filter(Boolean) as string[];
  }

  private showVoiceStatus(message: string): void {
    const statusEl = document.getElementById('voiceStatus');
    if (statusEl) {
      statusEl.textContent = message;
    }
  }

  private async performQuickSearch(category: string): Promise<void> {
    try {
      // TODO: Implement quick search
      telemetry.track('quick_search_performed', { category });
    } catch (error) {
      console.error('Quick search failed:', error);
      this.showError('Search failed');
    }
  }

  private showTripPlan(plan: TripPlan): void {
    const display = document.getElementById('enhancedTripDisplay');
    if (display) {
      display.hidden = false;
      // TODO: Populate trip plan display
    }
  }

  private showSearchResults(results: Place[]): void {
    const listEl = document.getElementById('list');
    if (!listEl) return;

    if (results.length === 0) {
      listEl.innerHTML = '<div class="no-results">No results found</div>';
      return;
    }

    listEl.innerHTML = results.map(place => `
      <div class="result-card">
        <h3>${place.name}</h3>
        <p>${place.address || ''}</p>
        ${place.rating ? `<div class="rating">⭐ ${place.rating}</div>` : ''}
      </div>
    `).join('');
  }

  private showWeatherInfo(weather: any): void {
    // TODO: Display weather information
    console.log('Weather info:', weather);
  }

  private initializeTripPlanning(): void {
    // TODO: Initialize trip planning view
  }

  private initializeAIInterface(): void {
    // TODO: Initialize AI interface
  }

  private initializeVoiceInterface(): void {
    // TODO: Initialize voice interface
  }
}