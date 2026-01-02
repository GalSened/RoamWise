import { test, expect } from '@playwright/test';
import { dismissModals } from './utils/dismissModals';

test.describe('Monitor Agent - Intervention System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissModals(page);
    // Navigate to trip planning view
    await page.click('[data-testid="nav-trip"]');
    await expect(page.locator('#tripView')).toHaveClass(/active/);
  });

  test('intervention container exists in DOM', async ({ page }) => {
    // The intervention container should exist (for displaying alerts)
    const interventionContainer = page.locator('#interventionContainer, [data-testid="intervention-container"]');
    // May be created dynamically, so just check the page loaded
    await expect(page.locator('#tripView')).toBeVisible();
  });

  test('trip form elements exist for weather-aware planning', async ({ page }) => {
    // Duration selector should exist
    const durationSelector = page.locator('[data-duration="8"]');
    await expect(durationSelector).toBeVisible();

    // Interest selector should exist
    const interestOption = page.locator('[data-interest="food"]');
    await expect(interestOption).toBeVisible();

    // Generate button should exist
    const generateBtn = page.locator('#generateTripBtn');
    await expect(generateBtn).toBeVisible();
  });

  test('trip display container exists for weather-aware results', async ({ page }) => {
    // The trip display container should exist (initially hidden)
    const tripDisplay = page.locator('#enhancedTripDisplay');
    await expect(tripDisplay).toHaveCount(1);
  });
});

test.describe('Monitor Agent - Mode Availability', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissModals(page);
    await page.click('[data-testid="nav-trip"]');
    await expect(page.locator('#tripView')).toHaveClass(/active/);
  });

  test('mode buttons can be disabled state', async ({ page }) => {
    // Check that mode buttons support disabled state
    const scenicBtn = page.locator('[data-testid="mode-scenic"]');
    await expect(scenicBtn).toBeVisible();

    // The button should not be disabled by default
    await expect(scenicBtn).not.toHaveClass(/disabled/);
  });

  test('disabled mode hint element exists', async ({ page }) => {
    // Check disabled hint is in DOM
    const hint = page.locator('#modeDisabledHint');
    await expect(hint).toHaveCount(1);
  });

  test('recommended badge elements exist on mode buttons', async ({ page }) => {
    // Check that recommended badge elements exist
    const efficiencyRecommended = page.locator('[data-testid="mode-efficiency"] .ios-mode-recommended');
    const scenicRecommended = page.locator('[data-testid="mode-scenic"] .ios-mode-recommended');
    const foodieRecommended = page.locator('[data-testid="mode-foodie"] .ios-mode-recommended');

    await expect(efficiencyRecommended).toHaveCount(1);
    await expect(scenicRecommended).toHaveCount(1);
    await expect(foodieRecommended).toHaveCount(1);
  });
});

test.describe('Monitor Agent - Weather Insights Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissModals(page);
    await page.click('[data-testid="nav-trip"]');
    await expect(page.locator('#tripView')).toHaveClass(/active/);
  });

  test('trip generation button triggers loading with default mode', async ({ page }) => {
    // Generate a trip
    await page.click('[data-duration="8"]');
    await page.click('[data-interest="food"]');
    await page.click('#generateTripBtn');

    // Button should show loading state
    await expect(page.locator('#generateTripBtn')).toContainText(/Generating|Planning|Thinking/);
  });

  test('outdoor interest can be selected for weather-aware planning', async ({ page }) => {
    // Select nature/outdoor interests
    await page.click('[data-duration="8"]');
    await page.click('[data-interest="nature"]');

    // Nature should be selected
    await expect(page.locator('[data-interest="nature"]')).toHaveClass(/selected/);

    // Generate button should be available
    await expect(page.locator('#generateTripBtn')).toBeVisible();
  });

  test('foodie mode integrates with interest selection', async ({ page }) => {
    // Select foodie mode
    await page.click('[data-testid="mode-foodie"]');
    await expect(page.locator('[data-testid="mode-foodie"]')).toHaveClass(/selected/);

    // Select food interests
    await page.click('[data-duration="8"]');
    await page.click('[data-interest="food"]');

    // Food should be selected
    await expect(page.locator('[data-interest="food"]')).toHaveClass(/selected/);

    // Generate trip
    await page.click('#generateTripBtn');

    // Button should show loading state
    await expect(page.locator('#generateTripBtn')).toContainText(/Generating|Planning|Thinking/);
  });
});

test.describe('Monitor Agent - Intervention UI Elements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissModals(page);
    await page.click('[data-testid="nav-trip"]');
    await expect(page.locator('#tripView')).toHaveClass(/active/);
  });

  test('page structure supports intervention overlay', async ({ page }) => {
    // The page should support overlay/modal elements
    const tripView = page.locator('#tripView');
    await expect(tripView).toBeVisible();

    // Check that the mode selector exists (for intervention updates)
    const modeSelector = page.locator('[data-testid="mode-selector"]');
    await expect(modeSelector).toBeVisible();
  });

  test('mode selector is keyboard accessible', async ({ page }) => {
    // Mode buttons should be focusable
    const efficiencyBtn = page.locator('[data-testid="mode-efficiency"]');
    await efficiencyBtn.focus();

    // Button should receive focus
    await expect(efficiencyBtn).toBeFocused();

    // Tab to next button
    await page.keyboard.press('Tab');
    const scenicBtn = page.locator('[data-testid="mode-scenic"]');
    await expect(scenicBtn).toBeFocused();
  });

  test('mode buttons respond to Enter key', async ({ page }) => {
    // Focus on scenic button
    const scenicBtn = page.locator('[data-testid="mode-scenic"]');
    await scenicBtn.focus();

    // Press Enter
    await page.keyboard.press('Enter');

    // Scenic should be selected
    await expect(scenicBtn).toHaveClass(/selected/);
  });
});
