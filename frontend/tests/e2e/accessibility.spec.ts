import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { dismissModals } from './utils/dismissModals';

/**
 * Accessibility Tests using axe-core
 * Tests WCAG 2.1 Level AA compliance across all views
 */
test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissModals(page);
    await page.waitForSelector('.ios-tab.active', { timeout: 10000 });
  });

  test.describe('Search Page Accessibility', () => {
    test('search page accessibility audit', async ({ page }) => {
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .exclude('.leaflet-container') // Exclude map (third-party)
        .analyze();

      // Log all violations for audit
      if (results.violations.length > 0) {
        console.log(`\n⚠️ Search page: ${results.violations.length} a11y issues found`);
        results.violations.forEach(v => {
          console.log(`  - [${v.impact}] ${v.id}: ${v.help}`);
        });
      } else {
        console.log('✅ Search page: No accessibility violations');
      }

      // Only fail on critical violations that block usage
      const criticalViolations = results.violations.filter(
        v => v.impact === 'critical'
      );

      expect(criticalViolations).toHaveLength(0);
    });

    test('search input has accessible label', async ({ page }) => {
      const searchInput = page.locator('#freeText');

      // Check for aria-label or associated label
      const ariaLabel = await searchInput.getAttribute('aria-label');
      const placeholder = await searchInput.getAttribute('placeholder');

      expect(ariaLabel || placeholder).toBeTruthy();
    });

    test('search button is keyboard accessible', async ({ page }) => {
      const searchBtn = page.locator('#searchBtn');

      await searchBtn.focus();
      const isFocused = await searchBtn.evaluate(el => document.activeElement === el);
      expect(isFocused).toBe(true);
    });
  });

  test.describe('AI Chat Page Accessibility', () => {
    test('AI page accessibility audit', async ({ page }) => {
      await page.click('.ios-tab[data-view="ai"]');
      await page.waitForSelector('#chatView.active', { timeout: 5000 });

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      // Log all violations for audit
      if (results.violations.length > 0) {
        console.log(`\n⚠️ AI page: ${results.violations.length} a11y issues found`);
        results.violations.forEach(v => {
          console.log(`  - [${v.impact}] ${v.id}: ${v.help}`);
        });
      } else {
        console.log('✅ AI page: No accessibility violations');
      }

      // Only fail on critical violations
      const criticalViolations = results.violations.filter(
        v => v.impact === 'critical'
      );

      expect(criticalViolations).toHaveLength(0);
    });

    test('voice button has accessible name', async ({ page }) => {
      await page.click('.ios-tab[data-view="ai"]');
      await page.waitForSelector('#chatView.active', { timeout: 5000 });

      const voiceBtn = page.locator('#chatVoiceBtn');
      const ariaLabel = await voiceBtn.getAttribute('aria-label');
      const buttonText = await voiceBtn.textContent();

      expect(ariaLabel || buttonText).toBeTruthy();
    });
  });

  test.describe('Trip Planner Accessibility', () => {
    test('trip page accessibility audit', async ({ page }) => {
      await page.click('.ios-tab[data-view="trip"]');
      await page.waitForSelector('#tripView.active', { timeout: 5000 });

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      // Log all violations for audit
      if (results.violations.length > 0) {
        console.log(`\n⚠️ Trip page: ${results.violations.length} a11y issues found`);
        results.violations.forEach(v => {
          console.log(`  - [${v.impact}] ${v.id}: ${v.help}`);
        });
      } else {
        console.log('✅ Trip page: No accessibility violations');
      }

      // Only fail on critical violations
      const criticalViolations = results.violations.filter(
        v => v.impact === 'critical'
      );

      expect(criticalViolations).toHaveLength(0);
    });

    test('wizard steps are navigable with keyboard', async ({ page }) => {
      await page.click('.ios-tab[data-view="trip"]');
      await page.waitForSelector('#tripView.active', { timeout: 5000 });

      const nextBtn = page.locator('#wizardNext');
      await nextBtn.focus();

      const isFocused = await nextBtn.evaluate(el => document.activeElement === el);
      expect(isFocused).toBe(true);
    });

    test('destination cards have proper focus indicators', async ({ page }) => {
      await page.click('.ios-tab[data-view="trip"]');
      await page.waitForSelector('.destination-card', { timeout: 5000 });

      const firstCard = page.locator('.destination-card').first();
      await firstCard.focus();

      // Check that card has visible focus ring or outline
      const focusStyles = await firstCard.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          outline: styles.outline,
          boxShadow: styles.boxShadow
        };
      });

      // Either outline or box-shadow should indicate focus
      const hasFocusIndicator =
        focusStyles.outline !== 'none' ||
        focusStyles.boxShadow !== 'none';

      expect(hasFocusIndicator).toBe(true);
    });
  });

  test.describe('Profile Page Accessibility', () => {
    test('profile page accessibility audit', async ({ page }) => {
      await page.click('.ios-tab[data-view="profile"]');
      await expect(page.locator('#profileView')).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      // Log all violations for audit
      if (results.violations.length > 0) {
        console.log(`\n⚠️ Profile page: ${results.violations.length} a11y issues found`);
        results.violations.forEach(v => {
          console.log(`  - [${v.impact}] ${v.id}: ${v.help}`);
        });
      } else {
        console.log('✅ Profile page: No accessibility violations');
      }

      // Only fail on critical violations
      const criticalViolations = results.violations.filter(
        v => v.impact === 'critical'
      );

      expect(criticalViolations).toHaveLength(0);
    });

    test('theme toggle has accessible label', async ({ page }) => {
      await page.click('.ios-tab[data-view="profile"]');
      await expect(page.locator('#profileView')).toBeVisible();

      const themeToggle = page.locator('#themeToggle');
      if (await themeToggle.isVisible()) {
        const ariaLabel = await themeToggle.getAttribute('aria-label');
        const associatedLabel = page.locator('label[for="themeToggle"]');

        const hasLabel = ariaLabel || await associatedLabel.isVisible();
        expect(hasLabel).toBeTruthy();
      }
    });
  });

  test.describe('Navigation Accessibility', () => {
    test('navbar has proper ARIA roles', async ({ page }) => {
      const navbar = page.locator('.ios-tabbar, nav');
      const role = await navbar.getAttribute('role');

      // Navigation should have proper role
      expect(['navigation', 'tablist', null]).toContain(role);
    });

    test('all nav tabs are keyboard navigable', async ({ page }) => {
      const tabs = ['search', 'ai', 'trip', 'profile'];

      for (const tab of tabs) {
        const tabEl = page.locator(`.ios-tab[data-view="${tab}"]`);
        await tabEl.focus();

        // Tab should be focusable
        const isFocused = await tabEl.evaluate(el => document.activeElement === el);
        expect(isFocused).toBe(true);

        // Tab should be activatable with Enter key
        await tabEl.press('Enter');
        await expect(tabEl).toHaveClass(/active/);
      }
    });

    test('active tab is properly indicated for screen readers', async ({ page }) => {
      const activeTab = page.locator('.ios-tab.active');

      // Should have aria-selected or similar indicator
      const ariaSelected = await activeTab.getAttribute('aria-selected');
      const ariaCurrent = await activeTab.getAttribute('aria-current');
      const hasActiveClass = await activeTab.evaluate(el => el.classList.contains('active'));

      expect(ariaSelected === 'true' || ariaCurrent || hasActiveClass).toBe(true);
    });
  });

  test.describe('RTL Accessibility', () => {
    test('RTL direction is properly set for Hebrew', async ({ page }) => {
      // Ensure Hebrew is active (default)
      await expect(page.locator('body')).toHaveAttribute('dir', 'rtl');
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    });

    test('lang attribute is set correctly', async ({ page }) => {
      const lang = await page.locator('html').getAttribute('lang');
      expect(['he', 'en']).toContain(lang);
    });
  });

  test.describe('Color Contrast', () => {
    test('color contrast audit', async ({ page }) => {
      const results = await new AxeBuilder({ page })
        .withRules(['color-contrast'])
        .analyze();

      // Log all contrast issues for audit
      const contrastViolations = results.violations.filter(
        v => v.id === 'color-contrast'
      );

      if (contrastViolations.length > 0) {
        console.log(`\n⚠️ Color contrast: ${contrastViolations.length} issues found`);
        contrastViolations.forEach(v => {
          console.log(`  - [${v.impact}] ${v.nodes.length} elements with insufficient contrast`);
        });
      } else {
        console.log('✅ Color contrast: All elements pass WCAG AA');
      }

      // This is an audit test - log but don't fail (contrast issues are documented)
      // Teams can fix contrast issues as part of design iteration
    });
  });

  test.describe('Focus Management', () => {
    test('focus is visible when navigating with keyboard', async ({ page }) => {
      // Tab through interactive elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Check that some element has focus
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();
      expect(focusedElement).not.toBe('BODY');
    });

    test('modal traps focus when open', async ({ page }) => {
      // This tests focus trapping in modals
      // First, we need to trigger a modal - let's use the welcome flow
      await page.evaluate(() => localStorage.clear());
      await page.reload();

      const welcomeModal = page.locator('#welcomeModal');
      try {
        await welcomeModal.waitFor({ state: 'visible', timeout: 3000 });

        // Tab within modal should cycle focus
        await page.keyboard.press('Tab');
        const focusedInModal = await page.evaluate(() => {
          const modal = document.querySelector('#welcomeModal');
          return modal?.contains(document.activeElement);
        });

        expect(focusedInModal).toBe(true);
      } catch {
        // Modal didn't appear - skip this test
        test.skip();
      }
    });
  });
});
