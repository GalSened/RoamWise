import { test, expect } from '@playwright/test';
import { waitForPlannerOK } from './utils/waits';

test.describe('Traveling App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the app title', async ({ page }) => {
    await expect(page).toHaveTitle(/traveling/);
  });

  test('should have working navigation', async ({ page }) => {
    // Check initial view is search
    await expect(page.locator('[data-view="search"]')).toHaveClass(/active/);

    // Navigate to trip planning
    await page.click('[data-view="trip"]');
    await expect(page.locator('[data-view="trip"]')).toHaveClass(/active/);

    // Navigate to AI
    await page.click('[data-view="ai"]');
    await expect(page.locator('[data-view="ai"]')).toHaveClass(/active/);

    // Navigate to map
    await page.click('[data-view="map"]');
    await expect(page.locator('[data-view="map"]')).toHaveClass(/active/);
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
    await page.click('[data-view="search"]');
    
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
    await page.click('[data-view="trip"]');
    
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
    await page.click('[data-view="ai"]');
    
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

  test('should display map', async ({ page }) => {
    // Navigate to map view
    await page.click('[data-view="map"]');
    
    // Map container should be visible
    await expect(page.locator('#map')).toBeVisible();
    
    // Location button should be present
    await expect(page.locator('#locationFab')).toBeVisible();
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
    await expect(page.locator('.mobile-layout')).toBeVisible();
    await expect(page.locator('.bottom-nav')).toBeVisible();
    
    // Navigation should work on mobile
    await page.click('[data-view="trip"]');
    await expect(page.locator('[data-view="trip"]')).toHaveClass(/active/);
  });

  test('should handle offline state', async ({ page }) => {
    // Go offline
    await page.context().setOffline(true);
    
    // App should still load from cache
    await page.reload();
    await expect(page.locator('.mobile-layout')).toBeVisible();
    
    // Should show offline indicator or handle gracefully
    // This would depend on your offline implementation
  });

  test('should save preferences', async ({ page }) => {
    // Change theme
    await page.click('#themeToggle');
    
    // Create a trip plan
    await page.click('[data-view="trip"]');
    await page.click('[data-duration="4"]');
    
    // Reload page
    await page.reload();
    
    // Theme should be preserved
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});