import { test, expect } from '@playwright/test';

test.describe('Internationalization (i18n)', () => {
  test.beforeEach(async ({ page, browserName }) => {
    // Skip Firefox due to routing issue with Python HTTP server + /roamwise-app/ base path
    test.skip(browserName === 'firefox', 'Firefox has routing issues with Python HTTP server');
    await page.goto('/');
  });

  test('language toggle buttons exist and are visible', async ({ page }) => {
    // Verify both language toggle buttons exist
    await expect(page.locator('[data-testid="lang-he"]')).toBeVisible();
    await expect(page.locator('[data-testid="lang-en"]')).toBeVisible();
  });

  test('Hebrew is active by default', async ({ page }) => {
    // Hebrew button should have active class initially (Hebrew is now default)
    await expect(page.locator('[data-testid="lang-he"]')).toHaveClass(/active/);
    await expect(page.locator('[data-testid="lang-en"]')).not.toHaveClass(/active/);
  });

  test('clicking Hebrew toggle activates Hebrew', async ({ page }) => {
    // Click Hebrew button
    await page.click('[data-testid="lang-he"]');

    // Hebrew button should become active
    await expect(page.locator('[data-testid="lang-he"]')).toHaveClass(/active/);
    await expect(page.locator('[data-testid="lang-en"]')).not.toHaveClass(/active/);
  });

  test('clicking English toggle activates English', async ({ page }) => {
    // First switch to Hebrew
    await page.click('[data-testid="lang-he"]');
    await expect(page.locator('[data-testid="lang-he"]')).toHaveClass(/active/);

    // Then switch back to English
    await page.click('[data-testid="lang-en"]');

    // English button should become active
    await expect(page.locator('[data-testid="lang-en"]')).toHaveClass(/active/);
    await expect(page.locator('[data-testid="lang-he"]')).not.toHaveClass(/active/);
  });

  test('Hebrew sets RTL direction on body', async ({ page }) => {
    // Click Hebrew button
    await page.click('[data-testid="lang-he"]');

    // Body should have dir="rtl"
    const bodyDir = await page.locator('body').getAttribute('dir');
    expect(bodyDir).toBe('rtl');
  });

  test('English sets LTR direction on body', async ({ page }) => {
    // First switch to Hebrew
    await page.click('[data-testid="lang-he"]');

    // Then switch back to English
    await page.click('[data-testid="lang-en"]');

    // Body should have dir="ltr"
    const bodyDir = await page.locator('body').getAttribute('dir');
    expect(bodyDir).toBe('ltr');
  });

  test('language preference persists across page reloads', async ({ page }) => {
    // Switch to Hebrew
    await page.click('[data-testid="lang-he"]');
    await expect(page.locator('[data-testid="lang-he"]')).toHaveClass(/active/);

    // Reload the page
    await page.reload();

    // Hebrew should still be active after reload
    await expect(page.locator('[data-testid="lang-he"]')).toHaveClass(/active/);
    await expect(page.locator('[data-testid="lang-en"]')).not.toHaveClass(/active/);

    // Body should still have dir="rtl"
    const bodyDir = await page.locator('body').getAttribute('dir');
    expect(bodyDir).toBe('rtl');
  });

  test('toggling between languages multiple times', async ({ page }) => {
    // Toggle Hebrew
    await page.click('[data-testid="lang-he"]');
    await expect(page.locator('[data-testid="lang-he"]')).toHaveClass(/active/);

    // Toggle English
    await page.click('[data-testid="lang-en"]');
    await expect(page.locator('[data-testid="lang-en"]')).toHaveClass(/active/);

    // Toggle Hebrew again
    await page.click('[data-testid="lang-he"]');
    await expect(page.locator('[data-testid="lang-he"]')).toHaveClass(/active/);

    // Toggle English again
    await page.click('[data-testid="lang-en"]');
    await expect(page.locator('[data-testid="lang-en"]')).toHaveClass(/active/);

    // Final state should be English with LTR
    const bodyDir = await page.locator('body').getAttribute('dir');
    expect(bodyDir).toBe('ltr');
  });

  test('only one language is active at a time', async ({ page }) => {
    // Initially only Hebrew is active (Hebrew is now default)
    const langHe = page.locator('[data-testid="lang-he"]');
    const langEn = page.locator('[data-testid="lang-en"]');

    await expect(langHe).toHaveClass(/active/);
    await expect(langEn).not.toHaveClass(/active/);

    // After clicking English, only English is active
    await page.click('[data-testid="lang-en"]');
    await expect(langEn).toHaveClass(/active/);
    await expect(langHe).not.toHaveClass(/active/);

    // After clicking Hebrew, only Hebrew is active
    await page.click('[data-testid="lang-he"]');
    await expect(langHe).toHaveClass(/active/);
    await expect(langEn).not.toHaveClass(/active/);
  });
});
