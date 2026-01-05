import { test, expect } from '@playwright/test';
import { dismissModals } from './utils/dismissModals';

/**
 * Visual Regression Tests
 * Captures and compares screenshots to detect unexpected visual changes
 *
 * Run with: npx playwright test visual-regression --update-snapshots
 * to create/update baseline screenshots
 */
test.describe('Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissModals(page);
    await page.waitForSelector('.ios-tab.active', { timeout: 10000 });
  });

  test.describe('Search Page Visual', () => {
    test('search page matches baseline', async ({ page }) => {
      // Wait for any animations to settle
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('search-page.png', {
        maxDiffPixels: 100,
        threshold: 0.2,
        animations: 'disabled'
      });
    });

    test('search page header matches baseline', async ({ page }) => {
      const header = page.locator('.ios-navbar');

      await expect(header).toHaveScreenshot('search-header.png', {
        maxDiffPixels: 50
      });
    });

    test('category chips match baseline', async ({ page }) => {
      const chips = page.locator('.chip-row, .category-chips');

      if (await chips.isVisible()) {
        await expect(chips).toHaveScreenshot('category-chips.png', {
          maxDiffPixels: 50
        });
      }
    });
  });

  test.describe('AI Chat Page Visual', () => {
    test('AI page matches baseline', async ({ page }) => {
      await page.click('.ios-tab[data-view="ai"]');
      await page.waitForSelector('#chatView.active', { timeout: 5000 });
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('ai-chat-page.png', {
        maxDiffPixels: 100,
        threshold: 0.2,
        animations: 'disabled'
      });
    });

    test('voice button matches baseline', async ({ page }) => {
      await page.click('.ios-tab[data-view="ai"]');
      await page.waitForSelector('#chatView.active', { timeout: 5000 });

      const voiceBtn = page.locator('#chatVoiceBtn');

      if (await voiceBtn.isVisible()) {
        await expect(voiceBtn).toHaveScreenshot('voice-button.png', {
          maxDiffPixels: 30
        });
      }
    });

    test('quick action buttons match baseline', async ({ page }) => {
      await page.click('.ios-tab[data-view="ai"]');
      await page.waitForSelector('#chatView.active', { timeout: 5000 });

      const suggestions = page.locator('#chatSuggestions');

      if (await suggestions.isVisible()) {
        await expect(suggestions).toHaveScreenshot('quick-actions.png', {
          maxDiffPixels: 50
        });
      }
    });
  });

  test.describe('Trip Planner Visual', () => {
    test('trip wizard step 1 matches baseline', async ({ page }) => {
      await page.click('.ios-tab[data-view="trip"]');
      await page.waitForSelector('#tripView.active', { timeout: 5000 });
      await page.waitForSelector('.destination-card', { timeout: 5000 });
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('trip-wizard-step1.png', {
        maxDiffPixels: 150, // Higher tolerance for dynamic content
        threshold: 0.25,
        animations: 'disabled'
      });
    });

    test('destination card matches baseline', async ({ page }) => {
      await page.click('.ios-tab[data-view="trip"]');
      await page.waitForSelector('.destination-card', { timeout: 5000 });

      const card = page.locator('.destination-card').first();

      await expect(card).toHaveScreenshot('destination-card.png', {
        maxDiffPixels: 50
      });
    });

    test('wizard navigation matches baseline', async ({ page }) => {
      await page.click('.ios-tab[data-view="trip"]');
      await page.waitForSelector('#tripView.active', { timeout: 5000 });

      const wizardNav = page.locator('.wizard-navigation, .wizard-footer');

      if (await wizardNav.isVisible()) {
        await expect(wizardNav).toHaveScreenshot('wizard-navigation.png', {
          maxDiffPixels: 30
        });
      }
    });
  });

  test.describe('Profile Page Visual', () => {
    test('profile page matches baseline', async ({ page }) => {
      await page.click('.ios-tab[data-view="profile"]');
      await expect(page.locator('#profileView')).toBeVisible();
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('profile-page.png', {
        maxDiffPixels: 100,
        threshold: 0.2,
        animations: 'disabled'
      });
    });

    test('stats section matches baseline', async ({ page }) => {
      await page.click('.ios-tab[data-view="profile"]');
      await expect(page.locator('#profileView')).toBeVisible();

      const stats = page.locator('.ios-stats, .profile-stats');

      if (await stats.isVisible()) {
        await expect(stats).toHaveScreenshot('profile-stats.png', {
          maxDiffPixels: 50
        });
      }
    });
  });

  test.describe('Navigation Visual', () => {
    test('bottom navbar matches baseline', async ({ page }) => {
      const navbar = page.locator('.ios-tabbar');

      await expect(navbar).toHaveScreenshot('bottom-navbar.png', {
        maxDiffPixels: 30
      });
    });

    test('navbar with each tab active', async ({ page }) => {
      const tabs = ['search', 'ai', 'trip', 'profile'];

      for (const tab of tabs) {
        await page.click(`.ios-tab[data-view="${tab}"]`);
        await page.waitForTimeout(200);

        const navbar = page.locator('.ios-tabbar');
        await expect(navbar).toHaveScreenshot(`navbar-${tab}-active.png`, {
          maxDiffPixels: 30
        });
      }
    });
  });

  test.describe('Language Toggle Visual', () => {
    test('language toggle buttons match baseline', async ({ page }) => {
      const langToggle = page.locator('.lang-toggle, .language-switcher');

      if (await langToggle.isVisible()) {
        await expect(langToggle).toHaveScreenshot('lang-toggle-he.png', {
          maxDiffPixels: 20
        });

        // Switch to English
        await page.click('[data-testid="lang-en"]');
        await page.waitForTimeout(300);

        await expect(langToggle).toHaveScreenshot('lang-toggle-en.png', {
          maxDiffPixels: 20
        });
      }
    });
  });

  test.describe('Dark Mode Visual', () => {
    test('dark mode toggle changes theme', async ({ page }) => {
      await page.click('.ios-tab[data-view="profile"]');
      await expect(page.locator('#profileView')).toBeVisible();

      const themeToggle = page.locator('#themeToggle');

      if (await themeToggle.isVisible()) {
        // Capture light mode
        await expect(page).toHaveScreenshot('profile-light-mode.png', {
          maxDiffPixels: 100,
          animations: 'disabled'
        });

        // Toggle to dark mode
        await themeToggle.click();
        await page.waitForTimeout(500);

        await expect(page).toHaveScreenshot('profile-dark-mode.png', {
          maxDiffPixels: 100,
          animations: 'disabled'
        });
      }
    });
  });

  test.describe('Responsive Visual', () => {
    test('mobile viewport renders correctly', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      await page.reload();
      await dismissModals(page);
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('mobile-375x667.png', {
        maxDiffPixels: 100,
        animations: 'disabled'
      });
    });

    test('tablet viewport renders correctly', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 }); // iPad
      await page.reload();
      await dismissModals(page);
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('tablet-768x1024.png', {
        maxDiffPixels: 150,
        animations: 'disabled'
      });
    });
  });
});
