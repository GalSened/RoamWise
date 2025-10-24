import { Page } from '@playwright/test';

/**
 * Wait for the planner API to respond before asserting DOM.
 * Prevents timeouts on planner tests by waiting for network response.
 *
 * @param page - Playwright Page object
 * @param timeout - Maximum wait time in milliseconds (default: 40000ms)
 */
export async function waitForPlannerOK(page: Page, timeout = 40_000): Promise<void> {
  await page.waitForResponse(
    (response) => {
      return response.url().includes('/planner/plan-day') && response.status() === 200;
    },
    { timeout }
  );
}

/**
 * Wait for any API response matching a given URL pattern.
 *
 * @param page - Playwright Page object
 * @param urlPattern - URL pattern to match (can be string or regex)
 * @param timeout - Maximum wait time in milliseconds (default: 40000ms)
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  timeout = 40_000
): Promise<void> {
  await page.waitForResponse(
    (response) => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern) && response.status() === 200;
      }
      return urlPattern.test(url) && response.status() === 200;
    },
    { timeout }
  );
}
