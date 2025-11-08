/**
 * End-to-end tests for keyboard shortcuts
 * Tests that keyboard shortcuts work correctly in the dashboard
 */

import { test, expect } from '@playwright/test';
import { ingestBundle } from '../../src/lib/server/ingestion/index.js';
import { cleanDatabase, createDashboardTestData } from '../../src/lib/server/db/seed.js';

test.describe('Keyboard Shortcuts', () => {
  test.beforeEach(async () => {
    // Clean database before each test
    await cleanDatabase();

    // Set up test data
    const { landingPageProjects } = createDashboardTestData();

    for (const project of landingPageProjects) {
      await ingestBundle(project);
    }
  });

  test('should open help modal when pressing ?', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    // Click first project to go to dashboard
    await page.getByTestId('project-card').first().click();
    await page.waitForURL(/\/dashboard\/.+/);

    // Press ? to open help modal
    await page.keyboard.press('?');

    // Wait a bit for modal to appear
    await page.waitForTimeout(100);

    // Verify help modal is visible
    await expect(page.getByText('Keyboard Shortcuts', { exact: true })).toBeVisible({
      timeout: 2000,
    });
  });

  test('should close help modal when pressing Escape', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    // Click first project to go to dashboard
    await page.getByTestId('project-card').first().click();
    await page.waitForURL(/\/dashboard\/.+/);

    // Press ? to open help modal
    await page.keyboard.press('?');
    await page.waitForTimeout(100);

    // Verify help modal is visible
    await expect(page.getByText('Keyboard Shortcuts', { exact: true })).toBeVisible({
      timeout: 2000,
    });

    // Press Escape to close
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);

    // Verify help modal is hidden
    await expect(page.getByText('Keyboard Shortcuts', { exact: true })).not.toBeVisible({
      timeout: 2000,
    });
  });

  test('should navigate to Dashboard when pressing G then D', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    // Click first project to go to dashboard
    await page.getByTestId('project-card').first().click();
    await page.waitForURL(/\/dashboard\/.+/);

    // Press G then D
    await page.keyboard.press('g');
    await page.keyboard.press('d');

    // Should navigate to dashboard landing page
    await expect(page).toHaveURL('/dashboard');
  });

  test('should navigate between tabs using number keys', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    // Click first project to go to dashboard
    await page.getByTestId('project-card').first().click();
    await page.waitForURL(/\/dashboard\/.+/);

    const projectUrl = page.url();
    const projectName = projectUrl.split('/').pop();

    // Start on Overview (default)
    await expect(page).toHaveURL(new RegExp(`/dashboard/${projectName}$`));

    // Press 2 to go to Dependencies
    await page.keyboard.press('2');
    await expect(page).toHaveURL(new RegExp(`/dashboard/${projectName}/dependencies`));

    // Press 3 to go to Compare
    await page.keyboard.press('3');
    await expect(page).toHaveURL(new RegExp(`/dashboard/${projectName}/compare`));

    // Press 4 to go to Suggestions
    await page.keyboard.press('4');
    await expect(page).toHaveURL(new RegExp(`/dashboard/${projectName}/suggestions`));

    // Press 1 to go back to Overview
    await page.keyboard.press('1');
    await expect(page).toHaveURL(new RegExp(`/dashboard/${projectName}$`));
  });

  test('should show keyboard shortcuts button in header', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    // Click first project to go to dashboard
    await page.getByTestId('project-card').first().click();
    await page.waitForURL(/\/dashboard\/.+/);

    // Verify shortcuts button is visible
    await expect(page.getByRole('button', { name: /shortcuts/i })).toBeVisible();

    // Click it to open modal
    await page.getByRole('button', { name: /shortcuts/i }).click();
    await page.waitForTimeout(100);

    // Verify modal opens
    await expect(page.getByText('Keyboard Shortcuts', { exact: true })).toBeVisible({
      timeout: 2000,
    });
  });

  test('should display tooltips on navigation tabs', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    // Click first project to go to dashboard
    await page.getByTestId('project-card').first().click();
    await page.waitForURL(/\/dashboard\/.+/);

    // Check Overview tab has tooltip with keyboard shortcut
    const overviewLink = page.getByRole('link', { name: /^overview$/i });
    await expect(overviewLink).toHaveAttribute('title', /Press 1/i);

    // Check Dependencies tab has tooltip
    const depsLink = page.getByRole('link', { name: /^dependencies$/i });
    await expect(depsLink).toHaveAttribute('title', /Press 2/i);

    // Check Compare tab has tooltip
    const compareLink = page.getByRole('link', { name: /^compare$/i });
    await expect(compareLink).toHaveAttribute('title', /Press 3/i);

    // Check Suggestions tab has tooltip
    const suggestionsLink = page.getByRole('link', { name: /^suggestions$/i });
    await expect(suggestionsLink).toHaveAttribute('title', /Press 4/i);
  });
});
