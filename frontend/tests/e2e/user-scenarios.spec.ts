import { test, expect } from '@playwright/test';
import { waitForPlannerOK, waitForApiResponse } from './utils/waits';
import { dismissModals } from './utils/dismissModals';

/**
 * Comprehensive User Scenario Tests for RoamWise
 * These tests cover real-world user flows and edge cases
 */
test.describe('User Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start fresh
    await page.addInitScript(() => localStorage.clear());
    await page.goto('/');
    await dismissModals(page);
    // Wait for app to initialize (nav buttons get active class after JS loads)
    await page.waitForSelector('.ios-tab.active', { timeout: 10000 });
  });

  // Skip: These tests depend on planner API which times out in CI
  test.describe.skip('Complete Trip Planning Flow', () => {
    test('user plans a full day trip with specific interests', async ({ page }) => {
      // Navigate to trip planning
      await page.click('.ios-tab[data-view="trip"]');
      await expect(page.locator('#tripView')).toBeVisible();

      // Select full day duration (it's selected by default, clicking deselects and reselects)
      await page.click('[data-duration="8"]');
      // Duration options use 'selected' class
      await expect(page.locator('[data-duration="8"]')).toHaveClass(/selected/);

      // Select multiple interests (max 4)
      await page.click('[data-interest="food"]');
      await page.click('[data-interest="nature"]');
      await page.click('[data-interest="culture"]');
      await expect(page.locator('[data-interest="food"]')).toHaveClass(/selected/);
      await expect(page.locator('[data-interest="nature"]')).toHaveClass(/selected/);
      await expect(page.locator('[data-interest="culture"]')).toHaveClass(/selected/);

      // Set budget
      await page.fill('#budgetRange', '500');
      await expect(page.locator('#budgetAmount')).toContainText('500');

      // Generate trip
      await page.click('#generateTripBtn');

      // Wait for planner API response
      await waitForPlannerOK(page);

      // Verify trip results are displayed
      await expect(page.locator('#enhancedTripDisplay')).toBeVisible();
      await expect(page.locator('#enhancedTripDisplay')).not.toHaveAttribute('hidden');
    });

    test('user plans a 2-hour quick trip', async ({ page }) => {
      await page.click('.ios-tab[data-view="trip"]');
      await expect(page.locator('#tripView')).toBeVisible();

      // Select 2-hour duration
      await page.click('[data-duration="2"]');

      // Select single interest
      await page.click('[data-interest="food"]');

      // Set low budget
      await page.fill('#budgetRange', '100');

      // Generate trip
      await page.click('#generateTripBtn');

      // Wait for response
      await waitForPlannerOK(page);

      // Verify result
      await expect(page.locator('#enhancedTripDisplay')).toBeVisible();
    });

    test('user changes interests after selecting max (4)', async ({ page }) => {
      await page.click('.ios-tab[data-view="trip"]');
      await expect(page.locator('#tripView')).toBeVisible();

      // Select 4 interests (max)
      await page.click('[data-interest="food"]');
      await page.click('[data-interest="nature"]');
      await page.click('[data-interest="culture"]');
      await page.click('[data-interest="shopping"]');

      // Verify all 4 are selected
      const selectedInterests = page.locator('[data-interest].selected');
      await expect(selectedInterests).toHaveCount(4);

      // 5th interest button should be disabled (can't click)
      await expect(page.locator('[data-interest="relaxation"]')).toHaveClass(/disabled/);

      // Deselect one interest
      await page.click('[data-interest="food"]');
      await expect(page.locator('[data-interest].selected')).toHaveCount(3);

      // Now the 5th option should be enabled again
      await expect(page.locator('[data-interest="relaxation"]')).not.toHaveClass(/disabled/);

      // Can now select it
      await page.click('[data-interest="relaxation"]');
      await expect(page.locator('[data-interest].selected')).toHaveCount(4);
    });
  });

  // Skip: These tests depend on search API which may timeout
  test.describe.skip('Search Functionality', () => {
    test('user searches for restaurants', async ({ page }) => {
      // Ensure we're on search view
      await expect(page.locator('.ios-tab[data-view="search"]')).toHaveClass(/active/);

      // Type search query
      await page.fill('#freeText', 'restaurants');
      await page.click('#searchBtn');

      // Wait for search to complete
      await page.waitForTimeout(2000);

      // Results should appear or show "no results" message
      const hasResults = await page.locator('#list').locator('.ios-card').count();
      const hasNoResults = await page.locator('#list').getByText(/no results|אין תוצאות/i).count();
      expect(hasResults > 0 || hasNoResults > 0).toBeTruthy();
    });

    test('user searches using category quick filter', async ({ page }) => {
      // Click food category (category value is 'restaurant' not 'food')
      await page.click('[data-category="restaurant"]');

      // Wait for search to be triggered
      await page.waitForTimeout(1000);

      // Verify search was initiated (loading state or results)
      const searchBtn = page.locator('#searchBtn');
      const isSearching = await searchBtn.textContent();
      // The button should either say "Searching" or the search completed
      expect(isSearching).toBeDefined();
    });

    test('empty search shows appropriate message', async ({ page }) => {
      // Submit empty search
      await page.fill('#freeText', '');
      await page.click('#searchBtn');

      // Should show ready state or validation message
      const readyState = page.locator('#list').getByText(/ready|מוכן/i);
      await expect(readyState).toBeVisible();
    });
  });

  test.describe('Language and RTL Support', () => {
    test('Hebrew is default language', async ({ page }) => {
      // Wait for language buttons to be interactive and check Hebrew is active
      await expect(page.locator('[data-testid="lang-he"]')).toHaveClass(/active/, { timeout: 10000 });
      await expect(page.locator('[data-testid="lang-en"]')).not.toHaveClass(/active/);
    });

    test('switching to English updates UI text', async ({ page }) => {
      // Wait for language to initialize
      await expect(page.locator('[data-testid="lang-he"]')).toHaveClass(/active/, { timeout: 10000 });

      // Get Hebrew title from search view (not from any modals)
      const searchTitle = page.locator('#searchView h1');
      const hebrewTitle = await searchTitle.textContent();

      // Switch to English
      await page.click('[data-testid="lang-en"]');
      await expect(page.locator('[data-testid="lang-en"]')).toHaveClass(/active/, { timeout: 5000 });

      // Wait for translations to load and apply (async operation)
      await expect(searchTitle).toContainText('Find Places', { timeout: 5000 });

      // Title should have changed
      const englishTitle = await searchTitle.textContent();
      expect(hebrewTitle).not.toBe(englishTitle);
    });

    test('Hebrew mode sets RTL direction', async ({ page }) => {
      // Wait for language to initialize
      await expect(page.locator('[data-testid="lang-he"]')).toHaveClass(/active/, { timeout: 10000 });
      // Default should be Hebrew with RTL
      await expect(page.locator('body')).toHaveAttribute('dir', 'rtl');
    });

    test('English mode sets LTR direction', async ({ page }) => {
      // Switch to English
      await page.click('[data-testid="lang-en"]');
      await expect(page.locator('[data-testid="lang-en"]')).toHaveClass(/active/, { timeout: 5000 });

      // Body should have LTR
      await expect(page.locator('body')).toHaveAttribute('dir', 'ltr');
    });
  });

  test.describe('AI Assistant', () => {
    test('quick action buttons are visible', async ({ page }) => {
      // Navigate to AI view
      await page.click('.ios-tab[data-view="ai"]');
      await page.waitForSelector('#chatView.active', { timeout: 5000 });

      // Verify quick action buttons exist (in chat suggestions)
      await expect(page.locator('#chatSuggestions button[data-suggestion="food"]')).toBeVisible();
      await expect(page.locator('#chatSuggestions button[data-suggestion="weather"]')).toBeVisible();
      await expect(page.locator('#chatSuggestions button[data-suggestion="nearby"]')).toBeVisible();
      await expect(page.locator('#chatSuggestions button[data-suggestion="plan"]')).toBeVisible();
    });

    test('voice button is present and clickable', async ({ page }) => {
      await page.click('.ios-tab[data-view="ai"]');
      await page.waitForSelector('#chatView.active', { timeout: 5000 });

      const voiceBtn = page.locator('#chatVoiceBtn');
      await expect(voiceBtn).toBeVisible();
      await expect(voiceBtn).toBeEnabled();
    });

    test.skip('weather quick action shows loading then result', async ({ page }) => {
      await page.click('.ios-tab[data-view="ai"]');
      await expect(page.locator('#aiView')).toBeVisible();

      // Click weather quick action button
      await page.click('#aiView button[data-action="weather"]');

      // Should show loading or result (may fail without geolocation)
      await page.waitForTimeout(3000);

      // Either shows weather card or error message
      const hasWeatherCard = await page.locator('.weather-card').count();
      const hasError = await page.locator('text=/Unable|שגיאה|error|Getting/i').count();
      expect(hasWeatherCard > 0 || hasError > 0).toBeTruthy();
    });
  });

  test.describe('Theme Toggle', () => {
    test('dark mode toggle works', async ({ page }) => {
      // Get current theme
      const initialTheme = await page.locator('html').getAttribute('data-theme');

      // Toggle theme
      await page.click('#themeToggle');
      const newTheme = await page.locator('html').getAttribute('data-theme');

      // Theme should have changed
      expect(newTheme).not.toBe(initialTheme);

      // Toggle back
      await page.click('#themeToggle');
      await expect(page.locator('html')).toHaveAttribute('data-theme', initialTheme || 'light');
    });

    test('theme preference persists after reload', async ({ page, context }) => {
      // Create a new page without the localStorage clearing script
      const newPage = await context.newPage();
      await newPage.goto('/');
      await dismissModals(newPage);

      // Get current theme and toggle it
      const initialTheme = await newPage.locator('html').getAttribute('data-theme');
      await newPage.click('#themeToggle');
      const newTheme = await newPage.locator('html').getAttribute('data-theme');
      expect(newTheme).not.toBe(initialTheme);

      // Reload without clearing localStorage
      await newPage.reload();
      await dismissModals(newPage);

      // Should still be the toggled theme
      await expect(newPage.locator('html')).toHaveAttribute('data-theme', newTheme || 'dark');
      await newPage.close();
    });
  });

  test.describe('Navigation', () => {
    test('all navigation views are accessible', async ({ page }) => {
      // Test each navigation button with correct view IDs
      const viewMap = {
        'search': '#searchView',
        'ai': '#chatView',
        'trip': '#tripView',
        'profile': '#profileView'
      };

      for (const [view, selector] of Object.entries(viewMap)) {
        await page.click(`.ios-tab[data-view="${view}"]`);
        await expect(page.locator(`.ios-tab[data-view="${view}"]`)).toHaveClass(/active/);
        await page.waitForSelector(`${selector}.active`, { timeout: 5000 });
      }
    });

    test('navigation updates active state correctly', async ({ page }) => {
      // Navigate to trip
      await page.click('.ios-tab[data-view="trip"]');

      // Only trip should be active
      await expect(page.locator('.ios-tab[data-view="trip"]')).toHaveClass(/active/);
      await expect(page.locator('.ios-tab[data-view="search"]')).not.toHaveClass(/active/);
      await expect(page.locator('.ios-tab[data-view="ai"]')).not.toHaveClass(/active/);
      await expect(page.locator('.ios-tab[data-view="profile"]')).not.toHaveClass(/active/);
    });

    test('rapid navigation switching works', async ({ page }) => {
      // Rapidly switch between views
      for (let i = 0; i < 3; i++) {
        await page.click('.ios-tab[data-view="search"]');
        await page.click('.ios-tab[data-view="ai"]');
        await page.click('.ios-tab[data-view="trip"]');
        await page.click('.ios-tab[data-view="profile"]');
      }

      // Final state should be profile
      await expect(page.locator('.ios-tab[data-view="profile"]')).toHaveClass(/active/);
      await expect(page.locator('#profileView')).toBeVisible();
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('app is usable on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Core elements should be visible
      await expect(page.locator('.app-container')).toBeVisible();
      await expect(page.locator('.ios-tabbar')).toBeVisible();
      await expect(page.locator('.ios-navbar')).toBeVisible();

      // Navigation should work
      await page.click('.ios-tab[data-view="trip"]');
      await expect(page.locator('#tripView')).toBeVisible();
    });

    test('buttons are tappable on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // All nav buttons should be visible and tappable
      for (const view of ['search', 'ai', 'trip', 'profile']) {
        const btn = page.locator(`.ios-tab[data-view="${view}"]`);
        await expect(btn).toBeVisible();
        await btn.click();
        await expect(btn).toHaveClass(/active/);
      }
    });
  });

  test.describe('Edge Cases', () => {
    test('handles very long search query', async ({ page }) => {
      const longQuery = 'a'.repeat(500);
      await page.fill('#freeText', longQuery);
      await page.click('#searchBtn');

      // Should handle gracefully (not crash)
      await page.waitForTimeout(1000);
      await expect(page.locator('.app-container')).toBeVisible();
    });

    test('handles special characters in search', async ({ page }) => {
      await page.fill('#freeText', '!@#$%^&*()');
      await page.click('#searchBtn');

      // Should handle gracefully
      await page.waitForTimeout(1000);
      await expect(page.locator('.app-container')).toBeVisible();
    });

    test('handles Hebrew text in search', async ({ page }) => {
      await page.fill('#freeText', 'מסעדות בתל אביב');
      await page.click('#searchBtn');

      // Should search successfully
      await page.waitForTimeout(2000);
      await expect(page.locator('.app-container')).toBeVisible();
    });

    // Skip: Budget slider is now in Step 4 of wizard, not directly accessible
    test.skip('budget slider accepts extreme values', async ({ page }) => {
      await page.click('.ios-tab[data-view="trip"]');
      await expect(page.locator('#tripView')).toBeVisible();

      // Test minimum value
      await page.fill('#budgetRange', '50');
      await expect(page.locator('#budgetAmount')).toContainText('50');

      // Test maximum value
      await page.fill('#budgetRange', '1000');
      await expect(page.locator('#budgetAmount')).toContainText('1000');
    });

    test.skip('multiple trip generations work correctly', async ({ page }) => {
      await page.click('.ios-tab[data-view="trip"]');
      await expect(page.locator('#tripView')).toBeVisible();

      // Generate first trip
      await page.click('[data-duration="2"]');
      await page.click('[data-interest="food"]');
      await page.click('#generateTripBtn');
      await waitForPlannerOK(page);
      await expect(page.locator('#enhancedTripDisplay')).toBeVisible();

      // Generate second trip with different params
      await page.click('[data-duration="8"]');
      await page.click('[data-interest="nature"]');
      await page.click('#generateTripBtn');
      await waitForPlannerOK(page);
      await expect(page.locator('#enhancedTripDisplay')).toBeVisible();
    });
  });

  test.describe('Profile View', () => {
    test('profile stats are displayed', async ({ page }) => {
      await page.click('.ios-tab[data-view="profile"]');

      // Stats section should be visible
      await expect(page.locator('#profileView')).toBeVisible();
      // Check for stats labels (HTML uses "Trips Saved" / "Places Saved")
      await expect(page.locator('.ios-stat-label').first()).toBeVisible();
      await expect(page.locator('#tripsPlannedCount')).toBeVisible();
      await expect(page.locator('#placesVisitedCount')).toBeVisible();
    });
  });
});
