import { test, expect } from '@playwright/test';

/**
 * Critical-journey scaffold. These are intentionally `test.skip` until the team
 * wires stable selectors (prefer data-testid attributes) against a seeded backend.
 *
 * Target journey: register → verify → create wall → post → react → archive.
 * Fill in step by step; remove `.skip` as each becomes reliable.
 */
test.describe('auth + wall journey (scaffold)', () => {
  test.skip('a visitor can open the sign-in modal', async ({ page }) => {
    await page.goto('/');
    // TODO: add data-testid="open-login" to the sign-in trigger, then:
    // await page.getByTestId('open-login').click();
    // await expect(page.getByTestId('login-modal')).toBeVisible();
    expect(true).toBe(true);
  });

  test.skip('a logged-in user can create a wall and post to it', async () => {
    // TODO: seed a verified test user via the API, log in by storing the JWT,
    // then drive: create wall → open wall → add a post → assert it appears.
  });
});
