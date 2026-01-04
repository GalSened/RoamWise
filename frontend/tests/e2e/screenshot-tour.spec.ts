import { test, expect } from '@playwright/test';
import { dismissModals } from './utils/dismissModals';

/**
 * V2 Features Screenshot Tour
 * Takes screenshots of all V2 features
 */
test.describe('V2 Features Screenshot Tour', () => {
  test('capture all V2 features', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 }); // iPhone 14 Pro size

    // Navigate to app
    await page.goto('/');

    // Screenshot 1: Welcome Modal
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/v2-screenshots/01-welcome-modal.png', fullPage: false });
    console.log('📸 1. Welcome Modal captured');

    // Dismiss modals
    await dismissModals(page);
    await page.waitForSelector('.ios-tab.active', { timeout: 10000 });

    // Screenshot 2: Search Page (default)
    await page.screenshot({ path: '/tmp/v2-screenshots/02-search-page.png', fullPage: false });
    console.log('📸 2. Search Page captured');

    // Screenshot 3: AI Assistant Page
    await page.click('.ios-tab[data-view="ai"]');
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/tmp/v2-screenshots/03-ai-assistant.png', fullPage: false });
    console.log('📸 3. AI Assistant captured');

    // Screenshot 4: Trip Planner Page (Wizard Step 1)
    await page.click('.ios-tab[data-view="trip"]');
    await page.waitForSelector('#tripView.active', { timeout: 5000 });
    await page.screenshot({ path: '/tmp/v2-screenshots/04-trip-planner.png', fullPage: false });
    console.log('📸 4. Trip Planner captured');

    // Screenshot 5: Trip Planner with selections (wizard flow)
    await page.waitForSelector('.destination-card', { timeout: 5000 });
    await page.click('.destination-card');
    await page.click('#wizardNext');
    await page.waitForTimeout(500);
    await page.click('[data-duration="weekend"]');
    await page.click('#wizardNext');
    await page.waitForTimeout(500);
    await page.click('[data-interest="food"]');
    await page.click('[data-interest="nature"]');
    await page.screenshot({ path: '/tmp/v2-screenshots/05-trip-configured.png', fullPage: false });
    console.log('📸 5. Trip Planner (configured) captured');

    // Screenshot 6: Profile Page
    await page.click('.ios-tab[data-view="profile"]');
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/tmp/v2-screenshots/06-profile-page.png', fullPage: false });
    console.log('📸 6. Profile Page captured');

    // Screenshot 7: Dark Mode
    await page.click('#themeToggle');
    await page.waitForTimeout(300);
    await page.screenshot({ path: '/tmp/v2-screenshots/07-dark-mode.png', fullPage: false });
    console.log('📸 7. Dark Mode captured');

    // Screenshot 8: English Language
    await page.click('[data-testid="lang-en"]');
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/tmp/v2-screenshots/08-english-mode.png', fullPage: false });
    console.log('📸 8. English Mode captured');

    // Go back to Search to show English
    await page.click('.ios-tab[data-view="search"]');
    await page.waitForTimeout(300);
    await page.screenshot({ path: '/tmp/v2-screenshots/09-search-english-dark.png', fullPage: false });
    console.log('📸 9. Search (English + Dark) captured');

    // Switch back to light mode for AI page
    await page.click('#themeToggle');
    await page.click('.ios-tab[data-view="ai"]');
    await page.waitForTimeout(300);
    await page.screenshot({ path: '/tmp/v2-screenshots/10-ai-english-light.png', fullPage: false });
    console.log('📸 10. AI Assistant (English + Light) captured');

    console.log('✅ All V2 screenshots captured in /tmp/v2-screenshots/');
  });
});
