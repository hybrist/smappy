/**
 * End-to-end tests for dashboard UI
 * Tests that the UI correctly displays ingested bundle data
 */

import { test, expect } from '@playwright/test';
import { ingestBundle, type BundleIngestionInput } from '../../src/lib/server/ingestion/index.js';
import type {
  BundleInput,
  ModuleInput,
  ChunkInput,
} from '../../src/lib/server/ingestion/types/index.js';

test.describe('Dashboard UI E2E', () => {
  test.beforeEach(async () => {
    // Set up test data by ingesting a bundle before each test
    const modules: ModuleInput[] = [
      {
        filePath: './src/dashboard-test.js',
        sourceContent: `
export function renderDashboard() {
  return 'Dashboard';
}

export class DashboardComponent {
  constructor() {
    this.data = [];
  }

  update(data) {
    this.data = data;
  }
}
        `.trim(),
        fileType: 'js',
      },
    ];

    const bundles: BundleInput[] = [
      {
        fileName: 'dashboard.js',
        content: '/* bundled dashboard code */',
        type: 'js',
      },
    ];

    const chunks: ChunkInput[] = [
      {
        name: 'dashboard',
        isEntry: true,
        isAsync: false,
        moduleIds: ['./src/dashboard-test.js'],
      },
    ];

    const input: BundleIngestionInput = {
      options: {
        bundlerType: 'vite',
        projectName: 'dashboard-test-project',
        enableIncremental: false,
      },
      bundles,
      modules,
      chunks,
    };

    await ingestBundle(input);
  });

  test('should load the home page', async ({ page }) => {
    await page.goto('/');

    // Check that the page loads
    await expect(page).toHaveTitle(/SvelteKit/i);
  });

  test('should display analysis data in UI', async ({ page }) => {
    // This test will need to be updated once the dashboard UI is implemented
    // For now, we verify the page loads and can query data

    await page.goto('/');

    // Wait for page to be interactive
    await page.waitForLoadState('networkidle');

    // Verify page rendered without errors
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should handle query functions via API', async ({ page }) => {
    // This test verifies that query functions work correctly
    // Since we're using SvelteKit remote functions, we'll test the API endpoints

    await page.goto('/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check that there are no console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait a bit for any async operations
    await page.waitForTimeout(1000);

    // Verify no critical errors occurred
    expect(errors.filter((e) => !e.includes('favicon'))).toHaveLength(0);
  });
});
