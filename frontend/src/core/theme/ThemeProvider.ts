import type { Theme, ThemeColors } from '@/types';
import { lightTheme, darkTheme } from './tokens';
import { createCustomEvent, EventBus } from '@/lib/utils/events';

class ThemeProvider extends EventBus {
  private currentTheme: Theme = 'system';
  private prefersDark = false;
  private mediaQuery: MediaQueryList;

  constructor() {
    super();
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.prefersDark = this.mediaQuery.matches;
    
    // Listen for system theme changes
    this.mediaQuery.addEventListener('change', (e) => {
      this.prefersDark = e.matches;
      if (this.currentTheme === 'system') {
        this.applyTheme();
        this.emit('theme-changed', { theme: this.getEffectiveTheme() });
      }
    });

    // Load saved theme or use system default
    this.loadTheme();
    this.applyTheme();
  }

  private loadTheme(): void {
    const saved = localStorage.getItem('app-theme') as Theme;
    if (saved && ['light', 'dark', 'system'].includes(saved)) {
      this.currentTheme = saved;
    }
  }

  private saveTheme(): void {
    localStorage.setItem('app-theme', this.currentTheme);
  }

  getTheme(): Theme {
    return this.currentTheme;
  }

  getEffectiveTheme(): 'light' | 'dark' {
    if (this.currentTheme === 'system') {
      return this.prefersDark ? 'dark' : 'light';
    }
    return this.currentTheme;
  }

  getColors(): ThemeColors {
    return this.getEffectiveTheme() === 'dark' ? darkTheme : lightTheme;
  }

  setTheme(theme: Theme): void {
    if (this.currentTheme === theme) return;
    
    this.currentTheme = theme;
    this.saveTheme();
    this.applyTheme();
    this.emit('theme-changed', { theme: this.getEffectiveTheme() });
  }

  toggleTheme(): void {
    const current = this.getEffectiveTheme();
    this.setTheme(current === 'light' ? 'dark' : 'light');
  }

  private applyTheme(): void {
    const effective = this.getEffectiveTheme();
    const colors = this.getColors();
    
    // Update CSS custom properties
    const root = document.documentElement;
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    // Update data attribute for CSS targeting
    root.setAttribute('data-theme', effective);
    
    // Update meta theme-color for mobile browsers
    const themeColorMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
    if (themeColorMeta) {
      themeColorMeta.content = colors.primary;
    }

    // Update map style if Leaflet map exists
    this.updateMapStyle(effective);
  }

  private updateMapStyle(theme: 'light' | 'dark'): void {
    // Dispatch event for map to update its basemap
    window.dispatchEvent(createCustomEvent('map-theme-change', { theme }));
  }

  // CSS-in-JS helper for components
  getCSSVariables(): Record<string, string> {
    const colors = this.getColors();
    const vars: Record<string, string> = {};
    
    Object.entries(colors).forEach(([key, value]) => {
      vars[`--color-${key}`] = value;
    });
    
    return vars;
  }

  // Helper for conditional styling
  isDark(): boolean {
    return this.getEffectiveTheme() === 'dark';
  }

  // Get theme-appropriate map tiles URL
  getMapTileURL(): string {
    const isDark = this.isDark();
    
    if (isDark) {
      // Use dark tiles from CartoDB or similar
      return 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    } else {
      // Use light tiles
      return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }
  }

  getMapTileAttribution(): string {
    const isDark = this.isDark();
    
    if (isDark) {
      return '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
    } else {
      return '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    }
  }
}

// Global singleton instance
export const themeProvider = new ThemeProvider();

// React-like hook interface for easy integration
export function useTheme() {
  return {
    theme: themeProvider.getTheme(),
    effectiveTheme: themeProvider.getEffectiveTheme(),
    colors: themeProvider.getColors(),
    setTheme: themeProvider.setTheme.bind(themeProvider),
    toggleTheme: themeProvider.toggleTheme.bind(themeProvider),
    isDark: themeProvider.isDark(),
    subscribe: (callback: (theme: string) => void) => {
      themeProvider.on('theme-changed', callback);
      return () => themeProvider.off('theme-changed', callback);
    }
  };
}