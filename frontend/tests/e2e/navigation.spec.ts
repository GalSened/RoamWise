import { test, expect } from '@playwright/test';
import { dismissModals } from './utils/dismissModals';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissModals(page);
  });

  test('exactly one page visible at a time', async ({ page }) => {
    // Initially search view should be active
    const activeViews = page.locator('.ios-view.active');
    await expect(activeViews).toHaveCount(1);
    await expect(page.locator('#searchView')).toHaveClass(/active/);

    // Navigate to AI view
    await page.click('[data-testid="nav-ai"]');
    await expect(activeViews).toHaveCount(1);
    await expect(page.locator('#aiView')).toHaveClass(/active/);
    await expect(page.locator('#searchView')).not.toHaveClass(/active/);

    // Navigate to Trip view
    await page.click('[data-testid="nav-trip"]');
    await expect(activeViews).toHaveCount(1);
    await expect(page.locator('#tripView')).toHaveClass(/active/);
    await expect(page.locator('#aiView')).not.toHaveClass(/active/);

    // Navigate to Profile view
    await page.click('[data-testid="nav-profile"]');
    await expect(activeViews).toHaveCount(1);
    await expect(page.locator('#profileView')).toHaveClass(/active/);
    await expect(page.locator('#tripView')).not.toHaveClass(/active/);

    // Navigate back to Search view
    await page.click('[data-testid="nav-search"]');
    await expect(activeViews).toHaveCount(1);
    await expect(page.locator('#searchView')).toHaveClass(/active/);
    await expect(page.locator('#profileView')).not.toHaveClass(/active/);
  });

  test('content not hidden under fixed navbar', async ({ page }) => {
    // Check that page containers are properly positioned below the header
    const header = page.locator('.ios-navbar');
    const searchView = page.locator('#searchView');

    const headerBox = await header.boundingBox();
    const searchBox = await searchView.boundingBox();

    // Ensure header is visible
    expect(headerBox).toBeTruthy();
    expect(headerBox!.height).toBeGreaterThan(0);

    // Ensure search view starts after header (no overlap)
    expect(searchBox).toBeTruthy();
    expect(searchBox!.y).toBeGreaterThanOrEqual(headerBox!.y + headerBox!.height);

    // Verify for each view - map data-view names to actual IDs
    const viewMap = { ai: 'aiView', trip: 'tripView', profile: 'profileView' };
    for (const [nav, viewId] of Object.entries(viewMap)) {
      await page.click(`[data-testid="nav-${nav}"]`);
      const viewElement = page.locator(`#${viewId}`);
      const viewBox = await viewElement.boundingBox();

      expect(viewBox).toBeTruthy();
      expect(viewBox!.y).toBeGreaterThanOrEqual(headerBox!.y + headerBox!.height);
    }
  });

  test('navbar buttons highlight correctly', async ({ page }) => {
    // Search button should be active initially
    await expect(page.locator('[data-testid="nav-search"]')).toHaveClass(/active/);
    await expect(page.locator('[data-testid="nav-ai"]')).not.toHaveClass(/active/);
    await expect(page.locator('[data-testid="nav-trip"]')).not.toHaveClass(/active/);
    await expect(page.locator('[data-testid="nav-profile"]')).not.toHaveClass(/active/);

    // Click AI button
    await page.click('[data-testid="nav-ai"]');
    await expect(page.locator('[data-testid="nav-ai"]')).toHaveClass(/active/);
    await expect(page.locator('[data-testid="nav-search"]')).not.toHaveClass(/active/);
    await expect(page.locator('[data-testid="nav-trip"]')).not.toHaveClass(/active/);
    await expect(page.locator('[data-testid="nav-profile"]')).not.toHaveClass(/active/);

    // Click Trip button
    await page.click('[data-testid="nav-trip"]');
    await expect(page.locator('[data-testid="nav-trip"]')).toHaveClass(/active/);
    await expect(page.locator('[data-testid="nav-search"]')).not.toHaveClass(/active/);
    await expect(page.locator('[data-testid="nav-ai"]')).not.toHaveClass(/active/);
    await expect(page.locator('[data-testid="nav-profile"]')).not.toHaveClass(/active/);

    // Click Profile button
    await page.click('[data-testid="nav-profile"]');
    await expect(page.locator('[data-testid="nav-profile"]')).toHaveClass(/active/);
    await expect(page.locator('[data-testid="nav-search"]')).not.toHaveClass(/active/);
    await expect(page.locator('[data-testid="nav-ai"]')).not.toHaveClass(/active/);
    await expect(page.locator('[data-testid="nav-trip"]')).not.toHaveClass(/active/);
  });

  test('all views are accessible', async ({ page }) => {
    // Verify all page containers exist
    await expect(page.locator('#searchView')).toBeAttached();
    await expect(page.locator('#aiView')).toBeAttached();
    await expect(page.locator('#tripView')).toBeAttached();
    await expect(page.locator('#profileView')).toBeAttached();

    // Verify all navbar buttons exist
    await expect(page.locator('[data-testid="nav-search"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-ai"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-trip"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-profile"]')).toBeVisible();
  });
});
