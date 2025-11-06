/**
 * End-to-end tests for dashboard UI
 * Tests that the UI correctly displays ingested bundle data
 */

import { test, expect } from '@playwright/test';
import { ingestBundle } from '../../src/lib/server/ingestion/index.js';
import { cleanDatabase, createDashboardTestData } from '../../src/lib/server/db/seed.js';

test.describe('Dashboard Landing Page', () => {
  test.beforeEach(async () => {
    // Clean database before each test
    await cleanDatabase();

    // Set up test data with multiple projects using seed data
    const { landingPageProjects } = createDashboardTestData();

    for (const project of landingPageProjects) {
      await ingestBundle(project);
    }
  });

  test('should display dashboard landing page with project list', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    // Check the page title
    await expect(page.locator('h1')).toContainText('Bundle Analysis Dashboard', { timeout: 5000 });

    // Verify project cards are displayed
    await expect(page.locator('.project-card')).toHaveCount(2, { timeout: 5000 });
  });

  test('should navigate to project dashboard when clicking project card', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    // Click on a project card
    await page.locator('.project-card').first().click();

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
    await ingestBundle(detailedProject);
  });

  test('should display project dashboard with stats', async ({ page }) => {
    await page.goto(`/dashboard/${projectName}`, { waitUntil: 'networkidle' });

    // Check navigation
    await expect(page.getByText('Bundle Analysis')).toBeVisible({ timeout: 5000 });

    // Check stats section is visible
    await expect(page.locator('.stat-card').first()).toBeVisible({ timeout: 5000 });

    // Should have stat cards
    await expect(page.locator('.stat-card')).toHaveCount(3, { timeout: 5000 });
  });

  test('should display correct module count in statistics', async ({ page }) => {
    await page.goto(`/dashboard/${projectName}`, { waitUntil: 'networkidle' });

    // Wait for stats to load
    await page.waitForSelector('.stat-card', { timeout: 10000 });

    // Verify module count (we have 3 modules)
    const modulesCard = page.locator('.stat-card:has(h3:has-text("Modules"))');
    await expect(modulesCard).toContainText('3', { timeout: 5000 });
  });

  test('should display bundler type', async ({ page }) => {
    await page.goto(`/dashboard/${projectName}`, { waitUntil: 'networkidle' });

    // Verify bundler is displayed
    const bundlerCard = page.locator('.stat-card:has(h3:has-text("Bundler"))');
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

    // Should still load the page
    await expect(page.getByText('Bundle Analysis')).toBeVisible({ timeout: 5000 });

    // Should show no analysis message
    await expect(page.getByText(/No analysis data found/)).toBeVisible({ timeout: 5000 });
  });
});
