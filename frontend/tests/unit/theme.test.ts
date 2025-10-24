import { describe, it, expect, beforeEach, vi } from 'vitest';
import { themeProvider } from '@/core/theme/ThemeProvider';

describe('ThemeProvider', () => {
  beforeEach(() => {
    // Reset localStorage
    localStorage.clear();
    // Reset theme to system default
    themeProvider.setTheme('system');
  });

  it('should initialize with system theme by default', () => {
    expect(themeProvider.getTheme()).toBe('system');
  });

  it('should switch to light theme', () => {
    themeProvider.setTheme('light');
    expect(themeProvider.getTheme()).toBe('light');
    expect(themeProvider.getEffectiveTheme()).toBe('light');
  });

  it('should switch to dark theme', () => {
    themeProvider.setTheme('dark');
    expect(themeProvider.getTheme()).toBe('dark');
    expect(themeProvider.getEffectiveTheme()).toBe('dark');
  });

  it('should persist theme preference', () => {
    themeProvider.setTheme('dark');
    expect(localStorage.setItem).toHaveBeenCalledWith('app-theme', 'dark');
  });

  it('should emit theme-changed event', () => {
    const callback = vi.fn();
    themeProvider.on('theme-changed', callback);
    
    themeProvider.setTheme('dark');
    
    expect(callback).toHaveBeenCalledWith({ theme: 'dark' });
  });

  it('should toggle between light and dark', () => {
    themeProvider.setTheme('light');
    themeProvider.toggleTheme();
    expect(themeProvider.getEffectiveTheme()).toBe('dark');
    
    themeProvider.toggleTheme();
    expect(themeProvider.getEffectiveTheme()).toBe('light');
  });

  it('should return correct colors for theme', () => {
    themeProvider.setTheme('light');
    const lightColors = themeProvider.getColors();
    expect(lightColors.background).toBe('#ffffff');
    
    themeProvider.setTheme('dark');
    const darkColors = themeProvider.getColors();
    expect(darkColors.background).toBe('#0f172a');
  });

  it('should return correct map tile URL for theme', () => {
    themeProvider.setTheme('light');
    const lightUrl = themeProvider.getMapTileURL();
    expect(lightUrl).toContain('tile.openstreetmap.org');
    
    themeProvider.setTheme('dark');
    const darkUrl = themeProvider.getMapTileURL();
    expect(darkUrl).toContain('basemaps.cartocdn.com/dark');
  });
});