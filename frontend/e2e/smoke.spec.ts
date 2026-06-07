import { test, expect } from '@playwright/test';

/**
 * Resilient smoke tests — assert the app actually boots and renders, not brittle
 * DOM details. These catch the "white screen of death" / bundle-load failures.
 */
test.describe('app boot', () => {
  test('home page renders the Angular root without a fatal error', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    const response = await page.goto('/');
    expect(response?.ok(), 'home responds 2xx/3xx').toBeTruthy();

    // app-root must be present and the app must have rendered into it.
    const root = page.locator('app-root');
    await expect(root).toBeAttached();
    await expect(root).not.toBeEmpty();

    expect(pageErrors, `uncaught page errors: ${pageErrors.join(', ')}`).toHaveLength(0);
  });

  test('unknown route still renders the shell (SPA fallback)', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page.locator('app-root')).toBeAttached();
  });
});
