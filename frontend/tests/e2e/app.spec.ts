import { test, expect } from '@playwright/test';
import { waitForPlannerOK } from './utils/waits';

test.describe('RoamWise App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the app title', async ({ page }) => {
    await expect(page).toHaveTitle(/RoamWise/i);
  });

  test('should have working navigation', async ({ page }) => {
    // Check initial view is search (use nav button selector)
    await expect(page.locator('.ios-tab[data-view="search"]')).toHaveClass(/active/);

    // Navigate to trip planning
    await page.click('.ios-tab[data-view="trip"]');
    await expect(page.locator('.ios-tab[data-view="trip"]')).toHaveClass(/active/);

    // Navigate to AI
    await page.click('.ios-tab[data-view="ai"]');
    await expect(page.locator('.ios-tab[data-view="ai"]')).toHaveClass(/active/);

    // Navigate to profile
    await page.click('.ios-tab[data-view="profile"]');
    await expect(page.locator('.ios-tab[data-view="profile"]')).toHaveClass(/active/);
  });

  test('should toggle theme', async ({ page }) => {
    const themeToggle = page.locator('#themeToggle');
    
    // Initial theme should be light
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    
    // Toggle to dark
    await themeToggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    
    // Toggle back to light
    await themeToggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('should perform search', async ({ page }) => {
    // Navigate to search view
    await page.click('.ios-tab[data-view="search"]');
    
    // Enter search query
    await page.fill('#freeText', 'restaurants');
    await page.click('#searchBtn');
    
    // Should show loading state
    await expect(page.locator('#searchBtn')).toContainText('Searching');
    
    // Results should appear (mocked)
    await page.waitForTimeout(1000);
    await expect(page.locator('#list')).not.toBeEmpty();
  });

  test('should create trip plan', async ({ page }) => {
    // Navigate to trip planning
    await page.click('.ios-tab[data-view="trip"]');
    
    // Select duration
    await page.click('[data-duration="8"]');
    
    // Select interests
    await page.click('[data-interest="gourmet"]');
    await page.click('[data-interest="nature"]');
    
    // Set budget
    await page.fill('#budgetRange', '400');
    
    // Generate trip
    await page.click('#generateTripBtn');
    
    // Should show loading state
    await expect(page.locator('#generateTripBtn')).toContainText('Generating');

    // Wait for planner API to respond
    await waitForPlannerOK(page);

    // Trip should be generated
    await expect(page.locator('#enhancedTripDisplay')).not.toHaveAttribute('hidden');
  });

  test('should handle voice interaction', async ({ page }) => {
    // Mock permissions
    await page.context().grantPermissions(['microphone']);

    // Navigate to AI view
    await page.click('.ios-tab[data-view="ai"]');
    
    // Test voice button
    const voiceBtn = page.locator('#voiceBtn');
    
    // Should be present and enabled
    await expect(voiceBtn).toBeVisible();
    await expect(voiceBtn).toBeEnabled();
    
    // Click and hold simulation
    await voiceBtn.click();
    
    // Should show listening state
    await expect(page.locator('#voiceStatus')).toContainText('Listening');
  });

  test('should display trip planner', async ({ page }) => {
    // Navigate to trip view
    await page.click('.ios-tab[data-view="trip"]');

    // Trip planner should be visible
    await expect(page.locator('#page-trip')).toBeVisible();

    // Duration chips should be present
    await expect(page.locator('[data-duration]').first()).toBeVisible();
  });

  test('should show update notification', async ({ page }) => {
    // Mock update available
    await page.evaluate(() => {
      // Simulate update available
      window.dispatchEvent(new CustomEvent('update-available', {
        detail: {
          available: true,
          current: '1.0.0',
          latest: '2.0.0'
        }
      }));
    });
    
    // Update notification should appear
    await expect(page.locator('#updateNotification')).not.toHaveClass(/hidden/);
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // App should still be functional
    await expect(page.locator('.app-container')).toBeVisible();
    await expect(page.locator('.ios-tabbar')).toBeVisible();

    // Navigation should work on mobile
    await page.click('.ios-tab[data-view="trip"]');
    await expect(page.locator('.ios-tab[data-view="trip"]')).toHaveClass(/active/);
  });

  test.skip('should handle offline state', async ({ page }) => {
    // Skip - requires service worker setup in production mode
    // Go offline
    await page.context().setOffline(true);

    // App should still be visible (cached)
    await expect(page.locator('.app-container')).toBeVisible();

    // Should show offline indicator or handle gracefully
  });

  test('should save preferences', async ({ page }) => {
    // Change theme
    await page.click('#themeToggle');

    // Create a trip plan
    await page.click('.ios-tab[data-view="trip"]');
    await page.click('[data-duration="4"]');
    
    // Reload page
    await page.reload();
    
    // Theme should be preserved
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});