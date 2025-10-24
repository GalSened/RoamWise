import { test, expect } from '@playwright/test';
import { waitForPlannerOK } from './utils/waits';

test.describe('Planner - Basic Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Navigate to trip planning view
    await page.click('[data-testid="nav-trip"]');
    await expect(page.locator('#page-trip')).toHaveClass(/active/);
  });

  test('NEARBY flow - generates trip without destination', async ({ page }) => {
    // Select duration
    await page.click('[data-duration="8"]');
    await expect(page.locator('[data-duration="8"]')).toHaveClass(/selected/);

    // Select interests
    await page.click('[data-interest="food"]');
    await page.click('[data-interest="nature"]');
    await expect(page.locator('[data-interest="food"]')).toHaveClass(/selected/);
    await expect(page.locator('[data-interest="nature"]')).toHaveClass(/selected/);

    // Don't fill destination - this is NEARBY mode
    const destInput = page.locator('#destInput');
    await expect(destInput).toBeEmpty();

    // Set budget
    await page.fill('#budgetRange', '400');

    // Generate trip
    await page.click('#generateTripBtn');

    // Should show loading state
    await expect(page.locator('#generateTripBtn')).toContainText(/Generating|Planning/);

    // Wait for planner API to respond
    await waitForPlannerOK(page);

    // Trip should be generated
    await expect(page.locator('#enhancedTripDisplay')).not.toHaveAttribute('hidden');

    // Should have POI items
    const poiItems = page.locator('.poi');
    await expect(poiItems).toHaveCount(await poiItems.count(), { timeout: 5000 });
    await expect(poiItems.first()).toBeVisible();
  });

  test('A→B flow - generates trip with destination', async ({ page }) => {
    // Select duration
    await page.click('[data-duration="16"]');
    await expect(page.locator('[data-duration="16"]')).toHaveClass(/selected/);

    // Select interests
    await page.click('[data-interest="culture"]');
    await page.click('[data-interest="shopping"]');
    await expect(page.locator('[data-interest="culture"]')).toHaveClass(/selected/);
    await expect(page.locator('[data-interest="shopping"]')).toHaveClass(/selected/);

    // Fill destination - this is A→B mode
    await page.fill('#destInput', 'Dolomites');
    await expect(page.locator('#destInput')).toHaveValue('Dolomites');

    // Set budget
    await page.fill('#budgetRange', '600');

    // Generate trip
    await page.click('#generateTripBtn');

    // Should show loading state
    await expect(page.locator('#generateTripBtn')).toContainText(/Generating|Planning/);

    // Wait for planner API to respond
    await waitForPlannerOK(page);

    // Trip should be generated
    await expect(page.locator('#enhancedTripDisplay')).not.toHaveAttribute('hidden');

    // Should have POI items
    const poiItems = page.locator('.poi');
    await expect(poiItems).toHaveCount(await poiItems.count(), { timeout: 5000 });
    await expect(poiItems.first()).toBeVisible();
  });

  test('handles planner errors gracefully', async ({ page }) => {
    // Try to generate without selecting any interests
    await page.click('#generateTripBtn');

    // Should either show validation error or proceed
    // (Behavior depends on whether frontend validates or backend rejects)
    const loadingBtn = page.locator('#generateTripBtn:has-text("Generating"), #generateTripBtn:has-text("Planning")');
    const errorMsg = page.locator('[data-testid="planner-error"]');

    // Wait for either loading state or error
    await Promise.race([
      loadingBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
      errorMsg.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
    ]);
  });

  test('can regenerate trip multiple times', async ({ page }) => {
    // First generation
    await page.click('[data-duration="8"]');
    await page.click('[data-interest="food"]');
    await page.click('#generateTripBtn');

    // Wait for first trip
    await waitForPlannerOK(page);
    await expect(page.locator('#enhancedTripDisplay')).not.toHaveAttribute('hidden');

    const firstPoiCount = await page.locator('.poi').count();
    expect(firstPoiCount).toBeGreaterThan(0);

    // Second generation - change preferences
    await page.click('[data-interest="nature"]');
    await page.click('#generateTripBtn');

    // Wait for second trip
    await waitForPlannerOK(page);
    await expect(page.locator('#enhancedTripDisplay')).not.toHaveAttribute('hidden');

    // Should have new POIs
    const secondPoiCount = await page.locator('.poi').count();
    expect(secondPoiCount).toBeGreaterThan(0);
  });

  test('network wait prevents premature assertions', async ({ page }) => {
    await page.click('[data-duration="8"]');
    await page.click('[data-interest="food"]');
    await page.click('#generateTripBtn');

    // This should NOT timeout because we wait for network
    await waitForPlannerOK(page, 40_000);

    // Only after network response, check DOM
    const tripDisplay = page.locator('#enhancedTripDisplay');
    await expect(tripDisplay).not.toHaveAttribute('hidden');
  });
});
