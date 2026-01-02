import { Page } from '@playwright/test';

/**
 * Dismisses the welcome modal and greeting modal that appear on app launch.
 * These modals block all other interactions, so they must be dismissed first.
 *
 * @param page - Playwright Page object
 */
export async function dismissModals(page: Page): Promise<void> {
  // Wait for page to stabilize
  await page.waitForTimeout(500);

  // Handle Welcome Modal (asks for user name on first visit)
  const welcomeModal = page.locator('#welcomeModal');

  // Wait for welcome modal to appear (it shows on first visit when localStorage is cleared)
  try {
    await welcomeModal.waitFor({ state: 'visible', timeout: 3000 });

    // Modal is visible, dismiss it
    // Note: The actual input ID is #tenantNameInput (not #welcomeNameInput)
    const nameInput = page.locator('#tenantNameInput');
    await nameInput.waitFor({ state: 'visible', timeout: 2000 });
    await nameInput.fill('Test User');

    const startBtn = page.locator('#welcomeStartBtn');
    await startBtn.waitFor({ state: 'visible', timeout: 2000 });
    await startBtn.click();

    // Wait for modal to disappear
    await welcomeModal.waitFor({ state: 'hidden', timeout: 5000 });
  } catch {
    // Modal didn't appear (user already completed welcome) - that's fine
  }

  // Handle Greeting Modal (appears after welcome or on every launch)
  const greetingModal = page.locator('#greetingModal');

  try {
    await greetingModal.waitFor({ state: 'visible', timeout: 3000 });

    // Modal is visible, dismiss it
    const skipBtn = page.locator('#greetingSkip');
    await skipBtn.waitFor({ state: 'visible', timeout: 2000 });
    await skipBtn.click();

    // Wait for modal to disappear
    await greetingModal.waitFor({ state: 'hidden', timeout: 5000 });
  } catch {
    // Modal didn't appear - that's fine
  }

  // Small delay to ensure modals are fully dismissed and app is interactive
  await page.waitForTimeout(300);
}

/**
 * Clears localStorage to reset app state (useful for testing first-time user flows)
 *
 * @param page - Playwright Page object
 */
export async function clearAppState(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}
