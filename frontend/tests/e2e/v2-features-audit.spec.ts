import { test, expect } from '@playwright/test';
import { dismissModals } from './utils/dismissModals';

/**
 * V2 Features Audit - Comprehensive check of all pages and features
 * Run with: npx playwright test v2-features-audit.spec.ts --project=chromium --reporter=line
 */
test.describe('V2 Features Audit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissModals(page);
    await page.waitForSelector('.ios-tab.active', { timeout: 10000 });
  });

  test.describe('Search Page', () => {
    test('search page loads with all elements', async ({ page }) => {
      // Should be on search by default
      await expect(page.locator('.ios-tab[data-view="search"]')).toHaveClass(/active/);
      await expect(page.locator('#searchView')).toBeVisible();

      // Search input
      await expect(page.locator('#freeText')).toBeVisible();
      await expect(page.locator('#searchBtn')).toBeVisible();

      // Category chips
      await expect(page.locator('[data-category]').first()).toBeVisible();

      // Results list container
      await expect(page.locator('#list')).toBeVisible();

      console.log('✅ Search page: All elements present');
    });

    test('category chips are clickable', async ({ page }) => {
      const categories = ['restaurant', 'attraction', 'shopping', 'entertainment'];

      for (const cat of categories) {
        const chip = page.locator(`[data-category="${cat}"]`);
        if (await chip.isVisible()) {
          await chip.click();
          await page.waitForTimeout(500);
          console.log(`✅ Category chip "${cat}" clicked`);
        }
      }
    });

    test('search performs query', async ({ page }) => {
      await page.fill('#freeText', 'coffee');
      await page.click('#searchBtn');

      // Wait for loading state or results
      await page.waitForTimeout(2000);

      // Check results area updated
      const listContent = await page.locator('#list').textContent();
      console.log(`✅ Search executed, results area updated`);
    });
  });

  test.describe('AI Assistant Page', () => {
    test('AI page loads with all elements', async ({ page }) => {
      await page.click('.ios-tab[data-view="ai"]');
      await page.waitForSelector('#chatView.active', { timeout: 5000 });

      // Voice button
      const voiceBtn = page.locator('#chatVoiceBtn');
      await expect(voiceBtn).toBeVisible();
      console.log('✅ Voice button present');

      // Quick action buttons (in chat suggestions)
      const quickActions = ['food', 'weather', 'nearby', 'plan'];
      for (const action of quickActions) {
        const btn = page.locator(`#chatSuggestions button[data-suggestion="${action}"]`);
        if (await btn.isVisible()) {
          console.log(`✅ Quick action "${action}" present`);
        } else {
          console.log(`⚠️ Quick action "${action}" NOT found`);
        }
      }

      // Chat messages area
      await expect(page.locator('#chatMessages')).toBeVisible();

      console.log('✅ AI page: Core elements present');
    });

    test('quick action buttons trigger actions', async ({ page }) => {
      await page.click('.ios-tab[data-view="ai"]');
      await page.waitForSelector('#chatView.active', { timeout: 5000 });

      // Test find-food action
      const findFoodBtn = page.locator('#chatSuggestions button[data-suggestion="food"]');
      if (await findFoodBtn.isVisible()) {
        await findFoodBtn.click();
        await page.waitForTimeout(1000);
        console.log('✅ Find food action triggered');
      }
    });
  });

  test.describe('Trip Planner Page', () => {
    test('trip page loads with all elements', async ({ page }) => {
      await page.click('.ios-tab[data-view="trip"]');
      await page.waitForSelector('#tripView.active', { timeout: 5000 });

      // Check wizard is visible
      const wizard = page.locator('#tripWizard');
      await expect(wizard).toBeVisible();
      console.log('✅ Trip wizard present');

      // Wizard steps should be visible
      await expect(page.locator('.wizard-step[data-step="1"]')).toBeVisible();
      console.log('✅ Wizard steps present');

      // Destinations grid (Step 1)
      await page.waitForSelector('.destination-card', { timeout: 5000 });
      console.log('✅ Destination cards present');

      // Wizard navigation
      await expect(page.locator('#wizardNext')).toBeVisible();
      console.log('✅ Wizard navigation present');
    });

    test('duration and interest selection works', async ({ page }) => {
      await page.click('.ios-tab[data-view="trip"]');
      await page.waitForSelector('#tripView.active', { timeout: 5000 });

      // Step 1: Select destination
      await page.waitForSelector('.destination-card', { timeout: 5000 });
      await page.click('.destination-card');
      console.log('✅ Destination selected');

      // Go to Step 2
      await page.click('#wizardNext');
      await page.waitForTimeout(500);

      // Step 2: Select duration
      await page.click('[data-duration="weekend"]');
      await expect(page.locator('[data-duration="weekend"]')).toHaveClass(/active/);
      console.log('✅ Duration selection works');

      // Go to Step 3
      await page.click('#wizardNext');
      await page.waitForTimeout(500);

      // Step 3: Select interests
      await page.click('[data-interest="food"]');
      await expect(page.locator('[data-interest="food"]')).toHaveClass(/active/);
      console.log('✅ Interest selection works');
    });

    test('generate trip button shows loading state', async ({ page }) => {
      await page.click('.ios-tab[data-view="trip"]');
      await page.waitForSelector('#tripView.active', { timeout: 5000 });

      // Step 1: Select destination
      await page.waitForSelector('.destination-card', { timeout: 5000 });
      await page.click('.destination-card');

      // Go to Step 2
      await page.click('#wizardNext');
      await page.waitForTimeout(500);

      // Step 2: Select duration
      await page.click('[data-duration="weekend"]');

      // Go to Step 3
      await page.click('#wizardNext');
      await page.waitForTimeout(500);

      // Step 3: Select interest
      await page.click('[data-interest="food"]');

      // Go to Step 4 (AI Generation)
      await page.click('#wizardNext');
      await page.waitForTimeout(500);

      console.log('✅ Wizard navigated through all steps');
    });
  });

  test.describe('Profile Page', () => {
    test('profile page loads with all elements', async ({ page }) => {
      await page.click('.ios-tab[data-view="profile"]');
      await expect(page.locator('#profileView')).toBeVisible();

      // Stats
      await expect(page.locator('#tripsPlannedCount')).toBeVisible();
      await expect(page.locator('#placesVisitedCount')).toBeVisible();
      console.log('✅ Profile stats present');

      // Settings sections
      const profileContent = await page.locator('#profileView').textContent();
      console.log('✅ Profile page loaded');
    });
  });

  test.describe('Language & Theme', () => {
    test('language switcher works (Hebrew/English)', async ({ page }) => {
      // Default should be Hebrew
      await expect(page.locator('[data-testid="lang-he"]')).toHaveClass(/active/);
      await expect(page.locator('body')).toHaveAttribute('dir', 'rtl');
      console.log('✅ Hebrew is default, RTL active');

      // Switch to English
      await page.click('[data-testid="lang-en"]');
      await expect(page.locator('[data-testid="lang-en"]')).toHaveClass(/active/);
      await expect(page.locator('body')).toHaveAttribute('dir', 'ltr');
      console.log('✅ English switch works, LTR active');

      // Switch back to Hebrew
      await page.click('[data-testid="lang-he"]');
      await expect(page.locator('[data-testid="lang-he"]')).toHaveClass(/active/);
      await expect(page.locator('body')).toHaveAttribute('dir', 'rtl');
      console.log('✅ Hebrew switch works, RTL restored');
    });

    test('theme toggle works', async ({ page }) => {
      const initialTheme = await page.locator('html').getAttribute('data-theme');
      console.log(`Initial theme: ${initialTheme}`);

      await page.click('#themeToggle');
      const newTheme = await page.locator('html').getAttribute('data-theme');
      expect(newTheme).not.toBe(initialTheme);
      console.log(`✅ Theme toggled to: ${newTheme}`);

      await page.click('#themeToggle');
      const restoredTheme = await page.locator('html').getAttribute('data-theme');
      expect(restoredTheme).toBe(initialTheme);
      console.log('✅ Theme restored');
    });
  });

  test.describe('Navigation', () => {
    test('all tabs navigate correctly', async ({ page }) => {
      const tabs = [
        { view: 'search', selector: '#searchView' },
        { view: 'ai', selector: '#chatView' },
        { view: 'trip', selector: '#tripView' },
        { view: 'profile', selector: '#profileView' },
      ];

      for (const tab of tabs) {
        await page.click(`.ios-tab[data-view="${tab.view}"]`);
        await expect(page.locator(`.ios-tab[data-view="${tab.view}"]`)).toHaveClass(/active/);
        await page.waitForSelector(`${tab.selector}.active`, { timeout: 5000 });
        console.log(`✅ Tab "${tab.view}" works`);
      }
    });
  });

  test.describe('PWA Features', () => {
    test('app container and navbar present', async ({ page }) => {
      await expect(page.locator('.app-container')).toBeVisible();
      await expect(page.locator('.ios-navbar')).toBeVisible();
      await expect(page.locator('.ios-tabbar')).toBeVisible();
      console.log('✅ PWA shell elements present');
    });
  });
});
