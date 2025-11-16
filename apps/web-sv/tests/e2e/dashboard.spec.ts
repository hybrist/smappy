/**
 * End-to-end tests for dashboard UI
 * Tests that the UI correctly displays ingested bundle data
 */

import { test, expect } from '@playwright/test';
import { ingestBundle } from '@smappy/cli/ingestion';
import { cleanDatabase, createDashboardTestData } from '../../src/lib/server/db/seed.js';
import { db } from '../../src/lib/server/db/index.js';

test.describe('Dashboard Landing Page', () => {
  test.beforeEach(async () => {
    // Clean database before each test
    await cleanDatabase();

    // Set up test data with multiple projects using seed data
    const { landingPageProjects } = createDashboardTestData();

    for (const project of landingPageProjects) {
      await ingestBundle(db, project);
    }
  });

  test('should display dashboard landing page with project list', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    // Check the Smappy logo is visible
    await expect(page.getByAltText('Smappy')).toBeVisible({ timeout: 5000 });

    // Verify project cards are displayed
    await expect(page.getByTestId('project-card')).toHaveCount(2, { timeout: 5000 });

    const firstCard = page.getByTestId('project-card').first();
    await expect(firstCard.getByTestId('project-card-size')).toBeVisible();
    await expect(firstCard.getByTestId('project-card-modules')).toContainText('module');
    await expect(firstCard.getByTestId('project-card-last-analyzed')).toBeVisible();
  });

  test('should navigate to project dashboard when clicking project card', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    // Click on a project card
    await page.getByTestId('project-card').first().click();

    // Should navigate to project dashboard
    await expect(page).toHaveURL(/\/dashboard\/test-project-/);
  });
});

test.describe('Project Dashboard Page', () => {
  const projectName = 'dashboard-test-project';

  test.beforeEach(async () => {
    // Clean database before each test
    await cleanDatabase();

    // Set up test data with realistic bundle analysis using seed data
    const { detailedProject } = createDashboardTestData();
    await ingestBundle(db, detailedProject);
  });

  test('should display project dashboard with stats', async ({ page }) => {
    await page.goto(`/dashboard/${projectName}`, { waitUntil: 'networkidle' });

    // Check navigation - Smappy logo should be visible
    await expect(page.getByAltText('Smappy')).toBeVisible({ timeout: 5000 });

    // Check stats section is visible
    await expect(page.getByTestId('stat-card-total-size')).toBeVisible({ timeout: 5000 });

    // Should have all stat cards visible
    await expect(page.getByTestId('stat-card-total-size')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('stat-card-modules')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('stat-card-bundler')).toBeVisible({ timeout: 5000 });
  });

  test('should display correct module count in statistics', async ({ page }) => {
    await page.goto(`/dashboard/${projectName}`, { waitUntil: 'networkidle' });

    // Wait for stats to load
    await page.waitForSelector('[data-testid="stat-card-modules"]', { timeout: 10000 });

    // Verify module count (we have 3 modules)
    const modulesCard = page.getByTestId('stat-card-modules');
    await expect(modulesCard).toContainText('3', { timeout: 5000 });
  });

  test('should display bundler type', async ({ page }) => {
    await page.goto(`/dashboard/${projectName}`, { waitUntil: 'networkidle' });

    // Verify bundler is displayed
    const bundlerCard = page.getByTestId('stat-card-bundler');
    await expect(bundlerCard).toContainText('vite', { timeout: 5000 });
  });

  test('should display project selector', async ({ page }) => {
    await page.goto(`/dashboard/${projectName}`, { waitUntil: 'networkidle' });

    // Check project selector exists and has the correct value
    const projectSelect = page.locator('#project-select');
    await expect(projectSelect).toBeVisible({ timeout: 5000 });
    await expect(projectSelect).toHaveValue(projectName);
  });

  test('should handle non-existent project', async ({ page }) => {
    await page.goto('/dashboard/non-existent-project', { waitUntil: 'networkidle' });

    // Should still load the page - check for Smappy logo
    await expect(page.getByAltText('Smappy')).toBeVisible({ timeout: 5000 });

    // Should show no analysis message
    await expect(page.getByTestId('empty-state-no-analysis')).toBeVisible({ timeout: 5000 });
  });
});
