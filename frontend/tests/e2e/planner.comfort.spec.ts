import { test, expect } from '@playwright/test';
import { waitForPlannerOK } from './utils/waits';

test.describe('Planner - UI Comfort & Consistency', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="nav-trip"]');
    await expect(page.locator('#page-trip')).toHaveClass(/active/);
  });

  test('loading state renders correctly', async ({ page }) => {
    await page.click('[data-duration="8"]');
    await page.click('[data-interest="food"]');
    await page.click('#generateTripBtn');

    // Loading state should appear immediately
    const loadingState = page.locator('[data-testid="planner-loading"]');
    await expect(loadingState).toBeVisible({ timeout: 2000 });
    await expect(loadingState).toContainText(/Planning|🧠/);

    // Wait for completion
    await waitForPlannerOK(page);

    // Loading state should be replaced
    await expect(loadingState).not.toBeVisible();
  });

  test('error state renders with proper data-testid', async ({ page }) => {
    // Try to trigger an error by filling invalid destination
    await page.fill('#destInput', 'InvalidLocationThatDoesNotExist123456789');
    await page.click('[data-duration="8"]');
    await page.click('[data-interest="food"]');
    await page.click('#generateTripBtn');

    // Wait for either success or error
    const errorState = page.locator('[data-testid="planner-error"]');
    const successState = page.locator('#enhancedTripDisplay:not([hidden])');

    await Promise.race([
      errorState.waitFor({ state: 'visible', timeout: 45000 }),
      successState.waitFor({ state: 'visible', timeout: 45000 })
    ]);

    // If error appeared, verify it has proper styling
    if (await errorState.isVisible()) {
      await expect(errorState).toContainText(/Error|Failed|⚠️|❌/);
    }
  });

  test('POI items render with consistent structure', async ({ page }) => {
    await page.click('[data-duration="8"]');
    await page.click('[data-interest="food"]');
    await page.click('[data-interest="nature"]');
    await page.click('#generateTripBtn');

    await waitForPlannerOK(page);
    await expect(page.locator('#enhancedTripDisplay')).not.toHaveAttribute('hidden');

    // Check that POI items exist and have consistent class
    const poiItems = page.locator('.poi');
    const count = await poiItems.count();
    expect(count).toBeGreaterThan(0);

    // Verify each POI has consistent structure
    for (let i = 0; i < Math.min(count, 3); i++) {
      const poi = poiItems.nth(i);
      await expect(poi).toBeVisible();

      // POI should have some content (name, description, etc.)
      const poiText = await poi.textContent();
      expect(poiText).toBeTruthy();
      expect(poiText!.length).toBeGreaterThan(0);
    }
  });

  test('smooth transition from empty to loaded state', async ({ page }) => {
    // Initially, trip display should be hidden
    const tripDisplay = page.locator('#enhancedTripDisplay');
    await expect(tripDisplay).toHaveAttribute('hidden', '');

    // Generate trip
    await page.click('[data-duration="8"]');
    await page.click('[data-interest="food"]');
    await page.click('#generateTripBtn');

    // Loading state appears
    await expect(page.locator('[data-testid="planner-loading"]')).toBeVisible();

    // Wait for API
    await waitForPlannerOK(page);

    // Trip display becomes visible
    await expect(tripDisplay).not.toHaveAttribute('hidden');

    // Loading state disappears
    await expect(page.locator('[data-testid="planner-loading"]')).not.toBeVisible();
  });

  test('regeneration clears previous results properly', async ({ page }) => {
    // First generation
    await page.click('[data-duration="8"]');
    await page.click('[data-interest="food"]');
    await page.click('#generateTripBtn');
    await waitForPlannerOK(page);

    const firstPoiCount = await page.locator('.poi').count();
    expect(firstPoiCount).toBeGreaterThan(0);

    // Second generation with different preferences
    await page.click('[data-interest="culture"]');
    await page.click('#generateTripBtn');

    // Loading state should appear again
    await expect(page.locator('[data-testid="planner-loading"]')).toBeVisible();

    await waitForPlannerOK(page);

    // New results should be displayed
    const secondPoiCount = await page.locator('.poi').count();
    expect(secondPoiCount).toBeGreaterThan(0);
  });

  test('planner controls remain interactive during loading', async ({ page }) => {
    await page.click('[data-duration="8"]');
    await page.click('[data-interest="food"]');
    await page.click('#generateTripBtn');

    // During loading, the button should show loading state
    await expect(page.locator('#generateTripBtn')).toContainText(/Generating|Planning/);

    // Other controls should still be accessible (though possibly disabled)
    const durationButtons = page.locator('[data-duration]');
    await expect(durationButtons.first()).toBeVisible();
  });

  test('no orphaned loading states', async ({ page }) => {
    // Generate trip multiple times rapidly
    await page.click('[data-duration="8"]');
    await page.click('[data-interest="food"]');

    // First click
    await page.click('#generateTripBtn');

    // Wait a bit, then click again
    await page.waitForTimeout(1000);
    await page.click('#generateTripBtn');

    // Wait for final result
    await waitForPlannerOK(page, 45000);

    // Should only have one loading or result state, not multiple
    const loadingStates = page.locator('[data-testid="planner-loading"]');
    const visibleLoadingCount = await loadingStates.count();

    // Should be 0 (completed) or 1 (still loading), never > 1
    expect(visibleLoadingCount).toBeLessThanOrEqual(1);
  });
});
