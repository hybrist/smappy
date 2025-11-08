/**
 * End-to-end tests for suggestions page
 * Tests that the suggestions page displays appropriate empty state guidance
 */

import { test, expect } from '@playwright/test';
import { ingestBundle } from '../../src/lib/server/ingestion/index.js';
import { cleanDatabase, createDashboardTestData } from '../../src/lib/server/db/seed.js';

test.describe('Suggestions Page', () => {
  const projectName = 'dashboard-test-project';

  test.beforeEach(async () => {
    // Clean database before each test
    await cleanDatabase();

    // Set up test data with realistic bundle analysis using seed data
    const { detailedProject } = createDashboardTestData();
    await ingestBundle(detailedProject);
  });

  test('should display informative empty state when no suggestions are available', async ({
    page,
  }) => {
    await page.goto(`/dashboard/${projectName}/suggestions`, { waitUntil: 'networkidle' });

    // Wait for the page to load and check we're on the right page
    await page.waitForURL(`**/dashboard/${projectName}/suggestions`, { timeout: 10000 });

    // Verify the AI-Powered Suggestions heading is visible
    await expect(page.getByRole('heading', { name: 'AI-Powered Suggestions', level: 3 })).toBeVisible({
      timeout: 5000,
    });

    // Verify explanation text is present
    await expect(
      page.getByText(/Suggestions are generated automatically using AI/),
    ).toBeVisible();

    // Verify "Why don't I see suggestions?" section
    await expect(page.getByRole('heading', { name: "Why don't I see suggestions?" })).toBeVisible();

    // Verify LLM configuration requirements are mentioned
    await expect(page.getByText(/LLM Integration Required/)).toBeVisible();
    await expect(page.getByText(/SMAPPY_LLM_ENABLED=true/)).toBeVisible();
    await expect(page.getByText(/SMAPPY_OPENAI_API_KEY/)).toBeVisible();
    await expect(page.getByText(/SMAPPY_ANTHROPIC_API_KEY/)).toBeVisible();

    // Verify "How to enable" section
    await expect(page.getByRole('heading', { name: 'How to enable:' })).toBeVisible();
    await expect(page.getByText(/Configure environment variables/)).toBeVisible();
    await expect(page.getByText(/Run a new analysis/)).toBeVisible();

    // Verify informational box about what suggestions do
    await expect(
      page.getByText(/Once configured, AI suggestions analyze your bundle structure/),
    ).toBeVisible();
  });

  test('should show filter controls even when empty', async ({ page }) => {
    await page.goto(`/dashboard/${projectName}/suggestions`, { waitUntil: 'networkidle' });

    // Verify filter dropdowns are present
    await expect(page.getByLabel('Type:')).toBeVisible();
    await expect(page.getByLabel('Severity:')).toBeVisible();

    // Verify showing count
    await expect(page.getByText(/Showing 0 of 0 suggestions/)).toBeVisible();
  });

  test('should show severity badges with zero counts', async ({ page }) => {
    await page.goto(`/dashboard/${projectName}/suggestions`, { waitUntil: 'networkidle' });

    // Verify severity badges show 0 - use more specific selectors
    const criticalBadge = page.locator('.severity-critical-count .count-badge');
    await expect(criticalBadge).toContainText('0');

    const warningBadge = page.locator('.severity-warning-count .count-badge');
    await expect(warningBadge).toContainText('0');

    const infoBadge = page.locator('.severity-info-count .count-badge');
    await expect(infoBadge).toContainText('0');
  });

  test('should display page header with description', async ({ page }) => {
    await page.goto(`/dashboard/${projectName}/suggestions`, { waitUntil: 'networkidle' });

    // Verify page header
    await expect(page.getByRole('heading', { name: 'Analysis Suggestions' })).toBeVisible();
    await expect(
      page.getByText(/AI-generated recommendations to optimize your bundle/),
    ).toBeVisible();
  });
});
