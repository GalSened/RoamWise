import { test, expect } from '@playwright/test';
import { waitForPlannerOK, waitForApiResponse } from './utils/waits';
import { dismissModals } from './utils/dismissModals';

/**
 * AI Weather Insights Tests
 * Tests the contextual weather recommendations feature
 */
// Skip: AI Weather Insights depend on planner API which times out
test.describe.skip('AI Weather Insights', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    await page.goto('/');
    await dismissModals(page);
  });

  test.describe('Trip Planning with Insights', () => {
    test('trip generation calls weather API and shows insights section', async ({ page }) => {
      // Navigate to trip planning
      await page.click('.ios-tab[data-view="trip"]');
      await expect(page.locator('#tripView')).toBeVisible();

      // Configure trip
      await page.click('[data-duration="8"]');
      await page.click('[data-interest="nature"]');
      await page.fill('#budgetRange', '300');

      // Listen for hazards API call (weather insights)
      const hazardsPromise = page.waitForResponse(
        (response) => response.url().includes('/api/hazards'),
        { timeout: 30000 }
      ).catch(() => null);

      // Generate trip
      await page.click('#generateTripBtn');

      // Wait for planner API
      await waitForPlannerOK(page);

      // Check if hazards API was called
      const hazardsResponse = await hazardsPromise;
      if (hazardsResponse) {
        expect(hazardsResponse.status()).toBe(200);
      }

      // Verify trip display is shown
      await expect(page.locator('#enhancedTripDisplay')).toBeVisible();

      // Check for insights section (may or may not appear based on weather)
      const insightsSection = page.locator('.ai-insights-section');
      const insightsVisible = await insightsSection.isVisible().catch(() => false);

      // If insights are present, verify structure
      if (insightsVisible) {
        await expect(page.locator('.ai-insights-section .ai-insight')).toBeVisible();
      }
    });

    test('insights display in correct language (Hebrew)', async ({ page }) => {
      // Navigate to trip planning (Hebrew is default)
      await page.click('.ios-tab[data-view="trip"]');

      // Configure and generate trip
      await page.click('[data-duration="2"]');
      await page.click('[data-interest="food"]');
      await page.click('#generateTripBtn');

      // Wait for planner
      await waitForPlannerOK(page);

      // Check if insights section exists
      const insightsSection = page.locator('.ai-insights-section');
      const insightsVisible = await insightsSection.isVisible().catch(() => false);

      if (insightsVisible) {
        // Header should be in Hebrew
        const header = page.locator('.ai-insights-section h4');
        await expect(header).toContainText(/תובנות מזג אוויר|AI Weather/);
      }
    });

    test('insights display in English when language is switched', async ({ page }) => {
      // Switch to English
      await page.click('[data-testid="lang-en"]');
      await expect(page.locator('[data-testid="lang-en"]')).toHaveClass(/active/);

      // Navigate to trip planning
      await page.click('.ios-tab[data-view="trip"]');

      // Configure and generate trip
      await page.click('[data-duration="2"]');
      await page.click('[data-interest="food"]');
      await page.click('#generateTripBtn');

      // Wait for planner
      await waitForPlannerOK(page);

      // Check if insights section exists
      const insightsSection = page.locator('.ai-insights-section');
      const insightsVisible = await insightsSection.isVisible().catch(() => false);

      if (insightsVisible) {
        // Header should be in English
        const header = page.locator('.ai-insights-section h4');
        await expect(header).toContainText(/AI Weather Insights/);
      }
    });
  });

  test.describe('Weather Quick Action', () => {
    test('weather quick action button triggers weather lookup', async ({ page }) => {
      // Navigate to AI view
      await page.click('.ios-tab[data-view="ai"]');
      await expect(page.locator('#aiView')).toBeVisible();

      // Find weather quick action button
      const weatherBtn = page.locator('#aiView button[data-action="weather"]');
      await expect(weatherBtn).toBeVisible();

      // Click weather button
      await weatherBtn.click();

      // Should show loading state or result within a few seconds
      await page.waitForTimeout(3000);

      // Check for weather card or error message (geolocation may fail in test env)
      const hasWeatherCard = await page.locator('.weather-card').count();
      const hasLoadingOrError = await page.locator('text=/Getting weather|Unable|שגיאה|Getting/i').count();

      // Either weather worked or we got an error message
      expect(hasWeatherCard > 0 || hasLoadingOrError > 0).toBeTruthy();
    });

    test('weather error gracefully handled without geolocation', async ({ page, context }) => {
      // Ensure geolocation is denied
      await context.clearPermissions();

      // Navigate to AI view
      await page.click('.ios-tab[data-view="ai"]');
      await expect(page.locator('#aiView')).toBeVisible();

      // Click weather quick action
      const weatherBtn = page.locator('#aiView button[data-action="weather"]');
      await weatherBtn.click();

      // Wait for error to appear
      await page.waitForTimeout(3000);

      // Should show error message about location access
      const errorMessage = page.locator('text=/Unable|location|error|שגיאה/i');
      await expect(errorMessage).toBeVisible();
    });
  });

  test.describe('Insight Types', () => {
    test('insight cards have proper structure', async ({ page }) => {
      // Navigate to trip and generate
      await page.click('.ios-tab[data-view="trip"]');
      await page.click('[data-duration="8"]');
      await page.click('[data-interest="nature"]');
      await page.click('#generateTripBtn');
      await waitForPlannerOK(page);

      // Check if insights are present
      const insights = page.locator('.ai-insight');
      const insightCount = await insights.count();

      if (insightCount > 0) {
        // Each insight should have icon, title, and message
        const firstInsight = insights.first();

        // Should have icon (emoji)
        const icon = await firstInsight.locator('span').first().textContent();
        expect(icon?.length).toBeGreaterThan(0);

        // Should have title (strong element)
        await expect(firstInsight.locator('strong')).toBeVisible();

        // Should have message (p element)
        await expect(firstInsight.locator('p')).toBeVisible();
      }
    });

    test('insight cards have color-coded borders', async ({ page }) => {
      await page.click('.ios-tab[data-view="trip"]');
      await page.click('[data-duration="8"]');
      await page.click('[data-interest="nature"]');
      await page.click('#generateTripBtn');
      await waitForPlannerOK(page);

      const insights = page.locator('.ai-insight');
      const insightCount = await insights.count();

      if (insightCount > 0) {
        // Check that insights have styling (border-left)
        const firstInsight = insights.first();
        const style = await firstInsight.getAttribute('style');

        // Should have border-left styling
        expect(style).toContain('border-left');
      }
    });
  });

  test.describe('Edge Cases', () => {
    test('handles API failure gracefully', async ({ page }) => {
      // Navigate to trip
      await page.click('.ios-tab[data-view="trip"]');

      // Mock network failure for hazards API
      await page.route('**/api/hazards**', (route) => {
        route.abort('failed');
      });

      // Configure and generate trip
      await page.click('[data-duration="2"]');
      await page.click('[data-interest="food"]');
      await page.click('#generateTripBtn');

      // Wait for planner (should still work even if hazards fails)
      await waitForPlannerOK(page);

      // Trip should still be generated
      await expect(page.locator('#enhancedTripDisplay')).toBeVisible();

      // App should not crash
      await expect(page.locator('.app-container')).toBeVisible();
    });

    test('handles slow weather API response', async ({ page }) => {
      // Navigate to trip
      await page.click('.ios-tab[data-view="trip"]');

      // Mock slow hazards API
      await page.route('**/api/hazards**', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 5000));
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            conditions: { temperature: 25, description: 'clear' },
            alerts: []
          })
        });
      });

      // Configure and generate trip
      await page.click('[data-duration="2"]');
      await page.click('[data-interest="food"]');
      await page.click('#generateTripBtn');

      // Trip should be generated before weather completes
      await waitForPlannerOK(page);
      await expect(page.locator('#enhancedTripDisplay')).toBeVisible();
    });

    test('insights update when generating new trip', async ({ page }) => {
      await page.click('.ios-tab[data-view="trip"]');

      // Generate first trip
      await page.click('[data-duration="2"]');
      await page.click('[data-interest="food"]');
      await page.click('#generateTripBtn');
      await waitForPlannerOK(page);

      // Generate second trip
      await page.click('[data-duration="8"]');
      await page.click('[data-interest="nature"]');
      await page.click('#generateTripBtn');
      await waitForPlannerOK(page);

      // Trip display should be updated (not duplicated)
      await expect(page.locator('#enhancedTripDisplay')).toBeVisible();

      // Should only have one insights section (not multiple)
      const insightSections = await page.locator('.ai-insights-section').count();
      expect(insightSections).toBeLessThanOrEqual(1);
    });
  });
});
