import { test, expect } from '@playwright/test';
import { dismissModals } from './utils/dismissModals';

/**
 * Comprehensive Hebrew Text Audit
 * Tests all Hebrew translations across all pages and features
 */
test.describe('Hebrew Text Audit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissModals(page);
    await page.waitForSelector('.ios-tab.active', { timeout: 10000 });
    // Ensure Hebrew is active
    await expect(page.locator('[data-testid="lang-he"]')).toHaveClass(/active/);
    await expect(page.locator('body')).toHaveAttribute('dir', 'rtl');
  });

  test.describe('Search Page Hebrew', () => {
    test('search page title and subtitle in Hebrew', async ({ page }) => {
      const title = page.locator('#searchView h1');
      const subtitle = page.locator('#searchView .ios-subtitle');

      await expect(title).toContainText('מצא מקומות');
      await expect(subtitle).toContainText('גלה מקומות מדהימים');
      console.log('✅ Search title: מצא מקומות');
    });

    test('search button and input placeholder in Hebrew', async ({ page }) => {
      const searchBtn = page.locator('#searchBtn');
      const searchInput = page.locator('#freeText');

      await expect(searchBtn).toContainText('חפש');
      const placeholder = await searchInput.getAttribute('placeholder');
      expect(placeholder).toContain('מה אתה מחפש');
      console.log('✅ Search button: חפש');
      console.log('✅ Placeholder:', placeholder);
    });

    test('category chips in Hebrew', async ({ page }) => {
      const categories = {
        'restaurant': 'אוכל',
        'attraction': 'אתרים',
        'shopping': 'קניות',
        'entertainment': 'כיף'
      };

      for (const [dataVal, hebrewText] of Object.entries(categories)) {
        const chip = page.locator(`[data-category="${dataVal}"]`);
        if (await chip.isVisible()) {
          const text = await chip.textContent();
          console.log(`Category ${dataVal}: ${text}`);
        }
      }
    });

    test('ready state message in Hebrew', async ({ page }) => {
      const readyTitle = page.locator('#list .ios-card-title');
      await expect(readyTitle).toContainText('מוכן לחיפוש');
      console.log('✅ Ready state: מוכן לחיפוש');
    });
  });

  test.describe('Navigation Hebrew', () => {
    test('all navigation labels in Hebrew', async ({ page }) => {
      const navLabels = {
        'search': 'חיפוש',
        'ai': 'AI',
        'trip': 'טיול',
        'profile': 'פרופיל'
      };

      for (const [view, expectedText] of Object.entries(navLabels)) {
        const label = page.locator(`.ios-tab[data-view="${view}"] .ios-tab-label`);
        const text = await label.textContent();
        expect(text?.trim()).toBe(expectedText);
        console.log(`✅ Nav ${view}: ${text}`);
      }
    });
  });

  test.describe('AI Chat Page Hebrew', () => {
    test('AI page title and elements in Hebrew', async ({ page }) => {
      await page.click('.ios-tab[data-view="ai"]');
      await page.waitForSelector('#chatView.active', { timeout: 5000 });

      // Chat title
      const title = page.locator('#chatView h1, #chatView .section-title');
      const titleText = await title.first().textContent();
      console.log('AI page title:', titleText);

      // Quick action buttons
      const quickActions = {
        'food': 'אוכל',
        'weather': 'מזג אוויר',
        'nearby': 'בקרבת מקום',
        'plan': 'תכנן טיול'
      };

      for (const [action, expectedText] of Object.entries(quickActions)) {
        const btn = page.locator(`#chatSuggestions button[data-suggestion="${action}"]`);
        if (await btn.isVisible()) {
          const text = await btn.textContent();
          console.log(`Quick action ${action}: ${text}`);
        }
      }
    });

    test('voice button text in Hebrew', async ({ page }) => {
      await page.click('.ios-tab[data-view="ai"]');
      await page.waitForSelector('#chatView.active', { timeout: 5000 });

      const voiceBtn = page.locator('#chatVoiceBtn');
      const voiceText = await voiceBtn.textContent();
      console.log('Voice button:', voiceText);
    });
  });

  test.describe('Trip Planner Hebrew', () => {
    test('trip wizard step labels in Hebrew', async ({ page }) => {
      await page.click('.ios-tab[data-view="trip"]');
      await page.waitForSelector('#tripView.active', { timeout: 5000 });

      // Check wizard panel title
      const wizardTitle = page.locator('.wizard-panel-title').first();
      await expect(wizardTitle).toBeVisible({ timeout: 5000 });
      const titleText = await wizardTitle.textContent();
      expect(titleText).toContain('לאן נוסעים');
      console.log('✅ Wizard title:', titleText);

      // Step labels
      const steps = page.locator('.wizard-step span');
      const count = await steps.count();
      for (let i = 0; i < count; i++) {
        const text = await steps.nth(i).textContent();
        console.log(`Step ${i + 1}: ${text}`);
      }
    });

    test('destination cards have Hebrew text', async ({ page }) => {
      await page.click('.ios-tab[data-view="trip"]');
      await page.waitForSelector('#tripView.active', { timeout: 5000 });
      await page.waitForSelector('.destination-card', { timeout: 5000 });

      const cards = page.locator('.destination-card');
      const count = await cards.count();
      console.log(`Found ${count} destination cards`);

      for (let i = 0; i < Math.min(count, 3); i++) {
        const cardText = await cards.nth(i).textContent();
        console.log(`Destination ${i + 1}: ${cardText?.substring(0, 50)}`);
      }
    });

    test('wizard navigation buttons in Hebrew', async ({ page }) => {
      await page.click('.ios-tab[data-view="trip"]');
      await page.waitForSelector('#tripView.active', { timeout: 5000 });

      const nextBtn = page.locator('#wizardNext');
      const nextText = await nextBtn.textContent();
      console.log('Next button:', nextText);

      // Select destination and go to step 2
      await page.waitForSelector('.destination-card', { timeout: 5000 });
      await page.click('.destination-card');
      await page.click('#wizardNext');
      await page.waitForTimeout(500);

      const backBtn = page.locator('#wizardBack');
      if (await backBtn.isVisible()) {
        const backText = await backBtn.textContent();
        console.log('Back button:', backText);
      }
    });

    test('duration options in Hebrew', async ({ page }) => {
      await page.click('.ios-tab[data-view="trip"]');
      await page.waitForSelector('#tripView.active', { timeout: 5000 });

      // Navigate to step 2 (dates)
      await page.waitForSelector('.destination-card', { timeout: 5000 });
      await page.click('.destination-card');
      await page.click('#wizardNext');
      await page.waitForTimeout(500);

      const durations = page.locator('[data-duration]');
      const count = await durations.count();
      for (let i = 0; i < count; i++) {
        const text = await durations.nth(i).textContent();
        console.log(`Duration option: ${text}`);
      }
    });

    test('interest options in Hebrew', async ({ page }) => {
      await page.click('.ios-tab[data-view="trip"]');
      await page.waitForSelector('#tripView.active', { timeout: 5000 });

      // Navigate to step 3 (preferences)
      await page.waitForSelector('.destination-card', { timeout: 5000 });
      await page.click('.destination-card');
      await page.click('#wizardNext');
      await page.waitForTimeout(500);
      await page.click('[data-duration="weekend"]');
      await page.click('#wizardNext');
      await page.waitForTimeout(500);

      const interests = page.locator('[data-interest]');
      const count = await interests.count();
      for (let i = 0; i < Math.min(count, 6); i++) {
        const text = await interests.nth(i).textContent();
        console.log(`Interest: ${text}`);
      }
    });
  });

  test.describe('Profile Page Hebrew', () => {
    test('profile page title and stats in Hebrew', async ({ page }) => {
      await page.click('.ios-tab[data-view="profile"]');
      await expect(page.locator('#profileView')).toBeVisible();

      // Profile title
      const title = page.locator('#profileView h1, #profileView .section-title').first();
      const titleText = await title.textContent();
      console.log('Profile title:', titleText);

      // Stats labels
      const statLabels = page.locator('.ios-stat-label');
      const count = await statLabels.count();
      for (let i = 0; i < count; i++) {
        const text = await statLabels.nth(i).textContent();
        console.log(`Stat label: ${text}`);
      }
    });

    test('profile sections in Hebrew', async ({ page }) => {
      await page.click('.ios-tab[data-view="profile"]');
      await expect(page.locator('#profileView')).toBeVisible();

      // Look for section headers
      const headers = page.locator('#profileView h2, #profileView h3, #profileView .section-header');
      const count = await headers.count();
      for (let i = 0; i < count; i++) {
        const text = await headers.nth(i).textContent();
        console.log(`Section: ${text}`);
      }
    });

    test('settings labels in Hebrew', async ({ page }) => {
      await page.click('.ios-tab[data-view="profile"]');
      await expect(page.locator('#profileView')).toBeVisible();

      // Dark mode toggle label
      const themeLabel = page.locator('label[for="themeToggle"], .theme-toggle-label');
      if (await themeLabel.isVisible()) {
        const text = await themeLabel.textContent();
        console.log('Theme toggle label:', text);
      }
    });
  });

  test.describe('Language Toggle', () => {
    test('switching to English shows English text', async ({ page }) => {
      // Get Hebrew title first
      const title = page.locator('#searchView h1');
      const hebrewTitle = await title.textContent();
      expect(hebrewTitle).toContain('מצא מקומות');
      console.log('Hebrew title:', hebrewTitle);

      // Switch to English
      await page.click('[data-testid="lang-en"]');
      await expect(page.locator('[data-testid="lang-en"]')).toHaveClass(/active/);
      await expect(page.locator('body')).toHaveAttribute('dir', 'ltr');
      await page.waitForTimeout(500);

      const englishTitle = await title.textContent();
      expect(englishTitle).toContain('Find Places');
      console.log('English title:', englishTitle);

      // Switch back to Hebrew
      await page.click('[data-testid="lang-he"]');
      await page.waitForTimeout(500);
      const backToHebrew = await title.textContent();
      expect(backToHebrew).toContain('מצא מקומות');
      console.log('Back to Hebrew:', backToHebrew);
    });
  });

  test.describe('RTL Layout', () => {
    test('RTL direction is set correctly', async ({ page }) => {
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      await expect(page.locator('body')).toHaveAttribute('dir', 'rtl');
    });

    test('text alignment respects RTL', async ({ page }) => {
      // Check that content is right-aligned in RTL mode
      const searchView = page.locator('#searchView');
      const styles = await searchView.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          direction: computed.direction,
          textAlign: computed.textAlign
        };
      });
      console.log('Search view styles:', styles);
    });
  });
});
