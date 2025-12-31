import { test, expect } from '@playwright/test';
import { waitForPlannerOK } from './utils/waits';

test.describe('Smart Route Optimizer - Mode Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Navigate to trip planning view
    await page.click('[data-testid="nav-trip"]');
    await expect(page.locator('#tripView')).toHaveClass(/active/);
  });

  test('mode selector is visible with 3 modes', async ({ page }) => {
    // Mode selector should be visible
    const modeSelector = page.locator('[data-testid="mode-selector"]');
    await expect(modeSelector).toBeVisible();

    // Should have 3 mode buttons
    const modeButtons = page.locator('.ios-mode-btn');
    await expect(modeButtons).toHaveCount(3);

    // Verify each mode exists
    await expect(page.locator('[data-testid="mode-efficiency"]')).toBeVisible();
    await expect(page.locator('[data-testid="mode-scenic"]')).toBeVisible();
    await expect(page.locator('[data-testid="mode-foodie"]')).toBeVisible();
  });

  test('efficiency mode is selected by default', async ({ page }) => {
    const efficiencyBtn = page.locator('[data-testid="mode-efficiency"]');
    await expect(efficiencyBtn).toHaveClass(/selected/);

    // Other modes should not be selected
    const scenicBtn = page.locator('[data-testid="mode-scenic"]');
    const foodieBtn = page.locator('[data-testid="mode-foodie"]');
    await expect(scenicBtn).not.toHaveClass(/selected/);
    await expect(foodieBtn).not.toHaveClass(/selected/);
  });

  test('clicking mode button selects it', async ({ page }) => {
    // Click scenic mode
    await page.click('[data-testid="mode-scenic"]');

    // Scenic should be selected
    await expect(page.locator('[data-testid="mode-scenic"]')).toHaveClass(/selected/);

    // Efficiency should no longer be selected
    await expect(page.locator('[data-testid="mode-efficiency"]')).not.toHaveClass(/selected/);

    // Click foodie mode
    await page.click('[data-testid="mode-foodie"]');

    // Foodie should be selected
    await expect(page.locator('[data-testid="mode-foodie"]')).toHaveClass(/selected/);

    // Scenic should no longer be selected
    await expect(page.locator('[data-testid="mode-scenic"]')).not.toHaveClass(/selected/);
  });

  test('mode icons are displayed correctly', async ({ page }) => {
    // Check icons
    const efficiencyIcon = page.locator('[data-testid="mode-efficiency"] .ios-mode-icon');
    const scenicIcon = page.locator('[data-testid="mode-scenic"] .ios-mode-icon');
    const foodieIcon = page.locator('[data-testid="mode-foodie"] .ios-mode-icon');

    await expect(efficiencyIcon).toContainText('⚡');
    await expect(scenicIcon).toContainText('🏞️');
    await expect(foodieIcon).toContainText('🍽️');
  });

  test('mode labels and descriptions are displayed', async ({ page }) => {
    // Efficiency mode text
    const efficiencyLabel = page.locator('[data-testid="mode-efficiency"] .ios-mode-label');
    const efficiencyDesc = page.locator('[data-testid="mode-efficiency"] .ios-mode-desc');
    await expect(efficiencyLabel).toBeVisible();
    await expect(efficiencyDesc).toBeVisible();

    // Scenic mode text
    const scenicLabel = page.locator('[data-testid="mode-scenic"] .ios-mode-label');
    const scenicDesc = page.locator('[data-testid="mode-scenic"] .ios-mode-desc');
    await expect(scenicLabel).toBeVisible();
    await expect(scenicDesc).toBeVisible();

    // Foodie mode text
    const foodieLabel = page.locator('[data-testid="mode-foodie"] .ios-mode-label');
    const foodieDesc = page.locator('[data-testid="mode-foodie"] .ios-mode-desc');
    await expect(foodieLabel).toBeVisible();
    await expect(foodieDesc).toBeVisible();
  });
});

test.describe('Smart Route Optimizer - Trip Generation with Modes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="nav-trip"]');
    await expect(page.locator('#tripView')).toHaveClass(/active/);
  });

  test('clicking generate with efficiency mode triggers loading state', async ({ page }) => {
    // Ensure efficiency mode is selected (default)
    await expect(page.locator('[data-testid="mode-efficiency"]')).toHaveClass(/selected/);

    // Select duration and interests
    await page.click('[data-duration="8"]');
    await page.click('[data-interest="food"]');

    // Generate trip
    await page.click('#generateTripBtn');

    // Should show loading state
    await expect(page.locator('#generateTripBtn')).toContainText(/Generating|Planning|Thinking/);
  });

  test('clicking generate with scenic mode triggers loading state', async ({ page }) => {
    // Select scenic mode
    await page.click('[data-testid="mode-scenic"]');
    await expect(page.locator('[data-testid="mode-scenic"]')).toHaveClass(/selected/);

    // Select duration and interests
    await page.click('[data-duration="8"]');
    await page.click('[data-interest="nature"]');

    // Generate trip
    await page.click('#generateTripBtn');

    // Should show loading state
    await expect(page.locator('#generateTripBtn')).toContainText(/Generating|Planning|Thinking/);
  });

  test('clicking generate with foodie mode triggers loading state', async ({ page }) => {
    // Select foodie mode
    await page.click('[data-testid="mode-foodie"]');
    await expect(page.locator('[data-testid="mode-foodie"]')).toHaveClass(/selected/);

    // Select duration and interests
    await page.click('[data-duration="8"]');
    await page.click('[data-interest="food"]');

    // Generate trip
    await page.click('#generateTripBtn');

    // Should show loading state
    await expect(page.locator('#generateTripBtn')).toContainText(/Generating|Planning|Thinking/);
  });

  test('mode selection persists after clicking generate', async ({ page }) => {
    // Select scenic mode
    await page.click('[data-testid="mode-scenic"]');
    await expect(page.locator('[data-testid="mode-scenic"]')).toHaveClass(/selected/);

    // Select interests
    await page.click('[data-duration="8"]');
    await page.click('[data-interest="nature"]');

    // Click generate
    await page.click('#generateTripBtn');

    // Wait a moment for any state changes
    await page.waitForTimeout(500);

    // Scenic mode should still be selected
    await expect(page.locator('[data-testid="mode-scenic"]')).toHaveClass(/selected/);
  });

  test('mode can be changed multiple times', async ({ page }) => {
    // Start with efficiency (default)
    await expect(page.locator('[data-testid="mode-efficiency"]')).toHaveClass(/selected/);

    // Change to foodie
    await page.click('[data-testid="mode-foodie"]');
    await expect(page.locator('[data-testid="mode-foodie"]')).toHaveClass(/selected/);
    await expect(page.locator('[data-testid="mode-efficiency"]')).not.toHaveClass(/selected/);

    // Change to scenic
    await page.click('[data-testid="mode-scenic"]');
    await expect(page.locator('[data-testid="mode-scenic"]')).toHaveClass(/selected/);
    await expect(page.locator('[data-testid="mode-foodie"]')).not.toHaveClass(/selected/);

    // Change back to efficiency
    await page.click('[data-testid="mode-efficiency"]');
    await expect(page.locator('[data-testid="mode-efficiency"]')).toHaveClass(/selected/);
    await expect(page.locator('[data-testid="mode-scenic"]')).not.toHaveClass(/selected/);
  });
});

test.describe('Smart Route Optimizer - Weather Badge', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="nav-trip"]');
    await expect(page.locator('#tripView')).toHaveClass(/active/);
  });

  test('weather score badge exists in DOM', async ({ page }) => {
    // Weather badge should exist (may be hidden initially)
    const weatherBadge = page.locator('#weatherScoreBadge');
    await expect(weatherBadge).toHaveCount(1);
  });

  test('mode disabled hint exists in DOM', async ({ page }) => {
    // Disabled hint should exist (hidden initially)
    const disabledHint = page.locator('#modeDisabledHint');
    await expect(disabledHint).toHaveCount(1);
  });
});
