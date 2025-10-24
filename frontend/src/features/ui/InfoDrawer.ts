import type { Place } from '@/types';
import { EventBus } from '@/lib/utils/events';
import { telemetry } from '@/lib/telemetry';

interface InfoDrawerState {
  isOpen: boolean;
  currentPlace?: Place;
  content?: string;
  actions?: InfoDrawerAction[];
}

interface InfoDrawerAction {
  label: string;
  icon?: string;
  action: () => void;
  style?: 'primary' | 'secondary' | 'danger';
}

export class InfoDrawer extends EventBus {
  private state: InfoDrawerState = { isOpen: false };
  private container?: HTMLElement;
  private content?: HTMLElement;
  private backdrop?: HTMLElement;

  constructor() {
    super();
    this.createDrawer();
    this.setupEventHandlers();
  }

  private createDrawer(): void {
    // Create backdrop
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'info-drawer-backdrop';
    this.backdrop.onclick = () => this.close();

    // Create container
    this.container = document.createElement('div');
    this.container.className = 'info-drawer';
    this.container.innerHTML = `
      <div class="info-drawer-header">
        <div class="info-drawer-handle"></div>
        <button class="info-drawer-close" aria-label="Close">×</button>
      </div>
      <div class="info-drawer-content"></div>
      <div class="info-drawer-actions"></div>
    `;

    // Get content area
    this.content = this.container.querySelector('.info-drawer-content') as HTMLElement;

    // Add to DOM
    document.body.appendChild(this.backdrop);
    document.body.appendChild(this.container);
  }

  private setupEventHandlers(): void {
    const closeBtn = this.container?.querySelector('.info-drawer-close');
    closeBtn?.addEventListener('click', () => this.close());

    // Handle touch/swipe gestures for mobile
    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    const handle = this.container?.querySelector('.info-drawer-handle');
    
    handle?.addEventListener('touchstart', (e) => {
      startY = e.touches[0].clientY;
      isDragging = true;
    });

    handle?.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      currentY = e.touches[0].clientY;
      const deltaY = currentY - startY;
      
      if (deltaY > 0) { // Swiping down
        const translateY = Math.min(deltaY, 300);
        this.container!.style.transform = `translateY(${translateY}px)`;
      }
    });

    handle?.addEventListener('touchend', () => {
      if (!isDragging) return;
      isDragging = false;
      
      const deltaY = currentY - startY;
      if (deltaY > 100) { // Swipe down threshold
        this.close();
      } else {
        // Snap back
        this.container!.style.transform = 'translateY(0)';
      }
    });
  }

  showPlace(place: Place, actions: InfoDrawerAction[] = []): void {
    this.state = {
      isOpen: true,
      currentPlace: place,
      actions
    };

    if (!this.content) return;

    // Generate place content
    const placeHtml = this.generatePlaceContent(place);
    this.content.innerHTML = placeHtml;

    // Update actions
    this.updateActions(actions);

    // Show drawer
    this.show();

    telemetry.track('info_drawer_place_shown', {
      place_id: place.id,
      place_name: place.name,
      has_actions: actions.length > 0
    });
  }

  showContent(html: string, actions: InfoDrawerAction[] = []): void {
    this.state = {
      isOpen: true,
      content: html,
      actions
    };

    if (!this.content) return;

    this.content.innerHTML = html;
    this.updateActions(actions);
    this.show();

    telemetry.track('info_drawer_content_shown', {
      has_actions: actions.length > 0
    });
  }

  private generatePlaceContent(place: Place): string {
    return `
      <div class="place-info">
        <div class="place-header">
          <h2 class="place-name">${place.name}</h2>
          ${place.rating ? `
            <div class="place-rating">
              <span class="rating-stars">${'⭐'.repeat(Math.floor(place.rating))}</span>
              <span class="rating-value">${place.rating}</span>
              ${place.userRatingsTotal ? `<span class="rating-count">(${place.userRatingsTotal})</span>` : ''}
            </div>
          ` : ''}
        </div>

        ${place.address ? `
          <div class="place-address">
            <span class="address-icon">📍</span>
            <span class="address-text">${place.address}</span>
          </div>
        ` : ''}

        ${place.types && place.types.length > 0 ? `
          <div class="place-types">
            ${place.types.slice(0, 3).map(type => 
              `<span class="place-type">${this.formatPlaceType(type)}</span>`
            ).join('')}
          </div>
        ` : ''}

        ${place.priceLevel ? `
          <div class="place-price">
            <span class="price-label">Price:</span>
            <span class="price-level">${'$'.repeat(place.priceLevel)}</span>
          </div>
        ` : ''}

        ${place.openNow !== undefined ? `
          <div class="place-hours ${place.openNow ? 'open' : 'closed'}">
            <span class="hours-icon">${place.openNow ? '🟢' : '🔴'}</span>
            <span class="hours-text">${place.openNow ? 'Open now' : 'Closed'}</span>
          </div>
        ` : ''}

        ${place.website ? `
          <div class="place-website">
            <a href="${place.website}" target="_blank" rel="noopener noreferrer">
              🌐 Visit Website
            </a>
          </div>
        ` : ''}

        ${place.phoneNumber ? `
          <div class="place-phone">
            <a href="tel:${place.phoneNumber}">
              📞 ${place.phoneNumber}
            </a>
          </div>
        ` : ''}
      </div>
    `;
  }

  private formatPlaceType(type: string): string {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  private updateActions(actions: InfoDrawerAction[]): void {
    const actionsContainer = this.container?.querySelector('.info-drawer-actions');
    if (!actionsContainer) return;

    if (actions.length === 0) {
      actionsContainer.innerHTML = '';
      return;
    }

    actionsContainer.innerHTML = actions.map(action => `
      <button 
        class="drawer-action-btn ${action.style || 'primary'}"
        data-action="${action.label}"
      >
        ${action.icon ? `<span class="action-icon">${action.icon}</span>` : ''}
        <span class="action-label">${action.label}</span>
      </button>
    `).join('');

    // Attach click handlers
    actions.forEach((action, index) => {
      const btn = actionsContainer.children[index] as HTMLElement;
      btn.onclick = () => {
        action.action();
        telemetry.track('info_drawer_action_clicked', {
          action_label: action.label
        });
      };
    });
  }

  private show(): void {
    this.backdrop?.classList.add('visible');
    this.container?.classList.add('open');
    document.body.classList.add('drawer-open');
    this.emit('drawer-opened');
  }

  close(): void {
    this.backdrop?.classList.remove('visible');
    this.container?.classList.remove('open');
    document.body.classList.remove('drawer-open');
    
    this.state.isOpen = false;
    this.emit('drawer-closed');

    telemetry.track('info_drawer_closed');
  }

  isOpen(): boolean {
    return this.state.isOpen;
  }

  getCurrentPlace(): Place | undefined {
    return this.state.currentPlace;
  }

  destroy(): void {
    this.container?.remove();
    this.backdrop?.remove();
    super.destroy();
  }
}

// Default actions factory
export function createPlaceActions(place: Place): InfoDrawerAction[] {
  const actions: InfoDrawerAction[] = [];

  // Navigate action
  actions.push({
    label: 'Navigate',
    icon: '🧭',
    action: () => {
      window.dispatchEvent(new CustomEvent('start-navigation', { 
        detail: { destination: place.location }
      }));
    },
    style: 'primary'
  });

  // Add to trip action
  actions.push({
    label: 'Add to Trip',
    icon: '➕',
    action: () => {
      window.dispatchEvent(new CustomEvent('add-to-trip', { 
        detail: { place }
      }));
    },
    style: 'secondary'
  });

  // Share action
  if (navigator.share) {
    actions.push({
      label: 'Share',
      icon: '📤',
      action: async () => {
        try {
          await navigator.share({
            title: place.name,
            text: `Check out ${place.name}`,
            url: place.website || window.location.href
          });
        } catch (error) {
          console.warn('Share failed:', error);
        }
      },
      style: 'secondary'
    });
  }

  return actions;
}

// CSS injection for styling
const drawerStyles = `
.info-drawer-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
  z-index: 999;
}

.info-drawer-backdrop.visible {
  opacity: 1;
  visibility: visible;
}

.info-drawer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--color-surface, #ffffff);
  border-radius: 1rem 1rem 0 0;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
  transform: translateY(100%);
  transition: transform 0.3s ease;
  z-index: 1000;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.info-drawer.open {
  transform: translateY(0);
}

.info-drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
  position: relative;
}

.info-drawer-handle {
  position: absolute;
  top: 0.5rem;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 4px;
  background: var(--color-border, #e2e8f0);
  border-radius: 2px;
  cursor: grab;
}

.info-drawer-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;
  color: var(--color-text-secondary, #64748b);
}

.info-drawer-content {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
}

.info-drawer-actions {
  padding: 1rem;
  border-top: 1px solid var(--color-border, #e2e8f0);
  display: flex;
  gap: 0.5rem;
}

.drawer-action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border: none;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.drawer-action-btn.primary {
  background: var(--color-primary, #3b82f6);
  color: white;
}

.drawer-action-btn.secondary {
  background: var(--color-surface, #f8fafc);
  color: var(--color-text, #1e293b);
  border: 1px solid var(--color-border, #e2e8f0);
}

.place-info .place-header {
  margin-bottom: 1rem;
}

.place-name {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.place-rating {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
}

.place-address,
.place-hours,
.place-phone,
.place-website {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.5rem 0;
  font-size: 0.875rem;
}

.place-types {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin: 0.5rem 0;
}

.place-type {
  background: var(--color-surface, #f8fafc);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  border: 1px solid var(--color-border, #e2e8f0);
}

.place-hours.open {
  color: var(--color-success, #10b981);
}

.place-hours.closed {
  color: var(--color-error, #ef4444);
}

body.drawer-open {
  overflow: hidden;
}

@media (max-width: 768px) {
  .info-drawer {
    max-height: 80vh;
  }
}
`;

// Inject styles
const styleElement = document.createElement('style');
styleElement.textContent = drawerStyles;
document.head.appendChild(styleElement);

// Global instance
export const infoDrawer = new InfoDrawer();