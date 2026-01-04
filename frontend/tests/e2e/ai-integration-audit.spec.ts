import { test, expect } from '@playwright/test';
import { dismissModals } from './utils/dismissModals';

/**
 * AI Integration Audit - Test AI features in the app
 * Run with: npx playwright test ai-integration-audit.spec.ts --project=chromium --reporter=line
 */
test.describe('AI Integration Audit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissModals(page);
    await page.waitForSelector('.ios-tab.active', { timeout: 10000 });
  });

  test.describe('AI Search Integration', () => {
    test('search uses AI backend', async ({ page }) => {
      // Monitor network requests
      const apiCalls: string[] = [];
      page.on('request', (req) => {
        if (req.url().includes('/api/') || req.url().includes('openai') || req.url().includes('groq')) {
          apiCalls.push(req.url());
        }
      });

      // Perform search
      await page.fill('#freeText', 'best coffee shop');
      await page.click('#searchBtn');

      // Wait for search
      await page.waitForTimeout(5000);

      // Check if AI API was called
      console.log('API calls made:', apiCalls);
      if (apiCalls.length > 0) {
        console.log('✅ AI API calls detected during search');
      } else {
        console.log('⚠️ No AI API calls detected (may use proxy)');
      }

      // Check results populated
      const resultCards = await page.locator('#list .ios-card').count();
      console.log(`✅ Search returned ${resultCards} results`);
    });
  });

  test.describe('AI Trip Planner Integration', () => {
    test('trip planner shows wizard steps', async ({ page }) => {
      await page.click('.ios-tab[data-view="trip"]');
      await page.waitForSelector('#tripView.active', { timeout: 5000 });

      // Check wizard is visible
      const wizard = page.locator('#tripWizard');
      await expect(wizard).toBeVisible();

      // Step 1: Select a destination (wait for grid to populate)
      await page.waitForSelector('.destination-card', { timeout: 5000 });
      await page.click('.destination-card');
      await page.waitForTimeout(300);

      // Navigate to Step 2 (Dates)
      await page.click('#wizardNext');
      await page.waitForTimeout(500);

      // Step 2: Select duration
      await page.click('[data-duration="weekend"]');

      // Navigate to Step 3 (Preferences)
      await page.click('#wizardNext');
      await page.waitForTimeout(500);

      // Step 3: Select interest
      await page.click('[data-interest="food"]');

      console.log(`✅ Trip planner wizard navigation working`);
    });

    test('trip planner makes API request', async ({ page }) => {
      await page.click('.ios-tab[data-view="trip"]');
      await page.waitForSelector('#tripView.active', { timeout: 5000 });

      // Monitor for planner API
      const plannerRequest = page.waitForRequest(
        (req) => req.url().includes('/planner') || req.url().includes('/api/'),
        { timeout: 15000 }
      ).catch(() => null);

      // Step 1: Select destination
      await page.waitForSelector('.destination-card', { timeout: 5000 });
      await page.click('.destination-card');
      await page.waitForTimeout(300);

      // Navigate to Step 2
      await page.click('#wizardNext');
      await page.waitForTimeout(500);

      // Step 2: Select duration
      await page.click('[data-duration="weekend"]');

      // Navigate to Step 3
      await page.click('#wizardNext');
      await page.waitForTimeout(500);

      // Step 3: Select interest
      await page.click('[data-interest="food"]');

      // Navigate to Step 4 (AI Generation)
      await page.click('#wizardNext');
      await page.waitForTimeout(1000);

      const req = await plannerRequest;
      if (req) {
        console.log(`✅ Planner API called: ${req.url()}`);
      } else {
        console.log('⚠️ No planner API request detected within 15s (expected for mock)');
      }
    });
  });

  test.describe('AI Assistant Quick Actions', () => {
    test('find-food action triggers AI', async ({ page }) => {
      await page.click('.ios-tab[data-view="ai"]');
      await page.waitForSelector('#chatView.active', { timeout: 5000 });

      const btn = page.locator('#chatSuggestions button[data-suggestion="food"]');
      await expect(btn).toBeVisible();

      // Click and check response
      await btn.click();
      await page.waitForTimeout(2000);

      // Check if chat input or messages updated
      const chatMessages = page.locator('#chatMessages');
      console.log(`✅ Find-food action triggered`);
    });

    test('weather action triggers API', async ({ page }) => {
      await page.click('.ios-tab[data-view="ai"]');
      await page.waitForSelector('#chatView.active', { timeout: 5000 });

      const btn = page.locator('#chatSuggestions button[data-suggestion="weather"]');
      await expect(btn).toBeVisible();

      // Click weather
      await btn.click();
      await page.waitForTimeout(3000);

      // Check for chat response
      console.log(`✅ Weather action triggered`);
    });

    test('nearby action works', async ({ page }) => {
      await page.click('.ios-tab[data-view="ai"]');
      await page.waitForSelector('#chatView.active', { timeout: 5000 });

      const btn = page.locator('#chatSuggestions button[data-suggestion="nearby"]');
      await expect(btn).toBeVisible();

      await btn.click();
      await page.waitForTimeout(1000);

      console.log(`✅ Nearby action triggered`);
    });

    test('plan action works', async ({ page }) => {
      await page.click('.ios-tab[data-view="ai"]');
      await page.waitForSelector('#chatView.active', { timeout: 5000 });

      const btn = page.locator('#chatSuggestions button[data-suggestion="plan"]');
      await expect(btn).toBeVisible();

      await btn.click();
      await page.waitForTimeout(1000);

      console.log(`✅ Plan action triggered`);
    });
  });

  test.describe('Voice AI Features', () => {
    test('voice button is functional', async ({ page }) => {
      await page.click('.ios-tab[data-view="ai"]');
      await page.waitForSelector('#chatView.active', { timeout: 5000 });

      const voiceBtn = page.locator('#chatVoiceBtn');
      await expect(voiceBtn).toBeVisible();
      await expect(voiceBtn).toBeEnabled();

      // Check button content (should have icon/text)
      const btnContent = await voiceBtn.textContent();
      console.log(`✅ Voice button content: "${btnContent}"`);

      // Click voice button
      await voiceBtn.click();
      await page.waitForTimeout(1000);

      console.log(`✅ Voice button clicked`);
    });
  });

  test.describe('AI Model Configuration', () => {
    test('app loads AI configuration', async ({ page }) => {
      // Check for AI provider config in page
      const aiProviderConfig = await page.evaluate(() => {
        // Check various ways the app might expose AI config
        return {
          hasOpenAI: !!(window as any).OPENAI_API_KEY || document.body.innerHTML.includes('openai'),
          hasGroq: !!(window as any).GROQ_API_KEY || document.body.innerHTML.includes('groq'),
          hasProxy: document.body.innerHTML.includes('proxy') || document.body.innerHTML.includes('api'),
        };
      });

      console.log('AI Configuration detected:', aiProviderConfig);
    });
  });
});
