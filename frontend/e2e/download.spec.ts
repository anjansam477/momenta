import { test, expect } from '@playwright/test';

/**
 * Guards the PDF export against the cross-origin canvas-taint regression that the
 * srcset re-architecture could introduce (feed images now load via direct URLs).
 *
 * Skipped until a wall with at least one image post is seeded and a stable
 * `data-testid="download-wall"` is added to the download button. Remove `.skip`
 * to activate. The capture pattern below is ready — only the navigation +
 * selector + seed need filling in.
 */
test.describe('wall PDF export', () => {
  test.skip('downloading a wall with image posts produces a PDF (no canvas taint)', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text());
    });

    // TODO: navigate to a seeded wall that has at least one IMAGE post.
    // await page.goto('/moment/<seeded-wall-id>');
    // await expect(page.locator('app-wall-posts img').first()).toBeVisible();

    // Capture the download triggered by the export button.
    const downloadPromise = page.waitForEvent('download');
    // await page.getByTestId('download-wall').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
    // A tainted canvas throws SecurityError in toDataURL → surfaces as a console error.
    expect(consoleErrors.join('\n')).not.toMatch(/SecurityError|tainted/i);
  });
});
