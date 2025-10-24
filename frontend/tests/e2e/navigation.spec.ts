import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('exactly one page visible at a time', async ({ page }) => {
    // Initially search view should be active
    const activeViews = page.locator('.app-view.active');
    await expect(activeViews).toHaveCount(1);
    await expect(page.locator('#page-search')).toHaveClass(/active/);

    // Navigate to AI view
    await page.click('[data-testid="nav-ai"]');
    await expect(activeViews).toHaveCount(1);
    await expect(page.locator('#page-ai')).toHaveClass(/active/);
    await expect(page.locator('#page-search')).not.toHaveClass(/active/);

    // Navigate to Trip view
    await page.click('[data-testid="nav-trip"]');
    await expect(activeViews).toHaveCount(1);
    await expect(page.locator('#page-trip')).toHaveClass(/active/);
    await expect(page.locator('#page-ai')).not.toHaveClass(/active/);

    // Navigate to Profile view
    await page.click('[data-testid="nav-profile"]');
    await expect(activeViews).toHaveCount(1);
    await expect(page.locator('#page-profile')).toHaveClass(/active/);
    await expect(page.locator('#page-trip')).not.toHaveClass(/active/);

    // Navigate back to Search view
    await page.click('[data-testid="nav-search"]');
    await expect(activeViews).toHaveCount(1);
    await expect(page.locator('#page-search')).toHaveClass(/active/);
    await expect(page.locator('#page-profile')).not.toHaveClass(/active/);
  });

  test('content not hidden under fixed navbar', async ({ page }) => {
    // Check that page containers are properly positioned below the header
    const header = page.locator('.app-header');
    const searchView = page.locator('#page-search');

    const headerBox = await header.boundingBox();
    const searchBox = await searchView.boundingBox();

    // Ensure header is visible
    expect(headerBox).toBeTruthy();
    expect(headerBox!.height).toBeGreaterThan(0);

    // Ensure search view starts after header (no overlap)
    expect(searchBox).toBeTruthy();
    expect(searchBox!.y).toBeGreaterThanOrEqual(headerBox!.y + headerBox!.height);

    // Verify for each view
    const views = ['ai', 'trip', 'profile'];
    for (const view of views) {
      await page.click(`[data-testid="nav-${view}"]`);
      const viewElement = page.locator(`#page-${view}`);
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
    await expect(page.locator('#page-search')).toBeAttached();
    await expect(page.locator('#page-ai')).toBeAttached();
    await expect(page.locator('#page-trip')).toBeAttached();
    await expect(page.locator('#page-profile')).toBeAttached();

    // Verify all navbar buttons exist
    await expect(page.locator('[data-testid="nav-search"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-ai"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-trip"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-profile"]')).toBeVisible();
  });
});
