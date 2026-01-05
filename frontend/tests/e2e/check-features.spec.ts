import { test, expect } from '@playwright/test';
import { dismissModals } from './utils/dismissModals';

test.describe('Feature Check', () => {
  test.beforeEach(async ({ page }) => {
    // Set tenant ID using the correct key format (roamwise-tenant-id)
    await page.addInitScript(() => {
      localStorage.setItem('roamwise-tenant-id', 'test-user');
      localStorage.setItem('roamwise-tenant-name', 'TestUser');
      localStorage.setItem('traveling_lang', 'he');
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Dismiss any modals that appear (welcome + greeting)
    await dismissModals(page);
  });

  test('check console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Navigate through all tabs using nav button selectors
    await page.click('[data-testid="nav-search"]');
    await page.waitForTimeout(500);
    await page.click('[data-testid="nav-ai"]');
    await page.waitForTimeout(500);
    await page.click('[data-testid="nav-trip"]');
    await page.waitForTimeout(500);
    await page.click('[data-testid="nav-profile"]');
    await page.waitForTimeout(500);

    console.log('Console errors found:', errors.length);
    errors.forEach(e => console.log('  ERROR:', e));

    const criticalErrors = errors.filter(e =>
      !e.includes('Failed to fetch') &&
      !e.includes('NetworkError') &&
      !e.includes('net::') &&
      !e.includes('API') // API errors expected without backend
    );
    expect(criticalErrors.length).toBe(0);
  });

  test('all i18n keys render in Hebrew on search page', async ({ page }) => {
    // Ensure Hebrew
    await page.click('[data-testid="lang-he"]');
    await page.waitForTimeout(300);
    await page.click('[data-testid="nav-search"]');
    await page.waitForTimeout(300);

    const untranslated = await page.evaluate(() => {
      const elements = document.querySelectorAll('[data-i18n]');
      const issues: string[] = [];
      elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        const text = el.textContent?.trim();
        // Skip hidden elements
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return;

        if (text === key) {
          issues.push(key + ' not translated');
        }
      });
      return issues;
    });

    console.log('Untranslated elements:', untranslated.length);
    untranslated.forEach(u => console.log('  ISSUE:', u));
    expect(untranslated.length).toBe(0);
  });

  test('all i18n keys render in English on search page', async ({ page }) => {
    await page.click('[data-testid="lang-en"]');
    await page.waitForTimeout(300);
    await page.click('[data-testid="nav-search"]');
    await page.waitForTimeout(300);

    const untranslated = await page.evaluate(() => {
      const elements = document.querySelectorAll('[data-i18n]');
      const issues: string[] = [];
      elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        const text = el.textContent?.trim();
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return;

        if (text === key) {
          issues.push(key + ' not translated');
        }
      });
      return issues;
    });

    console.log('Untranslated elements:', untranslated.length);
    untranslated.forEach(u => console.log('  ISSUE:', u));
    expect(untranslated.length).toBe(0);
  });

  test('profile page i18n Hebrew', async ({ page }) => {
    await page.click('[data-testid="lang-he"]');
    await page.waitForTimeout(200);
    await page.click('[data-testid="nav-profile"]');
    await page.waitForTimeout(500);

    const untranslated = await page.evaluate(() => {
      const elements = document.querySelectorAll('[data-i18n]');
      const issues: string[] = [];
      elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        const text = el.textContent?.trim();
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return;

        if (text === key) {
          issues.push(key + ' not translated');
        }
      });
      return issues;
    });

    console.log('Profile untranslated:', untranslated.length);
    untranslated.forEach(u => console.log('  ISSUE:', u));
    expect(untranslated.length).toBe(0);
  });

  test('trip wizard i18n Hebrew', async ({ page }) => {
    await page.click('[data-testid="lang-he"]');
    await page.waitForTimeout(200);
    await page.click('[data-testid="nav-trip"]');
    await page.waitForTimeout(500);

    const untranslated = await page.evaluate(() => {
      const elements = document.querySelectorAll('[data-i18n]');
      const issues: string[] = [];
      elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        const text = el.textContent?.trim();
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return;

        if (text === key) {
          issues.push(key + ' not translated');
        }
      });
      return issues;
    });

    console.log('Trip wizard untranslated:', untranslated.length);
    untranslated.forEach(u => console.log('  ISSUE:', u));
    expect(untranslated.length).toBe(0);
  });

  test('AI chat i18n Hebrew', async ({ page }) => {
    await page.click('[data-testid="lang-he"]');
    await page.waitForTimeout(200);
    await page.click('[data-testid="nav-ai"]');
    await page.waitForTimeout(500);

    const untranslated = await page.evaluate(() => {
      const elements = document.querySelectorAll('[data-i18n]');
      const issues: string[] = [];
      elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        const text = el.textContent?.trim();
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return;

        if (text === key) {
          issues.push(key + ' not translated');
        }
      });
      return issues;
    });

    console.log('AI chat untranslated:', untranslated.length);
    untranslated.forEach(u => console.log('  ISSUE:', u));
    expect(untranslated.length).toBe(0);
  });

  test('search page categories render with translations', async ({ page }) => {
    await page.click('[data-testid="nav-search"]');
    await page.waitForTimeout(500);

    const categories = await page.locator('.ios-chip[data-category]').count();
    console.log('Category chips:', categories);
    expect(categories).toBeGreaterThan(0);

    const categoryTexts = await page.locator('.ios-chip[data-category]').allTextContents();
    console.log('Categories:', categoryTexts.map(t => t.trim()).join(', '));

    // Check none are raw i18n keys
    const keyPattern = /^categories\./;
    const untranslated = categoryTexts.filter(t => keyPattern.test(t.trim()));
    if (untranslated.length > 0) {
      console.log('Untranslated categories:', untranslated);
    }
    expect(untranslated.length).toBe(0);
  });

  test('wizard destination cards have content', async ({ page }) => {
    await page.click('[data-testid="nav-trip"]');
    await page.waitForTimeout(500);

    const cards = await page.locator('.destination-card').count();
    console.log('Destination cards:', cards);
    expect(cards).toBeGreaterThan(0);

    // Check first card has city name
    const firstCardText = await page.locator('.destination-card').first().textContent();
    console.log('First card content:', firstCardText?.trim());
    expect(firstCardText?.trim().length).toBeGreaterThan(0);
  });
});
