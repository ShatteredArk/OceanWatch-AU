/**
 * Playwright smoke tests.
 *
 * These run against a live dev server (see playwright.config.ts).
 * They verify the critical user paths work end-to-end.
 */

import { test, expect } from '@playwright/test';

test.describe('Home page', () => {
  test('loads and renders the globe container', async ({ page }) => {
    await page.goto('/');

    // Wait for the page to finish loading
    await expect(page).toHaveTitle(/OceanWatch AU/);

    // The globe container should be present
    const globeContainer = page.locator(
      '[aria-label="Interactive globe showing ocean pollution detections"]'
    );
    await expect(globeContainer).toBeVisible({ timeout: 15_000 });
  });

  test('renders the time scrubber', async ({ page }) => {
    await page.goto('/');

    const scrubber = page.locator('[aria-label="Time navigation"]');
    await expect(scrubber).toBeVisible({ timeout: 10_000 });

    // Verify the scrubber has a range input
    const rangeInput = scrubber.locator('input[type="range"]');
    await expect(rangeInput).toBeVisible();
  });

  test('time scrubber can be moved', async ({ page }) => {
    await page.goto('/');

    const rangeInput = page.locator('input[type="range"]');
    await expect(rangeInput).toBeVisible({ timeout: 10_000 });

    // Get initial value
    const initialValue = await rangeInput.inputValue();

    // Move the slider to 50% of its range
    const min = Number(await rangeInput.getAttribute('min'));
    const max = Number(await rangeInput.getAttribute('max'));
    const midValue = Math.floor((min + max) / 2);

    await rangeInput.fill(String(midValue));

    const newValue = await rangeInput.inputValue();
    expect(newValue).toBe(String(midValue));
    expect(newValue).not.toBe(initialValue);
  });

  test('renders the header with confidence tier legend', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('OceanWatch AU')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Verified', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Probable', { exact: true }).first()).toBeVisible();
  });

  test('renders the footer with data attribution', async ({ page }) => {
    await page.goto('/');

    // Footer contains attribution links
    await expect(page.getByText('CartoDB', { exact: false })).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Methodology page', () => {
  test('loads and contains key sections', async ({ page }) => {
    await page.goto('/methodology');

    await expect(page).toHaveTitle(/Methodology/);
    await expect(page.getByText('How OceanWatch AU works')).toBeVisible();
    await expect(page.getByText('Confidence tiers')).toBeVisible();
    await expect(page.getByText('Limitations')).toBeVisible();
    await expect(page.getByText('Data sources and licences')).toBeVisible();
  });

  test('has a working back link to the globe', async ({ page }) => {
    await page.goto('/methodology');

    await page.getByRole('link', { name: '← Globe' }).click();
    await expect(page).toHaveURL('/');
  });
});

test.describe('API endpoints', () => {
  test('/api/health returns a status response', async ({ request }) => {
    const response = await request.get('/api/health');
    // 200 (ok) or 503 (degraded — no DB in CI) are both valid response shapes
    expect([200, 503]).toContain(response.status());

    const body = await response.json();
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('checks');
  });

  test('/api/v1/detections returns a GeoJSON FeatureCollection', async ({ request }) => {
    const response = await request.get('/api/v1/detections');
    expect([200, 500]).toContain(response.status()); // 500 if no DB in CI

    if (response.status() === 200) {
      const body = await response.json();
      expect(body.type).toBe('FeatureCollection');
      expect(Array.isArray(body.features)).toBe(true);
    }
  });

  test('/api/v1/detections validates bbox parameter', async ({ request }) => {
    const response = await request.get('/api/v1/detections?bbox=invalid');
    expect(response.status()).toBe(400);
  });
});

test.describe('Mobile viewport (380px)', () => {
  test.use({ viewport: { width: 380, height: 812 } });

  test('renders the globe full-bleed on mobile', async ({ page }) => {
    await page.goto('/');

    const globeContainer = page.locator(
      '[aria-label="Interactive globe showing ocean pollution detections"]'
    );
    await expect(globeContainer).toBeVisible({ timeout: 15_000 });

    const box = await globeContainer.boundingBox();
    expect(box?.width).toBeCloseTo(380, -1);
  });
});
