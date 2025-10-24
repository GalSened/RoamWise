import { test, expect } from '@playwright/test';
import { waitForPlannerOK } from './utils/waits';

test.describe('Route - Chips and Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="nav-trip"]');
    await expect(page.locator('#page-trip')).toHaveClass(/active/);
  });

  test('route chips become visible after trip generation', async ({ page }) => {
    // Initially chips should be hidden
    const routeChips = page.locator('#route-chips');
    const isInitiallyHidden = await routeChips.evaluate((el) => {
      return el.style.display === 'none' || !el.offsetParent;
    });
    expect(isInitiallyHidden).toBe(true);

    // Generate trip
    await page.click('[data-duration="8"]');
    await page.click('[data-interest="food"]');
    await page.click('#generateTripBtn');

    await waitForPlannerOK(page);
    await expect(page.locator('#enhancedTripDisplay')).not.toHaveAttribute('hidden');

    // Route chips should now be visible
    const isNowVisible = await routeChips.evaluate((el) => {
      return el.style.display !== 'none' && !!el.offsetParent;
    });
    expect(isNowVisible).toBe(true);
  });

  test('distance chip displays route distance', async ({ page }) => {
    await page.click('[data-duration="8"]');
    await page.click('[data-interest="food"]');
    await page.click('#generateTripBtn');

    await waitForPlannerOK(page);

    const distanceChip = page.locator('[data-testid="chip-distance"]');
    await expect(distanceChip).toBeVisible();

    // Should contain distance information (km or mi)
    const distanceText = await distanceChip.textContent();
    expect(distanceText).toBeTruthy();
    expect(distanceText).toMatch(/\d+(\.\d+)?\s*(km|mi|miles)/i);
  });

  test('duration chip displays route duration', async ({ page }) => {
    await page.click('[data-duration="8"]');
    await page.click('[data-interest="food"]');
    await page.click('#generateTripBtn');

    await waitForPlannerOK(page);

    const durationChip = page.locator('[data-testid="chip-duration"]');
    await expect(durationChip).toBeVisible();

    // Should contain time information
    const durationText = await durationChip.textContent();
    expect(durationText).toBeTruthy();
    expect(durationText).toMatch(/\d+\s*(h|hour|min|minute)/i);
  });

  test('avoid chip displays route restrictions', async ({ page }) => {
    await page.click('[data-duration="8"]');
    await page.click('[data-interest="food"]');
    await page.click('#generateTripBtn');

    await waitForPlannerOK(page);

    const avoidChip = page.locator('[data-testid="chip-avoid"]');
    await expect(avoidChip).toBeVisible();

    // Should contain avoid information
    const avoidText = await avoidChip.textContent();
    expect(avoidText).toBeTruthy();
    expect(avoidText).toMatch(/avoid/i);
  });

  test('navigation links contain coordinates in href', async ({ page }) => {
    await page.click('[data-duration="8"]');
    await page.click('[data-interest="food"]');
    await page.click('#generateTripBtn');

    await waitForPlannerOK(page);

    // Check Waze link
    const wazeLink = page.locator('[data-testid="nav-waze"]');
    await expect(wazeLink).toBeVisible();
    const wazeHref = await wazeLink.getAttribute('href');
    expect(wazeHref).toBeTruthy();
    expect(wazeHref).toContain('waze.com');
    expect(wazeHref).toMatch(/ll=[\d.,-]+/); // Coordinates pattern

    // Check Google Maps link
    const googleLink = page.locator('[data-testid="nav-google"]');
    await expect(googleLink).toBeVisible();
    const googleHref = await googleLink.getAttribute('href');
    expect(googleHref).toBeTruthy();
    expect(googleHref).toContain('google.com/maps');
    expect(googleHref).toMatch(/[\d.,-]+/); // Contains coordinates

    // Check Apple Maps link
    const appleLink = page.locator('[data-testid="nav-apple"]');
    await expect(appleLink).toBeVisible();
    const appleHref = await appleLink.getAttribute('href');
    expect(appleHref).toBeTruthy();
    expect(appleHref).toContain('maps.apple.com');
    expect(appleHref).toMatch(/(saddr|daddr)=[\d.,-]+/); // Source/dest coordinates
  });

  test('navigation links open in new tab', async ({ page }) => {
    await page.click('[data-duration="8"]');
    await page.click('[data-interest="food"]');
    await page.click('#generateTripBtn');

    await waitForPlannerOK(page);

    // All nav links should have target="_blank"
    const wazeTarget = await page.locator('[data-testid="nav-waze"]').getAttribute('target');
    expect(wazeTarget).toBe('_blank');

    const googleTarget = await page.locator('[data-testid="nav-google"]').getAttribute('target');
    expect(googleTarget).toBe('_blank');

    const appleTarget = await page.locator('[data-testid="nav-apple"]').getAttribute('target');
    expect(appleTarget).toBe('_blank');
  });

  test('all route chips render together', async ({ page }) => {
    await page.click('[data-duration="8"]');
    await page.click('[data-interest="food"]');
    await page.click('#generateTripBtn');

    await waitForPlannerOK(page);

    // All three chips should be visible
    await expect(page.locator('[data-testid="chip-distance"]')).toBeVisible();
    await expect(page.locator('[data-testid="chip-duration"]')).toBeVisible();
    await expect(page.locator('[data-testid="chip-avoid"]')).toBeVisible();

    // All three nav links should be visible
    await expect(page.locator('[data-testid="nav-waze"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-google"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-apple"]')).toBeVisible();
  });

  test('route info updates on regeneration', async ({ page }) => {
    // First generation
    await page.click('[data-duration="8"]');
    await page.click('[data-interest="food"]');
    await page.click('#generateTripBtn');
    await waitForPlannerOK(page);

    const firstDistance = await page.locator('[data-testid="chip-distance"]').textContent();

    // Second generation
    await page.click('[data-interest="nature"]');
    await page.click('#generateTripBtn');
    await waitForPlannerOK(page);

    const secondDistance = await page.locator('[data-testid="chip-distance"]').textContent();

    // Distance should still be populated (may or may not be different)
    expect(secondDistance).toBeTruthy();
    expect(secondDistance).toMatch(/\d+(\.\d+)?\s*(km|mi|miles)/i);
  });
});
